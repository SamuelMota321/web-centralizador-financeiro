"use client";

import { useActionState, useId, useState } from "react";
import type { Category } from "@/lib/categories/types";
import {
  archiveCategoryAction,
  type ArchiveCategoryState,
  type CategoryFormState,
  renameCategoryAction,
} from "./actions";
import { CATEGORY_STATUS_LABELS } from "./category-names";
import { ReauthLink } from "./reauth-link";
import styles from "./categorias.module.css";

const ARCHIVE_INITIAL: ArchiveCategoryState = { status: "idle" };
const RENAME_INITIAL: CategoryFormState = { status: "idle" };

type Panel = "none" | "rename" | "archive";

export function CategoryItem({ category }: { category: Category }) {
  const [panel, setPanel] = useState<Panel>("none");
  const archived = category.status === "archived";

  return (
    <li className={`${styles.item} ${archived ? styles.itemArchived : ""}`}>
      <div className={styles.itemRow}>
        <p className={styles.itemName}>{category.name}</p>
        <span className={styles.status}>{CATEGORY_STATUS_LABELS[category.status]}</span>
      </div>

      {archived ? (
        <p className={styles.itemMeta}>Continua no historico; nao pode mais ser atribuida.</p>
      ) : (
        <div className={styles.actions}>
          <button
            className={styles.linkButton}
            type="button"
            aria-expanded={panel === "rename"}
            onClick={() => setPanel(panel === "rename" ? "none" : "rename")}
          >
            Renomear
          </button>
          <button
            className={`${styles.linkButton} ${styles.linkDanger}`}
            type="button"
            aria-expanded={panel === "archive"}
            onClick={() => setPanel("archive")}
          >
            Arquivar
          </button>
        </div>
      )}

      {panel === "rename" ? (
        <RenamePanel category={category} onClose={() => setPanel("none")} />
      ) : null}
      {panel === "archive" ? (
        <ArchivePanel category={category} onClose={() => setPanel("none")} />
      ) : null}
    </li>
  );
}

function RenamePanel({ category, onClose }: { category: Category; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    renameCategoryAction.bind(null, category.id),
    RENAME_INITIAL,
  );
  const id = useId();
  const invalid = state.status === "invalid";

  return (
    <form action={formAction} className={`${styles.form} ${styles.inlinePanel}`}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-name`}>
          Novo nome
        </label>
        <input
          className={styles.input}
          id={`${id}-name`}
          name="name"
          maxLength={100}
          defaultValue={"name" in state ? state.name : category.name}
          required
          autoFocus
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-name-error` : undefined}
        />
        {invalid ? (
          <p className={styles.fieldError} id={`${id}-name-error`}>
            {state.message}
          </p>
        ) : null}
      </div>

      {state.status === "error" ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <p>{state.message}</p>
          {state.reauth ? <ReauthLink /> : null}
        </div>
      ) : null}

      <div className={styles.formFooter}>
        <button className={styles.secondary} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar nome"}
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
    <form
      action={archive}
      className={`${styles.confirm} ${styles.inlinePanel}`}
      aria-describedby={textId}
    >
      <p id={textId}>
        Arquivar &ldquo;{category.name}&rdquo;? Ela continua visivel no historico das
        movimentacoes, mas nao podera ser atribuida de novo nem reativada.
      </p>

      {state.status === "error" ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <p>{state.message}</p>
          {state.reauth ? <ReauthLink /> : null}
        </div>
      ) : null}

      <div className={styles.formFooter}>
        {/* Foco inicial na opcao segura: a acao definitiva exige escolha explicita. */}
        <button
          className={styles.secondary}
          type="button"
          onClick={onClose}
          disabled={pending}
          autoFocus
        >
          Cancelar
        </button>
        <button className={styles.danger} type="submit" disabled={pending}>
          {pending ? "Arquivando..." : "Confirmar arquivamento"}
        </button>
      </div>
    </form>
  );
}
