"use client";

import { useEffect, useRef } from "react";
import { todayCivilDate } from "@/lib/civil-date";
import type { MovementFormState } from "./actions";
import styles from "./movimentacoes.module.css";

export type FieldErrors = Record<string, string[] | undefined>;

/** Props de acessibilidade que ligam o campo a sua mensagem de erro. */
export function errorProps(id: string, messages: string[] | undefined) {
  return messages && messages.length > 0
    ? { "aria-invalid": true, "aria-describedby": `${id}-error` }
    : {};
}

export function FieldError({ id, messages }: { id: string; messages: string[] | undefined }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p className={styles.fieldError} id={`${id}-error`}>
      {messages[0]}
    </p>
  );
}

/**
 * Data civil de hoje no calendario do navegador, preenchida apos montar: o servidor
 * pode estar em outro fuso e o HTML inicial nao pode divergir do cliente.
 */
export function DateInput({
  id,
  defaultValue,
  messages,
}: {
  id: string;
  defaultValue: string | undefined;
  messages: string[] | undefined;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current && ref.current.value === "") ref.current.value = todayCivilDate();
  }, []);

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`${id}-occurredOn`}>
        Data
      </label>
      <input
        ref={ref}
        className={styles.input}
        id={`${id}-occurredOn`}
        name="occurredOn"
        type="date"
        defaultValue={defaultValue}
        required
        {...errorProps(`${id}-occurredOn`, messages)}
      />
      <FieldError id={`${id}-occurredOn`} messages={messages} />
    </div>
  );
}

export function AmountInput({
  id,
  defaultValue,
  messages,
}: {
  id: string;
  defaultValue: string | undefined;
  messages: string[] | undefined;
}) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={`${id}-amount`}>
        Valor (R$)
      </label>
      <input
        className={`${styles.input} tabular`}
        id={`${id}-amount`}
        name="amount"
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        defaultValue={defaultValue}
        required
        {...errorProps(`${id}-amount`, messages)}
      />
      <FieldError id={`${id}-amount`} messages={messages} />
    </div>
  );
}

export function DescriptionInput({
  id,
  defaultValue,
  messages,
}: {
  id: string;
  defaultValue: string | undefined;
  messages: string[] | undefined;
}) {
  return (
    <div className={`${styles.field} ${styles.fieldWide}`}>
      <label className={styles.label} htmlFor={`${id}-description`}>
        Descricao <span>(opcional)</span>
      </label>
      <input
        className={styles.input}
        id={`${id}-description`}
        name="description"
        defaultValue={defaultValue}
        {...errorProps(`${id}-description`, messages)}
      />
      <FieldError id={`${id}-description`} messages={messages} />
    </div>
  );
}

/** Mensagem de falha do envio; sessao expirada oferece o caminho de volta ao login. */
export function FormFailure({ state }: { state: MovementFormState }) {
  if (state.status !== "error") return null;
  return (
    <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
      <p>{state.message}</p>
      {state.reauth ? (
        // Link do Next faria prefetch e iniciaria a transacao de login por engano.
        <a className={styles.inlineLink} href="/auth/login?returnTo=/movimentacoes">
          Entrar novamente
        </a>
      ) : null}
    </div>
  );
}
