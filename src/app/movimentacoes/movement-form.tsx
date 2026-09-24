"use client";

import { useActionState, useId } from "react";
import { formatMoney } from "@/lib/money";
import { createTransactionAction, type FormValues, type MovementFormState } from "./actions";
import {
  AmountInput,
  DateInput,
  DescriptionInput,
  errorProps,
  FieldError,
  type FieldErrors,
  FormFailure,
} from "./form-parts";
import { accountLabel, type AccountOption } from "./presentation";
import styles from "./movimentacoes.module.css";

interface Props {
  accounts: AccountOption[];
  initialKey: string;
}

/** Receita ou despesa manual. */
export function MovementForm({ accounts, initialKey }: Props) {
  const [state, formAction, pending] = useActionState<MovementFormState, FormData>(
    createTransactionAction,
    { status: "idle", idempotencyKey: initialKey },
  );

  const values = "values" in state ? state.values : undefined;
  const fieldErrors = state.status === "invalid" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className={styles.form}>
      <input type="hidden" name="idempotencyKey" value={state.idempotencyKey} />
      {/* Chave nova (sucesso ou chave recusada) remonta os campos: o formulario recomeca. */}
      <MovementFields
        key={state.idempotencyKey}
        accounts={accounts}
        values={values}
        fieldErrors={fieldErrors}
      />

      <FormFailure state={state} />

      {state.status === "success" && state.summary.kind === "movement" ? (
        <div className={styles.notice} role="status">
          <p>
            {state.summary.type === "income" ? "Receita" : "Despesa"} de{" "}
            <span className="tabular">{formatMoney(state.summary.amount)}</span> registrada em{" "}
            {accountLabel(state.summary.accountId, accounts)}.
          </p>
          {state.summary.categorizedByRule ? (
            <p>A categoria foi aplicada por uma regra pessoal.</p>
          ) : null}
        </div>
      ) : null}

      <div className={styles.formFooter}>
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Registrando..." : "Registrar movimentacao"}
        </button>
      </div>
    </form>
  );
}

function MovementFields({
  accounts,
  values,
  fieldErrors,
}: {
  accounts: AccountOption[];
  values: FormValues | undefined;
  fieldErrors: FieldErrors | undefined;
}) {
  const id = useId();

  return (
    <>
      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-accountId`}>
          Conta
        </label>
        <select
          className={styles.select}
          id={`${id}-accountId`}
          name="accountId"
          defaultValue={selectableAccount(values?.accountId, accounts)}
          required
          {...errorProps(`${id}-accountId`, fieldErrors?.accountId)}
        >
          <option value="" disabled>
            Escolha uma conta
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-accountId`} messages={fieldErrors?.accountId} />
      </div>

      <div className={styles.field}>
        <label className={styles.label} htmlFor={`${id}-type`}>
          Tipo
        </label>
        <select
          className={styles.select}
          id={`${id}-type`}
          name="type"
          defaultValue={values?.type || "expense"}
          {...errorProps(`${id}-type`, fieldErrors?.type)}
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
        <FieldError id={`${id}-type`} messages={fieldErrors?.type} />
      </div>

      <AmountInput id={id} defaultValue={values?.amount} messages={fieldErrors?.amount} />
      <DateInput id={id} defaultValue={values?.occurredOn} messages={fieldErrors?.occurredOn} />
      <DescriptionInput
        id={id}
        defaultValue={values?.description}
        messages={fieldErrors?.description}
      />
    </>
  );
}

/** Conta que saiu da lista de ativas nao volta pre-selecionada. */
export function selectableAccount(value: string | undefined, accounts: AccountOption[]): string {
  return value && accounts.some((account) => account.id === value) ? value : "";
}
