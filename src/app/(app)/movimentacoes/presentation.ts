import { fromCents, toCents } from "@/components/charts/model";
import { isRealCivilDate } from "@/lib/civil-date";
import { formatMoney } from "@/lib/money";
import type { CategoryStatus } from "@/lib/categories/types";
import type { Transaction } from "@/lib/transactions/types";

export const PAGE_SIZE = 20;

/** Conta ausente da lista de ativas (arquivada) ou lista indisponivel: nunca exibir o UUID. */
export const ACCOUNT_FALLBACK_LABEL = "Conta indisponível";

export interface AccountOption {
  id: string;
  name: string;
}

/** Categoria resolvida para exibicao; arquivadas continuam legiveis no historico. */
export interface CategoryOption {
  id: string;
  name: string;
  status: CategoryStatus;
}

/** Categoria referenciada mas ausente da lista (ou lista indisponivel): nunca exibir o UUID. */
export const CATEGORY_FALLBACK_LABEL = "Categoria indisponível";

/** `?pagina=` e entrada nao confiavel: qualquer valor fora de 1..999999 vira 1. */
export function parsePageParam(value: unknown): number {
  return typeof value === "string" && /^[1-9]\d{0,5}$/.test(value) ? Number(value) : 1;
}

export function totalPages(total: number, pageSize: number): number {
  return Math.max(1, Math.ceil(total / pageSize));
}

export function accountLabel(accountId: string, accounts: AccountOption[] | null): string {
  const target = accountId.toLowerCase();
  return accounts?.find((account) => account.id.toLowerCase() === target)?.name ?? ACCOUNT_FALLBACK_LABEL;
}

/** Transferencia e registro contabil entre contas proprias: o rotulo nunca sugere envio de dinheiro. */
export function typeLabel(transaction: Pick<Transaction, "type" | "transferSide">): string {
  if (transaction.type === "income") return "Receita";
  if (transaction.type === "expense") return "Despesa";
  return transaction.transferSide === "incoming"
    ? "Transferência entre contas — entrada"
    : "Transferência entre contas — saída";
}

function isInflow(transaction: Pick<Transaction, "type" | "transferSide">): boolean {
  return transaction.type === "income" || transaction.transferSide === "incoming";
}

/**
 * O sinal comunica a direcao em texto; a cor e apenas reforco. Formato do style guide:
 * "+ R$ 6.800,00" e "− R$ 184,90" (sinal de menos tipografico, U+2212).
 */
export function signedAmount(transaction: Pick<Transaction, "type" | "transferSide" | "amount">): {
  text: string;
  direction: "in" | "out";
} {
  return isInflow(transaction)
    ? { text: `+ ${formatMoney(transaction.amount)}`, direction: "in" }
    : { text: `\u2212 ${formatMoney(transaction.amount)}`, direction: "out" };
}

/** Somente receitas e despesas lancadas aceitam categoria; transferencias usam not_applicable. */
export function canCategorize(transaction: Pick<Transaction, "type" | "status">): boolean {
  return transaction.type !== "transfer" && transaction.status === "posted";
}

export type CategorizationTone = "positive" | "warning" | "neutral";

/** Tom do status; o texto de `statusLabel` sempre acompanha a cor. */
export function categorizationTone(
  transaction: Pick<Transaction, "categorizationStatus">,
): CategorizationTone {
  switch (transaction.categorizationStatus) {
    case "categorized":
      return "positive";
    case "uncertain":
    case "unrecognized":
      return "warning";
    default:
      return "neutral";
  }
}

/**
 * Quadrado da linha (Style Guide 2.1): categoria definida mostra o ícone dela;
 * transferência, o ícone de transferência; entrada sem categoria, o de entrada; saída
 * sem categoria segura (sem categoria, incerta ou não reconhecida), "a revisar".
 */
export function movementMark(
  transaction: Pick<Transaction, "type" | "transferSide" | "categoryId" | "categorizationStatus">,
  categories: readonly CategoryOption[] | null,
): { kind: "category" | "review" | "transfer" | "inflow"; name: string | null } {
  if (transaction.type === "transfer") return { kind: "transfer", name: null };
  const category = transaction.categoryId
    ? (categories?.find((option) => option.id === transaction.categoryId) ?? null)
    : null;
  if (transaction.categorizationStatus === "categorized" && transaction.categoryId) {
    // Lista de categorias indisponível: ícone genérico, mas ainda como categoria.
    return { kind: "category", name: category?.name ?? null };
  }
  return transaction.type === "income" ? { kind: "inflow", name: null } : { kind: "review", name: null };
}

// ---------- Busca, filtros e resumo ----------

/** Janela de busca: a API de transações não filtra, então o servidor filtra os mais recentes. */
export const SEARCH_WINDOW = 500;
export const SEARCH_MAX_LENGTH = 80;

export const TYPE_FILTERS = {
  receitas: "Receitas",
  despesas: "Despesas",
  transferencias: "Transferências",
} as const;
export type TypeFilter = keyof typeof TYPE_FILTERS;

export const SITUATION_FILTERS = {
  "sem-categoria": "Sem categoria",
  categorizadas: "Categorizadas",
  incertas: "Incertas ou não reconhecidas",
  "nao-se-aplica": "Não se aplica",
} as const;
export type SituationFilter = keyof typeof SITUATION_FILTERS;

export const PERIOD_PRESETS = { "1m": "1 mês", "3m": "3 meses", "6m": "6 meses", "12m": "1 ano" } as const;
export type PeriodPreset = keyof typeof PERIOD_PRESETS;
const PRESET_MONTHS: Record<PeriodPreset, number> = { "1m": 1, "3m": 3, "6m": 6, "12m": 12 };

export interface MovementFilters {
  search: string;
  type: TypeFilter | null;
  situation: SituationFilter | null;
  accountId: string | null;
  categoryId: string | null;
  /** Atalho de período; "personalizado" usa `from` e `to`; null é "Tudo". */
  period: PeriodPreset | "personalizado" | null;
  from: string | null;
  to: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function firstParam(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

function keyOf<T extends object>(options: T, value: string): keyof T | null {
  return Object.prototype.hasOwnProperty.call(options, value) ? (value as keyof T) : null;
}

function uuidOrNull(value: string): string | null {
  return UUID.test(value) ? value.toLowerCase() : null;
}

function civilDateOrNull(value: string): string | null {
  return isRealCivilDate(value) ? value : null;
}

/** Parâmetros da URL são entrada não confiável: valor desconhecido vira "sem filtro". */
export function parseMovementFilters(params: {
  busca?: string | string[];
  tipo?: string | string[];
  situacao?: string | string[];
  conta?: string | string[];
  categoria?: string | string[];
  periodo?: string | string[];
  de?: string | string[];
  ate?: string | string[];
}): MovementFilters {
  let from = civilDateOrNull(firstParam(params.de));
  let to = civilDateOrNull(firstParam(params.ate));
  if (from && to && from > to) [from, to] = [to, from];
  const rawPeriod = firstParam(params.periodo);
  // Datas informadas sempre valem como período personalizado. Sem período na URL vale o
  // padrão (1 mês); "tudo" é a escolha explícita do histórico inteiro.
  const period =
    from || to
      ? "personalizado"
      : rawPeriod === "personalizado"
        ? "personalizado"
        : rawPeriod === "tudo"
          ? null
          : (keyOf(PERIOD_PRESETS, rawPeriod) ?? DEFAULT_PERIOD);
  return {
    search: firstParam(params.busca).trim().slice(0, SEARCH_MAX_LENGTH),
    type: keyOf(TYPE_FILTERS, firstParam(params.tipo)),
    situation: keyOf(SITUATION_FILTERS, firstParam(params.situacao)),
    accountId: uuidOrNull(firstParam(params.conta)),
    categoryId: uuidOrNull(firstParam(params.categoria)),
    period,
    from,
    to,
  };
}

export const DEFAULT_PERIOD: PeriodPreset = "1m";

/** Filtros além do período: com eles, a lista é filtrada no servidor. */
export function hasContentFilters(filters: MovementFilters): boolean {
  return Boolean(filters.search || filters.type || filters.situation || filters.accountId || filters.categoryId);
}

/** Algo diferente do padrão está aplicado: mostra "Limpar". */
export function hasMovementFilters(filters: MovementFilters): boolean {
  return hasContentFilters(filters) || filters.period !== DEFAULT_PERIOD;
}

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** Mesmo dia N meses antes; sem esse dia no mês de destino, o último dia dele (31/05 − 3 = 28/02). */
export function monthsBefore(today: string, months: number): string {
  const [year, month, day] = today.split("-").map(Number);
  const target = new Date(year, month - 1 - months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return `${pad(target.getFullYear(), 4)}-${pad(target.getMonth() + 1)}-${pad(Math.min(day, lastDay))}`;
}

/** Intervalo de datas civis do filtro, inclusivo; null nas pontas abertas. */
export function dateRange(filters: MovementFilters, today: string): { since: string | null; until: string | null } {
  if (filters.period === "personalizado") return { since: filters.from, until: filters.to };
  if (filters.period) return { since: monthsBefore(today, PRESET_MONTHS[filters.period]), until: null };
  return { since: null, until: null };
}

function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function matchesSituation(transaction: Transaction, situation: SituationFilter): boolean {
  switch (situation) {
    case "sem-categoria":
      return transaction.categorizationStatus === "unclassified";
    case "categorizadas":
      return transaction.categorizationStatus === "categorized";
    case "incertas":
      return transaction.categorizationStatus === "uncertain" || transaction.categorizationStatus === "unrecognized";
    case "nao-se-aplica":
      return transaction.categorizationStatus === "not_applicable";
  }
}

const TYPE_OF_FILTER: Record<TypeFilter, Transaction["type"]> = {
  receitas: "income",
  despesas: "expense",
  transferencias: "transfer",
};

/** Nomes para a busca: categoria e conta, além da descrição. Lista indisponível não busca por nome. */
export interface SearchNames {
  accounts: readonly AccountOption[] | null;
  categories: readonly CategoryOption[] | null;
}

/** Combina busca e filtros sobre a janela já carregada, mantendo a ordem da API. */
export function filterMovements(
  transactions: readonly Transaction[],
  filters: MovementFilters,
  today: string,
  names: SearchNames = { accounts: null, categories: null },
): Transaction[] {
  const term = normalize(filters.search);
  const { since, until } = dateRange(filters, today);
  const accountNames = new Map(names.accounts?.map((account) => [account.id.toLowerCase(), account.name]));
  const categoryNames = new Map(names.categories?.map((category) => [category.id.toLowerCase(), category.name]));
  return transactions.filter((transaction) => {
    if (filters.type && transaction.type !== TYPE_OF_FILTER[filters.type]) return false;
    if (filters.situation && !matchesSituation(transaction, filters.situation)) return false;
    if (filters.accountId && transaction.accountId.toLowerCase() !== filters.accountId) return false;
    if (filters.categoryId && transaction.categoryId?.toLowerCase() !== filters.categoryId) return false;
    if (since && transaction.occurredOn < since) return false;
    if (until && transaction.occurredOn > until) return false;
    if (!term) return true;
    const haystack = [
      transaction.description ?? "",
      accountNames.get(transaction.accountId.toLowerCase()) ?? "",
      transaction.categoryId ? (categoryNames.get(transaction.categoryId.toLowerCase()) ?? "") : "",
    ].join(" ");
    return normalize(haystack).includes(term);
  });
}

/** Página de uma lista já filtrada; página além do fim devolve lista vazia. */
export function paginate<T>(items: readonly T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize);
}

/** Rótulo curto do tipo para a etiqueta da coluna; a direção da transferência fica no valor. */
export function typeTag(transaction: Pick<Transaction, "type">): string {
  if (transaction.type === "income") return "Receita";
  if (transaction.type === "expense") return "Despesa";
  return "Transferência";
}

/** Monta a URL mantendo os filtros ativos e trocando só a página. */
export function movementsHref(filters: MovementFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.search) params.set("busca", filters.search);
  if (filters.type) params.set("tipo", filters.type);
  if (filters.situation) params.set("situacao", filters.situation);
  if (filters.accountId) params.set("conta", filters.accountId);
  if (filters.categoryId) params.set("categoria", filters.categoryId);
  if (filters.period === null) params.set("periodo", "tudo");
  else if (filters.period !== DEFAULT_PERIOD) params.set("periodo", filters.period);
  if (filters.period === "personalizado" && filters.from) params.set("de", filters.from);
  if (filters.period === "personalizado" && filters.to) params.set("ate", filters.to);
  if (page > 1) params.set("pagina", String(page));
  const query = params.toString();
  return query ? `/movimentacoes?${query}` : "/movimentacoes";
}

/** Status curto da coluna Status; a origem (regra ou manual) vai na linha de baixo. */
export function statusLabel(transaction: Pick<Transaction, "categorizationStatus">): string {
  switch (transaction.categorizationStatus) {
    case "categorized":
      return "Categorizada";
    case "uncertain":
      return "Incerta";
    case "unrecognized":
      return "Não reconhecida";
    case "not_applicable":
      return "Não se aplica";
    case "unclassified":
      return "Sem categoria";
  }
}

export function statusSource(transaction: Pick<Transaction, "categorizationStatus" | "categorizationSource">): string | null {
  if (transaction.categorizationStatus !== "categorized") return null;
  return transaction.categorizationSource === "rule" ? "por regra" : "por você";
}

/** Categoria exibida no chip: só quando categorizada; arquivada é marcada, ausente vira fallback. */
export function categoryChip(
  transaction: Pick<Transaction, "categorizationStatus" | "categoryId">,
  categories: readonly CategoryOption[] | null,
): { id: string; label: string } | null {
  if (transaction.categorizationStatus !== "categorized" || !transaction.categoryId) return null;
  const target = transaction.categoryId.toLowerCase();
  const category = categories?.find((item) => item.id.toLowerCase() === target);
  if (!category) return { id: transaction.categoryId, label: CATEGORY_FALLBACK_LABEL };
  return { id: category.id, label: category.status === "archived" ? `${category.name} (arquivada)` : category.name };
}

/** "Mostrando 21–40 de 124 movimentações". */
export function showingText(page: number, pageSize: number, shown: number, total: number): string {
  const first = (page - 1) * pageSize + 1;
  const noun = total === 1 ? "movimentação" : "movimentações";
  return shown === 0 ? `Nenhuma de ${total} ${noun}` : `Mostrando ${first}–${first + shown - 1} de ${total} ${noun}`;
}

// ---------- Entradas, saídas e balanço do período ----------

export interface PeriodTotals {
  income: string;
  expense: string;
  /** Entradas menos saídas; transferências entre contas próprias não entram. */
  balance: string;
}

/** Só lançamentos válidos: estornos e transferências ficam fora. Soma em centavos. */
export function periodTotals(transactions: readonly Transaction[]): PeriodTotals {
  let income = BigInt(0);
  let expense = BigInt(0);
  for (const transaction of transactions) {
    if (transaction.status !== "posted") continue;
    if (transaction.type === "income") income += toCents(transaction.amount);
    else if (transaction.type === "expense") expense += toCents(transaction.amount);
  }
  return { income: fromCents(income), expense: fromCents(expense), balance: fromCents(income - expense) };
}

function shiftDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(year, month - 1, day + days);
  return `${pad(shifted.getFullYear(), 4)}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}`;
}

function daysBetween(since: string, until: string): number {
  const [y1, m1, d1] = since.split("-").map(Number);
  const [y2, m2, d2] = until.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/** Período anterior com o mesmo número de dias, terminando na véspera do início. */
export function previousRange(since: string, until: string): { since: string; until: string } {
  const length = daysBetween(since, until);
  const previousUntil = shiftDays(since, -1);
  return { since: shiftDays(previousUntil, -length), until: previousUntil };
}

/** Variação percentual inteira; null quando o período anterior é zero (sem base). */
export function percentChange(current: string, previous: string): number | null {
  const base = toCents(previous);
  if (base === BigInt(0)) return null;
  const delta = toCents(current) - base;
  return Math.round((Number(delta) / Math.abs(Number(base))) * 100);
}

export function changeText(change: number | null): string {
  if (change === null) return "Sem base de comparação no período anterior";
  const sign = change > 0 ? "+" : change < 0 ? "\u2212" : "";
  return `${sign}${Math.abs(change)}% vs. período anterior`;
}

/** Séries do período para os minigráficos, acumuladas dia a dia desde o início do período. */
export function dailySeries(
  transactions: readonly Transaction[],
  since: string,
  until: string,
): { income: string[]; expense: string[]; balance: string[] } {
  const length = daysBetween(since, until) + 1;
  const income = Array.from({ length }, () => BigInt(0));
  const expense = Array.from({ length }, () => BigInt(0));
  for (const transaction of transactions) {
    if (transaction.status !== "posted" || transaction.occurredOn < since || transaction.occurredOn > until) continue;
    const index = daysBetween(since, transaction.occurredOn);
    if (transaction.type === "income") income[index] += toCents(transaction.amount);
    else if (transaction.type === "expense") expense[index] += toCents(transaction.amount);
  }
  // Acumulado dia a dia dentro do período: a linha termina no valor do card.
  const accumulate = (values: bigint[]) => {
    let running = BigInt(0);
    return values.map((value) => fromCents((running += value)));
  };
  return {
    income: accumulate(income),
    expense: accumulate(expense),
    balance: accumulate(income.map((value, index) => value - expense[index])),
  };
}

/** Lançamentos dentro de um intervalo inclusivo de datas civis. */
export function withinRange<T extends Pick<Transaction, "occurredOn">>(items: readonly T[], since: string, until: string): T[] {
  return items.filter((item) => item.occurredOn >= since && item.occurredOn <= until);
}
