import { SkeletonLine } from "@/components/ui";
import { SlowLoadHint } from "@/components/slow-load-hint";
import styles from "./patrimonio.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando bens e dívidas">
      <SlowLoadHint />
      <div>
        <SkeletonLine width="12rem" height={28} />
        <div style={{ height: 10 }} />
        <SkeletonLine width="22rem" />
      </div>
      {/* Mesma forma: três seções com título e linhas. */}
      {Array.from({ length: 3 }, (_, section) => (
        <div key={section} className={styles.skeletonBlock} aria-hidden>
          <SkeletonLine width="8rem" height={14} />
          <SkeletonLine width="85%" />
          <SkeletonLine width="70%" />
        </div>
      ))}
    </div>
  );
}
