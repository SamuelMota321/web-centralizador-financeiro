"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { errorProps, FieldError, Notice, ui } from "@/components/ui";
import type { Transaction } from "@/lib/transactions/types";
import { categorizeTransactionAction, type CategorizeState } from "./actions";
import type { CategoryOption } from "./presentation";

const INITIAL_STATE: CategorizeState = { status: "idle" };

interface Props {
  transaction: Pick<Transaction, "id" | "categoryId">;
  /** Somente categorias ativas: arquivadas nunca são oferecidas. */
  activeCategories: CategoryOption[];
  truncated: boolean;
  onClose: () => void;
}

export function CategorizePanel({ transaction, activeCategories, truncated, onClose }: Props) {
  const [state, formAction, pending] = useActionState(
    categorizeTransactionAction.bind(null, transaction.id),
    INITIAL_STATE,
  );
  const id = useId();
  const error = state.status === "invalid" ? state.message : undefined;
  const current = activeCategories.some((category) => category.id === transaction.categoryId)
    ? (transaction.categoryId ?? "")
    : "";

  return (
    <form action={formAction} className={`${ui.form} ${ui.reveal}`}>
      {activeCategories.length === 0 ? (
        <Notice
          tone="info"
          className={ui.fullWidth}
          actions={
            <Link className={ui.inlineLink} href="/categorias">
              Criar uma categoria
            </Link>
          }
        >
          Você ainda não tem categorias ativas. Crie uma para organizar esta movimentação.
        </Notice>
      ) : (
        <div className={`${ui.field} ${ui.fieldWide}`}>
          <label className={ui.label} htmlFor={`${id}-categoryId`}>
            Categoria
          </label>
          <select
            className={ui.select}
            id={`${id}-categoryId`}
            name="categoryId"
            defaultValue={current}
            {...errorProps(`${id}-categoryId-error`, error)}
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
          <FieldError id={`${id}-categoryId-error`} message={error} />
          <p className={ui.help}>
            {truncated
              ? "Apenas as primeiras categorias aparecem nesta lista. "
              : null}
            Se não souber agora, marque como incerta ou não reconhecida e corrija depois.
          </p>
        </div>
      )}

      {state.status === "error" ? (
        <Notice
          tone="error"
          className={ui.fullWidth}
          actions={
            state.reauth ? (
              // Link do Next faria prefetch e iniciaria a transação de login por engano.
              <a className={ui.inlineLink} href="/auth/login?returnTo=/movimentacoes">
                Entrar novamente
              </a>
            ) : undefined
          }
        >
          {state.message}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        {activeCategories.length > 0 ? (
          <button
            className={`${ui.button} ${ui.primary} ${ui.small}`}
            type="submit"
            name="intent"
            value="category"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Salvando…" : "Aplicar categoria"}
          </button>
        ) : null}
        <button
          className={`${ui.button} ${ui.secondary} ${ui.small}`}
          type="submit"
          name="intent"
          value="uncertain"
          disabled={pending}
        >
          Marcar como incerta
        </button>
        <button
          className={`${ui.button} ${ui.secondary} ${ui.small}`}
          type="submit"
          name="intent"
          value="unrecognized"
          disabled={pending}
        >
          Marcar como não reconhecida
        </button>
        <button className={ui.linkButton} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
