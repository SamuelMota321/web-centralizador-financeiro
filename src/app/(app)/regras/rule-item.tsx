"use client";

import { useActionState, useState, useTransition } from "react";
import { IconPause, IconPlay, IconTrash } from "@/components/icons";
import { ActionMenu, ConfirmDialog } from "@/components/interactive";
import { Notice, PendingLabel, StatusChip, ui } from "@/components/ui";
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
  ruleConditionParts,
  STATUS_LABELS,
  valuesFromRule,
} from "./rule-logic";
import styles from "./regras.module.css";

const LIFECYCLE_INITIAL: RuleLifecycleState = { status: "idle" };

interface Props {
  rule: CategoryRule;
  /** Ativas e arquivadas, para ler o nome; o formulário recebe só as ativas. */
  categories: CategoryOption[] | null;
  accounts: NamedOption[] | null;
}

export function RuleItem({ rule, categories, accounts }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [activateState, activate, activating] = useActionState(
    activateRuleAction.bind(null, rule.id),
    LIFECYCLE_INITIAL,
  );
  const [deactivateState, deactivate, deactivating] = useActionState(
    deactivateRuleAction.bind(null, rule.id),
    LIFECYCLE_INITIAL,
  );
  const [removeState, remove, removing] = useActionState(
    removeRuleAction.bind(null, rule.id),
    LIFECYCLE_INITIAL,
  );
  const [, startTransition] = useTransition();
  const removed = rule.status === "removed";
  const category = ruleCategory(rule, categories);
  const condition = ruleConditionParts(rule, accounts);
  const lifecycleError =
    activateState.status === "error"
      ? activateState
      : deactivateState.status === "error"
        ? deactivateState
        : null;
  const activeCategories = (categories ?? []).filter((item) => item.status === "active");
  const busy = activating || deactivating;

  // Ativar e desativar são reversíveis: executam direto do menu, sem confirmação.
  const toggleStatus = () =>
    startTransition(() => (rule.status === "active" ? deactivate() : activate()));

  return (
    <li
      className={styles.row}
      data-removed={removed || undefined}
      data-open={editing || undefined}
    >
      <div className={styles.rowMain}>
        <p className={styles.sentence}>
          {condition.lead} <span className={styles.value}>{condition.value}</span>{" "}
          <span className={styles.arrow} aria-label="aplica">
            →
          </span>{" "}
          <strong className={styles.category}>{category.name}</strong>
          {category.archived ? " (arquivada)" : ""}
        </p>
        {category.archived && !removed ? (
          <p className={styles.rowMeta}>
            Não será aplicada enquanto a categoria estiver arquivada.
          </p>
        ) : null}
        {removed ? <p className={styles.rowMeta}>Somente leitura</p> : null}
      </div>

      <p className={`${styles.priority} tabular`}>
        <span className={styles.priorityLabel}>Prioridade </span>
        {rule.priority}
      </p>

      <StatusChip tone={rule.status === "active" ? "positive" : "neutral"}>
        {busy ? (activating ? "Ativando…" : "Desativando…") : STATUS_LABELS[rule.status]}
      </StatusChip>

      <div className={ui.rowActions}>
        {removed ? null : (
          <>
            <button
              className={`${ui.button} ${ui.ghost} ${ui.small}`}
              type="button"
              aria-expanded={editing}
              onClick={() => setEditing(!editing)}
              disabled={busy}
            >
              Editar
            </button>
            <ActionMenu
              label="Mais ações para esta regra"
              disabled={busy}
              items={[
                rule.status === "active"
                  ? { label: "Desativar", icon: <IconPause size={17} />, onSelect: toggleStatus }
                  : { label: "Ativar", icon: <IconPlay size={17} />, onSelect: toggleStatus },
                {
                  label: "Remover regra",
                  icon: <IconTrash size={17} />,
                  tone: "danger",
                  onSelect: () => setConfirming(true),
                },
              ]}
            />
          </>
        )}
      </div>

      {lifecycleError ? (
        <div className={ui.rowPanel}>
          <Notice tone="error" actions={lifecycleError.reauth ? <ReauthLink /> : undefined}>
            {lifecycleError.message}
          </Notice>
        </div>
      ) : null}

      {editing ? (
        <div className={`${ui.rowPanel} ${ui.reveal}`}>
          <EditPanel
            rule={rule}
            categories={activeCategories}
            accounts={accounts ?? []}
            onClose={() => setEditing(false)}
          />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Remover esta regra?"
        description="Ela deixa de ser aplicada e continua visível como removida, mas não poderá ser reativada nem editada. As movimentações já categorizadas por ela não mudam."
        confirmLabel="Remover regra"
        pendingLabel="Removendo…"
        action={remove}
        pending={removing}
        error={
          removeState.status === "error" ? (
            <Notice tone="error" actions={removeState.reauth ? <ReauthLink /> : undefined}>
              {removeState.message}
            </Notice>
          ) : null
        }
      />
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
    <form action={formAction} className={ui.form}>
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
          <PendingLabel pending={pending} idle="Salvar regra" busy="Salvando…" />
        </button>
        <button className={ui.linkButton} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
        {!dirty ? <span className={ui.help}>Altere algum campo para salvar.</span> : null}
      </div>
    </form>
  );
}
