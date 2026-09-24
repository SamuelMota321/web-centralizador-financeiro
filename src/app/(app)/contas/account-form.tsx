"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { IconClose } from "@/components/icons";
import { Notice, ui } from "@/components/ui";
import { createAccountAction, type CreateAccountState } from "./actions";
import { AccountFields } from "./account-fields";
import { DuplicateNotice } from "./duplicate-notice";

const INITIAL_STATE: CreateAccountState = { status: "idle" };

export function AccountForm({ closeHref }: { closeHref: string }) {
  const [state, formAction, pending] = useActionState(createAccountAction, INITIAL_STATE);
  const id = useId();
  const fieldErrors = state.status === "invalid" ? state.fieldErrors : undefined;

  return (
    <section className={`${ui.panel} ${ui.reveal}`} aria-labelledby={`${id}-title`}>
      <div className={ui.panelHeader}>
        <div>
          <h2 className={ui.panelTitle} id={`${id}-title`}>
            Nova conta manual
          </h2>
          <p className={ui.panelDescription}>
            Registre uma conta que não está conectada. O saldo inicial vale a partir da data de
            referência.
          </p>
        </div>
        <Link
          className={`${ui.button} ${ui.ghost} ${ui.small}`}
          href={closeHref}
          scroll={false}
          aria-label="Fechar o painel de nova conta"
        >
          <IconClose size={16} />
        </Link>
      </div>

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

        {state.status === "success" ? (
          <Notice tone="success" className={ui.fullWidth}>
            Conta criada. Ela já pode receber movimentações.
          </Notice>
        ) : null}

        <div className={ui.formFooter}>
          <button
            className={`${ui.button} ${ui.primary}`}
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Criando…" : "Criar conta"}
          </button>
        </div>
      </form>
    </section>
  );
}
