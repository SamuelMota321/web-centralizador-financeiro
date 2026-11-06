"use client";

import * as m from "motion/react-m";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId } from "react";
import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { barRatio, donutArcs, formatShare, maxValue, type DonutItem } from "./model";
import { useGeometryTransition, useLinkedHighlight } from "./use-chart";

const SIZE = 168;
const STROKE = 18;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Composição dos gastos (Style Guide 2.1): rosca com o total no centro e a lista ao lado
 * com cor, valor e percentual de cada fatia. A rosca dá a proporção de relance; quem
 * permite comparar é a lista, sempre escrita. Recebe as fatias já agrupadas (donutItems).
 * Com `links`, cada categoria filtra o que a tela mostra embaixo: pela lista (teclado e
 * mouse) ou pela fatia (só mouse; a fatia é decorativa para leitores de tela).
 */
export function DonutChart({
  caption,
  items,
  total,
  links,
  selectedId = null,
}: {
  caption: string;
  items: readonly DonutItem[];
  total: string;
  /** href por id de fatia; fatia sem href (como "Outras") não filtra. */
  links?: Readonly<Record<string, string>>;
  selectedId?: string | null;
}) {
  const router = useRouter();
  const transition = useGeometryTransition();
  const { active, bind } = useLinkedHighlight();
  // Ids do React trazem caracteres que quebram url(#…).
  const hatchId = `hatch-${useId().replace(/[^a-zA-Z0-9-]/g, "")}`;
  const arcs = donutArcs(items, total, CIRCUMFERENCE);
  const max = maxValue(items.map((item) => item.value));
  const paint = (item: DonutItem) => (item.review ? `url(#${hatchId})` : item.color);

  return (
    <figure className={styles.donutChart}>
      <figcaption className="visually-hidden">{caption}</figcaption>
      <div className={styles.donutWrap}>
        <svg
          className={styles.donut}
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          aria-hidden
          data-active={active === null ? undefined : ""}
          data-selected={selectedId === null ? undefined : ""}
        >
          <defs>
            <pattern id={hatchId} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="2" height="5" className={styles.hatchStripe} />
            </pattern>
          </defs>
          <circle className={styles.donutTrack} cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} strokeWidth={STROKE} />
          {/* Começa no topo e segue no sentido horário. */}
          <g transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            {items.map((item, index) => (
              <m.circle
                key={item.id}
                className={links?.[item.id] ? `${styles.donutArc} ${styles.donutArcLink}` : styles.donutArc}
                data-active={active === index ? "" : undefined}
                data-selected={selectedId === item.id ? "" : undefined}
                onClick={links?.[item.id] ? () => router.push(links[item.id], { scroll: false }) : undefined}
                cx={SIZE / 2}
                cy={SIZE / 2}
                r={RADIUS}
                strokeWidth={STROKE}
                style={{ stroke: paint(item) }}
                initial={false}
                animate={{
                  strokeDasharray: `${arcs[index].length} ${CIRCUMFERENCE}`,
                  strokeDashoffset: -arcs[index].start,
                }}
                transition={transition}
                {...bind(index)}
              />
            ))}
          </g>
        </svg>
        <p className={styles.donutCenter}>
          <span className={styles.donutLabel}>Total</span>
          <span className={styles.donutTotal}>{formatMoney(total)}</span>
        </p>
      </div>

      <ol className={styles.donutList} data-selected={selectedId === null ? undefined : ""}>
        {items.map((item, index) => {
          const href = links?.[item.id];
          const selected = selectedId === item.id;
          const content = (
            <>
              <span
                className={item.review ? `${styles.donutSwatch} ${styles.hatched}` : styles.donutSwatch}
                style={item.review ? undefined : { background: item.color }}
                aria-hidden
              />
              <span className={styles.donutName}>{item.label}</span>
              <span className={`${styles.donutValue} ${styles.num}`}>{formatMoney(item.value)}</span>
              <span className={`${styles.donutPct} ${styles.num}`}>{formatShare(item.value, total) ?? "—"}</span>
              <span className={styles.donutBarTrack} aria-hidden>
                <i
                  className={item.review ? `${styles.donutBar} ${styles.hatched}` : styles.donutBar}
                  style={
                    {
                      "--ratio": barRatio(item.value, max),
                      ...(item.review ? {} : { background: item.color }),
                    } as React.CSSProperties
                  }
                />
              </span>
            </>
          );
          const rowProps = {
            className: styles.donutItem,
            "data-active": active === index ? "" : undefined,
            "data-selected": selected ? "" : undefined,
            ...bind(index),
          };
          return (
            <li key={item.id}>
              {href ? (
                <Link
                  {...rowProps}
                  className={`${styles.donutItem} ${styles.donutItemLink}`}
                  href={href}
                  scroll={false}
                  aria-current={selected ? "true" : undefined}
                >
                  {content}
                  <span className="visually-hidden">
                    {selected ? ". Filtro ativo; escolha de novo para mostrar todas" : ". Mostrar só estas saídas"}
                  </span>
                </Link>
              ) : (
                <div {...rowProps}>{content}</div>
              )}
            </li>
          );
        })}
      </ol>
    </figure>
  );
}
