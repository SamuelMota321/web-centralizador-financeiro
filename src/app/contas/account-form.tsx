"use client";

import { useActionState } from "react";
import { ACCOUNT_TYPES, type AccountType } from "@/lib/accounts/types";
import { createAccountAction, type CreateAccountState } from "./actions";
import styles from "./contas.module.css";

const TYPE_LABELS: Record<AccountType, string> = {
  checking: "Conta corrente",
  savings: "Poupanca",
  payment: "Conta de pagamento",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  investment: "Investimento",
  other: "Outra",
};

const INITIAL_STATE: CreateAccountState = { status: "idle" };

export function AccountForm() {
  const [state, formAction, pending] = useActionState(
    createAccountAction,
    INITIAL_STATE,
  );

  const fieldErrors = state.status === "invalid" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label className={styles.label} htmlFor="name">
          Nome
        </label>
        <input
          className={styles.input}
          id="name"
          name="name"
          maxLength={100}
          required
        />
        <FieldError messages={fieldErrors?.name} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="type">
          Tipo
        </label>
        <select className={styles.select} id="type" name="type" defaultValue="checking">
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <FieldError messages={fieldErrors?.type} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="institutionName">
          Instituicao <span>(opcional)</span>
        </label>
        <input
          className={styles.input}
          id="institutionName"
          name="institutionName"
          maxLength={120}
        />
        <FieldError messages={fieldErrors?.institutionName} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="initialBalance">
          Saldo inicial
        </label>
        <input
          className={styles.input}
          id="initialBalance"
          name="initialBalance"
          inputMode="decimal"
          placeholder="0.00"
          required
        />
        <FieldError messages={fieldErrors?.initialBalance} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="initialBalanceAsOf">
          Data de referencia
        </label>
        <input
          className={styles.input}
          id="initialBalanceAsOf"
          name="initialBalanceAsOf"
          type="date"
          required
        />
        <FieldError messages={fieldErrors?.initialBalanceAsOf} />
      </div>

      {state.status === "duplicate" ? (
        <div className={styles.notice}>
          <p>
            Ja existe conta conectada com nome, tipo e instituicao equivalentes. Confirme
            se esta conta manual deve existir separadamente.
          </p>
          <ul className={styles.candidates}>
            {state.candidates.map((candidate) => (
              <li key={candidate.id}>
                {candidate.name}
                {candidate.institutionName ? ` · ${candidate.institutionName}` : ""}
              </li>
            ))}
          </ul>
          {/* Reenvia o mesmo formulario com a confirmacao exigida pelo contrato. */}
          <button
            className={styles.submit}
            type="submit"
            name="confirmPossibleDuplicate"
            value="true"
            disabled={pending}
          >
            Criar assim mesmo
          </button>
        </div>
      ) : null}

      {state.status === "error" ? (
        <p className={`${styles.notice} ${styles.noticeError}`}>{state.message}</p>
      ) : null}

      {state.status === "success" ? (
        <p className={styles.notice}>Conta criada.</p>
      ) : null}

      <div className={styles.formFooter}>
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Criando..." : "Criar conta"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ messages }: { messages: string[] | undefined }) {
  if (!messages || messages.length === 0) return null;
  return <p className={styles.fieldError}>{messages[0]}</p>;
}
