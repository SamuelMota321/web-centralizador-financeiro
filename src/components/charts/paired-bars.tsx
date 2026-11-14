"use client";

import * as m from "motion/react-m";
import { type ReactNode, useState } from "react";
import { IconChevronDown } from "@/components/icons";
import { SyncedDetails } from "@/components/synced-details";
import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { formatTick, pairedBarsLayout, type MonthFlow } from "./model";
import {
  useChartWidth,
  useGeometryTransition,
  useIntroTransition,
  useLinkedHighlight,
} from "./use-chart";

const DEFAULT_HEIGHT = 190;
/** Metade da largura da caixa de detalhe: ela não sai pelas bordas do gráfico. */
const TOOLTIP_HALF = 92;

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
  tableCollapsed = false,
  height = DEFAULT_HEIGHT,
  tableOrder = "oldest-first",
  tableHeader,
}: {
  /** Descrição do gráfico, usada como legenda da tabela. */
  caption: string;
  data: readonly MonthFlow[];
  /** Barras sobem da linha de base ao montar. Só na página inicial. */
  intro?: boolean;
  /** false: a tabela continua para leitores de tela, fora da vista (prévias). */
  tableVisible?: boolean;
  /** true: a tabela fica recolhida sob "Ver valores por mês" (blocos lado a lado). */
  tableCollapsed?: boolean;
  /** Altura do gráfico em px. */
  height?: number;
  /** Só a tabela: o gráfico segue sempre do mais antigo (esquerda) ao mais novo. */
  tableOrder?: "oldest-first" | "newest-first";
  /**
   * Título da tabela, acima do "Ver valores por mês". Com ele, título e tabela descem para
   * o rodapé do bloco, alinhados com um bloco vizinho de mesma forma.
   */
  tableHeader?: ReactNode;
}) {
  const [ref, width] = useChartWidth<HTMLDivElement>();
  const transition = useGeometryTransition();
  const introTransition = useIntroTransition();
  const { active, bind } = useLinkedHighlight();
  const layout = width === null ? null : pairedBarsLayout(data, width, height);
  // Último mês em foco: a caixa some por opacidade sem perder o conteúdo, e na próxima
  // vez desliza dali para o mês novo. Só monta na primeira vez, já no lugar certo.
  const [shown, setShown] = useState<number | null>(null);
  if (active !== null && active !== shown) setShown(active);
  // Outra página pode ter menos meses: um foco antigo fora da lista não é desenhado.
  const focus = shown !== null && shown < data.length ? shown : null;

  // A linha guarda o índice do mês no gráfico, para o destaque ligado seguir certo.
  const rows = data.map((month, index) => ({ month, index }));
  if (tableOrder === "newest-first") rows.reverse();

  const table = (
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
        {rows.map(({ month, index }) => (
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
  );

  // Com título, a tabela ganha um quadro com altura mínima vinda do bloco vizinho.
  const framed = tableHeader ? <div className={styles.tableFrame}>{table}</div> : table;

  const tableValues = tableCollapsed ? (
    <SyncedDetails
      className={styles.values}
      summaryClassName={styles.valuesSummary}
      summary={
        <>
          Ver valores por mês
          <IconChevronDown className={styles.valuesChevron} size={16} />
        </>
      }
    >
      {framed}
    </SyncedDetails>
  ) : (
    framed
  );

  return (
    <figure className={tableHeader ? `${styles.chart} ${styles.chartFill}` : styles.chart}>
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

      <div ref={ref} className={styles.plotArea} style={{ height }}>
        {layout && width !== null ? (
          <svg
            className={styles.svg}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
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
                  <text x={month.center} y={height - 6} textAnchor="middle">
                    {partial ? `${month.month}*` : month.month}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : null}
        {/* Faixa de foco e detalhe do mês sob o cursor; decorativos, os valores estão na tabela. */}
        {layout && width !== null && focus !== null ? (
          <>
            <div
              className={styles.focusBand}
              data-visible={active === null ? undefined : ""}
              style={{
                top: layout.plot.top,
                width: layout.months[focus].band.width,
                height: layout.plot.bottom - layout.plot.top,
                transform: `translateX(${layout.months[focus].band.x}px)`,
              }}
              aria-hidden
            />
            <div
              className={styles.tooltip}
              data-visible={active === null ? undefined : ""}
              style={{
                transform: `translateX(${Math.min(Math.max(layout.months[focus].center, TOOLTIP_HALF), width - TOOLTIP_HALF)}px) translateX(-50%)`,
              }}
              aria-hidden
            >
              <p className={styles.tooltipTitle}>
                {data[focus].monthName}
                {data[focus].partial ? " · parcial" : ""}
              </p>
              <p className={styles.tooltipRow}>
                <span>Entradas</span>
                <span className={styles.num}>{formatMoney(data[focus].inflow)}</span>
              </p>
              <p className={styles.tooltipRow}>
                <span>Saídas</span>
                <span className={styles.num}>{formatMoney(data[focus].outflow)}</span>
              </p>
              <p className={styles.tooltipRow}>
                <span>Resultado</span>
                <span className={styles.num}>{formatMoney(data[focus].net)}</span>
              </p>
            </div>
          </>
        ) : null}
      </div>

      {tableHeader ? (
        <div className={styles.tableBlock}>
          {tableHeader}
          {tableValues}
        </div>
      ) : (
        tableValues
      )}
    </figure>
  );
}
