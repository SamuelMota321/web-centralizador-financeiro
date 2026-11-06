import type { MonthFlow } from "@/components/charts/model";
import type { RankedItem } from "@/components/charts/ranked-bars";
import type { AccountBalance, BalanceSource, Freshness, FlowMonth, SpendingSummary } from "@/lib/overview/types";
import type { ChipTone } from "@/components/ui";

const MONTH_NAMES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

function parseMonth(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new RangeError(`Mês fora do formato AAAA-MM: "${month}"`);
  const index = Number(match[2]) - 1;
  if (index < 0 || index > 11) throw new RangeError(`Mês inválido: "${month}"`);
  return { year: match[1], name: MONTH_NAMES[index] };
}

/** "2026-10" -> "outubro de 2026". */
export function monthName(month: string): string {
  const { year, name } = parseMonth(month);
  return `${name} de ${year}`;
}

/** "2026-10" -> "out". */
export function monthShort(month: string): string {
  return parseMonth(month).name.slice(0, 3);
}

/** "2026-10" -> "Outubro de 2026". */
export function periodTitle(month: string): string {
  const name = monthName(month);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

/** Rótulo do seletor: o mês corrente diz que é parcial. */
export function periodOption(month: string, current: boolean): string {
  const short = monthShort(month);
  const label = short.charAt(0).toUpperCase() + short.slice(1);
  return current ? `${label} · parcial` : label;
}

export function toChartFlow(months: readonly FlowMonth[]): MonthFlow[] {
  return months.map((month) => ({
    month: monthShort(month.month),
    monthName: monthName(month.month),
    inflow: month.inflow,
    outflow: month.outflow,
    net: month.net,
    partial: month.partial,
  }));
}

export const SOURCE_LABELS: Record<BalanceSource, string> = {
  manual: "Manual",
  ofx: "OFX",
  pluggy: "Conectada",
};

const reference = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "America/Sao_Paulo",
});

/** "2026-10-05T09:12:00-03:00" -> "05/10, 09:12" no horário de Brasília. */
export function formatReference(iso: string): string {
  return reference.format(new Date(iso));
}

/** Atualizado não ganha marcador (a data basta); só o que pede atenção. */
export function freshnessChip(freshness: Freshness): { tone: ChipTone; label: string } | null {
  if (freshness === "stale") return { tone: "warning", label: "Desatualizada" };
  if (freshness === "unavailable") return { tone: "neutral", label: "Indisponível" };
  return null;
}

/** Cartões em grupo próprio, fora do Disponível (D-03). */
export function splitAccounts(accounts: readonly AccountBalance[]) {
  return {
    accounts: accounts.filter((account) => account.type !== "credit_card"),
    cards: accounts.filter((account) => account.type === "credit_card"),
  };
}

/** Categorias + "A revisar" (só quando há valor), no formato das barras ordenadas. */
export function toRankedItems(spending: SpendingSummary): RankedItem[] {
  const items: RankedItem[] = spending.categories.map((category) => ({
    id: category.categoryId,
    label: category.archived ? `${category.name} (arquivada)` : category.name,
    value: category.amount,
  }));
  if (spending.toReview.amount !== "0.00") {
    items.push({ id: "a-revisar", label: "A revisar", value: spending.toReview.amount, review: true });
  }
  return items;
}
