"use client";

import { useActionState, useId, useState } from "react";
import { Notice, StatusChip, ui } from "@/components/ui";
import type { CategoryRule } from "@/lib/category-rules/types";
import {
  activateRuleAction,
  deactivateRuleAction,
  removeRuleAction,
  type RuleFormState,
  type RuleLifecycleState,
  updateRuleAction,
} from "./actions";
import { RuleFields } from "./rule-fields";
import {
  type CategoryOption,
  isDirty,
  type NamedOption,
  ruleCategory,
  ruleCondition,
  STATUS_LABELS,
  valuesFromRule,
} from "./rule-logic";
import styles from "./regras.module.css";

const LIFECYCLE_INITIAL: RuleLifecycleState = { status: "idle" };

type Panel = "none" | "edit" | "remove";

interface Props {
  rule: CategoryRule;
  /** Ativas e arquivadas, para ler o nome; o formulário recebe só as ativas. */
  categories: CategoryOption[] | null;
  accounts: NamedOption[] | null;
}

export function RuleItem({ rule, categories, accounts }: Props) {
  const [panel, setPanel] = useState<Panel>("none");
  const [activateState, activate, activating] = useActionState(
    activateRuleAction.bind(null, rule.id),
    LIFECYCLE_INITIAL,
  );
  const [deactivateState, deactivate, deactivating] = useActionState(
    deactivateRuleAction.bind(null, rule.id),
    LIFECYCLE_INITIAL,
  );
  const removed = rule.status === "removed";
  const category = ruleCategory(rule, categories);
  const lifecycleError =
    activateState.status === "error"
      ? activateState
      : deactivateState.status === "error"
        ? deactivateState
        : null;
  const activeCategories = (categories ?? []).filter((item) => item.status === "active");
  const busy = activating || deactivating;

  return (
    <li className={styles.row} data-removed={removed || undefined}>
      <div className={styles.rowMain}>
        <p className={styles.sentence}>
          {ruleCondition(rule, accounts)}{" "}
          <span className={styles.arrow} aria-label="aplica">
            →
          </span>{" "}
          <strong>{category.name}</strong>
          {category.archived ? " (arquivada)" : ""}
        </p>
        <p className={styles.rowMeta}>
          <span className="tabular">Prioridade {rule.priority}</span>
          {category.archived && !removed
            ? " · Não será aplicada enquanto a categoria estiver arquivada."
            : ""}
          {removed ? " · Somente leitura" : ""}
        </p>
      </div>

      <StatusChip tone={rule.status === "active" ? "positive" : "neutral"}>
        {STATUS_LABELS[rule.status]}
      </StatusChip>

      <div className={styles.rowActions}>
        {removed ? null : (
          <>
            <button
              className={ui.linkButton}
              type="button"
              aria-expanded={panel === "edit"}
              onClick={() => setPanel(panel === "edit" ? "none" : "edit")}
              disabled={busy}
            >
              Editar
            </button>
            {rule.status === "active" ? (
              <form action={deactivate}>
                <button className={ui.linkButton} type="submit" disabled={busy} aria-busy={deactivating}>
                  {deactivating ? "Desativando…" : "Desativar"}
                </button>
              </form>
            ) : (
              <form action={activate}>
                <button className={ui.linkButton} type="submit" disabled={busy} aria-busy={activating}>
                  {activating ? "Ativando…" : "Ativar"}
                </button>
              </form>
            )}
            <button
              className={`${ui.linkButton} ${ui.linkDanger}`}
              type="button"
              aria-expanded={panel === "remove"}
              onClick={() => setPanel(panel === "remove" ? "none" : "remove")}
              disabled={busy}
            >
              Remover
            </button>
          </>
        )}
      </div>

      {lifecycleError ? (
        <div className={styles.rowPanel}>
          <Notice tone="error" actions={lifecycleError.reauth ? <ReauthLink /> : undefined}>
            {lifecycleError.message}
          </Notice>
        </div>
      ) : null}

      {panel === "edit" ? (
        <div className={styles.rowPanel}>
          <EditPanel
            rule={rule}
            categories={activeCategories}
            accounts={accounts ?? []}
            onClose={() => setPanel("none")}
          />
        </div>
      ) : null}

      {panel === "remove" ? (
        <div className={styles.rowPanel}>
          <RemovePanel rule={rule} onClose={() => setPanel("none")} />
        </div>
      ) : null}
    </li>
  );
}

function ReauthLink() {
  // Link do Next faria prefetch e iniciaria a transação de login por engano.
  return (
    <a className={ui.inlineLink} href="/auth/login?returnTo=/regras">
      Entrar novamente
    </a>
  );
}

interface Attempt {
  result: RuleFormState;
  version: number;
}

function EditPanel({
  rule,
  categories,
  accounts,
  onClose,
}: {
  rule: CategoryRule;
  categories: NamedOption[];
  accounts: NamedOption[];
  onClose: () => void;
}) {
  const [attempt, formAction, pending] = useActionState<Attempt, FormData>(
    async (previous, formData) => ({
      result: await updateRuleAction(rule.id, rule, previous.result, formData),
      version: previous.version + 1,
    }),
    { result: { status: "idle" }, version: 0 },
  );
  const { result } = attempt;
  const initial = "values" in result ? result.values : valuesFromRule(rule);
  const [dirty, setDirty] = useState(() => isDirty(rule, initial));

  return (
    <form action={formAction} className={`${ui.form} ${ui.reveal}`}>
      <RuleFields
        key={attempt.version}
        initial={initial}
        fieldErrors={result.status === "invalid" ? result.fieldErrors : undefined}
        categories={categories}
        accounts={accounts}
        onChange={(values) => setDirty(isDirty(rule, values))}
      />

      {result.status === "unchanged" ? (
        <Notice tone="info" className={ui.fullWidth}>
          Nenhuma alteração para salvar.
        </Notice>
      ) : null}

      {result.status === "error" ? (
        <Notice
          tone="error"
          className={ui.fullWidth}
          actions={result.reauth ? <ReauthLink /> : undefined}
        >
          {result.message}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        {/* Envio sem alteração é evitado aqui; o servidor também confere. */}
        <button
          className={`${ui.button} ${ui.primary} ${ui.small}`}
          type="submit"
          disabled={pending || !dirty}
          aria-busy={pending}
        >
          {pending ? "Salvando…" : "Salvar regra"}
        </button>
        <button className={ui.linkButton} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
        {!dirty ? <span className={ui.help}>Altere algum campo para salvar.</span> : null}
      </div>
    </form>
  );
}

function RemovePanel({ rule, onClose }: { rule: CategoryRule; onClose: () => void }) {
  const [state, remove, pending] = useActionState(
    removeRuleAction.bind(null, rule.id),
    LIFECYCLE_INITIAL,
  );
  const textId = useId();

  return (
    <form action={remove} className={`${styles.confirm} ${ui.reveal}`} aria-describedby={textId}>
      <p id={textId}>
        Remover esta regra? Ela deixa de ser aplicada e continua visível como removida, mas não
        poderá ser reativada nem editada. As movimentações já categorizadas por ela não mudam.
      </p>

      {state.status === "error" ? (
        <Notice tone="error" actions={state.reauth ? <ReauthLink /> : undefined}>
          {state.message}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        {/* Foco inicial na opção segura: a ação definitiva exige escolha explícita. */}
        <button
          className={`${ui.button} ${ui.secondary} ${ui.small}`}
          type="button"
          onClick={onClose}
          disabled={pending}
          autoFocus
        >
          Cancelar
        </button>
        <button
          className={`${ui.button} ${ui.danger} ${ui.small}`}
          type="submit"
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "Removendo…" : "Remover regra"}
        </button>
      </div>
    </form>
  );
}
