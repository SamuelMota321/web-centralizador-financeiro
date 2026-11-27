"use client";

import { useActionState } from "react";
import { Notice, PendingLabel, ui } from "@/components/ui";
import { SUGGESTED_CATEGORIES } from "@/lib/categories/suggestions";
import { createSuggestedCategoriesAction, type SuggestionState } from "./actions";
import styles from "./categorias.module.css";

const INITIAL: SuggestionState = { status: "idle" };

/** Atalho opcional do estado vazio: cria o conjunto básico, que depois pertence à pessoa. */
export function SuggestedCategories() {
  const [state, action, pending] = useActionState(createSuggestedCategoriesAction, INITIAL);

  return (
    <form action={action} className={styles.suggestions}>
      <p className={styles.suggestionsText}>
        Comece pelas sugeridas: {SUGGESTED_CATEGORIES.join(", ")}. Depois você pode renomear, arquivar ou criar outras.
      </p>
      <div>
        <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={pending} aria-busy={pending}>
          <PendingLabel pending={pending} idle="Usar categorias sugeridas" busy="Criando…" />
        </button>
      </div>
      {state.status === "error" ? (
        <Notice
          tone="error"
          actions={state.reauth ? <a className={ui.inlineLink} href="/auth/login?returnTo=/categorias">Entrar novamente</a> : undefined}
        >
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
