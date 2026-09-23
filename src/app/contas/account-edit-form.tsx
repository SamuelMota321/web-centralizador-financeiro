"use client";

import { useActionState } from "react";
import type { Account } from "@/lib/accounts/types";
import { updateAccountAction, type UpdateAccountState } from "./actions";
import { AccountFields } from "./account-fields";
import styles from "./contas.module.css";

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
    <form action={formAction} className={`${styles.form} ${styles.inlinePanel}`}>
      <AccountFields defaults={account} fieldErrors={fieldErrors} />

      {state.status === "duplicate" ? (
        <div className={styles.notice}>
          <p>
            Ja existe conta conectada com nome, tipo e instituicao equivalentes. Confirme
            se esta conta manual deve continuar separada.
          </p>
          <ul className={styles.candidates}>
            {state.candidates.map((candidate) => (
              <li key={candidate.id}>
                {candidate.name}
                {candidate.institutionName ? ` · ${candidate.institutionName}` : ""}
              </li>
            ))}
          </ul>
          <button
            className={styles.submit}
            type="submit"
            name="confirmPossibleDuplicate"
            value="true"
            disabled={pending}
          >
            Salvar assim mesmo
          </button>
        </div>
      ) : null}

      {state.status === "unchanged" ? (
        <p className={styles.notice}>Nenhuma alteracao para salvar.</p>
      ) : null}

      {state.status === "error" ? (
        <p className={`${styles.notice} ${styles.noticeError}`} role="alert">
          {state.message}
        </p>
      ) : null}

      <div className={styles.formFooter}>
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Salvando..." : "Salvar alteracoes"}
        </button>
        <button
          className={styles.secondary}
          type="button"
          onClick={onClose}
          disabled={pending}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
