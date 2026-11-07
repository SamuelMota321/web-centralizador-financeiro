"use client";

import { type PointerEvent, useState } from "react";
import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { sparkline } from "./model";

/**
 * Tendência curta ao lado de um número da faixa. Ao passar o mouse no número, a linha se
 * redesenha e o último ponto pulsa (CSS); sobre o minigráfico, um ponto percorre os meses e
 * mostra o mês e o valor. Mês em andamento termina tracejado, com o ponto vazado.
 * Decorativo para leitores de tela: o número e a linha de metadados dizem o valor.
 */
export function Sparkline({
  values,
  labels,
  partialLast = false,
  width = 120,
  height = 40,
}: {
  values: readonly string[];
  /** Rótulo de cada valor ("set"), mostrado ao percorrer os meses. */
  labels?: readonly string[];
  partialLast?: boolean;
  width?: number;
  height?: number;
}) {
  const [active, setActive] = useState<number | null>(null);
  // Último ponto percorrido: ao sair, ponto e etiqueta somem sem perder a posição.
  const [shown, setShown] = useState<number | null>(null);
  if (active !== null && active !== shown) setShown(active);

  if (values.length < 2) return null;
  const line = sparkline(values, width, height, partialLast);
  const focus = shown !== null && shown < line.points.length ? line.points[shown] : null;

  const onPointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (event.pointerType !== "mouse") return;
    const box = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - box.left) / box.width) * width;
    const step = width / (values.length - 1);
    setActive(Math.min(values.length - 1, Math.max(0, Math.round(x / step))));
  };

  return (
    <span className={styles.sparkWrap}>
      <svg
        className={styles.spark}
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        onPointerMove={onPointerMove}
        onPointerLeave={() => setActive(null)}
        aria-hidden
      >
        <path className={`${styles.sparkLine} ${styles.sparkDraw}`} d={line.solid} pathLength={1} />
        {line.partial ? <path className={`${styles.sparkLine} ${styles.sparkPartial}`} d={line.partial} /> : null}
        <circle
          className={partialLast ? styles.sparkOpen : styles.sparkLast}
          cx={line.last.x}
          cy={line.last.y}
          r={3}
        />
        {focus ? (
          <circle
            className={styles.sparkScrub}
            data-visible={active === null ? undefined : ""}
            r={3.5}
            style={{ transform: `translate(${focus.x}px, ${focus.y}px)` }}
          />
        ) : null}
      </svg>
      {focus && shown !== null && labels?.[shown] ? (
        <span
          className={styles.sparkLabel}
          data-visible={active === null ? undefined : ""}
          style={{ transform: `translateX(${focus.x}px) translateX(-50%)` }}
          aria-hidden
        >
          {labels[shown]} · {formatMoney(values[shown])}
        </span>
      ) : null}
    </span>
  );
}
