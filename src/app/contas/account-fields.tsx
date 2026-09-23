"use client";

import { useId } from "react";
import { ACCOUNT_TYPES, type Account } from "@/lib/accounts/types";
import { TYPE_LABELS } from "./account-type-labels";
import styles from "./contas.module.css";

export type FieldErrors = Record<string, string[] | undefined>;

interface Props {
  defaults?: Account;
  fieldErrors?: FieldErrors;
}

/** Campos da conta manual, usados na criacao e na edicao. */
export function AccountFields({ defaults, fieldErrors }: Props) {
  // Varios formularios podem coexistir na pagina; ids fixos colidiriam.
  const id = useId();

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-name`}>
          Nome
        </label>
        <input
          className={styles.input}
          id={`${id}-name`}
          name="name"
          maxLength={100}
          defaultValue={defaults?.name}
          required
        />
        <FieldError messages={fieldErrors?.name} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-type`}>
          Tipo
        </label>
        <select
          className={styles.select}
          id={`${id}-type`}
          name="type"
          defaultValue={defaults?.type ?? "checking"}
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <FieldError messages={fieldErrors?.type} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-institutionName`}>
          Instituicao <span>(opcional)</span>
        </label>
        <input
          className={styles.input}
          id={`${id}-institutionName`}
          name="institutionName"
          maxLength={120}
          defaultValue={defaults?.institutionName ?? ""}
        />
        <FieldError messages={fieldErrors?.institutionName} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-initialBalance`}>
          Saldo inicial
        </label>
        <input
          className={styles.input}
          id={`${id}-initialBalance`}
          name="initialBalance"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaults?.initialBalance}
          required
        />
        <FieldError messages={fieldErrors?.initialBalance} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-initialBalanceAsOf`}>
          Data de referencia
        </label>
        <input
          className={styles.input}
          id={`${id}-initialBalanceAsOf`}
          name="initialBalanceAsOf"
          type="date"
          defaultValue={defaults?.initialBalanceAsOf}
          required
        />
        <FieldError messages={fieldErrors?.initialBalanceAsOf} />
      </div>
    </>
  );
}

function FieldError({ messages }: { messages: string[] | undefined }) {
  if (!messages || messages.length === 0) return null;
  return <p className={styles.fieldError}>{messages[0]}</p>;
}
