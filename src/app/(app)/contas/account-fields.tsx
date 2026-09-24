"use client";

import { useId } from "react";
import { errorProps, FieldError, ui } from "@/components/ui";
import { ACCOUNT_TYPES, type Account } from "@/lib/accounts/types";
import { TYPE_LABELS } from "./account-type-labels";

export type FieldErrors = Record<string, string[] | undefined>;

interface Props {
  defaults?: Account;
  fieldErrors?: FieldErrors;
}

/** Campos da conta manual, usados na criação e na edição. */
export function AccountFields({ defaults, fieldErrors }: Props) {
  // Vários formulários podem coexistir na página; ids fixos colidiriam.
  const id = useId();
  const error = (field: string) => fieldErrors?.[field]?.[0];

  return (
    <>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-name`}>
          Nome
        </label>
        <input
          className={ui.input}
          id={`${id}-name`}
          name="name"
          maxLength={100}
          placeholder="Ex.: Conta do dia a dia"
          defaultValue={defaults?.name}
          required
          {...errorProps(`${id}-name-error`, error("name"))}
        />
        <FieldError id={`${id}-name-error`} message={error("name")} />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-type`}>
          Tipo
        </label>
        <select
          className={ui.select}
          id={`${id}-type`}
          name="type"
          defaultValue={defaults?.type ?? "checking"}
          {...errorProps(`${id}-type-error`, error("type"))}
        >
          {ACCOUNT_TYPES.map((type) => (
            <option key={type} value={type}>
              {TYPE_LABELS[type]}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-type-error`} message={error("type")} />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-institutionName`}>
          Instituição <span className={ui.optional}>(opcional)</span>
        </label>
        <input
          className={ui.input}
          id={`${id}-institutionName`}
          name="institutionName"
          maxLength={120}
          defaultValue={defaults?.institutionName ?? ""}
          {...errorProps(`${id}-institutionName-error`, error("institutionName"))}
        />
        <FieldError id={`${id}-institutionName-error`} message={error("institutionName")} />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-initialBalance`}>
          Saldo inicial (R$)
        </label>
        <input
          className={`${ui.input} tabular`}
          id={`${id}-initialBalance`}
          name="initialBalance"
          inputMode="decimal"
          placeholder="0.00"
          defaultValue={defaults?.initialBalance}
          required
          {...errorProps(`${id}-initialBalance-error`, error("initialBalance"))}
        />
        <FieldError id={`${id}-initialBalance-error`} message={error("initialBalance")} />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-initialBalanceAsOf`}>
          Data de referência do saldo
        </label>
        <input
          className={`${ui.input} tabular`}
          id={`${id}-initialBalanceAsOf`}
          name="initialBalanceAsOf"
          type="date"
          defaultValue={defaults?.initialBalanceAsOf}
          required
          {...errorProps(`${id}-initialBalanceAsOf-error`, error("initialBalanceAsOf"))}
        />
        <FieldError id={`${id}-initialBalanceAsOf-error`} message={error("initialBalanceAsOf")} />
      </div>
    </>
  );
}
