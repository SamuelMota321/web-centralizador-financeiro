import { CATEGORY_OTHER } from "@/components/charts/category-colors";
import { formatShare, fromCents, toCents } from "@/components/charts/model";
import type { Transaction } from "@/lib/transactions/types";
import { monthsBefore, PERIOD_PRESETS, type PeriodPreset } from "../movimentacoes/presentation";

// ---------- Parâmetros da URL ----------

export const DEFAULT_PERIOD: PeriodPreset = "1m";
export const SORTS = { uso: "Mais usadas", nome: "Nome (A–Z)", recentes: "Mais recentes" } as const;
export type CategorySort = keyof typeof SORTS;
const PRESET_MONTHS: Record<PeriodPreset, number> = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };

export interface CategoryParams {
  period: PeriodPreset;
  search: string;
  sort: CategorySort;
}

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function hasKey<T extends object>(options: T, value: string): value is Extract<keyof T, string> {
  return Object.prototype.hasOwnProperty.call(options, value);
}

/** Entrada não confiável: valor desconhecido volta ao padrão. */
export function parseCategoryParams(params: {
  periodo?: string | string[];
  busca?: string | string[];
  ordem?: string | string[];
}): CategoryParams {
  const period = firstParam(params.periodo);
  const sort = firstParam(params.ordem);
  return {
    period: hasKey(PERIOD_PRESETS, period) ? period : DEFAULT_PERIOD,
    search: firstParam(params.busca).trim().slice(0, 80),
    sort: hasKey(SORTS, sort) ? sort : "uso",
  };
}

export function categoriesHref(params: CategoryParams, overrides: Partial<CategoryParams> = {}): string {
  const next = { ...params, ...overrides };
  const query = new URLSearchParams();
  if (next.period !== DEFAULT_PERIOD) query.set("periodo", next.period);
  if (next.search) query.set("busca", next.search);
  if (next.sort !== "uso") query.set("ordem", next.sort);
  const text = query.toString();
  return text ? `/categorias?${text}` : "/categorias";
}

/** Período inclusivo: N meses antes de hoje até hoje (mesma regra de Movimentações). */
export function periodRange(period: PeriodPreset, today: string): { since: string; until: string } {
  return { since: monthsBefore(today, PRESET_MONTHS[period]), until: today };
}

// ---------- Uso por categoria no período ----------

export interface CategoryUsage {
  expense: bigint;
  income: bigint;
  /** Lançamentos categorizados (receitas e despesas) no período. */
  count: number;
  /** Acumulado diário do fluxo principal (despesa; receita se não houver despesa). */
  series: string[];
}

export interface PeriodUsage {
  byCategory: Map<string, CategoryUsage>;
  totalExpense: bigint;
  /** Despesas sem categoria: entram no total e aparecem na composição, nunca somem. */
  uncategorizedExpense: bigint;
  uncategorizedCount: number;
}

function daysBetween(since: string, until: string): number {
  const [y1, m1, d1] = since.split("-").map(Number);
  const [y2, m2, d2] = until.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Reduz para no máximo `max` pontos a intervalos iguais, mantendo primeiro e último. */
export function downsample<T>(values: readonly T[], max = 30): T[] {
  if (values.length <= max) return [...values];
  const step = (values.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, index) => values[Math.round(index * step)]);
}

/**
 * Soma em centavos as receitas e despesas lançadas do período, por categoria. Transferências e
 * estornos ficam fora. Só deve ser chamada com o período lido por inteiro.
 */
export function periodUsage(transactions: readonly Transaction[], since: string, until: string): PeriodUsage {
  const days = daysBetween(since, until) + 1;
  const daily = new Map<string, { expense: bigint[]; income: bigint[]; count: number }>();
  let totalExpense = BigInt(0);
  let uncategorizedExpense = BigInt(0);
  let uncategorizedCount = 0;

  for (const transaction of transactions) {
    if (transaction.status !== "posted" || transaction.type === "transfer") continue;
    if (transaction.occurredOn < since || transaction.occurredOn > until) continue;
    const cents = toCents(transaction.amount);
    if (transaction.type === "expense") totalExpense += cents;
    const categoryId = transaction.categorizationStatus === "categorized" ? transaction.categoryId : null;
    if (!categoryId) {
      if (transaction.type === "expense") {
        uncategorizedExpense += cents;
        uncategorizedCount += 1;
      }
      continue;
    }
    let entry = daily.get(categoryId);
    if (!entry) {
      entry = { expense: Array.from({ length: days }, () => BigInt(0)), income: Array.from({ length: days }, () => BigInt(0)), count: 0 };
      daily.set(categoryId, entry);
    }
    const index = daysBetween(since, transaction.occurredOn);
    if (transaction.type === "expense") entry.expense[index] += cents;
    else entry.income[index] += cents;
    entry.count += 1;
  }

  const byCategory = new Map<string, CategoryUsage>();
  for (const [categoryId, entry] of daily) {
    const expense = entry.expense.reduce((sum, value) => sum + value, BigInt(0));
    const income = entry.income.reduce((sum, value) => sum + value, BigInt(0));
    const flow = expense > BigInt(0) ? entry.expense : entry.income;
    let running = BigInt(0);
    const series = downsample(flow.map((value) => fromCents((running += value))));
    byCategory.set(categoryId, { expense, income, count: entry.count, series });
  }
  return { byCategory, totalExpense, uncategorizedExpense, uncategorizedCount };
}

/** Texto do cartão: gasto quando há despesa; recebido quando só há receita. */
export function usageFigure(usage: CategoryUsage | undefined, totalExpense: bigint): {
  kind: "gasto" | "recebido" | "nenhum";
  value: string | null;
  share: string | null;
} {
  if (!usage || (usage.expense === BigInt(0) && usage.income === BigInt(0))) return { kind: "nenhum", value: null, share: null };
  if (usage.expense > BigInt(0)) {
    return { kind: "gasto", value: fromCents(usage.expense), share: formatShare(fromCents(usage.expense), fromCents(totalExpense)) };
  }
  return { kind: "recebido", value: fromCents(usage.income), share: null };
}

// ---------- Composição das despesas ----------

export interface CompositionItem {
  id: string;
  label: string;
  value: string;
  share: string;
  color: string;
  /** "Sem categoria": hachurado, sempre por último, nunca diluído em "Outras". */
  uncategorized?: boolean;
}

/**
 * Maiores despesas por categoria; o restante vira "Outras" (neutra) e as despesas sem categoria
 * ficam visíveis à parte. As partes somam o total de despesas do período.
 */
export function composition(
  usage: PeriodUsage,
  names: ReadonlyMap<string, string>,
  colors: ReadonlyMap<string, string>,
  top = 5,
): CompositionItem[] {
  if (usage.totalExpense <= BigInt(0)) return [];
  const total = fromCents(usage.totalExpense);
  const ranked = [...usage.byCategory.entries()]
    .filter(([, item]) => item.expense > BigInt(0))
    .sort((a, b) => (b[1].expense > a[1].expense ? 1 : b[1].expense < a[1].expense ? -1 : 0));
  const head = ranked.slice(0, top);
  const rest = ranked.slice(top).reduce((sum, [, item]) => sum + item.expense, BigInt(0));
  const item = (id: string, label: string, cents: bigint, color: string, uncategorized?: boolean): CompositionItem => ({
    id,
    label,
    value: fromCents(cents),
    share: formatShare(fromCents(cents), total) ?? "0,0%",
    color,
    uncategorized,
  });
  const items = head.map(([id, value]) => item(id, names.get(id) ?? "Categoria indisponível", value.expense, colors.get(id) ?? CATEGORY_OTHER));
  if (rest > BigInt(0)) items.push(item("outras", "Outras", rest, CATEGORY_OTHER));
  if (usage.uncategorizedExpense > BigInt(0)) items.push(item("sem-categoria", "Sem categoria", usage.uncategorizedExpense, CATEGORY_OTHER, true));
  return items;
}

// ---------- Lista ----------

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

/** Busca sem acento e sem caixa; ordena por uso (gasto, depois quantidade), nome ou criação. */
export function arrangeCategories<C extends { id: string; name: string; createdAt: string }>(
  categories: readonly C[],
  usage: ReadonlyMap<string, CategoryUsage> | null,
  search: string,
  sort: CategorySort,
): C[] {
  const term = normalize(search.trim());
  const filtered = term ? categories.filter((category) => normalize(category.name).includes(term)) : [...categories];
  const byName = (a: C, b: C) => a.name.localeCompare(b.name, "pt-BR");
  if (sort === "nome") return filtered.sort(byName);
  if (sort === "recentes") return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return filtered.sort((a, b) => {
    const ua = usage?.get(a.id);
    const ub = usage?.get(b.id);
    const weight = (u: CategoryUsage | undefined) => (u ? u.expense + u.income : BigInt(0));
    const diff = weight(ub) - weight(ua);
    if (diff !== BigInt(0)) return diff > BigInt(0) ? 1 : -1;
    return (ub?.count ?? 0) - (ua?.count ?? 0) || byName(a, b);
  });
}

/** Regras ativas ou inativas (não removidas) por categoria. */
export function rulesPerCategory(rules: readonly { categoryId: string; status: string }[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const rule of rules) {
    if (rule.status === "removed") continue;
    counts.set(rule.categoryId, (counts.get(rule.categoryId) ?? 0) + 1);
  }
  return counts;
}

export function periodLabel(period: PeriodPreset): string {
  return PERIOD_PRESETS[period];
}
