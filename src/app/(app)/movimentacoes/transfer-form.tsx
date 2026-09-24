"use client";

import { useActionState, useId } from "react";
import { Notice, ui } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { createTransferAction, type FormValues, type MovementFormState } from "./actions";
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

/** Transferência entre contas do próprio usuário: registro contábil, nada é movimentado (RN-005). */
export function TransferForm({ accounts, initialKey }: Props) {
  const [state, formAction, pending] = useActionState<MovementFormState, FormData>(
    createTransferAction,
    { status: "idle", idempotencyKey: initialKey },
  );

  const values = "values" in state ? state.values : undefined;
  const fieldErrors = state.status === "invalid" ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className={ui.form}>
      <p className={`${ui.help} ${ui.fieldWide}`}>
        Registra que um valor passou de uma conta sua para outra conta sua. É apenas um
        registro no Coinciente: nenhum dinheiro é movimentado.
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
        <Notice tone="success" className={ui.fullWidth}>
          Registro contábil criado: saída de{" "}
          <span className="tabular">{formatMoney(state.summary.amount)}</span> em{" "}
          {accountLabel(state.summary.fromAccountId, accounts)} e entrada do mesmo valor em{" "}
          {accountLabel(state.summary.toAccountId, accounts)}.
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        <button
          className={`${ui.button} ${ui.primary}`}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Registrando…" : "Registrar transferência"}
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
        error={firstError(fieldErrors, "fromAccountId")}
      />
      <AccountSelect
        id={`${id}-toAccountId`}
        name="toAccountId"
        label="Conta de destino"
        accounts={accounts}
        defaultValue={selectableAccount(values?.toAccountId, accounts)}
        error={firstError(fieldErrors, "toAccountId")}
      />
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
