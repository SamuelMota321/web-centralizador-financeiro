import { barRatio } from "@/components/charts/model";
import { formatMoney } from "@/lib/money";
import type { CompositionItem } from "./presentation";
import styles from "./categorias.module.css";

/**
 * Para onde foram as despesas do período, numa barra 100%. Larguras pelos valores exatos;
 * o percentual escrito tem uma casa e não é forçado a fechar 100%. "Sem categoria" fica
 * hachurado e por último, para não esconder o que falta categorizar.
 */
export function Composition({ items, total, periodName }: { items: CompositionItem[]; total: string; periodName: string }) {
  return (
    <section className={styles.composition} aria-labelledby="composicao-titulo">
      <div className={styles.compositionHead}>
        <h2 id="composicao-titulo" className={styles.compositionTitle}>
          Para onde foram as despesas
        </h2>
        <p className={`${styles.compositionTotal} tabular`}>
          {formatMoney(total)} <span>em {periodName}, sem transferências</span>
        </p>
      </div>
      <div className={styles.compositionBar} aria-hidden>
        {items.map((item) => (
          <i
            key={item.id}
            data-uncategorized={item.uncategorized || undefined}
            style={{ "--part": barRatio(item.value, total), "--part-color": item.color } as React.CSSProperties}
          />
        ))}
      </div>
      <ul className={styles.compositionLegend}>
        {items.map((item) => (
          <li key={item.id}>
            <span
              className={styles.compositionSwatch}
              data-uncategorized={item.uncategorized || undefined}
              style={{ "--part-color": item.color } as React.CSSProperties}
              aria-hidden
            />
            <span className={styles.compositionLabel}>{item.label}</span>
            <span className="tabular">{item.share}</span>
            <span className={`${styles.compositionValue} tabular`}>{formatMoney(item.value)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
