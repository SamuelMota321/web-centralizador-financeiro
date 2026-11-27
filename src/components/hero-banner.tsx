import type { ReactNode } from "react";
import ui from "./ui.module.css";

/**
 * Faixa de destaque: ícone, título, texto e uma ação. O gradiente é sutil e só aparece aqui
 * (identidade "Instrumento de precisão": o verde é sinal, não decoração). Não se fecha: fechar
 * exigiria guardar a preferência.
 */
export function HeroBanner({
  icon,
  title,
  children,
  action,
  tone = "primary",
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
  tone?: "primary" | "neutral";
}) {
  return (
    <section className={ui.heroBanner} data-tone={tone} aria-label={title}>
      <span className={ui.heroIcon} aria-hidden>
        {icon}
      </span>
      <div className={ui.heroText}>
        <p className={ui.heroTitle}>{title}</p>
        <div className={ui.heroBody}>{children}</div>
      </div>
      {action ? <div className={ui.heroAction}>{action}</div> : null}
    </section>
  );
}
