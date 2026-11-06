import { SAMPLE_BALANCES, SAMPLE_FLOW_MONTHS, SAMPLE_PERIODS, SAMPLE_SPENDING } from "./fixtures";
import type { BalancesSummary, FlowSummary, SpendingSummary } from "./types";

// Fonte provisória da Visão geral: devolve os dados de exemplo de fixtures.ts. Quando as
// rotas de agregação forem publicadas, cada função passa a chamar a API com o token da
// sessão e a validar a resposta com schema.ts; a tela não muda.

export type OverviewPeriod = (typeof SAMPLE_PERIODS)[number];

/** Meses no gráfico de fluxo, terminando no período escolhido (D-05). */
export const FLOW_WINDOW = 6;

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

export async function getFlow(period: OverviewPeriod): Promise<FlowSummary> {
  const end = SAMPLE_FLOW_MONTHS.findIndex((month) => month.month === period);
  if (end < 0) throw new RangeError(`Período sem fluxo: ${period}`);
  return { months: SAMPLE_FLOW_MONTHS.slice(Math.max(0, end - FLOW_WINDOW + 1), end + 1) };
}

export async function getSpending(period: OverviewPeriod): Promise<SpendingSummary> {
  return SAMPLE_SPENDING[period];
}
