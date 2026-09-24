"use client";

import { useEffect, useRef } from "react";
import { errorProps, FieldError, Notice, ui } from "@/components/ui";
import { todayCivilDate } from "@/lib/civil-date";
import type { MovementFormState } from "./actions";

export type FieldErrors = Record<string, string[] | undefined>;

export function firstError(errors: FieldErrors | undefined, field: string): string | undefined {
  return errors?.[field]?.[0];
}

/**
 * Data civil de hoje no calendario do navegador, preenchida apos montar: o servidor
 * pode estar em outro fuso e o HTML inicial nao pode divergir do cliente.
 */
export function DateInput({
  id,
  defaultValue,
  error,
}: {
  id: string;
  defaultValue: string | undefined;
  error: string | undefined;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.value === "") ref.current.value = todayCivilDate();
  }, []);

  return (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={`${id}-occurredOn`}>
        Data
      </label>
      <input
        ref={ref}
        className={`${ui.input} tabular`}
        id={`${id}-occurredOn`}
        name="occurredOn"
        type="date"
        defaultValue={defaultValue}
        required
        {...errorProps(`${id}-occurredOn-error`, error)}
      />
      <FieldError id={`${id}-occurredOn-error`} message={error} />
    </div>
  );
}

export function AmountInput({
  id,
  defaultValue,
  error,
}: {
  id: string;
  defaultValue: string | undefined;
  error: string | undefined;
}) {
  return (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={`${id}-amount`}>
        Valor (R$)
      </label>
      <input
        className={`${ui.input} tabular`}
        id={`${id}-amount`}
        name="amount"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        defaultValue={defaultValue}
        required
        {...errorProps(`${id}-amount-error`, error)}
      />
      <FieldError id={`${id}-amount-error`} message={error} />
    </div>
  );
}

export function DescriptionInput({
  id,
  defaultValue,
  error,
}: {
  id: string;
  defaultValue: string | undefined;
  error: string | undefined;
}) {
  return (
    <div className={`${ui.field} ${ui.fieldWide}`}>
      <label className={ui.label} htmlFor={`${id}-description`}>
        Descrição <span className={ui.optional}>(opcional)</span>
      </label>
      <input
        className={ui.input}
        id={`${id}-description`}
        name="description"
        placeholder="Ex.: Mercado do bairro"
        defaultValue={defaultValue}
        {...errorProps(`${id}-description-error`, error)}
      />
      <FieldError id={`${id}-description-error`} message={error} />
    </div>
  );
}

export function AccountSelect({
  id,
  name,
  label,
  accounts,
  defaultValue,
  error,
}: {
  id: string;
  name: string;
  label: string;
  accounts: { id: string; name: string }[];
  defaultValue: string;
  error: string | undefined;
}) {
  return (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={id}>
        {label}
      </label>
      <select
        className={ui.select}
        id={id}
        name={name}
        defaultValue={defaultValue}
        required
        {...errorProps(`${id}-error`, error)}
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
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

/** Conta que saiu da lista de ativas nao volta pre-selecionada. */
export function selectableAccount(
  value: string | undefined,
  accounts: { id: string }[],
): string {
  return value && accounts.some((account) => account.id === value) ? value : "";
}

/** Falha do envio; sessao expirada oferece o caminho de volta ao login. */
export function FormFailure({ state }: { state: MovementFormState }) {
  if (state.status !== "error") return null;
  return (
    <Notice
      tone="error"
      className={ui.fullWidth}
      actions={
        state.reauth ? (
          // Link do Next faria prefetch e iniciaria a transacao de login por engano.
          <a className={ui.inlineLink} href="/auth/login?returnTo=/movimentacoes">
            Entrar novamente
          </a>
        ) : undefined
      }
    >
      {state.message}
    </Notice>
  );
}
