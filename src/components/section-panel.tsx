import type { ReactNode } from "react";
import ui from "./ui.module.css";

/**
 * Bloco de seção com o cabeçalho dentro da borda: ícone, título, contagem, texto de apoio e
 * ações à direita (busca, ordenação). O conteúdo (tabela, fileira) vem logo abaixo.
 */
export function SectionPanel({
  id,
  icon,
  title,
  count,
  hint,
  actions,
  children,
}: {
  id: string;
  icon: ReactNode;
  title: ReactNode;
  count?: number;
  hint?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={ui.sectionPanel} aria-labelledby={id}>
      <header className={ui.sectionPanelHead}>
        <span className={ui.sectionPanelIcon} aria-hidden>
          {icon}
        </span>
        <div className={ui.sectionPanelText}>
          <h2 id={id} className={ui.sectionPanelTitle}>
            {title}
            {count !== undefined ? <span className={ui.countPill}>{count}</span> : null}
          </h2>
          {hint ? <p className={ui.sectionPanelHint}>{hint}</p> : null}
        </div>
        {actions ? <div className={ui.sectionPanelActions}>{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}
