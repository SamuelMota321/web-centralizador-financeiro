"use client";

import { useActionState, useId, useState } from "react";
import { errorProps, FieldError, Notice, StatusChip, ui } from "@/components/ui";
import type { Category } from "@/lib/categories/types";
import {
  archiveCategoryAction,
  type ArchiveCategoryState,
  type CategoryFormState,
  renameCategoryAction,
} from "./actions";
import { CATEGORY_STATUS_LABELS } from "./category-names";
import styles from "./categorias.module.css";

const ARCHIVE_INITIAL: ArchiveCategoryState = { status: "idle" };
const RENAME_INITIAL: CategoryFormState = { status: "idle" };

type Panel = "none" | "rename" | "archive";

export function CategoryItem({ category }: { category: Category }) {
  const [panel, setPanel] = useState<Panel>("none");
  const archived = category.status === "archived";

  return (
    <li className={styles.row} data-archived={archived || undefined}>
      <div className={styles.rowMain}>
        <p className={styles.rowTitle}>{category.name}</p>
        {archived ? (
          <p className={styles.rowMeta}>Continua no histórico; não pode mais ser atribuída.</p>
        ) : null}
      </div>

      <StatusChip tone={archived ? "neutral" : "positive"}>
        {CATEGORY_STATUS_LABELS[category.status]}
      </StatusChip>

      <div className={styles.rowActions}>
        {archived ? null : (
          <>
            <button
              className={ui.linkButton}
              type="button"
              aria-expanded={panel === "rename"}
              onClick={() => setPanel(panel === "rename" ? "none" : "rename")}
            >
              Renomear<span className="visually-hidden"> {category.name}</span>
            </button>
            <button
              className={`${ui.linkButton} ${ui.linkDanger}`}
              type="button"
              aria-expanded={panel === "archive"}
              onClick={() => setPanel(panel === "archive" ? "none" : "archive")}
            >
              Arquivar<span className="visually-hidden"> {category.name}</span>
            </button>
          </>
        )}
      </div>

      {panel === "rename" ? (
        <div className={styles.rowPanel}>
          <RenamePanel category={category} onClose={() => setPanel("none")} />
        </div>
      ) : null}
      {panel === "archive" ? (
        <div className={styles.rowPanel}>
          <ArchivePanel category={category} onClose={() => setPanel("none")} />
        </div>
      ) : null}
    </li>
  );
}

function ReauthLink() {
  // Link do Next faria prefetch e iniciaria a transação de login por engano.
  return (
    <a className={ui.inlineLink} href="/auth/login?returnTo=/categorias">
      Entrar novamente
    </a>
  );
}

function RenamePanel({ category, onClose }: { category: Category; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    renameCategoryAction.bind(null, category.id),
    RENAME_INITIAL,
  );
  const id = useId();
  const error = state.status === "invalid" ? state.message : undefined;

  return (
    <form action={formAction} className={`${ui.form} ${ui.reveal}`}>
      <div className={`${ui.field} ${ui.fieldWide}`}>
        <label className={ui.label} htmlFor={`${id}-name`}>
          Novo nome
        </label>
        <input
          className={ui.input}
          id={`${id}-name`}
          name="name"
          maxLength={100}
          defaultValue={"name" in state ? state.name : category.name}
          required
          autoFocus
          {...errorProps(`${id}-name-error`, error)}
        />
        <FieldError id={`${id}-name-error`} message={error} />
      </div>

      {state.status === "error" ? (
        <Notice
          tone="error"
          className={ui.fullWidth}
          actions={state.reauth ? <ReauthLink /> : undefined}
        >
          {state.message}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        <button
          className={`${ui.button} ${ui.primary} ${ui.small}`}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Salvando…" : "Salvar nome"}
        </button>
        <button className={ui.linkButton} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}

function ArchivePanel({ category, onClose }: { category: Category; onClose: () => void }) {
  const [state, archive, pending] = useActionState(
    archiveCategoryAction.bind(null, category.id),
    ARCHIVE_INITIAL,
  );
  const textId = useId();

  return (
    <form action={archive} className={`${styles.confirm} ${ui.reveal}`} aria-describedby={textId}>
      <p id={textId}>
        Arquivar &ldquo;{category.name}&rdquo;? Ela continua visível no histórico das
        movimentações, mas não poderá ser atribuída de novo nem reativada.
      </p>

      {state.status === "error" ? (
        <Notice tone="error" actions={state.reauth ? <ReauthLink /> : undefined}>
          {state.message}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        {/* Foco inicial na opção segura: a ação definitiva exige escolha explícita. */}
        <button
          className={`${ui.button} ${ui.secondary} ${ui.small}`}
          type="button"
          onClick={onClose}
          disabled={pending}
          autoFocus
        >
          Cancelar
        </button>
        <button
          className={`${ui.button} ${ui.danger} ${ui.small}`}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Arquivando…" : "Arquivar categoria"}
        </button>
      </div>
    </form>
  );
}
