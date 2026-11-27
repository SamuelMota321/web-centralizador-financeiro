"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { showToast } from "@/components/interactive";
import { errorProps, FieldError, Notice, PendingLabel, ui } from "@/components/ui";
import { formatCivilDate, maskBrazilianDate } from "@/lib/civil-date";
import { LIMITS, type PatrimonyCollection, type PatrimonyItem } from "@/lib/patrimony/types";
import { createPatrimonyAction, type PatrimonyFormState, updatePatrimonyAction } from "./actions";
import { NO_ASSET, SECTIONS } from "./presentation";

const INITIAL: PatrimonyFormState = { status: "idle" };

/** Valores iniciais do formulário: o que foi digitado (após erro) ou o item em edição. */
function initialValues(item: PatrimonyItem | undefined): Record<string, string> {
  if (!item) return {};
  const values: Record<string, string> = { description: item.description };
  if (item.kind === "asset") {
    Object.assign(values, {
      type: item.type,
      estimatedValue: item.estimatedValue.replace(".", ","),
      valuationDate: formatCivilDate(item.valuationDate),
      source: item.source,
    });
  } else {
    values.outstandingBalance = item.outstandingBalance.replace(".", ",");
    if (item.kind === "financing") values.assetId = item.assetId ?? "";
  }
  return values;
}

export function PatrimonyForm({
  collection,
  item,
  assets,
  onDone,
}: {
  collection: PatrimonyCollection;
  /** Presente na edição. */
  item?: PatrimonyItem;
  /** Bens disponíveis para associar a um financiamento. */
  assets: { id: string; description: string }[] | null;
  onDone?: () => void;
}) {
  const action = item
    ? updatePatrimonyAction.bind(null, collection, item.id)
    : createPatrimonyAction.bind(null, collection);
  const [state, formAction, pending] = useActionState(action, INITIAL);
  const id = useId();
  const announced = useRef<PatrimonyFormState | null>(null);
  const section = SECTIONS[collection];

  useEffect(() => {
    if (state.status !== "success" || announced.current === state) return;
    announced.current = state;
    showToast("success", item ? "Alterações salvas. O histórico guarda a versão anterior." : section.created);
    onDone?.();
  }, [state, item, onDone, section.created]);

  const values = state.status === "invalid" || state.status === "error" ? state.values : initialValues(item);
  const errors = state.status === "invalid" ? state.errors : {};
  // Depois de criar, o React limpa o formulário; a chave remonta os campos sem valor antigo.
  const key = state.status === "success" ? state.at : "form";
  const field = (name: string) => `${id}-${name}`;

  const textInput = (name: string, label: string, max: number, placeholder: string, wide = false) => (
    <div className={`${ui.field} ${wide ? ui.fieldWide : ""}`}>
      <label className={ui.label} htmlFor={field(name)}>
        {label}
      </label>
      <input
        className={ui.input}
        id={field(name)}
        name={name}
        maxLength={max}
        placeholder={placeholder}
        defaultValue={values[name] ?? ""}
        required
        {...errorProps(`${field(name)}-error`, errors[name])}
      />
      <FieldError id={`${field(name)}-error`} message={errors[name]} />
    </div>
  );

  const amountInput = (name: string, label: string) => (
    <div className={ui.field}>
      <label className={ui.label} htmlFor={field(name)}>
        {label}
      </label>
      <input
        className={`${ui.input} tabular`}
        id={field(name)}
        name={name}
        inputMode="decimal"
        autoComplete="off"
        placeholder="0,00"
        defaultValue={values[name] ?? ""}
        required
        {...errorProps(`${field(name)}-error`, errors[name])}
      />
      <FieldError id={`${field(name)}-error`} message={errors[name]} />
    </div>
  );

  return (
    <form action={formAction} className={ui.form} key={key}>
      {collection === "assets" ? textInput("type", "Tipo", LIMITS.type, "Ex.: Imóvel, Veículo") : null}
      {textInput("description", "Descrição", LIMITS.description, collection === "assets" ? "Ex.: Apartamento na Asa Sul" : "Ex.: Financiamento do carro", true)}

      {collection === "assets" ? (
        <>
          {amountInput("estimatedValue", "Valor estimado (R$)")}
          <div className={ui.field}>
            <label className={ui.label} htmlFor={field("valuationDate")}>
              Data da avaliação
            </label>
            <input
              className={`${ui.input} tabular`}
              id={field("valuationDate")}
              name="valuationDate"
              inputMode="numeric"
              autoComplete="off"
              placeholder="DD/MM/AAAA"
              maxLength={10}
              defaultValue={values.valuationDate ?? ""}
              onInput={(event) => {
                event.currentTarget.value = maskBrazilianDate(event.currentTarget.value);
              }}
              required
              {...errorProps(`${field("valuationDate")}-error`, errors.valuationDate)}
            />
            <FieldError id={`${field("valuationDate")}-error`} message={errors.valuationDate} />
          </div>
          {textInput("source", "De onde veio o valor", LIMITS.source, "Ex.: Avaliação de corretor, tabela FIPE", true)}
        </>
      ) : (
        amountInput("outstandingBalance", "Saldo devedor (R$)")
      )}

      {collection === "financings" ? (
        <div className={ui.field}>
          <label className={ui.label} htmlFor={field("assetId")}>
            Bem associado
          </label>
          <select
            className={ui.select}
            id={field("assetId")}
            name="assetId"
            defaultValue={values.assetId ?? ""}
            {...errorProps(`${field("assetId")}-error`, errors.assetId)}
          >
            <option value="">{NO_ASSET}</option>
            {(assets ?? []).map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.description}
              </option>
            ))}
          </select>
          <FieldError id={`${field("assetId")}-error`} message={errors.assetId} />
        </div>
      ) : null}

      {state.status === "invalid" && state.message ? (
        <Notice tone="info" className={ui.fullWidth}>
          {state.message}
        </Notice>
      ) : null}
      {state.status === "error" ? (
        <Notice
          tone="error"
          className={ui.fullWidth}
          actions={
            state.reauth ? (
              <a className={ui.inlineLink} href="/auth/login?returnTo=/patrimonio">
                Entrar novamente
              </a>
            ) : undefined
          }
        >
          {state.message}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        {onDone && item ? (
          <button className={`${ui.button} ${ui.ghost}`} type="button" onClick={onDone} disabled={pending}>
            Cancelar
          </button>
        ) : null}
        {/* Sem Idempotency-Key no contrato: o botão desabilitado evita o duplo envio. */}
        <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={pending} aria-busy={pending}>
          <PendingLabel pending={pending} idle={item ? "Salvar alterações" : section.submit} busy="Salvando…" />
        </button>
      </div>
    </form>
  );
}
