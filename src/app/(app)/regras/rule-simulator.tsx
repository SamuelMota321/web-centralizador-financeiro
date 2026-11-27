"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { IconBadge } from "@/components/icon-badge";
import { IconCheck, IconInfo, IconPlus } from "@/components/icons";
import { SegmentedControl } from "@/components/interactive";
import { ui } from "@/components/ui";
import { matchRange, type MatchOutcome, normalizeDescription, simulate } from "@/lib/category-rules/evaluation";
import type { CategoryRule } from "@/lib/category-rules/types";
import { termSuggestions } from "./presentation";
import { CATEGORY_FALLBACK, conditionValueLabel, FIELD_LABELS, type NamedOption, OPERATOR_LABELS } from "./rule-logic";
import styles from "./regras.module.css";

const TYPES = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
] as const;

const OUTCOME_TEXT: Record<Exclude<MatchOutcome, "aplica">, string> = {
  perde: "também combina, mas vem depois na fila",
  inativa: "combinaria, mas está inativa",
  "categoria-arquivada": "combinaria, mas a categoria está arquivada",
};

/**
 * Simulador: digita uma descrição e vê, na hora, qual regra categorizaria um lançamento novo,
 * por quê, e quem perdeu. Tudo no navegador, com as regras já carregadas na página (nenhuma
 * chamada à API). A lógica é a cópia testada de `evaluation.ts`; o servidor é quem decide.
 */
export function RuleSimulator({
  rules,
  categories,
  colors,
  accounts,
  positions,
  recent,
}: {
  /** Regras não removidas, na ordem do backend. */
  rules: CategoryRule[];
  categories: { id: string; name: string; status: "active" | "archived" }[];
  colors: Record<string, string>;
  accounts: NamedOption[] | null;
  positions: Record<string, number>;
  /** Descrições recentes que ficaram sem categoria (dados reais), para testar com um toque. */
  recent: string[];
}) {
  const id = useId();
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [accountId, setAccountId] = useState("");
  const deferred = useDeferredValue(description);

  const activeIds = useMemo(
    () => new Set(categories.filter((category) => category.status === "active").map((category) => category.id.toLowerCase())),
    [categories],
  );
  const shown = normalizeDescription(deferred);
  const result = useMemo(
    () => (shown ? simulate(rules, activeIds, { description: shown, type, accountId: accountId || null }) : null),
    [rules, activeIds, shown, type, accountId],
  );
  const usesAccounts = rules.some((rule) => rule.conditionField === "accountId" && rule.status !== "removed");

  const categoryOf = (rule: CategoryRule) => {
    const found = categories.find((category) => category.id.toLowerCase() === rule.categoryId.toLowerCase());
    return { name: found?.name ?? CATEGORY_FALLBACK, color: found?.status === "active" ? (colors[found.id] ?? null) : null };
  };
  const condition = (rule: CategoryRule) =>
    `${FIELD_LABELS[rule.conditionField].toLowerCase()} ${OPERATOR_LABELS[rule.conditionOperator]} ${conditionValueLabel(rule, accounts)}`;
  const order = (rule: CategoryRule) => {
    const position = positions[rule.id];
    return position ? `nº ${position}` : "fora da fila";
  };

  // Abre "Nova regra" já com o termo: o painel lê `termo` da URL (sem ir ao servidor).
  const createWith = (term: string) => {
    const search = new URLSearchParams(window.location.search);
    search.set("nova", "1");
    search.set("termo", term);
    window.history.replaceState(null, "", `?${search.toString()}`);
  };

  const winner = result?.winner ?? null;
  const others = result?.matches.filter((match) => match.outcome !== "aplica") ?? [];
  const range = winner && shown ? matchRange(shown, winner) : null;
  const terms = shown && !winner ? termSuggestions(shown) : [];

  return (
    <section className={styles.simulator} aria-labelledby={`${id}-title`}>
      <div className={styles.simulatorHead}>
        <h2 id={`${id}-title`} className={styles.simulatorTitle}>
          Testar uma descrição
        </h2>
        <span className={styles.simulatorTag}>Simulação</span>
      </div>

      <div className={styles.simulatorInputs}>
        <label className="visually-hidden" htmlFor={`${id}-description`}>
          Descrição do lançamento
        </label>
        <input
          id={`${id}-description`}
          className={`${ui.input} ${styles.simulatorInput}`}
          type="search"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Ex.: UBER *TRIP, Drogasil 123, Netflix.com"
          maxLength={200}
          autoComplete="off"
          spellCheck={false}
        />
        <SegmentedControl label="Tipo do lançamento" options={TYPES} value={type} onChange={setType} />
        {usesAccounts && accounts ? (
          <>
            <label className="visually-hidden" htmlFor={`${id}-account`}>
              Conta
            </label>
            <select id={`${id}-account`} className={ui.select} value={accountId} onChange={(event) => setAccountId(event.target.value)}>
              <option value="">Sem conta escolhida</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </>
        ) : null}
      </div>

      {recent.length > 0 ? (
        <div className={styles.simulatorRecent}>
          <span className={styles.simulatorRecentLabel}>Recentes sem categoria:</span>
          {recent.map((item) => (
            <button key={item} type="button" className={styles.simulatorChip} onClick={() => setDescription(item)} aria-pressed={item === description}>
              {item}
            </button>
          ))}
        </div>
      ) : null}

      <div className={styles.simulatorResult} aria-live="polite">
        {!shown ? (
          <p className={styles.simulatorIdle}>
            Digite como a descrição aparece no extrato. O resultado aparece aqui, com a regra que decidiria e as que ficariam para trás.
          </p>
        ) : winner ? (
          <>
            <p className={styles.verdict} data-tone="positive">
              <IconCheck size={18} />
              <span>
                Seria categorizado como{" "}
                <span className={styles.verdictCategory}>
                  <IconBadge name={categoryOf(winner).name} color={categoryOf(winner).color} />
                  <strong>{categoryOf(winner).name}</strong>
                </span>
              </span>
            </p>
            <p className={styles.verdictWhy}>
              Pela regra{" "}
              <a className={ui.inlineLink} href={`#regra-${winner.id.toLowerCase()}`}>
                {order(winner)}
              </a>
              : se {condition(winner)} (prioridade {winner.priority}).
            </p>
            {range ? (
              <p className={styles.verdictText}>
                {shown.slice(0, range[0])}
                <mark className={styles.verdictMark}>{shown.slice(range[0], range[1])}</mark>
                {shown.slice(range[1])}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className={styles.verdict} data-tone="neutral">
              <IconInfo size={18} />
              <span>Ficaria sem categoria: nenhuma regra ativa combina.</span>
            </p>
            {terms.length > 0 ? (
              <div className={styles.simulatorRecent}>
                <span className={styles.simulatorRecentLabel}>Criar regra “descrição contém”:</span>
                {terms.map((term) => (
                  <button key={term} type="button" className={styles.simulatorChip} data-action onClick={() => createWith(term)}>
                    <IconPlus size={13} />
                    {term}
                  </button>
                ))}
              </div>
            ) : null}
          </>
        )}

        {others.length > 0 ? (
          <ul className={styles.verdictOthers}>
            {others.map(({ rule, outcome }) => (
              <li key={rule.id}>
                <a className={ui.inlineLink} href={`#regra-${rule.id.toLowerCase()}`}>
                  {order(rule)}
                </a>{" "}
                se {condition(rule)} → {categoryOf(rule).name}: {OUTCOME_TEXT[outcome as Exclude<MatchOutcome, "aplica">]}.
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <p className={styles.simulatorNote}>
        Feito no seu navegador com as regras desta página. Quem categoriza de verdade é o servidor, quando você registra um lançamento no app.
      </p>
    </section>
  );
}
