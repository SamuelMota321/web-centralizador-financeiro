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
