"use client";

import { useActionState, useId, useState } from "react";
import type { Transaction } from "@/lib/transactions/types";
import { categorizeTransactionAction, type CategorizeState } from "./actions";
import type { CategoryOption } from "./presentation";
import styles from "./movimentacoes.module.css";

const INITIAL_STATE: CategorizeState = { status: "idle" };

interface Props {
  transaction: Pick<Transaction, "id" | "categorizationStatus" | "categoryId">;
  /** Somente categorias ativas: arquivadas nunca sao oferecidas. */
  activeCategories: CategoryOption[];
  truncated: boolean;
}

export function CategorizeControl({ transaction, activeCategories, truncated }: Props) {
  const [open, setOpen] = useState(false);
  const label =
    transaction.categorizationStatus === "unclassified" ? "Categorizar" : "Corrigir categoria";

  return (
    <div className={styles.categorize}>
      <button
        className={styles.linkButton}
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {label}
      </button>
      {open ? (
        <CategorizePanel
          transaction={transaction}
          activeCategories={activeCategories}
          truncated={truncated}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

function CategorizePanel({
  transaction,
  activeCategories,
  truncated,
  onClose,
}: Props & { onClose: () => void }) {
  const [state, formAction, pending] = useActionState(
    categorizeTransactionAction.bind(null, transaction.id),
    INITIAL_STATE,
  );
  const id = useId();
  const current = activeCategories.some((category) => category.id === transaction.categoryId)
    ? (transaction.categoryId ?? "")
    : "";

  return (
    <form action={formAction} className={`${styles.form} ${styles.inlinePanel}`}>
      {activeCategories.length === 0 ? (
        <p className={`${styles.helper} ${styles.fieldWide}`}>
          Voce ainda nao tem categorias ativas.{" "}
          <a className={styles.inlineLink} href="/categorias">
            Criar uma categoria
          </a>
        </p>
      ) : (
        <div className={`${styles.field} ${styles.fieldWide}`}>
          <label className={styles.label} htmlFor={`${id}-categoryId`}>
            Categoria
          </label>
          <select
            className={styles.select}
            id={`${id}-categoryId`}
            name="categoryId"
            defaultValue={current}
            aria-invalid={state.status === "invalid" || undefined}
            aria-describedby={state.status === "invalid" ? `${id}-categoryId-error` : undefined}
          >
            <option value="" disabled>
              Escolha uma categoria
            </option>
            {activeCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          {state.status === "invalid" ? (
            <p className={styles.fieldError} id={`${id}-categoryId-error`}>
              {state.message}
            </p>
          ) : null}
          {truncated ? (
            <p className={styles.helper}>Apenas as primeiras categorias aparecem nesta lista.</p>
          ) : null}
        </div>
      )}

      <p className={`${styles.helper} ${styles.fieldWide}`}>
        Se nao souber a categoria agora, marque como incerta ou nao reconhecida. Voce pode
        corrigir depois.
      </p>

      {state.status === "error" ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <p>{state.message}</p>
          {state.reauth ? (
            // Link do Next faria prefetch e iniciaria a transacao de login por engano.
            <a className={styles.inlineLink} href="/auth/login?returnTo=/movimentacoes">
              Entrar novamente
            </a>
          ) : null}
        </div>
      ) : null}

      <div className={styles.formFooter}>
        {activeCategories.length > 0 ? (
          <button
            className={styles.submit}
            type="submit"
            name="intent"
            value="category"
            disabled={pending}
          >
            {pending ? "Salvando..." : "Aplicar categoria"}
          </button>
        ) : null}
        <button
          className={styles.secondary}
          type="submit"
          name="intent"
          value="uncertain"
          disabled={pending}
        >
          Marcar como incerta
        </button>
        <button
          className={styles.secondary}
          type="submit"
          name="intent"
          value="unrecognized"
          disabled={pending}
        >
          Marcar como nao reconhecida
        </button>
        <button className={styles.linkButton} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
