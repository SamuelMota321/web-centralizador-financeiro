"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { PROBLEM_CODES, ProblemDetailsError } from "@/lib/api/errors";
import { listAllPages } from "@/lib/api/pagination";
import { createCategory, listCategories } from "@/lib/categories/api";
import { RULE_PACK, rulesToCreate, splitSuggestedRules, SUGGESTED_CATEGORIES } from "@/lib/categories/suggestions";
import {
  activateCategoryRule,
  createCategoryRule,
  listCategoryRules,
  deactivateCategoryRule,
  removeCategoryRule,
  updateCategoryRule,
} from "@/lib/category-rules/api";
import { categoryRuleSchema } from "@/lib/category-rules/schema";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";
import type { NoticeKey } from "./notices";
import {
  buildRulePatch,
  fieldMessage,
  type FieldErrors,
  parseRuleForm,
  type RuleFormValues,
} from "./rule-logic";

const REGRAS_PATH = "/regras";
const REAUTH_MESSAGE = "Sua sessão expirou. Entre novamente para continuar.";
const UNAVAILABLE_MESSAGE =
  "A regra, a categoria ou a conta escolhida não foi encontrada ou não está mais disponível. A página foi atualizada.";

export type RuleFormState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "unchanged"; values: RuleFormValues }
  | { status: "invalid"; values: RuleFormValues; fieldErrors: FieldErrors }
  | { status: "error"; values: RuleFormValues; message: string; reauth?: boolean };

export type RuleLifecycleState =
  | { status: "idle" }
  | { status: "error"; message: string; reauth?: boolean };

export type RulePackState =
  | { status: "idle" }
  | { status: "done"; created: number; missingCategories: string[] }
  | { status: "error"; created: number; message: string; reauth?: boolean };

/**
 * Cria as regras do pacote sugerido que faltam ("descrição contém"), uma por vez, só para
 * categorias ativas encontradas pelo nome. Repetir é seguro: regra igual não removida é pulada.
 */
export async function applyRulePackAction(): Promise<RulePackState> {
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", created: 0, message: REAUTH_MESSAGE, reauth: true };
  const context = { accessToken: token };

  let created = 0;
  try {
    const [categories, rules] = await Promise.all([
      listAllPages((query) => listCategories(query, context)),
      listAllPages((query) => listCategoryRules(query, context)),
    ]);
    const { toCreate, missingCategories } = rulesToCreate(categories.items, rules.items);
    for (const rule of toCreate) {
      await createCategoryRule(
        {
          categoryId: rule.categoryId,
          conditionField: "description",
          conditionOperator: "contains",
          conditionValue: rule.conditionValue,
          priority: rule.priority,
        },
        context,
      );
      created += 1;
    }
    revalidatePath(REGRAS_PATH);
    return { status: "done", created, missingCategories };
  } catch (error) {
    if (created > 0) revalidatePath(REGRAS_PATH);
    if (isAuthFailure(error)) return { status: "error", created, message: REAUTH_MESSAGE, reauth: true };
    return {
      status: "error",
      created,
      message: `Não foi possível adicionar o pacote inteiro. ${created > 0 ? `${created} regras entraram; ` : ""}tente de novo para criar as que faltam.`,
    };
  }
}

/**
 * Adiciona um grupo do pacote: cria a categoria sugerida se não houver uma ativa com esse nome
 * e, em seguida, as regras do grupo que faltam. A entrada é só o nome do grupo.
 */
export async function addPackGroupAction(category: string): Promise<RulePackState> {
  const group = RULE_PACK.find((item) => item.category === category);
  if (!group) return { status: "error", created: 0, message: "Este grupo de regras não existe." };
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", created: 0, message: REAUTH_MESSAGE, reauth: true };
  const context = { accessToken: token };

  let created = 0;
  try {
    const [categories, rules] = await Promise.all([
      listAllPages((query) => listCategories(query, context)),
      listAllPages((query) => listCategoryRules(query, context)),
    ]);
    let pool = categories.items;
    if (rulesToCreate(pool, [], [group]).missingCategories.length > 0) {
      pool = [...pool, await createCategory({ name: group.category }, context)];
      revalidatePath("/categorias");
    }
    const { toCreate } = rulesToCreate(pool, rules.items, [group]);
    for (const rule of toCreate) {
      await createCategoryRule(
        {
          categoryId: rule.categoryId,
          conditionField: "description",
          conditionOperator: "contains",
          conditionValue: rule.conditionValue,
          priority: rule.priority,
        },
        context,
      );
      created += 1;
    }
    revalidatePath(REGRAS_PATH);
    return { status: "done", created, missingCategories: [] };
  } catch (error) {
    revalidatePath(REGRAS_PATH);
    if (isAuthFailure(error)) return { status: "error", created, message: REAUTH_MESSAGE, reauth: true };
    if (error instanceof ProblemDetailsError && error.code === PROBLEM_CODES.categoryAlreadyExists) {
      return {
        status: "error",
        created,
        message: `Já existe uma categoria “${group.category}” arquivada, e categorias arquivadas não voltam. Crie suas regras com outra categoria.`,
      };
    }
    return { status: "error", created, message: `Não foi possível adicionar o grupo ${group.category} inteiro. Tente de novo para criar o que falta.` };
  }
}

export type GroupStatusState =
  | { status: "idle" }
  | { status: "done"; changed: number }
  | { status: "error"; changed: number; message: string; reauth?: boolean };

/**
 * Ativa ou desativa, uma por vez, as regras sugeridas de uma categoria do pacote. A entrada é só
 * o nome do grupo: as regras são relidas e reagrupadas aqui, nunca vêm do cliente. Removidas e
 * as que já estão no estado pedido ficam como estão.
 */
export async function setSuggestedGroupStatusAction(category: string, target: "active" | "inactive"): Promise<GroupStatusState> {
  if (!(SUGGESTED_CATEGORIES as readonly string[]).includes(category) || (target !== "active" && target !== "inactive")) {
    return { status: "error", changed: 0, message: "Este grupo de regras não existe." };
  }
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", changed: 0, message: REAUTH_MESSAGE, reauth: true };
  const context = { accessToken: token };

  let changed = 0;
  try {
    const [categories, rules] = await Promise.all([
      listAllPages((query) => listCategories(query, context)),
      listAllPages((query) => listCategoryRules(query, context)),
    ]);
    const group = splitSuggestedRules(rules.items, categories.items).suggested.find((item) => item.category === category);
    const pending = (group?.rules ?? []).filter((rule) => rule.status !== "removed" && rule.status !== target);
    const operation = target === "active" ? activateCategoryRule : deactivateCategoryRule;
    for (const rule of pending) {
      await operation(rule.id, context);
      changed += 1;
    }
    revalidatePath(REGRAS_PATH);
    return { status: "done", changed };
  } catch (error) {
    if (changed > 0) revalidatePath(REGRAS_PATH);
    if (isAuthFailure(error)) return { status: "error", changed, message: REAUTH_MESSAGE, reauth: true };
    const verb = target === "active" ? "ativar" : "desativar";
    return {
      status: "error",
      changed,
      message: `Não foi possível ${verb} o grupo inteiro. ${changed > 0 ? `${changed} ${changed === 1 ? "regra mudou" : "regras mudaram"}; ` : ""}tente de novo para as que faltam.`,
    };
  }
}

export async function createRuleAction(
  _previous: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const values = readValues(formData);
  const parsed = parseRuleForm(values);
  if (!parsed.ok) return { status: "invalid", values, fieldErrors: parsed.fieldErrors };

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", values, message: REAUTH_MESSAGE, reauth: true };

  try {
    await createCategoryRule(parsed.input, { accessToken: token });
  } catch (error) {
    return formFailure(error, values, "Não foi possível criar a regra.");
  }

  revalidatePath(REGRAS_PATH);
  return { status: "success" };
}

/**
 * `ruleId` e `original` chegam via `.bind` no cliente e são tratados como entrada não
 * confiável: validados aqui e reverificados pelo backend (tenant e estado).
 */
export async function updateRuleAction(
  ruleId: string,
  original: unknown,
  _previous: RuleFormState,
  formData: FormData,
): Promise<RuleFormState> {
  const values = readValues(formData);
  const source = categoryRuleSchema.safeParse(original);
  if (!source.success || source.data.id !== ruleId) {
    return { status: "error", values, message: "Não foi possível salvar a regra." };
  }

  const parsed = parseRuleForm(values);
  if (!parsed.ok) return { status: "invalid", values, fieldErrors: parsed.fieldErrors };

  const patch = buildRulePatch(source.data, parsed.input);
  if (!patch) return { status: "unchanged", values };

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", values, message: REAUTH_MESSAGE, reauth: true };

  let notice: NoticeKey = "regra-atualizada";
  try {
    await updateCategoryRule(ruleId, patch, { accessToken: token });
  } catch (error) {
    const redirectTo = lifecycleNotice(error);
    if (!redirectTo) return formFailure(error, values, "Não foi possível salvar a regra.");
    notice = redirectTo;
  }

  // `redirect` lança exceção: fica fora do try, conforme a documentação do Next.
  return goToRegras(notice);
}

export async function activateRuleAction(ruleId: string): Promise<RuleLifecycleState> {
  return lifecycle(ruleId, activateCategoryRule, "regra-ativada", "Não foi possível ativar a regra.");
}

export async function deactivateRuleAction(ruleId: string): Promise<RuleLifecycleState> {
  return lifecycle(
    ruleId,
    deactivateCategoryRule,
    "regra-desativada",
    "Não foi possível desativar a regra.",
  );
}

export async function removeRuleAction(ruleId: string): Promise<RuleLifecycleState> {
  return lifecycle(ruleId, removeCategoryRule, "regra-removida", "Não foi possível remover a regra.");
}

async function lifecycle(
  ruleId: string,
  operation: (id: string, context: { accessToken: string }) => Promise<unknown>,
  success: NoticeKey,
  fallback: string,
): Promise<RuleLifecycleState> {
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: REAUTH_MESSAGE, reauth: true };

  let notice = success;
  try {
    await operation(ruleId, { accessToken: token });
  } catch (error) {
    if (isAuthFailure(error)) return { status: "error", message: REAUTH_MESSAGE, reauth: true };
    const redirectTo = lifecycleNotice(error);
    if (!redirectTo) return { status: "error", message: `${fallback} Tente de novo.` };
    notice = redirectTo;
  }

  return goToRegras(notice);
}

/** Regra inexistente/de outro tenant ou já removida: volta para a lista com aviso neutro. */
function lifecycleNotice(error: unknown): NoticeKey | null {
  if (!(error instanceof ProblemDetailsError)) return null;
  if (error.code === PROBLEM_CODES.categoryRuleNotFound) return "regra-indisponivel";
  if (error.code === PROBLEM_CODES.categoryRuleConflict) return "regra-removida-antes";
  return null;
}

function readValues(formData: FormData): RuleFormValues {
  const read = (name: string) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    conditionField: read("conditionField"),
    conditionOperator: read("conditionOperator"),
    conditionValue: read("conditionValue"),
    categoryId: read("categoryId"),
    priority: read("priority"),
  };
}

function formFailure(error: unknown, values: RuleFormValues, fallback: string): RuleFormState {
  if (isAuthFailure(error)) {
    return { status: "error", values, message: REAUTH_MESSAGE, reauth: true };
  }
  if (error instanceof ProblemDetailsError) {
    switch (error.code) {
      case PROBLEM_CODES.categoryArchived:
        revalidatePath(REGRAS_PATH);
        return {
          status: "invalid",
          values: { ...values, categoryId: "" },
          fieldErrors: { categoryId: "A categoria escolhida foi arquivada. Escolha uma categoria ativa." },
        };
      case PROBLEM_CODES.categoryNotFound:
      case PROBLEM_CODES.accountNotFound:
      case PROBLEM_CODES.categoryRuleNotFound:
        revalidatePath(REGRAS_PATH);
        return { status: "error", values, message: UNAVAILABLE_MESSAGE };
    }
    if (error.status === 400) {
      const fieldErrors: FieldErrors = {};
      for (const item of error.problem.errors ?? []) {
        const message = fieldMessage(item.path);
        if (message) fieldErrors[item.path as keyof RuleFormValues] ??= message;
      }
      if (Object.keys(fieldErrors).length > 0) return { status: "invalid", values, fieldErrors };
      return { status: "error", values, message: "Revise a condição da regra e tente de novo." };
    }
  }
  return { status: "error", values, message: `${fallback} Tente de novo.` };
}

function goToRegras(notice: NoticeKey): never {
  revalidatePath(REGRAS_PATH);
  redirect(`${REGRAS_PATH}?aviso=${notice}`, RedirectType.replace);
}
