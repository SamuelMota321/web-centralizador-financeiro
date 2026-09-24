"use client";

import { useActionState, useId } from "react";
import { errorProps, FieldError, Notice, ui } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { createTransactionAction, type FormValues, type MovementFormState } from "./actions";
import {
  AccountSelect,
  AmountInput,
  DateInput,
  DescriptionInput,
  type FieldErrors,
  firstError,
  FormFailure,
  selectableAccount,
} from "./form-parts";
import { accountLabel, type AccountOption } from "./presentation";

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
    <form action={formAction} className={ui.form}>
      <input type="hidden" name="idempotencyKey" value={state.idempotencyKey} />
      {/* Chave nova (sucesso ou chave recusada) remonta os campos: o formulário recomeça. */}
      <MovementFields
        key={state.idempotencyKey}
        accounts={accounts}
        values={values}
        fieldErrors={fieldErrors}
      />

      <FormFailure state={state} />

      {state.status === "success" && state.summary.kind === "movement" ? (
        <Notice tone="success" className={ui.fullWidth}>
          {state.summary.type === "income" ? "Receita" : "Despesa"} de{" "}
          <span className="tabular">{formatMoney(state.summary.amount)}</span> registrada em{" "}
          {accountLabel(state.summary.accountId, accounts)}.
          {state.summary.categorizedByRule
            ? " A categoria foi aplicada por uma regra pessoal."
            : null}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        <button
          className={`${ui.button} ${ui.primary}`}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Registrando…" : "Registrar movimentação"}
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
  const typeError = firstError(fieldErrors, "type");

  return (
    <>
      <AccountSelect
        id={`${id}-accountId`}
        name="accountId"
        label="Conta"
        accounts={accounts}
        defaultValue={selectableAccount(values?.accountId, accounts)}
        error={firstError(fieldErrors, "accountId")}
      />

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-type`}>
          Tipo
        </label>
        <select
          className={ui.select}
          id={`${id}-type`}
          name="type"
          defaultValue={values?.type || "expense"}
          {...errorProps(`${id}-type-error`, typeError)}
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
        <FieldError id={`${id}-type-error`} message={typeError} />
      </div>

      <AmountInput id={id} defaultValue={values?.amount} error={firstError(fieldErrors, "amount")} />
      <DateInput
        id={id}
        defaultValue={values?.occurredOn}
        error={firstError(fieldErrors, "occurredOn")}
      />
      <DescriptionInput
        id={id}
        defaultValue={values?.description}
        error={firstError(fieldErrors, "description")}
      />
    </>
  );
}
