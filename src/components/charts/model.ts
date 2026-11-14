import { scaleBand, scaleLinear } from "@visx/scale";

// Valores chegam como string decimal exata ("1234.56"), como no contrato da API. O que
// vira texto (percentual) é calculado em centavos com BigInt; Number só entra na
// geometria, onde a imprecisão some no arredondamento para pixel.

const DECIMAL = /^(-?)(\d+)\.(\d{2})$/;
// O tsconfig mira abaixo de ES2020, sem literais BigInt (0n).
const ZERO = BigInt(0);
const TWO = BigInt(2);
const TEN = BigInt(10);
const PER_MILLE_TWICE = BigInt(2000);

export function toCents(value: string): bigint {
  const match = DECIMAL.exec(value);
  if (!match) throw new RangeError(`Valor fora do formato decimal: "${value}"`);
  const cents = BigInt(match[2] + match[3]);
  return match[1] ? -cents : cents;
}

/** Valor em reais como número, só para escalas e posições. */
export function toGeometry(value: string): number {
  return Number(toCents(value)) / 100;
}

/**
 * "41,9%": parte sobre o total com uma casa, meio para cima (D-12). Sem ajuste para
 * fechar 100%. Total zero não tem percentual: retorna null.
 */
export function formatShare(part: string, total: string): string | null {
  const partCents = toCents(part);
  const totalCents = toCents(total);
  if (partCents < ZERO) throw new RangeError(`Parte negativa: "${part}"`);
  if (totalCents <= ZERO) return null;
  const tenths = (partCents * PER_MILLE_TWICE + totalCents) / (TWO * totalCents);
  return `${tenths / TEN},${tenths % TEN}%`;
}

/** Fração de `value` sobre `max` para largura de barra, entre 0 e 1. */
export function barRatio(value: string, max: string): number {
  const maxCents = toCents(max);
  if (maxCents <= ZERO) return 0;
  return Math.min(1, Math.max(0, Number(toCents(value)) / Number(maxCents)));
}

/** Do maior para o menor; empate mantém a ordem recebida. */
export function rankByValue<T extends { value: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const diff = toCents(b.value) - toCents(a.value);
    return diff > ZERO ? 1 : diff < ZERO ? -1 : 0;
  });
}

export function maxValue(values: readonly string[]): string {
  return values.reduce((max, value) => (toCents(value) > toCents(max) ? value : max), "0.00");
}

/* ---------- Barras pareadas por mês ---------- */

export interface MonthFlow {
  /** Rótulo curto do eixo ("out"). */
  month: string;
  /** Nome completo para a tabela ("outubro de 2026"). */
  monthName: string;
  inflow: string;
  outflow: string;
  /** Resultado do período, calculado no servidor (entradas − saídas). */
  net: string;
  /** Mês corrente, ainda em andamento (D-05). */
  partial?: boolean;
}

export type BarRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface PairedBarsLayout {
  plot: { left: number; right: number; top: number; bottom: number };
  ticks: { value: number; y: number }[];
  months: { month: string; center: number; band: BarRect; inflow: BarRect; outflow: BarRect }[];
}

const PAIRED_MARGIN = { top: 8, right: 8, bottom: 22, left: 44 };
const PAIR_GAP = 4;
/** Com poucos meses a banda fica larga; a barra não passa disto e o par centraliza. */
export const MAX_BAR_WIDTH = 28;

export function pairedBarsLayout(
  data: readonly MonthFlow[],
  width: number,
  height: number,
): PairedBarsLayout {
  const plot = {
    left: PAIRED_MARGIN.left,
    right: width - PAIRED_MARGIN.right,
    top: PAIRED_MARGIN.top,
    bottom: height - PAIRED_MARGIN.bottom,
  };
  const max = toGeometry(maxValue(data.flatMap((d) => [d.inflow, d.outflow])));
  const y = scaleLinear<number>({
    domain: [0, max > 0 ? max : 1],
    range: [plot.bottom, plot.top],
    nice: 3,
  });
  const x = scaleBand<string>({
    domain: data.map((d) => d.month),
    range: [plot.left, plot.right],
    paddingInner: 0.35,
    paddingOuter: 0.2,
  });
  const barWidth = Math.max(1, Math.min(MAX_BAR_WIDTH, (x.bandwidth() - PAIR_GAP) / 2));
  // Sobra da banda quando a barra bate no máximo: metade de cada lado do par.
  const inset = (x.bandwidth() - (barWidth * 2 + PAIR_GAP)) / 2;
  const bar = (left: number, value: string): BarRect => {
    const top = y(toGeometry(value));
    return { x: left, y: top, width: barWidth, height: plot.bottom - top };
  };

  return {
    plot,
    ticks: y.ticks(3).map((value) => ({ value, y: y(value) })),
    months: data.map((d) => {
      const left = (x(d.month) ?? plot.left) + inset;
      const step = x.step();
      return {
        month: d.month,
        center: left - inset + x.bandwidth() / 2,
        band: { x: left - inset - (step - x.bandwidth()) / 2, y: plot.top, width: step, height: plot.bottom - plot.top },
        inflow: bar(left, d.inflow),
        outflow: bar(left + barWidth + PAIR_GAP, d.outflow),
      };
    }),
  };
}

/* ---------- Linha com pontos ---------- */

export interface LinePoint {
  label: string;
  /** Nome completo para a tabela. */
  labelName: string;
  value: string;
}

export interface LineLayout {
  plot: { left: number; right: number; top: number; bottom: number };
  ticks: { value: number; y: number }[];
  points: { label: string; x: number; y: number }[];
  path: string;
}

const LINE_MARGIN = { top: 10, right: 12, bottom: 22, left: 44 };

/** Eixo começa em zero, como nas barras: a altura da linha não exagera a variação. */
export function lineLayout(points: readonly LinePoint[], width: number, height: number): LineLayout {
  const plot = {
    left: LINE_MARGIN.left,
    right: width - LINE_MARGIN.right,
    top: LINE_MARGIN.top,
    bottom: height - LINE_MARGIN.bottom,
  };
  const max = toGeometry(maxValue(points.map((p) => p.value)));
  const y = scaleLinear<number>({
    domain: [0, max > 0 ? max : 1],
    range: [plot.bottom, plot.top],
    nice: 3,
  });
  const step = points.length > 1 ? (plot.right - plot.left) / (points.length - 1) : 0;
  const placed = points.map((p, index) => ({
    label: p.label,
    x: points.length > 1 ? plot.left + step * index : (plot.left + plot.right) / 2,
    y: y(toGeometry(p.value)),
  }));

  return {
    plot,
    ticks: y.ticks(3).map((value) => ({ value, y: y(value) })),
    points: placed,
    path: placed.map((p, i) => `${i === 0 ? "M" : "L"}${round(p.x)} ${round(p.y)}`).join(""),
  };
}

function round(n: number) {
  return Math.round(n * 10) / 10;
}

const compact = new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 });

/** Rótulo do eixo em reais: "8 mil", "1,5 mi", "0". */
export function formatTick(value: number): string {
  return compact.format(value);
}

/** Centavos de volta para a string do contrato: BigInt(-1050) -> "-10.50". */
export function fromCents(cents: bigint): string {
  const negative = cents < ZERO;
  const digits = (negative ? -cents : cents).toString().padStart(3, "0");
  return `${negative ? "-" : ""}${digits.slice(0, -2)}.${digits.slice(-2)}`;
}

export function sumValues(values: readonly string[]): string {
  return fromCents(values.reduce((total, value) => total + toCents(value), ZERO));
}

/* ---------- Rosca ---------- */

export interface DonutItem {
  id: string;
  label: string;
  value: string;
  /** Cor da categoria (var(--cat-N)); ignorada em `review`. */
  color: string;
  /** "A revisar": hachurado, sempre a última fatia, nunca agrupado. */
  review?: boolean;
}

/** Fatias além desta quantidade (sem contar "A revisar") viram "Outras". */
export const DONUT_MAX_SLICES = 6;
export const DONUT_OTHER_ID = "outras";

/**
 * Ordena do maior para o menor e junta o excedente em "Outras" (neutra), para a rosca
 * não passar de seis fatias com cor; "A revisar" fica no fim, sempre separado.
 */
export function donutItems(items: readonly DonutItem[], otherColor: string): DonutItem[] {
  const regular = rankByValue(items.filter((item) => !item.review));
  const review = items.filter((item) => item.review);
  if (regular.length <= DONUT_MAX_SLICES) return [...regular, ...review];
  const kept = regular.slice(0, DONUT_MAX_SLICES - 1);
  const rest = regular.slice(DONUT_MAX_SLICES - 1);
  const other: DonutItem = {
    id: DONUT_OTHER_ID,
    label: `Outras (${rest.length})`,
    value: sumValues(rest.map((item) => item.value)),
    color: otherColor,
  };
  return [...kept, other, ...review];
}

export interface DonutArc {
  id: string;
  /** Comprimento visível do traço, já descontado o espaço entre fatias. */
  length: number;
  /** Onde a fatia começa no contorno (a partir do topo, sentido horário). */
  start: number;
}

/** Espaço entre fatias, em px de contorno: a superfície aparece entre as cores. */
export const DONUT_GAP = 2;

export function donutArcs(items: readonly DonutItem[], total: string, circumference: number): DonutArc[] {
  const totalCents = toCents(total);
  if (totalCents <= ZERO) return items.map((item) => ({ id: item.id, length: 0, start: 0 }));
  const gap = items.length > 1 ? DONUT_GAP : 0;
  let start = 0;
  return items.map((item) => {
    const span = (Number(toCents(item.value)) / Number(totalCents)) * circumference;
    const arc = { id: item.id, length: Math.max(0, span - gap), start };
    start += span;
    return arc;
  });
}

/* ---------- Minigráfico ---------- */

export interface Sparkline {
  /** Trecho dos meses fechados. */
  solid: string;
  /** Último trecho, tracejado, quando o último mês está em andamento. */
  partial: string | null;
  last: { x: number; y: number };
  /** Posição de cada valor, para o ponto que percorre os meses. */
  points: { x: number; y: number }[];
}

/**
 * Linha curta de tendência ao lado de um número. A escala vai do menor ao maior valor
 * da própria série: mostra o desenho, não a magnitude (o número ao lado diz o valor).
 */
export function sparkline(
  values: readonly string[],
  width: number,
  height: number,
  partialLast = false,
): Sparkline {
  const pad = 4;
  const numbers = values.map(toGeometry);
  const min = Math.min(...numbers);
  const max = Math.max(...numbers);
  const step = numbers.length > 1 ? width / (numbers.length - 1) : 0;
  const points = numbers.map((value, index) => ({
    x: round(step * index),
    y: round(max === min ? height / 2 : height - pad - ((value - min) / (max - min)) * (height - 2 * pad)),
  }));
  const path = (list: typeof points) => list.map((p, i) => `${i === 0 ? "M" : "L"}${p.x} ${p.y}`).join("");
  const split = partialLast && points.length > 1;
  return {
    solid: path(split ? points.slice(0, -1) : points),
    partial: split ? path(points.slice(-2)) : null,
    last: points[points.length - 1] ?? { x: 0, y: height / 2 },
    points,
  };
}
