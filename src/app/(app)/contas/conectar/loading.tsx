import { SkeletonLine, ui } from "@/components/ui";
import styles from "./conectar.module.css";

export default function Loading() {
  return (
    <div className={styles.page} role="status" aria-label="Carregando a conexão com o banco">
      <div>
        <SkeletonLine width="12rem" height={28} />
        <div style={{ height: 10 }} />
        <SkeletonLine width="24rem" />
      </div>
      {/* Mesma forma do primeiro passo: título, lista do que será autorizado e o botão. */}
      <div className={ui.panel} aria-hidden>
        <SkeletonLine width="12rem" height={16} />
        <SkeletonLine width="80%" />
        <SkeletonLine width="70%" />
        <SkeletonLine width="75%" />
        <SkeletonLine width="9rem" height={40} />
      </div>
    </div>
  );
}
