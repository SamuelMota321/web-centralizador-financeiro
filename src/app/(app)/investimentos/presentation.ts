import { formatCivilDate } from "@/lib/civil-date";
import type { ChipTone } from "@/components/ui";
import type {
  AssetClass,
  Availability,
  ExclusionReason,
  Freshness,
  Portfolio,
  Position,
} from "@/lib/investments/types";

export { PAGE_SIZE, parsePageParam, totalPages } from "../movimentacoes/presentation";

/** Campo que a fonte nao enviou: escrito como ausente, nunca como zero. */
export const ABSENT = "Não informado pela fonte";
export const CURRENCY_ABSENT = "Moeda não informada";
export const INSTITUTION_ABSENT = "Instituição não informada";

const CLASS_LABELS: Record<AssetClass, string> = {
  FIXED_INCOME: "Renda fixa",
  EQUITY: "Ações",
  ETF: "ETFs",
  MUTUAL_FUND: "Fundos",
  COE: "COE",
  SECURITY: "Valores mobiliários",
  UNCLASSIFIED: "Não classificado",
};

export function assetClassLabel(assetClass: AssetClass): string {
  return CLASS_LABELS[assetClass];
}

/** Variável de cor de cada classe, nos tokens de categoria; a classe escrita ao lado é que identifica. */
const CLASS_COLORS: Record<AssetClass, string> = {
  FIXED_INCOME: "var(--cat-1)",
  EQUITY: "var(--cat-2)",
  ETF: "var(--cat-3)",
  MUTUAL_FUND: "var(--cat-4)",
  COE: "var(--cat-5)",
  SECURITY: "var(--cat-6)",
  UNCLASSIFIED: "var(--cat-other)",
};

export function assetClassColor(assetClass: AssetClass): string {
  return CLASS_COLORS[assetClass];
}

export function institutionLabel(name: string | null): string {
  return name ?? INSTITUTION_ABSENT;
}

const EXCLUSION_LABELS: Record<ExclusionReason, string> = {
  incomplete_or_stale: "coleta incompleta ou dados desatualizados",
  non_active: "posição que não está ativa",
  non_positive_balance: "saldo zerado ou negativo",
  unknown_currency: "moeda não informada",
};

export function exclusionLabel(reason: ExclusionReason): string {
  return EXCLUSION_LABELS[reason];
}

export function availabilityLabel(availability: Availability): string {
  if (availability === "complete") return "Dados completos";
  if (availability === "partial") return "Dados parciais";
  return "Dados indisponíveis";
}

export function availabilityTone(availability: Availability): ChipTone {
  if (availability === "complete") return "positive";
  if (availability === "partial") return "warning";
  return "neutral";
}

export function freshnessLabel(freshness: Freshness): string {
  if (freshness === "current") return "Atual";
  if (freshness === "stale") return "Desatualizado";
  return "Referência desconhecida";
}

export function freshnessTone(freshness: Freshness): ChipTone {
  return freshness === "current" ? "positive" : freshness === "stale" ? "warning" : "neutral";
}

const REFERENCE_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "2026-11-22T13:00:00Z" -> "22/11 10:00" (horário de Brasília). Ausente vira texto explícito. */
export function formatReference(iso: string | null): string {
  if (!iso) return "Referência não informada";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Referência não informada";
  const parts = Object.fromEntries(REFERENCE_FORMAT.formatToParts(date).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month} ${parts.hour}:${parts.minute}`;
}

/** Linha de metadados do Style Guide: `Origem · ref. DD/MM HH:MM`. */
export function metaLine(source: string, referenceDate: string | null): string {
  const origin = source === "pluggy" ? "Pluggy" : source;
  return referenceDate ? `${origin} · ref. ${formatReference(referenceDate)}` : `${origin} · ${formatReference(null).toLowerCase()}`;
}

function groupThousands(integer: string): string {
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/**
 * "1234.5" + "BRL" -> "R$ 1.234,5"; outra moeda -> "USD 1.234,5". As casas vêm da fonte, sem
 * arredondar. Sem moeda, o valor sai com o aviso, nunca assumindo BRL.
 */
export function formatAmount(value: string, currencyCode: string | null): string {
  const match = /^(-?)(\d+)(?:\.(\d+))?$/.exec(value);
  if (!match) return value;
  const [, sign, integer, fraction] = match;
  const number = `${groupThousands(integer)}${fraction ? `,${fraction}` : ""}`;
  const prefix = currencyCode === "BRL" ? "R$" : currencyCode;
  if (!prefix) return `${sign === "-" ? "−" : ""}${number} (${CURRENCY_ABSENT.toLowerCase()})`;
  return `${sign === "-" ? "−" : ""}${prefix} ${number}`;
}

export function optionalAmount(value: string | null, currencyCode: string | null): string {
  return value === null ? ABSENT : formatAmount(value, currencyCode);
}

export function optionalText(value: string | null): string {
  return value === null || value === "" ? ABSENT : value;
}

/** Vencimento chega como data ou data e hora; só a data civil é exibida. */
export function formatMaturity(value: string | null): string {
  if (value === null) return ABSENT;
  const civil = /^\d{4}-\d{2}-\d{2}/.exec(value)?.[0];
  return civil ? formatCivilDate(civil) : value;
}

/** Taxa e tipo como a fonte enviou, juntos; nenhuma rentabilidade é calculada. */
export function rateText(position: Pick<Position, "rate" | "rateType" | "fixedAnnualRate">): string {
  const parts = [
    position.rate !== null ? `Taxa ${position.rate}${position.rateType ? ` (${position.rateType})` : ""}` : null,
    position.fixedAnnualRate !== null ? `Prefixada ${position.fixedAnnualRate}% ao ano` : null,
  ].filter((part): part is string => part !== null);
  return parts.length > 0 ? parts.join(" · ") : ABSENT;
}

/**
 * Explica por que o total está ausente. Só descreve o que o contrato permite concluir:
 * o backend não diz qual das causas ocorreu.
 */
export function totalNote(portfolio: Pick<Portfolio, "total" | "availability" | "totalsByCurrency">): string | null {
  if (portfolio.total !== null) return null;
  if (portfolio.totalsByCurrency.length > 1) {
    return "A carteira tem mais de uma moeda e o app não converte entre elas. Os totais ficam separados por moeda.";
  }
  if (portfolio.availability !== "complete") {
    return "A coleta está incompleta ou desatualizada, então não há um total seguro para exibir.";
  }
  return "Sem posição ativa com dados suficientes, não há total para exibir.";
}

/** Texto de cobertura da alocação, só com as contagens que o backend declara. */
export function coverageText(included: number, known: number): string {
  return `${included} de ${known} ${known === 1 ? "posição conhecida entra" : "posições conhecidas entram"} no cálculo.`;
}

/** "66.7" -> "66,7%": só troca o separador; o arredondamento é do backend. */
export function percentageText(percentage: string): string {
  return `${percentage.replace(".", ",")}%`;
}

/**
 * Origem e referência de um grupo da composição, a partir das posições que o formam.
 * Mostra a referência mais antiga (a que limita a leitura); se alguma falta, diz isso.
 */
export function groupMeta(members: readonly { source: string; referenceDate: string | null }[]): string {
  const count = `${members.length} ${members.length === 1 ? "posição" : "posições"}`;
  if (members.length === 0) return count;
  const origins = [...new Set(members.map((member) => (member.source === "pluggy" ? "Pluggy" : member.source)))].join(", ");
  const dates = members.map((member) => member.referenceDate);
  if (dates.some((date) => date === null)) return `${origins} · ${count} · referência ausente em parte`;
  const oldest = [...(dates as string[])].sort((a, b) => Date.parse(a) - Date.parse(b))[0];
  return `${origins} · ${count} · ref. mais antiga ${formatReference(oldest)}`;
}
