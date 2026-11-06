import { CATEGORY_OTHER, colorOf } from "@/components/charts/category-colors";
import { donutItems, toCents, type DonutItem, type MonthFlow } from "@/components/charts/model";
import type { ChipTone } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type {
  AccountBalance,
  BalanceSource,
  BalancesSummary,
  Freshness,
  FlowMonth,
  RecentMovement,
  SpendingMovement,
  SpendingSummary,
} from "@/lib/overview/types";

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

/** "abril a outubro de 2026"; anos diferentes: "novembro de 2025 a março de 2026"; um mês só: "março de 2026". */
export function monthRange(first: string, last: string): string {
  if (first === last) return monthName(first);
  const start = parseMonth(first);
  const end = monthName(last);
  return start.year === parseMonth(last).year ? `${start.name} a ${end}` : `${monthName(first)} a ${end}`;
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

/** Fatias da rosca: cor fixa por categoria, "A revisar" hachurado e só com valor. */
export function toDonutItems(spending: SpendingSummary, colors: ReadonlyMap<string, string>): DonutItem[] {
  const items: DonutItem[] = spending.categories.map((category) => ({
    id: category.categoryId,
    label: category.archived ? `${category.name} (arquivada)` : category.name,
    value: category.amount,
    color: colorOf(colors, category.categoryId),
  }));
  if (spending.toReview.amount !== "0.00") {
    items.push({ id: "a-revisar", label: "A revisar", value: spending.toReview.amount, color: CATEGORY_OTHER, review: true });
  }
  return donutItems(items, CATEGORY_OTHER);
}

const TWO_THOUSAND = BigInt(2000);
const TWO = BigInt(2);
const TEN = BigInt(10);

/**
 * "↑ 4,3% vs. setembro": variação sobre o mês anterior, uma casa, meio para cima, calculada
 * em centavos. Sem base positiva não há percentual que faça sentido: null.
 */
export function formatChange(current: string, previous: string, previousMonth: string): string | null {
  const now = toCents(current);
  const before = toCents(previous);
  if (before <= BigInt(0)) return null;
  const month = monthName(previousMonth).split(" ")[0];
  const diff = now - before;
  if (diff === BigInt(0)) return `Igual a ${month}`;
  const magnitude = diff < BigInt(0) ? -diff : diff;
  const tenths = (magnitude * TWO_THOUSAND + before) / (TWO * before);
  return `${diff > BigInt(0) ? "↑" : "↓"} ${tenths / TEN},${tenths % TEN}% vs. ${month}`;
}

const day = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });

/** Data civil "2026-10-05" -> "05/10" (meio-dia evita virar o dia por fuso). */
export function formatDay(date: string): string {
  return day.format(new Date(`${date.slice(0, 10)}T12:00:00-03:00`));
}

export interface AttentionItem {
  id: string;
  /** review: hachurado em atenção; warning: marcador de atenção; info: marcador informativo. */
  tone: "review" | "warning" | "info";
  title: string;
  text: string;
  action: { label: string; href: string };
}

const STALE_ACTION: Record<BalanceSource, { label: string; href: string }> = {
  ofx: { label: "Importar extrato OFX", href: "/contas/importar-ofx" },
  pluggy: { label: "Ver conexão", href: "/contas" },
  manual: { label: "Atualizar conta", href: "/contas" },
};

/**
 * "Pede sua atenção": só fatos que já estão nas agregações, cada um com a ação que o
 * resolve. Nunca recomendação financeira (RN-017).
 */
export function attentionItems(balances: BalancesSummary | null, spending: SpendingSummary | null): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (spending && spending.toReview.amount !== "0.00") {
    const { count, amount } = spending.toReview;
    items.push({
      id: "a-revisar",
      tone: "review",
      title: `${count} ${count === 1 ? "saída sem categoria segura" : "saídas sem categoria segura"} · ${formatMoney(amount)}`,
      text: "Ficam em “A revisar” até você confirmar a categoria.",
      action: { label: "Categorizar", href: "/movimentacoes" },
    });
  }
  for (const account of balances?.accounts ?? []) {
    if (account.freshness === "stale") {
      items.push({
        id: `desatualizada-${account.accountId}`,
        tone: "warning",
        title: `${account.name} com referência de ${formatDay(account.asOf)}`,
        text:
          account.type === "credit_card"
            ? "O saldo do cartão aparece com essa referência."
            : "O saldo dela entra no Disponível com essa referência.",
        action: STALE_ACTION[account.source],
      });
    }
  }
  for (const card of splitAccounts(balances?.accounts ?? []).cards) {
    items.push({
      id: `cartao-${card.accountId}`,
      tone: "info",
      title: `${card.name}: ${formatMoney(card.balance)}`,
      text: "Fica fora do Disponível, em grupo próprio.",
      action: { label: "Ver contas", href: "/contas" },
    });
  }
  return items;
}

export interface RecentLine {
  id: string;
  title: string;
  meta: string;
  amount: string;
  direction: RecentMovement["direction"];
  /** Cor da categoria; null: sem marcador (transferência). */
  color: string | null;
  toReview: boolean;
}

export function toRecentLines(movements: readonly RecentMovement[], colors: ReadonlyMap<string, string>): RecentLine[] {
  return movements.map((movement) => {
    const category = movement.toReview
      ? "A revisar"
      : movement.direction === "transfer"
        ? "Transferência"
        : (movement.categoryName ?? "Sem categoria");
    const sign = movement.direction === "inflow" ? "+ " : movement.direction === "outflow" ? "− " : "";
    return {
      id: movement.transactionId,
      title: movement.description ?? "Sem descrição",
      meta: [formatDay(movement.date), category, movement.accountName].join(" · "),
      amount: `${sign}${formatMoney(movement.amount)}`,
      direction: movement.direction,
      color:
        movement.direction === "transfer" || movement.toReview
          ? null
          : movement.categoryId
            ? colorOf(colors, movement.categoryId)
            : CATEGORY_OTHER,
      toReview: movement.toReview,
    };
  });
}

/** Estado da Visão geral na URL; valores padrão ficam de fora para o link sair limpo. */
export interface OverviewQuery {
  periodo: string;
  categoria?: string | null;
  pagina?: number;
  meses?: number;
}

export function overviewHref({ periodo, categoria, pagina, meses }: OverviewQuery): string {
  const params = new URLSearchParams({ periodo });
  if (categoria) params.set("categoria", categoria);
  if (pagina && pagina > 1) params.set("pagina", String(pagina));
  if (meses && meses > 1) params.set("meses", String(meses));
  return `/visao-geral?${params.toString()}`;
}

/** Saídas sob a rosca no mesmo desenho das últimas movimentações. */
export function toSpendingLines(
  movements: readonly SpendingMovement[],
  colors: ReadonlyMap<string, string>,
): RecentLine[] {
  return toRecentLines(
    movements.map((movement) => ({ ...movement, direction: "outflow" as const })),
    colors,
  );
}

/** "Saídas de outubro de 2026" ou, com filtro, "Saídas de Moradia em outubro de 2026". */
export function movementsTitle(period: string, categoryLabel: string | null): string {
  return categoryLabel ? `Saídas de ${categoryLabel} em ${monthName(period)}` : `Saídas de ${monthName(period)}`;
}

/** "1–6 de 34". */
export function pageRange(page: number, pageSize: number, total: number): string {
  if (total === 0) return "Nenhuma saída";
  const start = (page - 1) * pageSize + 1;
  return `${start}–${Math.min(page * pageSize, total)} de ${total}`;
}
