import type { ReactNode } from "react";
import ui from "./ui.module.css";

/**
 * Faixa de destaque: ícone (ou ilustração), título, texto e uma ação. É o único lugar com
 * gradiente, suave e verde (exceção registrada no DESIGN.md). Não se fecha: fechar exigiria
 * guardar a preferência.
 */
export function HeroBanner({
  icon,
  media,
  title,
  children,
  action,
}: {
  icon?: ReactNode;
  /** Ilustração decorativa maior, no lugar do ícone. */
  media?: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={ui.heroBanner} data-media={media ? "" : undefined} aria-label={title}>
      {media ? (
        <span className={ui.heroMedia} aria-hidden>
          {media}
        </span>
      ) : (
        <span className={ui.heroIcon} aria-hidden>
          {icon}
        </span>
      )}
      <div className={ui.heroText}>
        <p className={ui.heroTitle}>{title}</p>
        <div className={ui.heroBody}>{children}</div>
      </div>
      {action ? <div className={ui.heroAction}>{action}</div> : null}
    </section>
  );
}
