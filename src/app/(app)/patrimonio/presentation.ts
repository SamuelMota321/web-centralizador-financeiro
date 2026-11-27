import { formatCivilDate } from "@/lib/civil-date";
import { formatMoney } from "@/lib/money";
import type { Asset, PatrimonyCollection } from "@/lib/patrimony/types";

export { PAGE_SIZE, parsePageParam, totalPages } from "../movimentacoes/presentation";

/** Segmento da URL em português para cada coleção da API. */
export const SLUGS = { assets: "bens", financings: "financiamentos", liabilities: "passivos" } as const satisfies Record<
  PatrimonyCollection,
  string
>;

export function collectionFromSlug(slug: string): PatrimonyCollection | null {
  const entry = (Object.entries(SLUGS) as [PatrimonyCollection, string][]).find(([, value]) => value === slug);
  return entry ? entry[0] : null;
}

/** Parâmetro de página de cada seção: as três tabelas paginam de forma independente. */
export const PAGE_PARAMS = { assets: "pb", financings: "pf", liabilities: "pp" } as const satisfies Record<
  PatrimonyCollection,
  string
>;

export const SECTIONS = {
  assets: {
    title: "Bens",
    singular: "bem",
    create: "Novo bem",
    submit: "Registrar bem",
    created: "Bem registrado.",
    empty: "Nenhum bem cadastrado. Registre imóveis, veículos ou outros bens com o valor que você estima.",
    flag: "novo-bem",
  },
  financings: {
    title: "Financiamentos",
    singular: "financiamento",
    create: "Novo financiamento",
    submit: "Registrar financiamento",
    created: "Financiamento registrado.",
    empty: "Nenhum financiamento cadastrado. Um financiamento pode ficar associado ao bem que ele pagou.",
    flag: "novo-financiamento",
  },
  liabilities: {
    title: "Outras dívidas",
    singular: "dívida",
    create: "Nova dívida",
    submit: "Registrar dívida",
    created: "Dívida registrada.",
    empty: "Nenhuma outra dívida cadastrada, como empréstimos ou parcelamentos.",
    flag: "nova-divida",
  },
} as const satisfies Record<PatrimonyCollection, { title: string; singular: string; create: string; submit: string; created: string; empty: string; flag: string }>;

export const ASSET_UNAVAILABLE = "Bem indisponível";
export const NO_ASSET = "Sem bem associado";

/** Bem do financiamento pela descrição, nunca pelo UUID. */
export function assetLabel(assetId: string | null, assets: readonly Pick<Asset, "id" | "description">[] | null): string {
  if (assetId === null) return NO_ASSET;
  return assets?.find((asset) => asset.id === assetId)?.description ?? ASSET_UNAVAILABLE;
}

/** Linha de metadados do bem: tipo, fonte informada e data da avaliação. */
export function assetMeta(asset: Pick<Asset, "type" | "source" | "valuationDate">): string {
  return `${asset.type} · fonte: ${asset.source} · avaliado em ${formatCivilDate(asset.valuationDate)}`;
}

/** Meses inteiros entre duas datas civis (AAAA-MM-DD); negativo se `to` for anterior a `from`. */
function wholeMonths(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return (y2 - y1) * 12 + (m2 - m1) - (d2 < d1 ? 1 : 0);
}

function daysBetween(from: string, to: string): number {
  const [y1, m1, d1] = from.split("-").map(Number);
  const [y2, m2, d2] = to.split("-").map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86_400_000);
}

/**
 * Há quanto tempo o valor foi avaliado: "hoje", "há 12 dias", "há 5 meses", "há 2 anos" (anos só a partir de 24 meses). Sinal honesto
 * de que o valor pode estar velho; calculado só da data da avaliação. Data futura não tem texto.
 */
export function valuationAge(valuationDate: string, today: string): string | null {
  const days = daysBetween(valuationDate, today);
  if (days < 0) return null;
  if (days === 0) return "hoje";
  const months = wholeMonths(valuationDate, today);
  if (months < 1) return days === 1 ? "há 1 dia" : `há ${days} dias`;
  // Meses até 23: "há 17 meses" diz mais que "há 1 ano". Daqui em diante, anos inteiros.
  if (months < 24) return months === 1 ? "há 1 mês" : `há ${months} meses`;
  return `há ${Math.floor(months / 12)} anos`;
}

export function amountText(value: string): string {
  return formatMoney(value);
}

const STAMP_FORMAT = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** Momento de uma versão no horário de Brasília: "20/11/2026 12:00". */
export function formatStamp(iso: string): string {
  const parts = Object.fromEntries(STAMP_FORMAT.formatToParts(new Date(iso)).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Link de uma página de seção preservando a página das outras duas. */
export function sectionHref(
  current: Record<PatrimonyCollection, number>,
  collection: PatrimonyCollection,
  page: number,
): string {
  const params = new URLSearchParams();
  for (const key of Object.keys(PAGE_PARAMS) as PatrimonyCollection[]) {
    const value = key === collection ? page : current[key];
    if (value > 1) params.set(PAGE_PARAMS[key], String(value));
  }
  const query = params.toString();
  return query ? `/patrimonio?${query}` : "/patrimonio";
}
