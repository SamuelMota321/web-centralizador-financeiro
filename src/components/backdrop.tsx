import { useId } from "react";
import { VIEW_HEIGHT, WAVES, wavePath } from "./backdrop-paths";
import styles from "./backdrop.module.css";

/**
 * Decoração de fundo do app (Style Guide 2.3): ondas verdes suaves em três camadas, com deriva
 * muito lenta. Fica atrás de tudo, sem capturar clique e fora da leitura de tela; some antes das
 * tabelas por máscara. Só `transform` anima; com "reduzir movimento" fica parada.
 *
 * `side`: base da lateral. `top`: canto superior da área de conteúdo.
 */
export function Backdrop({ zone }: { zone: "side" | "top" }) {
  const gradient = useId();
  return (
    <div className={`${styles.zone} ${zone === "side" ? styles.side : styles.top}`} aria-hidden="true" data-zone={zone}>
      <div className={styles.glow} />
      {WAVES.map((wave) => (
        <svg
          key={wave.id}
          className={`${styles.wave} ${styles[wave.id]}`}
          viewBox={`0 0 ${wave.period * 2} ${VIEW_HEIGHT}`}
          preserveAspectRatio="none"
          focusable="false"
        >
          <defs>
            <linearGradient id={`${gradient}-${wave.id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" style={{ stopColor: "rgb(var(--deco-rgb))", stopOpacity: 1 }} />
              <stop offset="1" style={{ stopColor: "rgb(var(--deco-rgb))", stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          <path d={wavePath(wave.period, wave.amplitude, wave.baseline)} fill={`url(#${gradient}-${wave.id})`} />
        </svg>
      ))}
      <div className={styles.grain} />
    </div>
  );
}
