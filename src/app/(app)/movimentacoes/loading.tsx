import { SkeletonLine, ui } from "@/components/ui";
import styles from "./movimentacoes.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando suas movimentações">
      <div>
        <SkeletonLine width="12rem" height={24} />
        <div style={{ height: 8 }} />
        <SkeletonLine width="18rem" />
      </div>
      <ul className={ui.list} aria-hidden>
        {Array.from({ length: 6 }, (_, index) => (
          <li key={index} className={styles.skeletonRow}>
            <SkeletonLine width="32px" height={32} />
            <span className={styles.skeletonText}>
              <SkeletonLine width={`${55 - index * 4}%`} />
              <SkeletonLine width="35%" height={10} />
            </span>
            <SkeletonLine width="5.5rem" />
          </li>
        ))}
      </ul>
    </div>
  );
}
