import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { ProblemDetailsError, type ProblemDetails } from "@/lib/api/errors";
import {
  activateCategoryRule,
  createCategoryRule,
  deactivateCategoryRule,
  removeCategoryRule,
  updateCategoryRule,
} from "@/lib/category-rules/api";
import type { CategoryRule } from "@/lib/category-rules/types";
import {
  activateRuleAction,
  createRuleAction,
  deactivateRuleAction,
  removeRuleAction,
  updateRuleAction,
} from "./actions";

vi.mock("@/lib/auth0", () => ({ auth0: { getAccessToken: vi.fn() } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  RedirectType: { push: "push", replace: "replace" },
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`);
  }),
}));
vi.mock("@/lib/category-rules/api", () => ({
  createCategoryRule: vi.fn(),
  updateCategoryRule: vi.fn(),
  activateCategoryRule: vi.fn(),
  deactivateCategoryRule: vi.fn(),
  removeCategoryRule: vi.fn(),
}));

const RULE_ID = "9f8e7d6c-5b4a-4938-8271-6a5b4c3d2e1f";
const CATEGORY_ID = "7c6b5a49-3827-4165-9a8b-7c6d5e4f3a2b";

const original: CategoryRule = {
  id: RULE_ID,
  categoryId: CATEGORY_ID,
  conditionField: "description",
  conditionOperator: "contains",
  conditionValue: "mercado",
  priority: 10,
  status: "active",
  removedAt: null,
  createdAt: "2026-09-20T12:00:00.000Z",
  updatedAt: "2026-09-20T12:00:00.000Z",
};

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

function form(overrides: Record<string, string> = {}) {
  const data = new FormData();
  const fields = {
    conditionField: "description",
    conditionOperator: "contains",
    conditionValue: "mercado",
    categoryId: CATEGORY_ID,
    priority: "10",
    ...overrides,
  };
  for (const [name, value] of Object.entries(fields)) data.set(name, value);
  return data;
}

beforeEach(() => {
  vi.mocked(auth0.getAccessToken).mockReset().mockResolvedValue({ token: "token-ficticio" } as never);
  for (const fn of [
    createCategoryRule,
    updateCategoryRule,
    activateCategoryRule,
    deactivateCategoryRule,
    removeCategoryRule,
  ]) {
    vi.mocked(fn).mockReset();
  }
  vi.mocked(revalidatePath).mockReset();
});

describe("createRuleAction", () => {
  it("cria com valores normalizados e revalida a lista", async () => {
    vi.mocked(createCategoryRule).mockResolvedValue(original);

    const state = await createRuleAction({ status: "idle" }, form({ conditionValue: "  mercado  " }));

    expect(createCategoryRule).toHaveBeenCalledWith(
      {
        categoryId: CATEGORY_ID,
        conditionField: "description",
        conditionOperator: "contains",
        conditionValue: "mercado",
        priority: 10,
      },
      { accessToken: "token-ficticio" },
    );
    expect(state).toEqual({ status: "success" });
    expect(revalidatePath).toHaveBeenCalledWith("/regras");
  });

  it("recusa prioridade inválida sem chamar a API e devolve o que foi digitado", async () => {
    const state = await createRuleAction({ status: "idle" }, form({ priority: "1.5" }));

    expect(createCategoryRule).not.toHaveBeenCalled();
    expect(state).toMatchObject({
      status: "invalid",
      values: { priority: "1.5" },
      fieldErrors: { priority: expect.stringContaining("número inteiro") },
    });
  });

  it("categoria arquivada limpa a escolha e pede outra", async () => {
    vi.mocked(createCategoryRule).mockRejectedValue(problem(409, "CATEGORY_ARCHIVED"));

    const state = await createRuleAction({ status: "idle" }, form());

    expect(state).toMatchObject({
      status: "invalid",
      values: { categoryId: "" },
      fieldErrors: { categoryId: expect.stringContaining("arquivada") },
    });
  });

  it.each([
    [404, "CATEGORY_NOT_FOUND"],
    [404, "ACCOUNT_NOT_FOUND"],
  ])("%i %s recebe mensagem neutra e recarrega", async (status, code) => {
    vi.mocked(createCategoryRule).mockRejectedValue(problem(status, code));

    const state = await createRuleAction({ status: "idle" }, form());

    expect(state).toMatchObject({ status: "error", message: expect.stringContaining("não está mais disponível") });
    expect(revalidatePath).toHaveBeenCalledWith("/regras");
  });

  it("mapeia errors[].path do 400", async () => {
    vi.mocked(createCategoryRule).mockRejectedValue(
      problem(400, "INVALID_REQUEST", {
        errors: [{ path: "priority", code: "OUT_OF_RANGE", message: "x" }],
      }),
    );

    const state = await createRuleAction({ status: "idle" }, form());

    expect(state).toMatchObject({ status: "invalid", fieldErrors: { priority: expect.any(String) } });
  });

  it("500 vira mensagem segura", async () => {
    vi.mocked(createCategoryRule).mockRejectedValue(problem(500, "INTERNAL_ERROR"));

    const state = await createRuleAction({ status: "idle" }, form());

    expect(state).toMatchObject({ status: "error", message: "Não foi possível criar a regra. Tente de novo." });
  });

  it("sessão expirada pede novo login", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("expired"));

    expect(await createRuleAction({ status: "idle" }, form())).toMatchObject({ reauth: true });
    expect(createCategoryRule).not.toHaveBeenCalled();
  });
});

describe("updateRuleAction", () => {
  it("envia só a prioridade quando só ela muda e redireciona", async () => {
    vi.mocked(updateCategoryRule).mockResolvedValue({ ...original, priority: 30 });

    await expect(
      updateRuleAction(RULE_ID, original, { status: "idle" }, form({ priority: "30" })),
    ).rejects.toThrow("NEXT_REDIRECT /regras?aviso=regra-atualizada");
    expect(updateCategoryRule).toHaveBeenCalledWith(RULE_ID, { priority: 30 }, { accessToken: "token-ficticio" });
  });

  it("não chama a API quando nada mudou", async () => {
    const state = await updateRuleAction(RULE_ID, original, { status: "idle" }, form());

    expect(state).toMatchObject({ status: "unchanged" });
    expect(updateCategoryRule).not.toHaveBeenCalled();
  });

  it("recusa regra original adulterada", async () => {
    const state = await updateRuleAction(RULE_ID, { ...original, id: "outro" }, { status: "idle" }, form());

    expect(state).toMatchObject({ status: "error" });
    expect(updateCategoryRule).not.toHaveBeenCalled();
  });

  it("regra removida em outra aba volta para a lista com aviso", async () => {
    vi.mocked(updateCategoryRule).mockRejectedValue(problem(409, "CATEGORY_RULE_CONFLICT"));

    await expect(
      updateRuleAction(RULE_ID, original, { status: "idle" }, form({ priority: "30" })),
    ).rejects.toThrow("aviso=regra-removida-antes");
  });
});

describe("ciclo de vida", () => {
  it.each([
    ["ativar", activateRuleAction, activateCategoryRule, "regra-ativada"],
    ["desativar", deactivateRuleAction, deactivateCategoryRule, "regra-desativada"],
    ["remover", removeRuleAction, removeCategoryRule, "regra-removida"],
  ] as const)("%s redireciona com aviso após a confirmação da API", async (_, action, api, notice) => {
    vi.mocked(api).mockResolvedValue(original);

    await expect(action(RULE_ID)).rejects.toThrow(`aviso=${notice}`);
    expect(api).toHaveBeenCalledWith(RULE_ID, { accessToken: "token-ficticio" });
  });

  it("ativar regra removida explica que não pode ser reativada", async () => {
    vi.mocked(activateCategoryRule).mockRejectedValue(problem(409, "CATEGORY_RULE_CONFLICT"));

    await expect(activateRuleAction(RULE_ID)).rejects.toThrow("aviso=regra-removida-antes");
  });

  it("regra de outro tenant recebe aviso neutro", async () => {
    vi.mocked(removeCategoryRule).mockRejectedValue(problem(404, "CATEGORY_RULE_NOT_FOUND"));

    await expect(removeRuleAction(RULE_ID)).rejects.toThrow("aviso=regra-indisponivel");
  });

  it("500 mantém o usuário na tela com mensagem segura", async () => {
    vi.mocked(deactivateCategoryRule).mockRejectedValue(problem(500, "INTERNAL_ERROR"));

    expect(await deactivateRuleAction(RULE_ID)).toEqual({
      status: "error",
      message: "Não foi possível desativar a regra. Tente de novo.",
    });
  });

  it.each([
    [401, "AUTHENTICATION_REQUIRED"],
    [403, "IDENTITY_CONTEXT_UNAVAILABLE"],
  ])("%i pede novo login", async (status, code) => {
    vi.mocked(activateCategoryRule).mockRejectedValue(problem(status, code));

    expect(await activateRuleAction(RULE_ID)).toMatchObject({ reauth: true });
  });
});
