import type { CategoryRule, RuleStatus } from "@/lib/category-rules/types";
import { normalizeDescription } from "@/lib/category-rules/evaluation";
import type { Transaction } from "@/lib/transactions/types";
import { conditionValueLabel, type NamedOption } from "./rule-logic";

// ---------- Parâmetros da URL ----------

export const STATUS_FILTERS = { todas: "Todas", ativas: "Ativas", inativas: "Inativas" } as const;
export type StatusFilter = keyof typeof STATUS_FILTERS;

export const RULE_SORTS = { aplicacao: "Ordem de aplicação", recentes: "Mais recentes", categoria: "Categoria" } as const;
export type RuleSort = keyof typeof RULE_SORTS;

export interface RuleParams {
  status: StatusFilter;
  search: string;
  sort: RuleSort;
  /** Abre o grupo de removidas (vindo do atalho do resumo). */
  showRemoved: boolean;
}

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Entrada não confiável: valor desconhecido volta ao padrão. */
export function parseRuleParams(params: {
  status?: string | string[];
  busca?: string | string[];
  ordem?: string | string[];
  removidas?: string | string[];
}): RuleParams {
  const status = firstParam(params.status);
  const sort = firstParam(params.ordem);
  return {
    status: Object.prototype.hasOwnProperty.call(STATUS_FILTERS, status) ? (status as StatusFilter) : "todas",
    search: firstParam(params.busca).trim().slice(0, 80),
    sort: Object.prototype.hasOwnProperty.call(RULE_SORTS, sort) ? (sort as RuleSort) : "aplicacao",
    showRemoved: firstParam(params.removidas) === "1",
  };
}

export function rulesHref(params: RuleParams, overrides: Partial<RuleParams> = {}): string {
  const next = { ...params, ...overrides };
  const query = new URLSearchParams();
  if (next.status !== "todas") query.set("status", next.status);
  if (next.search) query.set("busca", next.search);
  if (next.sort !== "aplicacao") query.set("ordem", next.sort);
  if (next.showRemoved) query.set("removidas", "1");
  const text = query.toString();
  return text ? `/regras?${text}` : "/regras";
}

// ---------- Contagens e filtro ----------

export function statusCounts(rules: readonly { status: RuleStatus }[]): Record<RuleStatus, number> {
  const counts: Record<RuleStatus, number> = { active: 0, inactive: 0, removed: 0 };
  for (const rule of rules) counts[rule.status] += 1;
  return counts;
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/**
 * Filtro por status (removidas nunca entram: têm grupo próprio) e busca sem acento no valor
 * comparado e no nome da categoria. Mantém a ordem recebida (a do backend).
 */
export function filterRules<R extends Pick<CategoryRule, "status" | "categoryId" | "conditionField" | "conditionValue">>(
  rules: readonly R[],
  params: RuleParams,
  categoryName: (id: string) => string,
  accounts: NamedOption[] | null,
): R[] {
  const term = normalize(params.search.trim());
  return rules.filter((rule) => {
    if (rule.status === "removed") return false;
    if (params.status === "ativas" && rule.status !== "active") return false;
    if (params.status === "inativas" && rule.status !== "inactive") return false;
    if (!term) return true;
    return normalize(`${conditionValueLabel(rule, accounts)} ${categoryName(rule.categoryId)}`).includes(term);
  });
}

/**
 * Ordena a lista: "aplicação" mantém a ordem do backend (prioridade, depois a mais antiga);
 * "recentes" pela criação; "categoria" pelo nome e, dentro dela, a ordem do backend.
 */
export function sortRules<R extends Pick<CategoryRule, "categoryId" | "createdAt">>(
  rules: readonly R[],
  sort: RuleSort,
  categoryName: (id: string) => string,
): R[] {
  if (sort === "aplicacao") return [...rules];
  if (sort === "recentes") return [...rules].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return rules
    .map((rule, index) => ({ rule, index }))
    .sort((a, b) => categoryName(a.rule.categoryId).localeCompare(categoryName(b.rule.categoryId), "pt-BR") || a.index - b.index)
    .map(({ rule }) => rule);
}

// ---------- Simulador: atalhos com dados reais ----------

/**
 * Descrições dos lançamentos recentes que ficaram sem categoria, sem repetir: bons casos para
 * testar e virar regra. Só receitas e despesas lançadas (transferências não usam regras).
 */
export function uncategorizedDescriptions(transactions: readonly Transaction[], max = 6): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const transaction of transactions) {
    if (result.length >= max) break;
    if (transaction.status !== "posted" || transaction.type === "transfer") continue;
    if (transaction.categorizationStatus === "categorized" || transaction.categorizationStatus === "not_applicable") continue;
    const description = normalizeDescription(transaction.description);
    if (!description) continue;
    const key = description.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(description);
  }
  return result;
}

/**
 * Palavras da descrição que dariam um bom "descrição contém": letras (com acento), três ou mais,
 * sem repetir e sem palavras de ligação. Em minúsculas, que é como o backend compara.
 */
const STOP_WORDS = new Set(["com", "das", "dos", "para", "por", "pela", "pelo", "sem", "uma", "the", "and", "pix", "compra", "pagamento", "recebido", "enviado"]);

export function termSuggestions(description: string, max = 4): string[] {
  const words = description.toLowerCase().match(/\p{L}{3,}/gu) ?? [];
  const result: string[] = [];
  for (const word of words) {
    if (STOP_WORDS.has(word) || result.includes(word)) continue;
    result.push(word);
    if (result.length >= max) break;
  }
  return result;
}
