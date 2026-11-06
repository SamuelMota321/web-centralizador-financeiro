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
  const barWidth = Math.max(1, (x.bandwidth() - PAIR_GAP) / 2);
  const bar = (left: number, value: string): BarRect => {
    const top = y(toGeometry(value));
    return { x: left, y: top, width: barWidth, height: plot.bottom - top };
  };

  return {
    plot,
    ticks: y.ticks(3).map((value) => ({ value, y: y(value) })),
    months: data.map((d) => {
      const left = x(d.month) ?? plot.left;
      const step = x.step();
      return {
        month: d.month,
        center: left + x.bandwidth() / 2,
        band: { x: left - (step - x.bandwidth()) / 2, y: plot.top, width: step, height: plot.bottom - plot.top },
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
