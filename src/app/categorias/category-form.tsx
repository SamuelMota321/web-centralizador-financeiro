"use client";

import { useActionState, useId } from "react";
import { createCategoryAction, type CategoryFormState } from "./actions";
import { ReauthLink } from "./reauth-link";
import styles from "./categorias.module.css";

const INITIAL_STATE: CategoryFormState = { status: "idle" };

export function CategoryForm() {
  const [state, formAction, pending] = useActionState(createCategoryAction, INITIAL_STATE);
  const id = useId();
  const invalid = state.status === "invalid";

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-name`}>
          Nome da categoria
        </label>
        <input
          className={styles.input}
          id={`${id}-name`}
          name="name"
          maxLength={100}
          // O React reseta o formulario apos o envio: erro devolve o que foi digitado.
          defaultValue={"name" in state ? state.name : ""}
          required
          aria-invalid={invalid || undefined}
          aria-describedby={invalid ? `${id}-name-error` : undefined}
        />
        {invalid ? (
          <p className={styles.fieldError} id={`${id}-name-error`}>
            {state.message}
          </p>
        ) : null}
      </div>

      <div className={styles.formFooter}>
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar categoria"}
        </button>
      </div>

      {state.status === "error" ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <p>{state.message}</p>
          {state.reauth ? <ReauthLink /> : null}
        </div>
      ) : null}

      {state.status === "success" ? (
        <p className={styles.notice} role="status">
          Categoria criada. Ela ja pode ser atribuida as suas movimentacoes.
        </p>
      ) : null}
    </form>
  );
}
