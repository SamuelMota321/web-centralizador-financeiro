"use client";

import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useState } from "react";
import { IconChevronDown } from "@/components/icons";
import { SyncedDetails } from "@/components/synced-details";
import { motionDuration, motionEase } from "@/lib/motion";
import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { formatTick, lineLayout, type LinePoint } from "./model";
import { useChartWidth, useGeometryTransition, useLinkedHighlight } from "./use-chart";

const HEIGHT = 190;
/** Metade da largura da caixa de detalhe: ela não sai pelas bordas do gráfico. */
const TOOLTIP_HALF = 92;

/**
 * Evolução de um valor no tempo: linha de 1,5px com pontos, último ponto em sinal.
 * Sem área preenchida. Eixo a partir de zero. A tabela abaixo é a leitura acessível.
 */
export function LineChart({
  caption,
  points,
  valueLabel,
  tableCollapsed = false,
  drawIn = false,
  quietPoints = false,
}: {
  caption: string;
  points: readonly LinePoint[];
  /** Cabeçalho da coluna de valores ("Saldo"). */
  valueLabel: string;
  /** true: a tabela fica recolhida sob "Ver valores". */
  tableCollapsed?: boolean;
  /** A linha se desenha da esquerda para a direita ao aparecer (painel aberto pela pessoa). */
  drawIn?: boolean;
  /** Muitos pontos (dia a dia): só o ponto em foco e o último aparecem. */
  quietPoints?: boolean;
}) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const transition = useGeometryTransition();
  const reduce = useReducedMotion();
  const draw = drawIn && !reduce;
  const { active, bind } = useLinkedHighlight();
  const layout = width === null ? null : lineLayout(points, width, HEIGHT);
  const last = points.length - 1;
  // Rótulos do eixo contados a partir do último dia: no máximo uns sete, sem amontoar.
  const labelStep = Math.max(1, Math.ceil(points.length / 7));
  // Último ponto em foco: guia e caixa somem por opacidade e voltam deslizando dali.
  const [shown, setShown] = useState<number | null>(null);
  if (active !== null && active !== shown) setShown(active);
  const focus = shown !== null && layout && shown < layout.points.length ? shown : null;

  const table = (
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
  );

  return (
    <figure className={styles.chart}>
      <div ref={ref} className={styles.plotArea} style={{ height: HEIGHT }}>
        {layout && width !== null ? (
          <svg
            className={quietPoints ? `${styles.svg} ${styles.quiet}` : styles.svg}
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

            {/* Linha-guia: desliza até o ponto mais próximo do mouse. */}
            {focus !== null ? (
              <line
                className={styles.guide}
                data-visible={active === null ? undefined : ""}
                x1={0}
                x2={0}
                y1={layout.plot.top}
                y2={layout.plot.bottom}
                style={{ transform: `translateX(${layout.points[focus].x}px)` }}
              />
            ) : null}

            <m.path
              className={styles.series}
              initial={draw ? { d: layout.path, pathLength: 0 } : false}
              animate={{ d: layout.path, pathLength: 1 }}
              transition={{ ...transition, pathLength: { duration: motionDuration.intro, ease: motionEase.out } }}
            />

            {layout.points.map((point, index) => (
              <g key={point.label} {...bind(index)}>
                {/* Faixa de captura até o meio do caminho para os vizinhos: o ponto mais próximo. */}
                <rect
                  className={styles.hit}
                  x={index === 0 ? layout.plot.left : (layout.points[index - 1].x + point.x) / 2}
                  y={layout.plot.top}
                  width={
                    (index === last ? layout.plot.right : (point.x + layout.points[index + 1].x) / 2) -
                    (index === 0 ? layout.plot.left : (layout.points[index - 1].x + point.x) / 2)
                  }
                  height={layout.plot.bottom - layout.plot.top}
                />
                <m.circle
                  className={
                    index === last
                      ? `${styles.point} ${styles.last}${draw ? ` ${styles.arrive}` : ""}`
                      : styles.point
                  }
                  data-active={active === index ? "" : undefined}
                  r={3.5}
                  cx={point.x}
                  initial={false}
                  animate={{ cy: point.y }}
                  transition={transition}
                />
                {(last - index) % labelStep === 0 ? (
                  <text x={point.x} y={HEIGHT - 6} textAnchor="middle">
                    {point.label}
                  </text>
                ) : null}
              </g>
            ))}
          </svg>
        ) : null}
        {/* Detalhe do ponto em foco; decorativo, os valores estão na tabela. */}
        {layout && width !== null && focus !== null ? (
          <div
            className={styles.tooltip}
            data-visible={active === null ? undefined : ""}
            style={{
              transform: `translateX(${Math.min(Math.max(layout.points[focus].x, TOOLTIP_HALF), width - TOOLTIP_HALF)}px) translateX(-50%)`,
            }}
            aria-hidden
          >
            <p className={styles.tooltipTitle}>{points[focus].labelName}</p>
            <p className={styles.tooltipRow}>
              <span>{valueLabel}</span>
              <span className={styles.num}>{formatMoney(points[focus].value)}</span>
            </p>
          </div>
        ) : null}
      </div>

      {tableCollapsed ? (
        <SyncedDetails
          className={styles.values}
          summaryClassName={styles.valuesSummary}
          summary={
            <>
              Ver valores
              <IconChevronDown className={styles.valuesChevron} size={16} />
            </>
          }
        >
          {table}
        </SyncedDetails>
      ) : (
        table
      )}
    </figure>
  );
}
