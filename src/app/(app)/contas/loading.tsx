import { SkeletonLine, ui } from "@/components/ui";
import styles from "./contas.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando suas contas">
      <div>
        <SkeletonLine width="8rem" height={24} />
        <div style={{ height: 8 }} />
        <SkeletonLine width="12rem" />
      </div>
      <ul className={ui.list} aria-hidden>
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className={styles.skeletonRow}>
            <SkeletonLine width={`${38 - index * 3}%`} />
            <SkeletonLine width="6rem" />
          </li>
        ))}
      </ul>
    </div>
  );
}
