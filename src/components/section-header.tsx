import type { ReactNode } from "react";
import ui from "./ui.module.css";

/** Título de seção com pílula de contagem e ações à direita (busca, ordenação, filtros). */
export function SectionHeader({
  id,
  title,
  count,
  hint,
  actions,
}: {
  id: string;
  title: string;
  count?: number;
  hint?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={ui.sectionHeader}>
      <div className={ui.sectionHeaderText}>
        <h2 id={id} className={ui.sectionHeaderTitle}>
          {title}
          {count !== undefined ? <span className={ui.countPill}>{count}</span> : null}
        </h2>
        {hint ? <p className={ui.sectionHeaderHint}>{hint}</p> : null}
      </div>
      {actions ? <div className={ui.sectionHeaderActions}>{actions}</div> : null}
    </div>
  );
}
