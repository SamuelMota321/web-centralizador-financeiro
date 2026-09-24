import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { ProblemDetailsError, type ProblemDetails } from "@/lib/api/errors";
import {
  createTransaction,
  createTransfer,
  updateTransactionCategory,
} from "@/lib/transactions/api";
import type { Transaction } from "@/lib/transactions/types";
import {
  categorizeTransactionAction,
  createTransactionAction,
  createTransferAction,
  type MovementFormState,
} from "./actions";

vi.mock("@/lib/auth0", () => ({
  auth0: { getAccessToken: vi.fn() },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/lib/transactions/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/transactions/api")>();
  return {
    ...actual,
    createTransaction: vi.fn(),
    createTransfer: vi.fn(),
    updateTransactionCategory: vi.fn(),
  };
});

const KEY = "0b7c8f1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e";
const ACCOUNT_A = "3f1c2b4e-8a6d-4c1e-9b2a-7d5e6f8a9b0c";
const ACCOUNT_B = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

const IDLE: MovementFormState = { status: "idle", idempotencyKey: KEY };

function transaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a",
    accountId: ACCOUNT_A,
    type: "expense",
    amount: "1234.56",
    occurredOn: "2026-09-20",
    description: "Mercado",
    status: "posted",
    transferId: null,
    transferSide: null,
    categoryId: null,
    categorizationStatus: "unclassified",
    categorizationSource: null,
    createdAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-20T12:00:00.000Z",
    ...overrides,
  };
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

function movementForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields = {
    idempotencyKey: KEY,
    accountId: ACCOUNT_A,
    type: "expense",
    amount: "1.234,56",
    occurredOn: "20/09/2026",
    description: "  Mercado  ",
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return formData;
}

function transferForm(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields = {
    idempotencyKey: KEY,
    fromAccountId: ACCOUNT_A,
    toAccountId: ACCOUNT_B,
    amount: "50",
    occurredOn: "20/09/2026",
    description: "",
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) formData.set(name, value);
  return formData;
}

beforeEach(() => {
  vi.mocked(auth0.getAccessToken).mockReset().mockResolvedValue({ token: "token-ficticio" } as never);
  vi.mocked(createTransaction).mockReset();
  vi.mocked(createTransfer).mockReset();
  vi.mocked(updateTransactionCategory).mockReset();
  vi.mocked(revalidatePath).mockReset();
});

describe("createTransactionAction", () => {
  it("envia valor normalizado com a chave do formulario e gera chave nova após sucesso", async () => {
    vi.mocked(createTransaction).mockResolvedValue(
      transaction({ categorizationStatus: "categorized", categorizationSource: "rule" }),
    );

    const state = await createTransactionAction(IDLE, movementForm());

    expect(createTransaction).toHaveBeenCalledWith(
      {
        accountId: ACCOUNT_A,
        type: "expense",
        amount: "1234.56",
        occurredOn: "2026-09-20",
        description: "Mercado",
      },
      { accessToken: "token-ficticio", idempotencyKey: KEY },
    );
    expect(state.status).toBe("success");
    expect(state.idempotencyKey).not.toBe(KEY);
    expect(state).toMatchObject({ summary: { kind: "movement", categorizedByRule: true } });
    expect(revalidatePath).toHaveBeenCalledWith("/movimentacoes");
  });

  it.each(["0,00", "0,001", "-10", "abc", ""])(
    "recusa o valor %j sem chamar a API e preserva o que foi digitado",
    async (amount) => {
      const state = await createTransactionAction(IDLE, movementForm({ amount }));

      expect(createTransaction).not.toHaveBeenCalled();
      expect(state).toMatchObject({
        status: "invalid",
        idempotencyKey: KEY,
        values: { amount },
        fieldErrors: { amount: [expect.stringContaining("maior que zero")] },
      });
    },
  );

  it("usa mensagens em pt-BR para tipo, conta e data inválidos", async () => {
    const state = await createTransactionAction(
      IDLE,
      movementForm({ type: "transfer", accountId: "", occurredOn: "29/02/2026" }),
    );

    expect(state).toMatchObject({
      status: "invalid",
      fieldErrors: {
        type: ["Escolha receita ou despesa."],
        accountId: ["Escolha uma conta."],
        occurredOn: ["Informe uma data válida no formato DD/MM/AAAA."],
      },
    });
  });

  it("mantém a mesma chave após falha de rede, para o reenvio ser um replay", async () => {
    vi.mocked(createTransaction).mockRejectedValue(new TypeError("fetch failed"));

    const state = await createTransactionAction(IDLE, movementForm());

    expect(state).toMatchObject({
      status: "error",
      idempotencyKey: KEY,
      message: expect.stringContaining("Tente de novo"),
    });
  });

  it("mantém a mesma chave após 500", async () => {
    vi.mocked(createTransaction).mockRejectedValue(problem(500, "INTERNAL_ERROR"));

    const state = await createTransactionAction(IDLE, movementForm());

    expect(state).toMatchObject({ status: "error", idempotencyKey: KEY });
    expect(state.status === "error" && state.message).not.toContain("English");
  });

  it.each(["IDEMPOTENCY_KEY_REUSED", "IDEMPOTENCY_KEY_EXPIRED"])(
    "gera chave nova quando o backend recusa a chave (%s)",
    async (code) => {
      vi.mocked(createTransaction).mockRejectedValue(problem(409, code));

      const state = await createTransactionAction(IDLE, movementForm());

      expect(state.status).toBe("error");
      expect(state.idempotencyKey).not.toBe(KEY);
      expect(state).toMatchObject({ values: { amount: "1.234,56" } });
    },
  );

  it.each([
    [404, "ACCOUNT_NOT_FOUND"],
    [409, "ACCOUNT_ARCHIVED"],
  ])("conta indisponível (%i %s) recarrega o seletor", async (status, code) => {
    vi.mocked(createTransaction).mockRejectedValue(problem(status, code));

    const state = await createTransactionAction(IDLE, movementForm());

    expect(state).toMatchObject({
      status: "error",
      idempotencyKey: KEY,
      message: expect.stringContaining("não está mais disponível"),
    });
    expect(revalidatePath).toHaveBeenCalledWith("/movimentacoes");
  });

  it.each([
    [401, "AUTHENTICATION_REQUIRED"],
    [403, "IDENTITY_CONTEXT_UNAVAILABLE"],
  ])("%i %s oferece caminho de reautenticacao", async (status, code) => {
    vi.mocked(createTransaction).mockRejectedValue(problem(status, code));

    const state = await createTransactionAction(IDLE, movementForm());

    expect(state).toMatchObject({ status: "error", reauth: true, idempotencyKey: KEY });
  });

  it("sessão sem token não chama a API e pede novo login", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("session expired"));

    const state = await createTransactionAction(IDLE, movementForm());

    expect(createTransaction).not.toHaveBeenCalled();
    expect(state).toMatchObject({ status: "error", reauth: true });
  });

  it("mapeia errors[].path do 400 para o campo", async () => {
    vi.mocked(createTransaction).mockRejectedValue(
      problem(400, "INVALID_REQUEST", {
        errors: [{ path: "occurredOn", code: "INVALID_VALUE", message: "Invalid value." }],
      }),
    );

    const state = await createTransactionAction(IDLE, movementForm());

    expect(state).toMatchObject({
      status: "invalid",
      idempotencyKey: KEY,
      fieldErrors: { occurredOn: ["Informe uma data válida no formato DD/MM/AAAA."] },
    });
  });

  it("chave oculta adulterada cai para a chave do estado anterior", async () => {
    vi.mocked(createTransaction).mockResolvedValue(transaction());

    await createTransactionAction(IDLE, movementForm({ idempotencyKey: "nao-e-uuid" }));

    expect(createTransaction).toHaveBeenCalledWith(expect.anything(), {
      accessToken: "token-ficticio",
      idempotencyKey: KEY,
    });
  });
});

describe("createTransferAction", () => {
  it("resume saída e entrada a partir das duas pernas retornadas", async () => {
    vi.mocked(createTransfer).mockResolvedValue({
      entries: [
        transaction({ type: "transfer", accountId: ACCOUNT_A, transferSide: "outgoing", amount: "50.00" }),
        transaction({ type: "transfer", accountId: ACCOUNT_B, transferSide: "incoming", amount: "50.00" }),
      ],
    });

    const state = await createTransferAction(IDLE, transferForm());

    expect(createTransfer).toHaveBeenCalledWith(
      {
        fromAccountId: ACCOUNT_A,
        toAccountId: ACCOUNT_B,
        amount: "50.00",
        occurredOn: "2026-09-20",
        description: null,
      },
      { accessToken: "token-ficticio", idempotencyKey: KEY },
    );
    expect(state).toMatchObject({
      status: "success",
      summary: { kind: "transfer", amount: "50.00", fromAccountId: ACCOUNT_A, toAccountId: ACCOUNT_B },
    });
    expect(state.idempotencyKey).not.toBe(KEY);
  });

  it("recusa origem igual ao destino antes de chamar a API", async () => {
    const state = await createTransferAction(
      IDLE,
      transferForm({ toAccountId: ACCOUNT_A.toUpperCase() }),
    );

    expect(createTransfer).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      status: "invalid",
      fieldErrors: { toAccountId: ["Escolha contas de origem e destino diferentes."] },
    });
  });

  it("mantém a mesma chave após falha de rede, para o reenvio ser um replay", async () => {
    vi.mocked(createTransfer).mockRejectedValue(new TypeError("fetch failed"));

    const state = await createTransferAction(IDLE, transferForm());

    expect(state).toMatchObject({ status: "error", idempotencyKey: KEY, values: { amount: "50" } });
  });

  it.each(["IDEMPOTENCY_KEY_REUSED", "IDEMPOTENCY_KEY_EXPIRED"])(
    "gera chave nova quando o backend recusa a chave da transferência (%s)",
    async (code) => {
      vi.mocked(createTransfer).mockRejectedValue(problem(409, code));

      const state = await createTransferAction(IDLE, transferForm());

      expect(state.status).toBe("error");
      expect(state.idempotencyKey).not.toBe(KEY);
    },
  );

  it("TRANSFER_ACCOUNTS_MUST_DIFFER do backend vira erro no destino", async () => {
    vi.mocked(createTransfer).mockRejectedValue(problem(400, "TRANSFER_ACCOUNTS_MUST_DIFFER"));

    const state = await createTransferAction(IDLE, transferForm());

    expect(state).toMatchObject({
      status: "invalid",
      idempotencyKey: KEY,
      fieldErrors: { toAccountId: [expect.stringContaining("diferentes")] },
    });
  });
});

describe("categorizeTransactionAction", () => {
  const TRANSACTION_ID = "5d4c3b2a-1f0e-4d9c-8b7a-6f5e4d3c2b1a";
  const CATEGORY_ID = "7c6b5a49-3827-4165-9a8b-7c6d5e4f3a2b";

  function categorizeForm(fields: Record<string, string>) {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  }

  it("aplica a categoria escolhida e revalida a lista", async () => {
    vi.mocked(updateTransactionCategory).mockResolvedValue(transaction());

    const state = await categorizeTransactionAction(
      TRANSACTION_ID,
      { status: "idle" },
      categorizeForm({ intent: "category", categoryId: CATEGORY_ID }),
    );

    expect(updateTransactionCategory).toHaveBeenCalledWith(
      TRANSACTION_ID,
      { categoryId: CATEGORY_ID },
      { accessToken: "token-ficticio" },
    );
    expect(state).toEqual({ status: "idle" });
    expect(revalidatePath).toHaveBeenCalledWith("/movimentacoes");
  });

  it.each(["uncertain", "unrecognized"] as const)("marca como %s sem categoria", async (intent) => {
    vi.mocked(updateTransactionCategory).mockResolvedValue(transaction());

    await categorizeTransactionAction(
      TRANSACTION_ID,
      { status: "idle" },
      categorizeForm({ intent, categoryId: CATEGORY_ID }),
    );

    expect(updateTransactionCategory).toHaveBeenCalledWith(
      TRANSACTION_ID,
      { categorizationStatus: intent },
      expect.anything(),
    );
  });

  it("exige categoria ao aplicar", async () => {
    const state = await categorizeTransactionAction(
      TRANSACTION_ID,
      { status: "idle" },
      categorizeForm({ intent: "category", categoryId: "" }),
    );

    expect(state).toEqual({ status: "invalid", message: "Escolha uma categoria ativa." });
    expect(updateTransactionCategory).not.toHaveBeenCalled();
  });

  it.each([
    [409, "CATEGORY_ARCHIVED", "arquivada"],
    [404, "CATEGORY_NOT_FOUND", "não está mais disponível"],
    [404, "TRANSACTION_NOT_FOUND", "não está mais disponível"],
    [409, "TRANSACTION_CATEGORIZATION_NOT_ALLOWED", "Transferências"],
  ])("%i %s explica e recarrega a lista", async (status, code, text) => {
    vi.mocked(updateTransactionCategory).mockRejectedValue(problem(status, code));

    const state = await categorizeTransactionAction(
      TRANSACTION_ID,
      { status: "idle" },
      categorizeForm({ intent: "category", categoryId: CATEGORY_ID }),
    );

    expect(state).toMatchObject({ status: "error", message: expect.stringContaining(text) });
    expect(revalidatePath).toHaveBeenCalledWith("/movimentacoes");
  });

  it.each([
    [401, "AUTHENTICATION_REQUIRED"],
    [403, "IDENTITY_CONTEXT_UNAVAILABLE"],
  ])("%i %s pede novo login", async (status, code) => {
    vi.mocked(updateTransactionCategory).mockRejectedValue(problem(status, code));

    const state = await categorizeTransactionAction(
      TRANSACTION_ID,
      { status: "idle" },
      categorizeForm({ intent: "uncertain" }),
    );

    expect(state).toMatchObject({ status: "error", reauth: true });
  });

  it("500 vira mensagem segura", async () => {
    vi.mocked(updateTransactionCategory).mockRejectedValue(problem(500, "INTERNAL_ERROR"));

    const state = await categorizeTransactionAction(
      TRANSACTION_ID,
      { status: "idle" },
      categorizeForm({ intent: "uncertain" }),
    );

    expect(state).toEqual({
      status: "error",
      message: "Não foi possível atualizar a categoria. Tente de novo.",
    });
  });
});
