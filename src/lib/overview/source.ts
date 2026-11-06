import {
  SAMPLE_BALANCES,
  SAMPLE_CATEGORY_ORDER,
  SAMPLE_FLOW_MONTHS,
  SAMPLE_PERIODS,
  SAMPLE_RECENT,
  SAMPLE_SPENDING,
  SAMPLE_SPENDING_MOVEMENTS,
} from "./fixtures";
import type {
  BalancesSummary,
  FlowSummary,
  Page,
  RecentMovement,
  SpendingMovement,
  SpendingSummary,
} from "./types";

// Fonte provisória da Visão geral: devolve os dados de exemplo de fixtures.ts. Quando as
// rotas de agregação forem publicadas, cada função passa a chamar a API com o token da
// sessão e a validar a resposta com schema.ts; a tela não muda.

export type OverviewPeriod = (typeof SAMPLE_PERIODS)[number];

/** Meses por página no gráfico de fluxo; a página 1 termina no período escolhido (D-05). */
export const FLOW_WINDOW = 7;

/** Saídas por página na lista sob a rosca. */
export const MOVEMENTS_PAGE_SIZE = 6;

/** Filtro das saídas sem categoria segura (o "A revisar" da rosca). */
export const REVIEW_FILTER = "a-revisar";

/** Do mais recente ao mais antigo; o primeiro é o mês corrente (parcial). */
export function listPeriods(): readonly OverviewPeriod[] {
  return SAMPLE_PERIODS;
}

/** `?periodo=` válido ou o mês corrente. */
export function parsePeriod(value: string | string[] | undefined): OverviewPeriod {
  const periods = listPeriods();
  return periods.find((period) => period === value) ?? periods[0];
}

export async function getBalances(period: OverviewPeriod): Promise<BalancesSummary> {
  return SAMPLE_BALANCES[period];
}

/** `?pagina=`/`?meses=`: inteiro positivo, senão 1. Página além do fim é ajustada na fonte. */
export function parsePage(value: string | string[] | undefined): number {
  const page = typeof value === "string" && /^\d{1,4}$/.test(value) ? Number(value) : 1;
  return page >= 1 ? page : 1;
}

/** `?categoria=`: uma categoria com gasto no período ou "a-revisar"; o resto vira sem filtro. */
export function parseCategory(value: string | string[] | undefined, spending: SpendingSummary | null): string | null {
  if (typeof value !== "string" || !spending) return null;
  if (value === REVIEW_FILTER) return spending.toReview.count > 0 ? value : null;
  return spending.categories.some((category) => category.categoryId === value) ? value : null;
}

const clampPage = (page: number, pages: number) => Math.min(Math.max(page, 1), pages);

export async function getFlow(period: OverviewPeriod, page = 1): Promise<FlowSummary> {
  const end = SAMPLE_FLOW_MONTHS.findIndex((month) => month.month === period);
  if (end < 0) throw new RangeError(`Período sem fluxo: ${period}`);
  const available = end + 1;
  const pages = Math.max(1, Math.ceil(available / FLOW_WINDOW));
  const current = clampPage(page, pages);
  // A última página volta até completar a janela: repetir meses é melhor que mostrar um só.
  const start = Math.max(0, available - current * FLOW_WINDOW);
  return {
    months: SAMPLE_FLOW_MONTHS.slice(start, Math.min(available, start + FLOW_WINDOW)),
    page: current,
    pages,
  };
}

/**
 * Saídas do período, mais recentes primeiro, `MOVEMENTS_PAGE_SIZE` por página. Ligado:
 * GET /transactions com filtro de período e categoria, que o backend ainda não tem.
 */
export async function getSpendingMovements(
  period: OverviewPeriod,
  { category, page }: { category: string | null; page: number },
): Promise<Page<SpendingMovement>> {
  const all = SAMPLE_SPENDING_MOVEMENTS[period];
  const filtered =
    category === null
      ? all
      : category === REVIEW_FILTER
        ? all.filter((item) => item.toReview)
        : all.filter((item) => item.categoryId === category);
  const pages = Math.max(1, Math.ceil(filtered.length / MOVEMENTS_PAGE_SIZE));
  const current = clampPage(page, pages);
  return {
    items: filtered.slice((current - 1) * MOVEMENTS_PAGE_SIZE, current * MOVEMENTS_PAGE_SIZE),
    page: current,
    pages,
    total: filtered.length,
  };
}

export async function getSpending(period: OverviewPeriod): Promise<SpendingSummary> {
  return SAMPLE_SPENDING[period];
}

/** Os cinco lançamentos mais recentes. Ligado: GET /transactions?page=1&pageSize=5. */
export async function getRecentMovements(): Promise<readonly RecentMovement[]> {
  return SAMPLE_RECENT;
}

/**
 * Ids das categorias na ordem de criação, arquivadas incluídas: decide a cor fixa de cada
 * uma. Ligado: GET /categories (todas as páginas) ordenado por `createdAt`.
 */
export async function getCategoryOrder(): Promise<readonly string[]> {
  return SAMPLE_CATEGORY_ORDER;
}
