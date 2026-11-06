import styles from "./charts.module.css";
import { sparkline } from "./model";

/**
 * Tendência curta ao lado de um número da faixa. Decorativa: o número e a linha de
 * metadados dizem o valor. Mês em andamento termina tracejado, com o ponto vazado.
 */
export function Sparkline({
  values,
  partialLast = false,
  width = 120,
  height = 40,
}: {
  values: readonly string[];
  partialLast?: boolean;
  width?: number;
  height?: number;
}) {
  if (values.length < 2) return null;
  const line = sparkline(values, width, height, partialLast);

  return (
    <svg className={styles.spark} width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <path className={styles.sparkLine} d={line.solid} />
      {line.partial ? <path className={`${styles.sparkLine} ${styles.sparkPartial}`} d={line.partial} /> : null}
      <circle
        className={partialLast ? styles.sparkOpen : styles.sparkLast}
        cx={line.last.x}
        cy={line.last.y}
        r={3}
      />
    </svg>
  );
}
