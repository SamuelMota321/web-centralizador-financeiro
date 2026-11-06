import { formatMoney } from "@/lib/money";
import styles from "./charts.module.css";
import { barRatio, formatShare } from "./model";

export interface ShareItem {
  id: string;
  label: string;
  value: string;
  /** Parte sem classe conhecida: hachurada e nunca diluída nas outras. */
  unclassified?: boolean;
}

const RAMP = ["var(--ramp-1)", "var(--ramp-2)", "var(--ramp-3)", "var(--ramp-4)"];

/**
 * Composição em barra 100% com tabela ao lado (alocação da HU-011, investimentos por
 * classe no bloco 7). A rampa neutra se repete depois de quatro classes; quem
 * identifica cada parte é o rótulo na tabela, não a cor. Componente de servidor.
 */
export function ShareBar({
  caption,
  items,
  total,
}: {
  caption: string;
  items: readonly ShareItem[];
  total: string;
}) {
  const swatch = (item: ShareItem, index: number) =>
    ({ "--swatch": item.unclassified ? undefined : RAMP[index % RAMP.length] }) as React.CSSProperties;

  return (
    <figure className={styles.chart}>
      <div className={styles.share} aria-hidden>
        {items.map((item, index) => (
          <i
            key={item.id}
            className={item.unclassified ? styles.unclassified : undefined}
            style={{ ...swatch(item, index), "--share": barRatio(item.value, total) } as React.CSSProperties}
          />
        ))}
      </div>

      <table className={styles.table}>
        <caption className="visually-hidden">{caption}</caption>
        <thead>
          <tr>
            <th scope="col">Classe</th>
            <th scope="col" className={styles.num}>
              Valor
            </th>
            <th scope="col" className={styles.num}>
              Parte
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={item.id}>
              <th scope="row">
                <span className={styles.rowLabel}>
                  <span
                    className={item.unclassified ? `${styles.swatch} ${styles.unclassified}` : styles.swatch}
                    style={swatch(item, index)}
                    aria-hidden
                  />
                  {item.label}
                </span>
              </th>
              <td className={styles.num}>{formatMoney(item.value)}</td>
              <td className={styles.num}>{formatShare(item.value, total) ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
