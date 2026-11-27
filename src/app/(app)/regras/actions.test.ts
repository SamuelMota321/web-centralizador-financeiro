import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { auth0 } from "@/lib/auth0";
import { ProblemDetailsError, type ProblemDetails } from "@/lib/api/errors";
import { createCategory, listCategories } from "@/lib/categories/api";
import {
  activateCategoryRule,
  applyCategoryRule,
  createCategoryRule,
  deactivateCategoryRule,
  listCategoryRules,
  removeCategoryRule,
  updateCategoryRule,
} from "@/lib/category-rules/api";
import type { CategoryRule } from "@/lib/category-rules/types";
import {
  activateRuleAction,
  addPackGroupAction,
  applyRuleAction,
  applyRulePackAction,
  createRuleAction,
  deactivateRuleAction,
  removeRuleAction,
  setSuggestedGroupStatusAction,
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
vi.mock("@/lib/categories/api", () => ({ listCategories: vi.fn(), createCategory: vi.fn() }));
vi.mock("@/lib/category-rules/api", () => ({
  listCategoryRules: vi.fn(),
  createCategoryRule: vi.fn(),
  updateCategoryRule: vi.fn(),
  activateCategoryRule: vi.fn(),
  applyCategoryRule: vi.fn(),
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
    expect(state).toEqual({ status: "success", ruleId: RULE_ID });
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

describe("applyRulePackAction", () => {
  const transporte = { id: CATEGORY_ID, name: "Transporte", source: "user" as const, status: "active" as const, archivedAt: null, createdAt: "2026-09-20T12:00:00.000Z", updatedAt: "2026-09-20T12:00:00.000Z" };

  beforeEach(() => {
    vi.mocked(createCategoryRule).mockReset().mockResolvedValue(original);
    vi.mocked(listCategories).mockReset().mockResolvedValue({ items: [transporte], page: 1, pageSize: 100, total: 1 });
    vi.mocked(listCategoryRules).mockReset().mockResolvedValue({
      items: [{ ...original, conditionValue: "uber" }],
      page: 1,
      pageSize: 100,
      total: 1,
    });
  });

  it("cria as regras que faltam para categorias ativas e lista as categorias ausentes", async () => {
    const result = await applyRulePackAction();

    expect(result.status).toBe("done");
    if (result.status !== "done") return;
    expect(result.missingCategories).toContain("Alimentação");
    expect(createCategoryRule).not.toHaveBeenCalledWith(expect.objectContaining({ conditionValue: "uber" }), expect.anything());
    expect(createCategoryRule).toHaveBeenCalledWith(
      { categoryId: CATEGORY_ID, conditionField: "description", conditionOperator: "contains", conditionValue: "99app", priority: 10 },
      { accessToken: "token-ficticio" },
    );
    expect(result.created).toBe(vi.mocked(createCategoryRule).mock.calls.length);
  });

  it("cria em lotes de 5: o lote com falha termina, conta as que entraram e não começa outro", async () => {
    vi.mocked(createCategoryRule).mockResolvedValueOnce(original).mockRejectedValueOnce(new Error("falha")).mockResolvedValue(original);
    expect(await applyRulePackAction()).toMatchObject({ status: "error", created: 4 });
    expect(createCategoryRule).toHaveBeenCalledTimes(5);
  });

  it("pede para entrar de novo sem sessão", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("sem sessão"));
    expect(await applyRulePackAction()).toMatchObject({ status: "error", reauth: true, created: 0 });
  });
});

describe("setSuggestedGroupStatusAction", () => {
  const transporte = { id: CATEGORY_ID, name: "Transporte", source: "user" as const, status: "active" as const, archivedAt: null, createdAt: "2026-09-20T12:00:00.000Z", updatedAt: "2026-09-20T12:00:00.000Z" };
  const rule = (id: string, conditionValue: string, status: CategoryRule["status"]) => ({
    ...original,
    id,
    conditionValue,
    status,
    removedAt: status === "removed" ? "2026-09-21T12:00:00.000Z" : null,
  });

  beforeEach(() => {
    vi.mocked(deactivateCategoryRule).mockReset().mockResolvedValue(original);
    vi.mocked(activateCategoryRule).mockReset().mockResolvedValue(original);
    vi.mocked(listCategories).mockReset().mockResolvedValue({ items: [transporte], page: 1, pageSize: 100, total: 1 });
    vi.mocked(listCategoryRules).mockReset().mockResolvedValue({
      items: [rule("r-uber", "uber", "active"), rule("r-99", "99app", "inactive"), rule("r-ped", "pedágio", "removed"), rule("r-minha", "uber centro", "active")],
      page: 1,
      pageSize: 100,
      total: 4,
    });
  });

  it("desativa só as sugeridas do grupo que estão ativas (nem removidas, nem as da pessoa)", async () => {
    expect(await setSuggestedGroupStatusAction("Transporte", "inactive")).toEqual({ status: "done", changed: 1 });
    expect(deactivateCategoryRule).toHaveBeenCalledTimes(1);
    expect(deactivateCategoryRule).toHaveBeenCalledWith("r-uber", { accessToken: "token-ficticio" });
    expect(revalidatePath).toHaveBeenCalledWith("/regras");
  });

  it("ativa as inativas do grupo", async () => {
    expect(await setSuggestedGroupStatusAction("Transporte", "active")).toEqual({ status: "done", changed: 1 });
    expect(activateCategoryRule).toHaveBeenCalledWith("r-99", { accessToken: "token-ficticio" });
  });

  it("recusa grupo ou estado desconhecido sem chamar a API", async () => {
    expect(await setSuggestedGroupStatusAction("Qualquer", "active")).toMatchObject({ status: "error" });
    expect(await setSuggestedGroupStatusAction("Transporte", "removed" as "active")).toMatchObject({ status: "error" });
    expect(listCategoryRules).not.toHaveBeenCalled();
  });

  it("falha no meio informa quantas mudaram", async () => {
    vi.mocked(listCategoryRules).mockResolvedValue({
      items: [rule("r-uber", "uber", "active"), rule("r-99", "99app", "active")],
      page: 1,
      pageSize: 100,
      total: 2,
    });
    vi.mocked(deactivateCategoryRule).mockResolvedValueOnce(original).mockRejectedValueOnce(new Error("falha"));
    expect(await setSuggestedGroupStatusAction("Transporte", "inactive")).toMatchObject({ status: "error", changed: 1 });
  });
});

describe("addPackGroupAction", () => {
  const category = (id: string, name: string, status: "active" | "archived" = "active") => ({
    id,
    name,
    source: "user" as const,
    status,
    archivedAt: status === "archived" ? "2026-09-21T12:00:00.000Z" : null,
    createdAt: "2026-09-20T12:00:00.000Z",
    updatedAt: "2026-09-20T12:00:00.000Z",
  });

  beforeEach(() => {
    vi.mocked(createCategoryRule).mockReset().mockResolvedValue(original);
    vi.mocked(createCategory).mockReset().mockResolvedValue(category("c-saude", "Saúde"));
    vi.mocked(listCategories).mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
    vi.mocked(listCategoryRules).mockReset().mockResolvedValue({ items: [], page: 1, pageSize: 100, total: 0 });
  });

  it("cria a categoria que falta e só as regras daquele grupo", async () => {
    const result = await addPackGroupAction("Saúde");
    expect(createCategory).toHaveBeenCalledWith({ name: "Saúde" }, { accessToken: "token-ficticio" });
    const values = vi.mocked(createCategoryRule).mock.calls.map(([input]) => input.conditionValue);
    expect(values).toContain("drogaria");
    expect(values).not.toContain("uber");
    expect(new Set(vi.mocked(createCategoryRule).mock.calls.map(([input]) => input.categoryId))).toEqual(new Set(["c-saude"]));
    expect(result).toEqual({ status: "done", created: values.length, missingCategories: [] });
  });

  it("usa a categoria ativa existente (sem acento também) e não recria regra igual", async () => {
    vi.mocked(listCategories).mockResolvedValue({ items: [category("c-s", "Saude")], page: 1, pageSize: 100, total: 1 });
    vi.mocked(listCategoryRules).mockResolvedValue({
      items: [{ ...original, categoryId: "c-s", conditionValue: "drogaria" }],
      page: 1,
      pageSize: 100,
      total: 1,
    });
    await addPackGroupAction("Saúde");
    expect(createCategory).not.toHaveBeenCalled();
    expect(createCategoryRule).not.toHaveBeenCalledWith(expect.objectContaining({ conditionValue: "drogaria" }), expect.anything());
  });

  it("categoria arquivada com o mesmo nome explica que não volta", async () => {
    vi.mocked(listCategories).mockResolvedValue({ items: [category("c-x", "Saúde", "archived")], page: 1, pageSize: 100, total: 1 });
    vi.mocked(createCategory).mockRejectedValue(problem(409, "CATEGORY_ALREADY_EXISTS"));
    const result = await addPackGroupAction("Saúde");
    expect(result).toMatchObject({ status: "error", created: 0 });
    expect(result.status === "error" && result.message).toContain("arquivada");
  });

  it("recusa grupo desconhecido", async () => {
    expect(await addPackGroupAction("Viagens")).toMatchObject({ status: "error" });
    expect(listCategories).not.toHaveBeenCalled();
  });
});

describe("applyRuleAction", () => {
  function monthsForm(fromMonth: string, toMonth: string) {
    const data = new FormData();
    data.set("fromMonth", fromMonth);
    data.set("toMonth", toMonth);
    return data;
  }
  const application = { ruleId: RULE_ID, from: "2026-09-01", to: "2026-11-30", examined: 4, categorized: 3, truncated: false };

  it("converte os meses em datas, aplica e atualiza Movimentações e Categorias", async () => {
    vi.mocked(applyCategoryRule).mockResolvedValue(application);

    const state = await applyRuleAction(RULE_ID, { status: "idle" }, monthsForm("2026-09", "2026-11"));

    expect(applyCategoryRule).toHaveBeenCalledWith(
      RULE_ID,
      { from: "2026-09-01", to: "2026-11-30" },
      { accessToken: "token-ficticio" },
    );
    expect(state).toEqual({ status: "done", message: "3 movimentações foram categorizadas.", categorized: 3 });
    expect(revalidatePath).toHaveBeenCalledWith("/movimentacoes");
    expect(revalidatePath).toHaveBeenCalledWith("/categorias");
  });

  it("recusa período inválido sem chamar a API", async () => {
    const state = await applyRuleAction(RULE_ID, { status: "idle" }, monthsForm("2026-11", "2026-09"));

    expect(state).toMatchObject({ status: "invalid", fromMonth: "2026-11", toMonth: "2026-09" });
    expect(applyCategoryRule).not.toHaveBeenCalled();
  });

  it("pede novo login quando a sessão expirou", async () => {
    vi.mocked(auth0.getAccessToken).mockRejectedValue(new Error("sem sessão"));

    const state = await applyRuleAction(RULE_ID, { status: "idle" }, monthsForm("2026-09", "2026-09"));

    expect(state).toMatchObject({ status: "error", reauth: true });
    expect(applyCategoryRule).not.toHaveBeenCalled();
  });

  it("traduz 404 e 409 sem mostrar o detail técnico", async () => {
    vi.mocked(applyCategoryRule).mockRejectedValueOnce(problem(404, "CATEGORY_RULE_NOT_FOUND"));
    const notFound = await applyRuleAction(RULE_ID, { status: "idle" }, monthsForm("2026-09", "2026-09"));
    expect(notFound).toMatchObject({ status: "error", message: "A regra não foi encontrada. Atualize a página." });

    vi.mocked(applyCategoryRule).mockRejectedValueOnce(problem(409, "CATEGORY_ARCHIVED"));
    const conflict = await applyRuleAction(RULE_ID, { status: "idle" }, monthsForm("2026-09", "2026-09"));
    expect(conflict).toMatchObject({ status: "error" });
    expect(JSON.stringify(conflict)).not.toContain("Technical detail");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
