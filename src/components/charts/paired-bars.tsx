"use client";

import * as m from "motion/react-m";
import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { formatTick, pairedBarsLayout, type MonthFlow } from "./model";
import {
  useChartWidth,
  useGeometryTransition,
  useIntroTransition,
  useLinkedHighlight,
} from "./use-chart";

const HEIGHT = 190;

/**
 * Entradas e saídas por mês (bloco 4 da Visão geral). Barras em neutros, sem cor de
 * ganho ou perda; mês parcial mais claro e marcado na tabela. A tabela abaixo é a
 * leitura acessível: o SVG é decorativo para leitores de tela.
 */
export function PairedBarsChart({
  caption,
  data,
  intro = false,
  tableVisible = true,
}: {
  /** Descrição do gráfico, usada como legenda da tabela. */
  caption: string;
  data: readonly MonthFlow[];
  /** Barras sobem da linha de base ao montar. Só na página inicial. */
  intro?: boolean;
  /** false: a tabela continua para leitores de tela, fora da vista (prévias). */
  tableVisible?: boolean;
}) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const transition = useGeometryTransition();
  const introTransition = useIntroTransition();
  const { active, bind } = useLinkedHighlight();
  const layout = width === null ? null : pairedBarsLayout(data, width, HEIGHT);

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

      <div ref={ref} style={{ height: HEIGHT }}>
        {layout && width !== null ? (
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
              const baseline = { y: layout.plot.bottom, height: 0 };
              // Só a altura anima; posição horizontal segue a largura sem transição.
              return (
                <g key={month.month} {...bind(index)}>
                  <rect className={styles.hit} {...month.band} />
                  <m.rect
                    className={barClass(styles.inflow)}
                    data-active={flag}
                    x={month.inflow.x}
                    width={month.inflow.width}
                    initial={intro ? baseline : false}
                    animate={{ y: month.inflow.y, height: month.inflow.height }}
                    transition={intro ? introTransition(index) : transition}
                  />
                  <m.rect
                    className={barClass(styles.outflow)}
                    data-active={flag}
                    x={month.outflow.x}
                    width={month.outflow.width}
                    initial={intro ? baseline : false}
                    animate={{ y: month.outflow.y, height: month.outflow.height }}
                    transition={intro ? introTransition(index) : transition}
                  />
                  <text x={month.center} y={HEIGHT - 6} textAnchor="middle">
                    {partial ? `${month.month}*` : month.month}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : null}
      </div>

      <table className={tableVisible ? styles.table : `${styles.table} visually-hidden`}>
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
