"use client";

import * as m from "motion/react-m";
import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { formatTick, pairedBarsLayout, type MonthFlow } from "./model";
import { useChartWidth, useGeometryTransition, useLinkedHighlight } from "./use-chart";

const HEIGHT = 190;

/**
 * Entradas e saídas por mês (bloco 4 da Visão geral). Barras em neutros, sem cor de
 * ganho ou perda; mês parcial mais claro e marcado na tabela. A tabela abaixo é a
 * leitura acessível: o SVG é decorativo para leitores de tela.
 */
export function PairedBarsChart({
  caption,
  data,
}: {
  /** Descrição do gráfico, usada como legenda da tabela. */
  caption: string;
  data: readonly MonthFlow[];
}) {
  const [ref, width] = useChartWidth<HTMLDivElement>(520);
  const transition = useGeometryTransition();
  const { active, bind } = useLinkedHighlight();
  const layout = pairedBarsLayout(data, width, HEIGHT);

  return (
    <figure className={styles.chart}>
      <ul className={styles.legend} aria-hidden>
        <li>
          <span className={styles.swatch} style={{ "--swatch": "var(--ramp-1)" } as React.CSSProperties} />
          Entradas
        </li>
        <li>
          <span className={styles.swatch} style={{ "--swatch": "var(--ramp-3)" } as React.CSSProperties} />
          Saídas
        </li>
      </ul>

      <div ref={ref}>
        <svg
          className={styles.svg}
          width={width}
          height={HEIGHT}
          viewBox={`0 0 ${width} ${HEIGHT}`}
          aria-hidden
          data-active={active === null ? undefined : ""}
        >
          {layout.ticks.map((tick) => (
            <g key={tick.value}>
              {tick.value > 0 ? (
                <path className={styles.grid} d={`M${layout.plot.left} ${tick.y}H${layout.plot.right}`} />
              ) : null}
              <text x={0} y={tick.y + 3}>
                {formatTick(tick.value)}
              </text>
            </g>
          ))}
          <path className={styles.axis} d={`M${layout.plot.left} ${layout.plot.bottom}H${layout.plot.right}`} />

          {layout.months.map((month, index) => {
            const partial = data[index].partial;
            const flag = active === index ? "" : undefined;
            const barClass = (base: string) => (partial ? `${base} ${styles.partial}` : base);
            return (
              <g key={month.month} {...bind(index)}>
                <rect className={styles.hit} {...month.band} />
                <m.rect
                  className={barClass(styles.inflow)}
                  data-active={flag}
                  initial={false}
                  animate={month.inflow}
                  transition={transition}
                />
                <m.rect
                  className={barClass(styles.outflow)}
                  data-active={flag}
                  initial={false}
                  animate={month.outflow}
                  transition={transition}
                />
                <text x={month.center} y={HEIGHT - 6} textAnchor="middle">
                  {partial ? `${month.month}*` : month.month}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Mês</th>
            <th scope="col" className={styles.num}>
              Entradas
            </th>
            <th scope="col" className={styles.num}>
              Saídas
            </th>
            <th scope="col" className={styles.num}>
              Resultado
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((month, index) => (
            <tr key={month.month} data-active={active === index ? "" : undefined} {...bind(index)}>
              <th scope="row">
                {month.monthName}
                {month.partial ? <span className={styles.note}> · parcial</span> : null}
              </th>
              <td className={styles.num}>{formatMoney(month.inflow)}</td>
              <td className={styles.num}>{formatMoney(month.outflow)}</td>
              <td className={styles.num}>{formatMoney(month.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
