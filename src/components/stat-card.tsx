import type { ReactNode } from "react";
import ui from "./ui.module.css";

/**
 * Card de resumo do topo das telas. Só recebe números que o backend entrega ou contagens da
 * própria lista: nunca saldo inventado. A barra é reforço visual; a linha de apoio diz o mesmo
 * em texto. Nada anima.
 */
export function StatCard({
  icon,
  label,
  value,
  meta,
  share,
}: {
  icon?: ReactNode;
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  /** Parte do total, de 0 a 1. */
  share?: number;
}) {
  return (
    <div className={ui.statCard}>
      {icon ? <span className={ui.statIcon}>{icon}</span> : null}
      <div className={ui.statBody}>
        <p className={ui.statLabel}>{label}</p>
        <p className={`${ui.statValue} tabular`}>{value}</p>
        {meta ? <p className={ui.statMeta}>{meta}</p> : null}
        {share !== undefined ? (
          <span className={ui.statMeter} aria-hidden>
            <i style={{ width: `${Math.min(Math.max(share, 0), 1) * 100}%` }} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

/** Grade responsiva dos cards; a região tem nome para leitores de tela. */
export function StatGrid({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={ui.statGrid} aria-label={label}>
      {children}
    </section>
  );
}
