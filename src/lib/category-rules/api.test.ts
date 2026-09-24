import { describe, expect, it, vi } from "vitest";
import {
  activateCategoryRule,
  createCategoryRule,
  deactivateCategoryRule,
  listCategoryRules,
  removeCategoryRule,
  updateCategoryRule,
} from "./api";
import type { CategoryRuleInput } from "./types";

const RULE_ID = "3f1c2b4e-8a6d-4c1e-9b2a-7d5e6f8a9b0c";
const CATEGORY_ID = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const ACCOUNT_ID = "1b2c3d4e-5f60-4718-8a9b-0c1d2e3f4a5b";
const context = { accessToken: "token-ficticio" };

const view = (overrides: Record<string, unknown> = {}) => ({
  id: RULE_ID,
  categoryId: CATEGORY_ID,
  conditionField: "description",
  conditionOperator: "contains",
  conditionValue: "mercado",
  priority: 10,
  status: "active",
  removedAt: null,
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
  ...overrides,
});

function stubFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn(async () => new Response(body === undefined ? "" : JSON.stringify(body), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function lastCall(fetchMock: ReturnType<typeof stubFetch>) {
  const [url, init] = fetchMock.mock.calls.at(-1) as unknown as [string, RequestInit];
  return { url, method: init.method, body: init.body ? JSON.parse(String(init.body)) : undefined };
}

const base: CategoryRuleInput = {
  categoryId: CATEGORY_ID,
  conditionField: "description",
  conditionOperator: "contains",
  conditionValue: "  mercado   central ",
  priority: 10,
};

describe("createCategoryRule", () => {
  it("envia a condicao normalizada", async () => {
    const fetchMock = stubFetch(201, view());
    await createCategoryRule(base, context);
    expect(lastCall(fetchMock).body).toEqual({ ...base, conditionValue: "mercado central" });
  });

  it.each([
    ["description", "equals", "mercado"],
    ["description", "starts_with", "mer"],
    ["description", "ends_with", "ado"],
    ["type", "equals", "income"],
    ["type", "equals", "EXPENSE"],
    ["accountId", "equals", ACCOUNT_ID],
  ] as const)("aceita %s %s %s", async (conditionField, conditionOperator, conditionValue) => {
    stubFetch(201, view());
    await expect(
      createCategoryRule({ ...base, conditionField, conditionOperator, conditionValue }, context),
    ).resolves.toBeDefined();
  });

  it.each([
    ["type", "contains", "income"],
    ["accountId", "starts_with", ACCOUNT_ID],
    ["type", "equals", "transfer"],
    ["accountId", "equals", "conta-principal"],
    ["description", "contains", "   "],
  ] as const)("recusa %s %s %j sem chamar a API", async (conditionField, conditionOperator, conditionValue) => {
    const fetchMock = stubFetch(201, view());
    await expect(
      createCategoryRule({ ...base, conditionField, conditionOperator, conditionValue }, context),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([-1, 1.5, Number.NaN])("recusa prioridade %s", async (priority) => {
    const fetchMock = stubFetch(201, view());
    await expect(createCategoryRule({ ...base, priority }, context)).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("updateCategoryRule", () => {
  it("envia PATCH parcial", async () => {
    const fetchMock = stubFetch(200, view({ priority: 20 }));
    await updateCategoryRule(RULE_ID, { priority: 20 }, context);
    expect(lastCall(fetchMock)).toEqual({
      url: `http://api.test.local/api/v1/category-rules/${RULE_ID}`,
      method: "PATCH",
      body: { priority: 20 },
    });
  });

  it("recusa PATCH vazio e condicao incompativel", async () => {
    const fetchMock = stubFetch(200, view());
    await expect(updateCategoryRule(RULE_ID, {}, context)).rejects.toThrow();
    await expect(
      updateCategoryRule(RULE_ID, { conditionField: "type", conditionOperator: "contains", conditionValue: "income" }, context),
    ).rejects.toThrow();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("ciclo de vida", () => {
  it("usa as rotas de ativar, desativar e remover", async () => {
    const fetchMock = stubFetch(200, view());
    await activateCategoryRule(RULE_ID, context);
    expect(lastCall(fetchMock)).toMatchObject({ url: `http://api.test.local/api/v1/category-rules/${RULE_ID}/activate`, method: "POST" });
    await deactivateCategoryRule(RULE_ID, context);
    expect(lastCall(fetchMock)).toMatchObject({ url: `http://api.test.local/api/v1/category-rules/${RULE_ID}/deactivate`, method: "POST" });

    stubFetch(200, view({ status: "removed", removedAt: "2026-09-21T10:00:00.000Z" }));
    const removed = await removeCategoryRule(RULE_ID, context);
    expect(removed.status).toBe("removed");
  });

  it("lista incluindo regras removidas", async () => {
    stubFetch(200, { items: [view(), view({ status: "removed", removedAt: "2026-09-21T10:00:00.000Z" })], page: 1, pageSize: 20, total: 2 });
    const page = await listCategoryRules({}, context);
    expect(page.items.map((rule) => rule.status)).toEqual(["active", "removed"]);
  });
});
