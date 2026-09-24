"use client";

import { useActionState, useId } from "react";
import { formatMoney } from "@/lib/money";
import { createTransferAction, type FormValues, type MovementFormState } from "./actions";
import {
  AmountInput,
  DateInput,
  DescriptionInput,
  errorProps,
  FieldError,
  type FieldErrors,
  FormFailure,
} from "./form-parts";
import { selectableAccount } from "./movement-form";
import { accountLabel, type AccountOption } from "./presentation";
import styles from "./movimentacoes.module.css";

interface Props {
  accounts: AccountOption[];
  initialKey: string;
}

/** Transferencia entre contas do proprio usuario: registro contabil, nada e movimentado (RN-005). */
export function TransferForm({ accounts, initialKey }: Props) {
  const [state, formAction, pending] = useActionState<MovementFormState, FormData>(
    createTransferAction,
    { status: "idle", idempotencyKey: initialKey },
  );

  const values = "values" in state ? state.values : undefined;
  const fieldErrors = state.status === "invalid" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className={styles.form}>
      <p className={`${styles.helper} ${styles.fieldWide}`}>
        Registra que um valor passou de uma conta sua para outra conta sua. E apenas um
        registro no Coinciente: nenhum dinheiro e movimentado.
      </p>

      <input type="hidden" name="idempotencyKey" value={state.idempotencyKey} />
      <TransferFields
        key={state.idempotencyKey}
        accounts={accounts}
        values={values}
        fieldErrors={fieldErrors}
      />

      <FormFailure state={state} />

      {state.status === "success" && state.summary.kind === "transfer" ? (
        <div className={styles.notice} role="status">
          <p>Registro contabil criado:</p>
          <ul className={styles.summaryList}>
            <li>
              Saida de <span className="tabular">{formatMoney(state.summary.amount)}</span> em{" "}
              {accountLabel(state.summary.fromAccountId, accounts)}
            </li>
            <li>
              Entrada de <span className="tabular">{formatMoney(state.summary.amount)}</span> em{" "}
              {accountLabel(state.summary.toAccountId, accounts)}
            </li>
          </ul>
        </div>
      ) : null}

      <div className={styles.formFooter}>
        <button className={styles.submit} type="submit" disabled={pending}>
          {pending ? "Registrando..." : "Registrar transferencia"}
        </button>
      </div>
    </form>
  );
}

function TransferFields({
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
      <AccountSelect
        id={`${id}-fromAccountId`}
        name="fromAccountId"
        label="Conta de origem"
        accounts={accounts}
        defaultValue={selectableAccount(values?.fromAccountId, accounts)}
        messages={fieldErrors?.fromAccountId}
      />
      <AccountSelect
        id={`${id}-toAccountId`}
        name="toAccountId"
        label="Conta de destino"
        accounts={accounts}
        defaultValue={selectableAccount(values?.toAccountId, accounts)}
        messages={fieldErrors?.toAccountId}
      />
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

function AccountSelect({
  id,
  name,
  label,
  accounts,
  defaultValue,
  messages,
}: {
  id: string;
  name: string;
  label: string;
  accounts: AccountOption[];
  defaultValue: string;
  messages: string[] | undefined;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        className={styles.select}
        id={id}
        name={name}
        defaultValue={defaultValue}
        required
        {...errorProps(id, messages)}
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
      <FieldError id={id} messages={messages} />
    </div>
  );
}
