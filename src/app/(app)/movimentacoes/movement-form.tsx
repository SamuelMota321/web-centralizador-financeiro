"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { showToast } from "@/components/interactive";
import { errorProps, FieldError, PendingLabel, ui } from "@/components/ui";
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
import { useRecentMovements } from "./recent";

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
  const { markRecent } = useRecentMovements();
  // Cada resposta é anunciada uma vez, mesmo que a lista de contas chegue de novo.
  const announced = useRef<MovementFormState | null>(null);

  // Sucesso é transitório: vira toast e destaque da linha; o formulário recomeça limpo.
  useEffect(() => {
    if (state.status !== "success" || state.summary.kind !== "movement") return;
    if (announced.current === state) return;
    announced.current = state;
    const { summary } = state;
    markRecent(summary.transactionIds);
    showToast(
      "success",
      <>
        {summary.type === "income" ? "Receita" : "Despesa"} de{" "}
        <span className="tabular">{formatMoney(summary.amount)}</span> registrada em{" "}
        {accountLabel(summary.accountId, accounts)}.
        {summary.categorizedByRule ? " A categoria foi aplicada por uma regra pessoal." : null}
      </>,
    );
  }, [state, accounts, markRecent]);

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

      <div className={ui.formFooter}>
        <button
          className={`${ui.button} ${ui.primary}`}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          <PendingLabel pending={pending} idle="Registrar movimentação" busy="Registrando…" />
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
