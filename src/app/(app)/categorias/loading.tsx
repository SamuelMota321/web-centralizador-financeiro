import { SkeletonLine, ui } from "@/components/ui";
import styles from "./categorias.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando suas categorias">
      <div>
        <SkeletonLine width="10rem" height={24} />
        <div style={{ height: 8 }} />
        <SkeletonLine width="16rem" />
      </div>
      <ul className={ui.list} aria-hidden>
        {Array.from({ length: 5 }, (_, index) => (
          <li key={index} className={styles.skeletonRow}>
            <SkeletonLine width={`${40 - index * 4}%`} />
            <SkeletonLine width="4rem" height={18} />
          </li>
        ))}
      </ul>
    </div>
  );
}
