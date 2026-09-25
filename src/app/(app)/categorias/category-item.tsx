"use client";

import { useActionState, useId, useState } from "react";
import { IconArchive } from "@/components/icons";
import { ActionMenu, ConfirmDialog } from "@/components/interactive";
import { errorProps, FieldError, Notice, PendingLabel, StatusChip, ui } from "@/components/ui";
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

export function CategoryItem({ category }: { category: Category }) {
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [archiveState, archive, archiving] = useActionState(
    archiveCategoryAction.bind(null, category.id),
    ARCHIVE_INITIAL,
  );
  const archived = category.status === "archived";

  return (
    <li
      className={styles.row}
      data-archived={archived || undefined}
      data-open={renaming || undefined}
    >
      <div className={styles.rowMain}>
        <p className={styles.rowTitle}>{category.name}</p>
        {archived ? (
          <p className={styles.rowMeta}>Continua no histórico; não pode mais ser atribuída.</p>
        ) : null}
      </div>

      <StatusChip tone={archived ? "neutral" : "positive"}>
        {CATEGORY_STATUS_LABELS[category.status]}
      </StatusChip>

      <div className={ui.rowActions}>
        {archived ? null : (
          <>
            <button
              className={`${ui.button} ${ui.ghost} ${ui.small}`}
              type="button"
              aria-expanded={renaming}
              onClick={() => setRenaming(!renaming)}
            >
              Renomear<span className="visually-hidden"> {category.name}</span>
            </button>
            <ActionMenu
              label={`Mais ações para ${category.name}`}
              items={[
                {
                  label: "Arquivar categoria",
                  icon: <IconArchive size={17} />,
                  tone: "danger",
                  onSelect: () => setConfirming(true),
                },
              ]}
            />
          </>
        )}
      </div>

      {renaming ? (
        <div className={`${ui.rowPanel} ${ui.reveal}`}>
          <RenamePanel category={category} onClose={() => setRenaming(false)} />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Arquivar “${category.name}”?`}
        description="Ela continua visível no histórico das movimentações, mas não poderá ser atribuída de novo nem reativada."
        confirmLabel="Arquivar categoria"
        pendingLabel="Arquivando…"
        action={archive}
        pending={archiving}
        error={
          archiveState.status === "error" ? (
            <Notice tone="error" actions={archiveState.reauth ? <ReauthLink /> : undefined}>
              {archiveState.message}
            </Notice>
          ) : null
        }
      />
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
    <form action={formAction} className={ui.form}>
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
          <PendingLabel pending={pending} idle="Salvar nome" busy="Salvando…" />
        </button>
        <button className={ui.linkButton} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
