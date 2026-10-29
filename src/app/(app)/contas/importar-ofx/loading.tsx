import { SkeletonLine, ui } from "@/components/ui";
import styles from "./importar-ofx.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando a importação de extrato">
      <div>
        <SkeletonLine width="15rem" height={28} />
        <div style={{ height: 10 }} />
        <SkeletonLine width="24rem" />
      </div>
      {/* Mesma forma do primeiro passo: título, dois campos e o botão. */}
      <div className={ui.panel} aria-hidden>
        <SkeletonLine width="9rem" height={16} />
        <SkeletonLine width="70%" />
        <SkeletonLine width="100%" height={40} />
        <SkeletonLine width="100%" height={40} />
        <SkeletonLine width="8rem" height={40} />
      </div>
    </div>
  );
}
