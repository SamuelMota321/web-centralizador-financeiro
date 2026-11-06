import { SkeletonLine } from "@/components/ui";
import styles from "./visao-geral.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando a visão geral">
      <div>
        <SkeletonLine width="11rem" height={28} />
        <div style={{ height: 10 }} />
        <SkeletonLine width="9rem" />
      </div>
      {/* Mesma forma da tela: faixa de três números, saldos e dois blocos. */}
      <div className={styles.figures} aria-hidden>
        {Array.from({ length: 3 }, (_, index) => (
          <div key={index} className={styles.figure}>
            <SkeletonLine width="6rem" height={10} />
            <SkeletonLine width="9rem" height={28} />
            <SkeletonLine width="7rem" height={10} />
          </div>
        ))}
      </div>
      <div className={styles.skeletonPanel} aria-hidden>
        <SkeletonLine width="8rem" height={14} />
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonLine key={index} width={`${92 - index * 6}%`} height={18} />
        ))}
      </div>
      <div className={styles.columns} aria-hidden>
        <div className={styles.skeletonPanel}>
          <SkeletonLine width="10rem" height={14} />
          <SkeletonLine height={190} />
        </div>
        <div className={styles.skeletonPanel}>
          <SkeletonLine width="9rem" height={14} />
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonLine key={index} width={`${90 - index * 14}%`} height={10} />
          ))}
        </div>
      </div>
    </div>
  );
}
