"use client";

import * as m from "motion/react-m";
import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { formatTick, lineLayout, type LinePoint } from "./model";
import { useChartWidth, useGeometryTransition, useLinkedHighlight } from "./use-chart";

const HEIGHT = 190;

/**
 * Evolução de um valor no tempo: linha de 1,5px com pontos, último ponto em sinal.
 * Sem área preenchida. Eixo a partir de zero. A tabela abaixo é a leitura acessível.
 */
export function LineChart({
  caption,
  points,
  valueLabel,
}: {
  caption: string;
  points: readonly LinePoint[];
  /** Cabeçalho da coluna de valores ("Saldo"). */
  valueLabel: string;
}) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const transition = useGeometryTransition();
  const { active, bind } = useLinkedHighlight();
  const layout = width === null ? null : lineLayout(points, width, HEIGHT);
  const last = points.length - 1;

  return (
    <figure className={styles.chart}>
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

            <m.path className={styles.series} initial={false} animate={{ d: layout.path }} transition={transition} />

            {layout.points.map((point, index) => (
              <g key={point.label} {...bind(index)}>
                <m.circle
                  className={index === last ? `${styles.point} ${styles.last}` : styles.point}
                  data-active={active === index ? "" : undefined}
                  r={3.5}
                  cx={point.x}
                  initial={false}
                  animate={{ cy: point.y }}
                  transition={transition}
                />
                <text x={point.x} y={HEIGHT - 6} textAnchor="middle">
                  {point.label}
                </text>
              </g>
            ))}
          </svg>
        ) : null}
      </div>

      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Data</th>
            <th scope="col" className={styles.num}>
              {valueLabel}
            </th>
          </tr>
        </thead>
        <tbody>
          {points.map((point, index) => (
            <tr key={point.label} data-active={active === index ? "" : undefined} {...bind(index)}>
              <th scope="row">{point.labelName}</th>
              <td className={styles.num}>{formatMoney(point.value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
