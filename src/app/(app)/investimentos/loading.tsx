import { SkeletonLine } from "@/components/ui";
import styles from "./investimentos.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando seus investimentos">
      <div>
        <SkeletonLine width="12rem" height={28} />
        <div style={{ height: 10 }} />
        <SkeletonLine width="20rem" />
      </div>
      {/* Mesma forma: resumo e tabela de posições. */}
      <div className={styles.skeletonBlock} aria-hidden>
        <SkeletonLine width="9rem" height={12} />
        <SkeletonLine width="14rem" height={28} />
      </div>
      <div className={styles.skeletonBlock} aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonLine key={index} width={`${90 - index * 6}%`} />
        ))}
      </div>
    </div>
  );
}
