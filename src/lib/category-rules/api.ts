import { z } from "zod";
import { apiRequest } from "../api/http-client";
import { pageQuerySchema, type PageQuery } from "../api/pagination";
import { toProblemError } from "../api/problem-error";
import {
  categoryRuleInputSchema,
  categoryRulePageSchema,
  categoryRuleSchema,
  categoryRuleUpdateSchema,
} from "./schema";
import type {
  CategoryRule,
  CategoryRuleInput,
  CategoryRulePage,
  CategoryRuleUpdate,
} from "./types";

export interface CategoryRulesRequestContext {
  accessToken: string;
}

const uuidSchema = z.uuid();
const RULES_PATH = "/category-rules";

/** GET /api/v1/category-rules — inclui removidas; ordem: prioridade desc, mais antiga primeiro. */
export async function listCategoryRules(
  query: PageQuery,
  context: CategoryRulesRequestContext,
): Promise<CategoryRulePage> {
  const { page, pageSize } = pageQuerySchema.parse(query);
  return request(RULES_PATH, { method: "GET", query: { page, pageSize } }, context, categoryRulePageSchema);
}

/** POST /api/v1/category-rules */
export async function createCategoryRule(
  input: CategoryRuleInput,
  context: CategoryRulesRequestContext,
): Promise<CategoryRule> {
  const body = categoryRuleInputSchema.parse(input);
  return request(RULES_PATH, { method: "POST", body }, context, categoryRuleSchema);
}

/** PATCH /api/v1/category-rules/{id} */
export async function updateCategoryRule(
  ruleId: string,
  update: CategoryRuleUpdate,
  context: CategoryRulesRequestContext,
): Promise<CategoryRule> {
  const id = uuidSchema.parse(ruleId);
  const body = categoryRuleUpdateSchema.parse(update);
  return request(`${RULES_PATH}/${id}`, { method: "PATCH", body }, context, categoryRuleSchema);
}

/** POST /api/v1/category-rules/{id}/activate */
export async function activateCategoryRule(
  ruleId: string,
  context: CategoryRulesRequestContext,
): Promise<CategoryRule> {
  const id = uuidSchema.parse(ruleId);
  return request(`${RULES_PATH}/${id}/activate`, { method: "POST" }, context, categoryRuleSchema);
}

/** POST /api/v1/category-rules/{id}/deactivate */
export async function deactivateCategoryRule(
  ruleId: string,
  context: CategoryRulesRequestContext,
): Promise<CategoryRule> {
  const id = uuidSchema.parse(ruleId);
  return request(`${RULES_PATH}/${id}/deactivate`, { method: "POST" }, context, categoryRuleSchema);
}

/**
 * DELETE /api/v1/category-rules/{id} — remocao definitiva do ciclo de vida (sem reativacao).
 * O OpenAPI documenta 200 com a regra removida (a especificacao cita "200/204").
 */
export async function removeCategoryRule(
  ruleId: string,
  context: CategoryRulesRequestContext,
): Promise<CategoryRule> {
  const id = uuidSchema.parse(ruleId);
  return request(`${RULES_PATH}/${id}`, { method: "DELETE" }, context, categoryRuleSchema);
}

async function request<T>(
  path: string,
  options: { method: string; body?: unknown; query?: Record<string, number> },
  context: CategoryRulesRequestContext,
  schema: z.ZodType<T>,
): Promise<T> {
  try {
    const raw = await apiRequest<unknown>(path, { ...options, accessToken: context.accessToken });
    return schema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}
