"use client";

import { useActionState } from "react";
import { Notice, ui } from "@/components/ui";
import type { Account } from "@/lib/accounts/types";
import { updateAccountAction, type UpdateAccountState } from "./actions";
import { AccountFields } from "./account-fields";
import { DuplicateNotice } from "./duplicate-notice";

const INITIAL_STATE: UpdateAccountState = { status: "idle" };

interface Props {
  account: Account;
  onClose: () => void;
}

export function AccountEditForm({ account, onClose }: Props) {
  const [state, formAction, pending] = useActionState(
    updateAccountAction.bind(null, account.id, account),
    INITIAL_STATE,
  );

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className={`${ui.form} ${ui.reveal}`}>
      <AccountFields defaults={account} fieldErrors={fieldErrors} />

      {state.status === "duplicate" ? (
        <DuplicateNotice candidates={state.candidates} action="Salvar assim mesmo" disabled={pending} />
      ) : null}

      {state.status === "unchanged" ? (
        <Notice tone="info" className={ui.fullWidth}>
          Nenhuma alteração para salvar.
        </Notice>
      ) : null}

      {state.status === "error" ? (
        <Notice tone="error" className={ui.fullWidth}>
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
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
        <button className={ui.linkButton} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
