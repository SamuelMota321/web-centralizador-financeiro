import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { barRatio, formatShare, maxValue, rankByValue } from "./model";

export interface RankedItem {
  id: string;
  label: string;
  value: string;
  /** Soma do que ainda não tem categoria segura (D-06): hachurado em atenção. */
  review?: boolean;
}

/**
 * Barras horizontais do maior para o menor, com valor e percentual sobre `total`
 * (bloco 5 da Visão geral). Rótulo, valor e percentual ficam em texto em cada linha;
 * a barra só reforça a comparação. Componente de servidor: a transição é CSS.
 */
export function RankedBars({
  caption,
  items,
  total,
}: {
  caption: string;
  items: readonly RankedItem[];
  total: string;
}) {
  const ranked = rankByValue(items);
  const max = maxValue(ranked.map((item) => item.value));

  return (
    <figure className={styles.chart}>
      <figcaption className="visually-hidden">{caption}</figcaption>
      <ol className={styles.ranked}>
        {ranked.map((item) => (
          <li key={item.id} className={item.review ? `${styles.rankedItem} ${styles.review}` : styles.rankedItem}>
            <span className={styles.rankedLabel}>{item.label}</span>
            <span className={styles.rankedTrack} aria-hidden>
              <i
                className={styles.rankedBar}
                style={{ "--ratio": barRatio(item.value, max) } as React.CSSProperties}
              />
            </span>
            <span className={`${styles.rankedValue} ${styles.num}`}>{formatMoney(item.value)}</span>
            <span className={`${styles.rankedPct} ${styles.num}`}>{formatShare(item.value, total) ?? "—"}</span>
          </li>
        ))}
      </ol>
    </figure>
  );
}
