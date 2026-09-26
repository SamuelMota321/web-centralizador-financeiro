import { SkeletonLine } from "@/components/ui";
import styles from "./movimentacoes.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando suas movimentações">
      <div>
        <SkeletonLine width="13rem" height={28} />
        <div style={{ height: 10 }} />
        <SkeletonLine width="18rem" />
      </div>
      {/* Mesma forma do histórico: um dia e suas linhas. */}
      <div className={styles.historyPanel} aria-hidden>
        <div className={styles.skeletonDay}>
          <SkeletonLine width="11rem" height={10} />
        </div>
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className={styles.skeletonRow}>
            <SkeletonLine width="34px" height={34} />
            <span className={styles.skeletonText}>
              <SkeletonLine width={`${55 - index * 4}%`} />
              <SkeletonLine width="35%" height={10} />
            </span>
            <SkeletonLine width="5.5rem" />
          </div>
        ))}
      </div>
    </div>
  );
}
