import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProblemDetailsError, type ProblemDetails } from "@/lib/api/errors";
import {
  createAccount,
  deactivateAccount,
  PossibleDuplicateAccountError,
  updateAccount,
} from "@/lib/accounts/api";
import type { Account } from "@/lib/accounts/types";
import {
  createAccountAction,
  deactivateAccountAction,
  updateAccountAction,
} from "./actions";

vi.mock("@/lib/auth0", () => ({
  auth0: { getAccessToken: vi.fn(async () => ({ token: "token-ficticio" })) },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

// `redirect` do Next lanca excecao; o teste reproduz esse contrato para observar o destino.
vi.mock("next/navigation", () => ({
  RedirectType: { push: "push", replace: "replace" },
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));

vi.mock("@/lib/accounts/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/accounts/api")>();
  return {
    ...actual,
    createAccount: vi.fn(),
    updateAccount: vi.fn(),
    deactivateAccount: vi.fn(),
  };
});

const ACCOUNT_ID = "3f1c2b4e-8a6d-4c1e-9b2a-7d5e6f8a9b0c";

const original: Account = {
  id: ACCOUNT_ID,
  name: "Conta principal",
  type: "checking",
  origin: "manual",
  institutionName: "Banco Ficticio",
  initialBalance: "1250.00",
  initialBalanceAsOf: "2026-09-10",
  currencyCode: "BRL",
  archivedAt: null,
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "2026-09-10T10:00:00.000Z",
};

function form(overrides: Record<string, string> = {}): FormData {
  const data = new FormData();
  const values = {
    name: original.name,
    type: original.type,
    institutionName: original.institutionName ?? "",
    initialBalance: original.initialBalance,
    initialBalanceAsOf: original.initialBalanceAsOf,
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function problem(status: number, code: string, extra: Partial<ProblemDetails> = {}) {
  return new ProblemDetailsError({
    type: "about:blank",
    title: "t",
    status,
    code,
    detail: "Technical detail in English.",
    ...extra,
  });
}

const idle = { status: "idle" } as const;

beforeEach(() => {
  vi.mocked(createAccount).mockReset();
  vi.mocked(updateAccount).mockReset();
  vi.mocked(deactivateAccount).mockReset();
});

describe("createAccountAction", () => {
  it("retorna erros de campo sem chamar a API", async () => {
    const state = await createAccountAction(idle, form({ name: "", initialBalance: "abc" }));
    expect(state.status).toBe("invalid");
    expect(createAccount).not.toHaveBeenCalled();
  });

  it("não expoe o detail do backend", async () => {
    vi.mocked(createAccount).mockRejectedValue(problem(500, "INTERNAL_ERROR"));
    const state = await createAccountAction(idle, form());
    expect(state).toEqual({ status: "error", message: "Não foi possível criar a conta." });
  });
});

describe("updateAccountAction", () => {
  it("não chama a API quando nada mudou", async () => {
    const state = await updateAccountAction(ACCOUNT_ID, original, idle, form());
    expect(state).toEqual({ status: "unchanged" });
    expect(updateAccount).not.toHaveBeenCalled();
  });

  it("recusa id adulterado ou diferente do original", async () => {
    const tampered = await updateAccountAction("../x", original, idle, form({ name: "Nova" }));
    const mismatch = await updateAccountAction(
      "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d",
      original,
      idle,
      form({ name: "Nova" }),
    );
    expect(tampered.status).toBe("error");
    expect(mismatch.status).toBe("error");
    expect(updateAccount).not.toHaveBeenCalled();
  });

  it("envia somente o diff e redireciona com aviso de sucesso", async () => {
    vi.mocked(updateAccount).mockResolvedValue({ ...original, name: "Nova" });
    await expect(
      updateAccountAction(ACCOUNT_ID, original, idle, form({ name: "Nova" })),
    ).rejects.toThrow("NEXT_REDIRECT /contas?aviso=conta-atualizada");
    expect(updateAccount).toHaveBeenCalledWith(
      ACCOUNT_ID,
      { name: "Nova" },
      { accessToken: "token-ficticio" },
    );
  });

  it("repassa a confirmação de duplicidade junto com o diff", async () => {
    vi.mocked(updateAccount).mockResolvedValue(original);
    await expect(
      updateAccountAction(
        ACCOUNT_ID,
        original,
        idle,
        form({ name: "Nova", confirmPossibleDuplicate: "true" }),
      ),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(vi.mocked(updateAccount).mock.calls[0][1]).toEqual({
      name: "Nova",
      confirmPossibleDuplicate: true,
    });
  });

  it.each(["ACCOUNT_NOT_FOUND", "ACCOUNT_ARCHIVED"])(
    "redireciona %s para o aviso uniforme de indisponibilidade",
    async (code) => {
      vi.mocked(updateAccount).mockRejectedValue(problem(code === "ACCOUNT_NOT_FOUND" ? 404 : 409, code));
      await expect(
        updateAccountAction(ACCOUNT_ID, original, idle, form({ name: "Nova" })),
      ).rejects.toThrow("NEXT_REDIRECT /contas?aviso=conta-indisponivel");
    },
  );

  it("devolve as candidatas quando há possível duplicidade", async () => {
    const candidates = [
      { id: ACCOUNT_ID, name: "Nova", type: "checking" as const, origin: "connected" as const, institutionName: null },
    ];
    vi.mocked(updateAccount).mockRejectedValue(
      new PossibleDuplicateAccountError(
        { type: "about:blank", title: "t", status: 409, code: "POSSIBLE_CONNECTED_ACCOUNT_DUPLICATE", detail: "d" },
        candidates,
      ),
    );
    const state = await updateAccountAction(ACCOUNT_ID, original, idle, form({ name: "Nova" }));
    expect(state).toEqual({ status: "duplicate", candidates });
  });

  it("traduz erros de campo do backend", async () => {
    vi.mocked(updateAccount).mockRejectedValue(
      problem(400, "INVALID_REQUEST", {
        errors: [{ path: "initialBalance", code: "BALANCE_REFERENCE_PAIR_REQUIRED", message: "x" }],
      }),
    );
    const state = await updateAccountAction(
      ACCOUNT_ID,
      original,
      idle,
      form({ initialBalance: "10.00" }),
    );
    expect(state).toEqual({
      status: "invalid",
      fieldErrors: { initialBalance: ["Informe saldo inicial e data de referência juntos."] },
    });
  });

  it("informa conta conectada somente leitura em pt-BR", async () => {
    vi.mocked(updateAccount).mockRejectedValue(problem(409, "CONNECTED_ACCOUNT_READ_ONLY"));
    const state = await updateAccountAction(ACCOUNT_ID, original, idle, form({ name: "Nova" }));
    expect(state).toEqual({
      status: "error",
      message: "Contas conectadas não podem ser editadas aqui. Você ainda pode desativá-las.",
    });
  });
});

describe("deactivateAccountAction", () => {
  it("redireciona com aviso de desativação", async () => {
    vi.mocked(deactivateAccount).mockResolvedValue({ ...original, archivedAt: "2026-09-12T10:00:00.000Z" });
    await expect(deactivateAccountAction(ACCOUNT_ID)).rejects.toThrow(
      "NEXT_REDIRECT /contas?aviso=conta-desativada",
    );
  });

  it("trata conta inexistente como indisponível", async () => {
    vi.mocked(deactivateAccount).mockRejectedValue(problem(404, "ACCOUNT_NOT_FOUND"));
    await expect(deactivateAccountAction(ACCOUNT_ID)).rejects.toThrow(
      "NEXT_REDIRECT /contas?aviso=conta-indisponivel",
    );
  });

  it("mantém o painel com mensagem em pt-BR em falha interna", async () => {
    vi.mocked(deactivateAccount).mockRejectedValue(problem(500, "INTERNAL_ERROR"));
    expect(await deactivateAccountAction(ACCOUNT_ID)).toEqual({
      status: "error",
      message: "Não foi possível desativar a conta.",
    });
  });

  it("recusa id inválido sem chamar a API", async () => {
    expect((await deactivateAccountAction("x")).status).toBe("error");
    expect(deactivateAccount).not.toHaveBeenCalled();
  });
});
