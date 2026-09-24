"use server";

import { revalidatePath } from "next/cache";
import { redirect, RedirectType } from "next/navigation";
import { PROBLEM_CODES, ProblemDetailsError } from "@/lib/api/errors";
import {
  activateCategoryRule,
  createCategoryRule,
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
