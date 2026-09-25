import Link from "next/link";
import type { ReactNode } from "react";
import { pageWindow } from "@/lib/page-window";
import {
  IconAlert,
  IconCheck,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconInfo,
} from "./icons";
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

/**
 * Rótulo de botão de envio: durante o envio mostra o indicador e o gerúndio.
 * O botão continua com `aria-busy` e `disabled`; isto é só a parte visível.
 */
export function PendingLabel({
  pending,
  idle,
  busy,
}: {
  pending: boolean;
  idle: ReactNode;
  busy: ReactNode;
}) {
  return pending ? (
    <>
      <span className={ui.spinner} aria-hidden />
      {busy}
    </>
  ) : (
    <>{idle}</>
  );
}

/** Explicação permanente que o usuário pode recolher (divulgação progressiva). */
export function Disclosure({
  icon,
  summary,
  defaultOpen,
  children,
}: {
  icon: ReactNode;
  summary: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={ui.disclosure} open={defaultOpen}>
      <summary className={ui.disclosureSummary}>
        {icon}
        {summary}
        <IconChevronDown className={ui.disclosureChevron} size={18} />
      </summary>
      <div className={ui.disclosureBody}>{children}</div>
    </details>
  );
}

/** Bloco de esqueleto com largura configuravel. */
export function SkeletonLine({ width = "100%", height = 12 }: { width?: string; height?: number }) {
  return <span className={ui.skeleton} style={{ width, height }} aria-hidden />;
}

/**
 * Paginação numerada das listas (20 itens por página). No celular fica só
 * Anterior / "página de total" / Próxima; os números aparecem a partir do tablet.
 */
export function Pagination({
  page,
  pages,
  href,
  label,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
  /** Nome da navegação para leitores de tela, ex.: "Páginas do histórico". */
  label: string;
}) {
  if (pages <= 1) return null;

  return (
    <nav className={ui.pagination} aria-label={label}>
      {page > 1 ? (
        <Link className={ui.pageLink} href={href(page - 1)}>
          <IconChevronLeft size={16} />
          Anterior
        </Link>
      ) : (
        <span className={`${ui.pageLink} ${ui.pageLinkDisabled}`} aria-hidden>
          <IconChevronLeft size={16} />
          Anterior
        </span>
      )}

      <ol className={ui.pageNumbers}>
        {pageWindow(page, pages).map((slot, index) =>
          slot === "gap" ? (
            <li key={`gap-${index}`} className={ui.pageGap} aria-hidden>
              …
            </li>
          ) : (
            <li key={slot}>
              <Link
                className={ui.pageNumber}
                href={href(slot)}
                aria-current={slot === page ? "page" : undefined}
                aria-label={`Página ${slot}`}
              >
                {slot}
              </Link>
            </li>
          ),
        )}
      </ol>
      <span className={`${ui.pageSummary} tabular`}>
        {page} de {pages}
      </span>

      {page < pages ? (
        <Link className={`${ui.pageLink} ${ui.pageLinkNext}`} href={href(page + 1)}>
          Próxima
          <IconChevronRight size={16} />
        </Link>
      ) : (
        <span className={`${ui.pageLink} ${ui.pageLinkNext} ${ui.pageLinkDisabled}`} aria-hidden>
          Próxima
          <IconChevronRight size={16} />
        </span>
      )}
    </nav>
  );
}
