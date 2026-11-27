import type { z } from "zod";
import { categoryRuleInputSchema } from "@/lib/category-rules/schema";
import {
  OPERATORS_BY_FIELD,
  type CategoryRule,
  type CategoryRuleInput,
  type CategoryRuleUpdate,
  type RuleConditionField,
  type RuleOperator,
  type RuleStatus,
} from "@/lib/category-rules/types";

export const FIELD_LABELS: Record<RuleConditionField, string> = {
  description: "Descrição",
  type: "Tipo",
  accountId: "Conta",
};

/** Sujeito da frase: "Se a descrição…", "Se o tipo…", "Se a conta…". */
const FIELD_SUBJECTS: Record<RuleConditionField, string> = {
  description: "a descrição",
  type: "o tipo",
  accountId: "a conta",
};

export const OPERATOR_LABELS: Record<RuleOperator, string> = {
  equals: "é igual a",
  contains: "contém",
  starts_with: "começa com",
  ends_with: "termina com",
};

export const STATUS_LABELS: Record<RuleStatus, string> = {
  active: "Ativa",
  inactive: "Inativa",
  removed: "Removida",
};

export const TYPE_VALUE_LABELS: Record<string, string> = {
  income: "Receita",
  expense: "Despesa",
};

export interface NamedOption {
  id: string;
  name: string;
}

export interface CategoryOption extends NamedOption {
  status: "active" | "archived";
}

export const ACCOUNT_FALLBACK = "Conta indisponível";
export const CATEGORY_FALLBACK = "Categoria indisponível";

function findById<T extends NamedOption>(items: T[] | null, id: string): T | undefined {
  const target = id.toLowerCase();
  return items?.find((item) => item.id.toLowerCase() === target);
}

export function operatorsFor(field: RuleConditionField): readonly RuleOperator[] {
  return OPERATORS_BY_FIELD[field];
}

/** Valor da condição legível; nunca um UUID cru. */
export function conditionValueLabel(
  rule: Pick<CategoryRule, "conditionField" | "conditionValue">,
  accounts: NamedOption[] | null,
): string {
  switch (rule.conditionField) {
    case "description":
      return `“${rule.conditionValue}”`;
    case "type":
      return TYPE_VALUE_LABELS[rule.conditionValue.toLowerCase()] ?? rule.conditionValue;
    case "accountId":
      return findById(accounts, rule.conditionValue)?.name ?? ACCOUNT_FALLBACK;
  }
}

/** Partes da frase, para a interface destacar o valor comparado sem mudar o texto. */
export function ruleConditionParts(
  rule: Pick<CategoryRule, "conditionField" | "conditionOperator" | "conditionValue">,
  accounts: NamedOption[] | null,
): { lead: string; value: string } {
  return {
    lead: `Se ${FIELD_SUBJECTS[rule.conditionField]} ${OPERATOR_LABELS[rule.conditionOperator]}`,
    value: conditionValueLabel(rule, accounts),
  };
}

export function ruleCondition(
  rule: Pick<CategoryRule, "conditionField" | "conditionOperator" | "conditionValue">,
  accounts: NamedOption[] | null,
): string {
  const { lead, value } = ruleConditionParts(rule, accounts);
  return `${lead} ${value}`;
}

export function ruleCategory(
  rule: Pick<CategoryRule, "categoryId">,
  categories: CategoryOption[] | null,
): { name: string; archived: boolean } {
  const category = findById(categories, rule.categoryId);
  if (!category) return { name: CATEGORY_FALLBACK, archived: false };
  return { name: category.name, archived: category.status === "archived" };
}

/** Valores do formulário, sempre texto (como chegam do FormData ou dos campos). */
export interface RuleFormValues {
  conditionField: string;
  conditionOperator: string;
  conditionValue: string;
  categoryId: string;
  priority: string;
}

export type FieldErrors = Partial<Record<keyof RuleFormValues, string>>;

export function valuesFromRule(rule: CategoryRule): RuleFormValues {
  return {
    conditionField: rule.conditionField,
    conditionOperator: rule.conditionOperator,
    conditionValue: rule.conditionValue,
    categoryId: rule.categoryId,
    priority: String(rule.priority),
  };
}

export const EMPTY_RULE_VALUES: RuleFormValues = {
  conditionField: "description",
  conditionOperator: "contains",
  conditionValue: "",
  categoryId: "",
  priority: "0",
};

const FIELD_MESSAGES: Record<keyof RuleFormValues, string> = {
  conditionField: "Escolha o campo da condição.",
  conditionOperator: "Escolha como comparar.",
  conditionValue: "Informe o valor da condição.",
  categoryId: "Escolha uma categoria ativa.",
  priority: "Use um número inteiro entre 0 e 2.147.483.647.",
};

export function fieldMessage(field: string): string | undefined {
  return FIELD_MESSAGES[field as keyof RuleFormValues];
}

/** Inteiro >= 0 digitado como texto; qualquer outra forma é recusada, sem arredondar. */
function parsePriority(raw: string): number | null {
  const value = raw.trim();
  return /^\d{1,10}$/.test(value) ? Number(value) : null;
}

export type ParsedRule = { ok: true; input: CategoryRuleInput } | { ok: false; fieldErrors: FieldErrors };

export function parseRuleForm(values: RuleFormValues): ParsedRule {
  const priority = parsePriority(values.priority);
  const result = categoryRuleInputSchema.safeParse({
    categoryId: values.categoryId,
    conditionField: values.conditionField,
    conditionOperator: values.conditionOperator,
    conditionValue: values.conditionValue,
    priority: priority ?? -1,
  });

  const fieldErrors: FieldErrors = {};
  if (!result.success) {
    for (const issue of result.error.issues as z.core.$ZodIssue[]) {
      const field = String(issue.path[0] ?? "") as keyof RuleFormValues;
      if (!field || fieldErrors[field]) continue;
      // Refinamentos do schema ("é igual a", Receita/Despesa, conta) já vêm em pt-BR.
      fieldErrors[field] = issue.code === "custom" ? `${issue.message}.` : FIELD_MESSAGES[field];
    }
  }
  if (priority === null) fieldErrors.priority = FIELD_MESSAGES.priority;

  if (result.success && Object.keys(fieldErrors).length === 0) {
    return { ok: true, input: result.data };
  }
  return { ok: false, fieldErrors };
}

function sameConditionValue(field: RuleConditionField, left: string, right: string): boolean {
  const normalize = (value: string) => value.replace(/\s+/g, " ").trim();
  // Tipo e conta não diferenciam maiúsculas no backend; descrição é comparada sem caixa
  // na avaliação, mas o valor salvo preserva o que o usuário digitou.
  return field === "description"
    ? normalize(left) === normalize(right)
    : normalize(left).toLowerCase() === normalize(right).toLowerCase();
}

/**
 * PATCH somente com o que mudou. Se qualquer parte da condição muda, campo, operador e
 * valor seguem juntos para o backend validar a combinação. null = nada a salvar.
 */
export function buildRulePatch(
  original: CategoryRule,
  input: CategoryRuleInput,
): CategoryRuleUpdate | null {
  const patch: CategoryRuleUpdate = {};
  const conditionChanged =
    original.conditionField !== input.conditionField ||
    original.conditionOperator !== input.conditionOperator ||
    !sameConditionValue(input.conditionField, original.conditionValue, input.conditionValue);

  if (conditionChanged) {
    patch.conditionField = input.conditionField;
    patch.conditionOperator = input.conditionOperator;
    patch.conditionValue = input.conditionValue;
  }
  if (original.categoryId.toLowerCase() !== input.categoryId.toLowerCase()) {
    patch.categoryId = input.categoryId;
  }
  if (original.priority !== input.priority) patch.priority = input.priority;

  return Object.keys(patch).length > 0 ? patch : null;
}

/** Comparação do formulário bruto com a regra, para habilitar "Salvar" só quando algo mudou. */
export function isDirty(original: CategoryRule, values: RuleFormValues): boolean {
  const base = valuesFromRule(original);
  return (
    base.conditionField !== values.conditionField ||
    base.conditionOperator !== values.conditionOperator ||
    !sameConditionValue(original.conditionField, base.conditionValue, values.conditionValue) ||
    base.categoryId !== values.categoryId ||
    base.priority !== values.priority.trim()
  );
}

/** Trocar o campo mantém o operador só se ele for válido para o novo campo; o valor recomeça. */
export function changeField(values: RuleFormValues, field: RuleConditionField): RuleFormValues {
  const operators = OPERATORS_BY_FIELD[field];
  const operator = operators.includes(values.conditionOperator as RuleOperator)
    ? values.conditionOperator
    : operators[0];
  return { ...values, conditionField: field, conditionOperator: operator, conditionValue: "" };
}

/** Meses que a pessoa escolhe no formulário de aplicar; o servidor aceita até ~800 dias. */
export const APPLY_MAX_MONTHS = 24;
const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type ApplyPeriodResult = { ok: true; from: string; to: string } | { ok: false; message: string };

/**
 * "AAAA-MM" inicial e final (inclusive) viram datas civis: primeiro dia do primeiro mês até o último
 * dia do último. Recusa o que o servidor recusaria, com uma frase clara para a pessoa.
 */
export function monthsToPeriod(fromMonth: string, toMonth: string): ApplyPeriodResult {
  const start = MONTH.exec(fromMonth);
  const end = MONTH.exec(toMonth);
  if (!start || !end) return { ok: false, message: "Escolha o mês inicial e o mês final." };
  const startIndex = Number(start[1]) * 12 + Number(start[2]) - 1;
  const endIndex = Number(end[1]) * 12 + Number(end[2]) - 1;
  if (endIndex < startIndex) return { ok: false, message: "O mês final não pode ser anterior ao inicial." };
  if (endIndex - startIndex + 1 > APPLY_MAX_MONTHS) {
    return { ok: false, message: `Escolha no máximo ${APPLY_MAX_MONTHS} meses por vez.` };
  }
  // Dia 0 do mês seguinte = último dia do mês final.
  const lastDay = new Date(Date.UTC(Number(end[1]), Number(end[2]), 0)).getUTCDate();
  return { ok: true, from: `${fromMonth}-01`, to: `${toMonth}-${String(lastDay).padStart(2, "0")}` };
}

/** Sugestão inicial: os últimos três meses, incluindo o atual. */
export function defaultApplyMonths(now: Date = new Date()): { from: string; to: string } {
  const month = (date: Date) => `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return { from: month(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))), to: month(now) };
}

/** Frase do resultado de aplicar uma regra. */
export function applicationMessage(result: { examined: number; categorized: number; truncated: boolean }): string {
  if (result.categorized === 0) {
    return result.examined === 0
      ? "Não há movimentações sem classificação nesse período."
      : "Nenhuma das movimentações sem classificação nesse período combina com esta regra.";
  }
  const noun = result.categorized === 1 ? "movimentação foi categorizada" : "movimentações foram categorizadas";
  const base = `${result.categorized} ${noun}.`;
  return result.truncated ? `${base} O período é grande: aplique de novo para continuar de onde parou.` : base;
}
