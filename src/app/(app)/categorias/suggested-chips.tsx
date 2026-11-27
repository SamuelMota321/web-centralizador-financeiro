"use client";

import { useState, useTransition } from "react";
import { IconBadge } from "@/components/icon-badge";
import { IconPlus } from "@/components/icons";
import { Notice, PendingLabel, ui } from "@/components/ui";
import { createOneSuggestedCategoryAction, createSuggestedCategoriesAction } from "./actions";
import styles from "./categorias.module.css";

/**
 * Sugeridas que faltam, como chips: cada um adiciona só aquela categoria; "Adicionar todas"
 * cria as restantes. Some quando o conjunto está completo (a página recalcula ao revalidar).
 */
export function SuggestedChips({ missing }: { missing: readonly string[] }) {
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function add(name: string | "todas") {
    setError(null);
    setPendingName(name);
    startTransition(async () => {
      const result = name === "todas" ? await createSuggestedCategoriesAction() : await createOneSuggestedCategoryAction(name);
      if (result.status === "error") setError(result.message);
      setPendingName(null);
    });
  }

  return (
    <section className={styles.suggested} aria-labelledby="sugeridas-titulo">
      <div className={styles.suggestedHead}>
        <h2 id="sugeridas-titulo" className={styles.suggestedTitle}>
          Sugeridas para você
        </h2>
        <p className={styles.suggestedHint}>Um toque cria a categoria; depois ela é sua para renomear ou arquivar.</p>
      </div>
      <ul className={styles.chips}>
        {missing.map((name) => (
          <li key={name}>
            <button
              type="button"
              className={styles.chip}
              onClick={() => add(name)}
              disabled={pending}
              aria-busy={pendingName === name}
              aria-label={`Adicionar a categoria ${name}`}
            >
              <IconBadge name={name} color={null} />
              <span>{name}</span>
              <IconPlus size={15} />
            </button>
          </li>
        ))}
      </ul>
      {missing.length > 1 ? (
        <div>
          <button className={`${ui.button} ${ui.secondary} ${ui.small}`} type="button" onClick={() => add("todas")} disabled={pending} aria-busy={pendingName === "todas"}>
            <PendingLabel pending={pendingName === "todas"} idle={`Adicionar todas (${missing.length})`} busy="Criando…" />
          </button>
        </div>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </section>
  );
}
