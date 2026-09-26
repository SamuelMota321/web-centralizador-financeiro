import { SkeletonLine, ui } from "@/components/ui";
import styles from "./regras.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando suas regras">
      <div>
        <SkeletonLine width="8rem" height={24} />
        <div style={{ height: 8 }} />
        <SkeletonLine width="20rem" />
      </div>
      <ul className={ui.list} aria-hidden>
        {Array.from({ length: 4 }, (_, index) => (
          <li key={index} className={styles.skeletonRow}>
            <SkeletonLine width={`${62 - index * 5}%`} />
            <SkeletonLine width="4rem" height={18} />
          </li>
        ))}
      </ul>
    </div>
  );
}
