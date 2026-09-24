import type { ReactNode } from "react";
import { IconAlert, IconCheck, IconInfo } from "./icons";
import ui from "./ui.module.css";

export { ui };

/** Titulo da tela, linha de contexto e acao principal, alinhados pela base. */
export function PageHeader({
  title,
  context,
  actions,
}: {
  title: string;
  context?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className={ui.pageHeader}>
      <div>
        <h1 className={ui.pageTitle}>{title}</h1>
        {context ? <p className={ui.pageContext}>{context}</p> : null}
      </div>
      {actions ? <div className={ui.pageActions}>{actions}</div> : null}
    </header>
  );
}

export type NoticeTone = "success" | "info" | "warning" | "error";

const NOTICE_ICONS = {
  success: IconCheck,
  info: IconInfo,
  warning: IconAlert,
  error: IconAlert,
} as const;

/** Aviso com icone e texto; erro usa role=alert, os demais role=status. */
export function Notice({
  tone,
  children,
  actions,
  className,
}: {
  tone: NoticeTone;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const Icon = NOTICE_ICONS[tone];
  return (
    <div
      className={`${ui.notice} ${className ?? ""}`}
      data-tone={tone}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon size={18} />
      <div className={ui.noticeBody}>
        <div>{children}</div>
        {actions ? <div className={ui.noticeActions}>{actions}</div> : null}
      </div>
    </div>
  );
}

export type ChipTone = "positive" | "warning" | "info" | "neutral";

/** Ponto colorido + texto: a cor nunca aparece sozinha. */
export function StatusChip({ tone, children }: { tone: ChipTone; children: ReactNode }) {
  return (
    <span className={ui.chip} data-tone={tone}>
      <span className={ui.chipLabel}>{children}</span>
    </span>
  );
}

/** Estado vazio que ensina a area e oferece a acao que a inicia. */
export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className={ui.empty}>
      <span className={ui.emptyIcon}>{icon}</span>
      <h2 className={ui.emptyTitle}>{title}</h2>
      <p className={ui.emptyText}>{children}</p>
      {action ? <div className={ui.emptyAction}>{action}</div> : null}
    </section>
  );
}

export function FieldError({ id, message }: { id: string; message: string | undefined }) {
  if (!message) return null;
  return (
    <p className={ui.fieldError} id={id}>
      <IconAlert size={15} />
      <span>{message}</span>
    </p>
  );
}

/** Liga o campo a mensagem de erro para leitores de tela. */
export function errorProps(id: string, message: string | undefined) {
  return message ? { "aria-invalid": true, "aria-describedby": id } : {};
}

/** Bloco de esqueleto com largura configuravel. */
export function SkeletonLine({ width = "100%", height = 12 }: { width?: string; height?: number }) {
  return <span className={ui.skeleton} style={{ width, height }} aria-hidden />;
}
