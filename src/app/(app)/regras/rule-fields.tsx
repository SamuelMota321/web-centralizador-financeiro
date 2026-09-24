"use client";

import { useId, useState } from "react";
import { errorProps, FieldError, ui } from "@/components/ui";
import { RULE_CONDITION_FIELDS, type RuleConditionField } from "@/lib/category-rules/types";
import {
  changeField,
  FIELD_LABELS,
  type FieldErrors,
  type NamedOption,
  OPERATOR_LABELS,
  operatorsFor,
  ruleCondition,
  type RuleFormValues,
  TYPE_VALUE_LABELS,
} from "./rule-logic";
import styles from "./regras.module.css";

interface Props {
  initial: RuleFormValues;
  fieldErrors: FieldErrors | undefined;
  /** Somente categorias e contas ativas são oferecidas. */
  categories: NamedOption[];
  accounts: NamedOption[];
  onChange?: (values: RuleFormValues) => void;
}

/** Campo → operador (filtrado) → valor (controle do campo) → categoria → prioridade. */
export function RuleFields({ initial, fieldErrors, categories, accounts, onChange }: Props) {
  const id = useId();
  const [values, setValues] = useState(initial);
  const field = (RULE_CONDITION_FIELDS as readonly string[]).includes(values.conditionField)
    ? (values.conditionField as RuleConditionField)
    : "description";

  const update = (next: RuleFormValues) => {
    setValues(next);
    onChange?.(next);
  };
  const set = (key: keyof RuleFormValues) => (value: string) => update({ ...values, [key]: value });

  const operators = operatorsFor(field);
  const operator = operators.find((option) => option === values.conditionOperator) ?? operators[0];
  const categoryName = categories.find((category) => category.id === values.categoryId)?.name;
  const preview =
    values.conditionValue.trim() && categoryName
      ? `${ruleCondition(
          { conditionField: field, conditionOperator: operator, conditionValue: values.conditionValue.trim() },
          accounts,
        )} → ${categoryName}`
      : null;

  return (
    <>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-field`}>
          Quando
        </label>
        <select
          className={ui.select}
          id={`${id}-field`}
          name="conditionField"
          value={field}
          onChange={(event) => update(changeField(values, event.target.value as RuleConditionField))}
          {...errorProps(`${id}-field-error`, fieldErrors?.conditionField)}
        >
          {RULE_CONDITION_FIELDS.map((option) => (
            <option key={option} value={option}>
              {FIELD_LABELS[option]}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-field-error`} message={fieldErrors?.conditionField} />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-operator`}>
          Comparação
        </label>
        <select
          className={ui.select}
          id={`${id}-operator`}
          name="conditionOperator"
          value={operator}
          onChange={(event) => set("conditionOperator")(event.target.value)}
          {...errorProps(`${id}-operator-error`, fieldErrors?.conditionOperator)}
        >
          {operators.map((option) => (
            <option key={option} value={option}>
              {OPERATOR_LABELS[option]}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-operator-error`} message={fieldErrors?.conditionOperator} />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-value`}>
          {field === "description" ? "Texto" : field === "type" ? "Tipo de movimentação" : "Conta"}
        </label>
        {field === "description" ? (
          <input
            className={ui.input}
            id={`${id}-value`}
            name="conditionValue"
            value={values.conditionValue}
            onChange={(event) => set("conditionValue")(event.target.value)}
            placeholder="Ex.: mercado"
            autoComplete="off"
            {...errorProps(`${id}-value-error`, fieldErrors?.conditionValue)}
          />
        ) : (
          <select
            className={ui.select}
            id={`${id}-value`}
            name="conditionValue"
            value={field === "type" ? values.conditionValue.toLowerCase() : values.conditionValue}
            onChange={(event) => set("conditionValue")(event.target.value)}
            {...errorProps(`${id}-value-error`, fieldErrors?.conditionValue)}
          >
            <option value="" disabled>
              {field === "type" ? "Escolha receita ou despesa" : "Escolha uma conta"}
            </option>
            {field === "type"
              ? Object.entries(TYPE_VALUE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))
              : accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
          </select>
        )}
        <FieldError id={`${id}-value-error`} message={fieldErrors?.conditionValue} />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-category`}>
          Aplicar a categoria
        </label>
        <select
          className={ui.select}
          id={`${id}-category`}
          name="categoryId"
          value={categories.some((category) => category.id === values.categoryId) ? values.categoryId : ""}
          onChange={(event) => set("categoryId")(event.target.value)}
          {...errorProps(`${id}-category-error`, fieldErrors?.categoryId)}
        >
          <option value="" disabled>
            Escolha uma categoria
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <FieldError id={`${id}-category-error`} message={fieldErrors?.categoryId} />
      </div>

      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-priority`}>
          Prioridade
        </label>
        <input
          className={`${ui.input} tabular`}
          id={`${id}-priority`}
          name="priority"
          inputMode="numeric"
          value={values.priority}
          onChange={(event) => set("priority")(event.target.value)}
          aria-describedby={fieldErrors?.priority ? `${id}-priority-error` : `${id}-priority-help`}
          aria-invalid={fieldErrors?.priority ? true : undefined}
        />
        {fieldErrors?.priority ? (
          <FieldError id={`${id}-priority-error`} message={fieldErrors.priority} />
        ) : (
          <p className={ui.help} id={`${id}-priority-help`}>
            Número inteiro, 0 ou mais. A maior vence.
          </p>
        )}
      </div>

      {preview ? (
        <p className={`${styles.preview} ${ui.fieldWide}`} aria-live="polite">
          <span className={styles.previewLabel}>Como a regra fica</span>
          {preview}
        </p>
      ) : null}
    </>
  );
}
