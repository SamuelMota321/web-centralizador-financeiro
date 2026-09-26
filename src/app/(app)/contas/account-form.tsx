"use client";

import { useActionState, useEffect, useRef } from "react";
import { showToast } from "@/components/interactive";
import { Notice, PendingLabel, ui } from "@/components/ui";
import { createAccountAction, type CreateAccountState } from "./actions";
import { AccountFields } from "./account-fields";
import { DuplicateNotice } from "./duplicate-notice";

const INITIAL_STATE: CreateAccountState = { status: "idle" };

/** Formulário de nova conta manual; o painel que o envolve fica na página. */
export function AccountForm() {
  const [state, formAction, pending] = useActionState(createAccountAction, INITIAL_STATE);
  const fieldErrors = state.status === "invalid" ? state.fieldErrors : undefined;
  const announced = useRef<CreateAccountState | null>(null);

  useEffect(() => {
    if (state.status !== "success" || announced.current === state) return;
    announced.current = state;
    showToast("success", "Conta criada. Ela já pode receber movimentações.");
  }, [state]);

  return (
    <form action={formAction} className={ui.form}>
      <AccountFields fieldErrors={fieldErrors} />

      {state.status === "duplicate" ? (
        <DuplicateNotice candidates={state.candidates} action="Criar assim mesmo" disabled={pending} />
      ) : null}

      {state.status === "error" ? (
        <Notice tone="error" className={ui.fullWidth}>
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
          <PendingLabel pending={pending} idle="Criar conta" busy="Criando…" />
        </button>
      </div>
    </form>
  );
}
