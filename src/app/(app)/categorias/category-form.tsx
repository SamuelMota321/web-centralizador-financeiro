"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { showToast } from "@/components/interactive";
import { errorProps, FieldError, Notice, PendingLabel, ui } from "@/components/ui";
import { createCategoryAction, type CategoryFormState } from "./actions";

const INITIAL_STATE: CategoryFormState = { status: "idle" };

/** Formulário de nova categoria; o painel que o envolve fica na página. */
export function CategoryForm() {
  const [state, formAction, pending] = useActionState(createCategoryAction, INITIAL_STATE);
  const id = useId();
  const error = state.status === "invalid" ? state.message : undefined;
  const announced = useRef<CategoryFormState | null>(null);

  useEffect(() => {
    if (state.status !== "success" || announced.current === state) return;
    announced.current = state;
    showToast("success", "Categoria criada. Ela já pode ser atribuída às suas movimentações.");
  }, [state]);

  return (
    <form action={formAction} className={ui.form}>
      <div className={`${ui.field} ${ui.fieldWide}`}>
        <label className={ui.label} htmlFor={`${id}-name`}>
          Nome
        </label>
        <input
          className={ui.input}
          id={`${id}-name`}
          name="name"
          maxLength={100}
          placeholder="Ex.: Alimentação"
          // O React reseta o formulário após o envio: erro devolve o que foi digitado.
          defaultValue={"name" in state ? state.name : ""}
          required
          {...errorProps(`${id}-name-error`, error)}
        />
        <FieldError id={`${id}-name-error`} message={error} />
      </div>

      {state.status === "error" ? (
        <Notice
          tone="error"
          className={ui.fullWidth}
          actions={
            state.reauth ? (
              <a className={ui.inlineLink} href="/auth/login?returnTo=/categorias">
                Entrar novamente
              </a>
            ) : undefined
          }
        >
          {state.message}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        <button
          className={`${ui.button} ${ui.primary}`}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          <PendingLabel pending={pending} idle="Criar categoria" busy="Criando…" />
        </button>
      </div>
    </form>
  );
}
