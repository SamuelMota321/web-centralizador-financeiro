"use client";

import { useActionState } from "react";
import { Notice, PendingLabel, ui } from "@/components/ui";
import { SUGGESTED_CATEGORIES } from "@/lib/categories/suggestions";
import { createSuggestedCategoriesAction, type SuggestionState } from "./actions";
import styles from "./categorias.module.css";

const INITIAL: SuggestionState = { status: "idle" };

/**
 * Atalho opcional: cria o conjunto básico de categorias, que depois pertence à pessoa.
 * Com `missing`, vira um aviso compacto para quem já tem categorias e quer completar o conjunto.
 */
export function SuggestedCategories({ missing }: { missing?: readonly string[] }) {
  const [state, action, pending] = useActionState(createSuggestedCategoriesAction, INITIAL);

  if (missing) {
    return (
      <form action={action}>
        <Notice
          tone={state.status === "error" ? "error" : "info"}
          actions={
            <button className={`${ui.button} ${ui.secondary} ${ui.small}`} type="submit" disabled={pending} aria-busy={pending}>
              <PendingLabel
                pending={pending}
                idle={missing.length === 1 ? "Adicionar a que falta" : `Adicionar as ${missing.length} que faltam`}
                busy="Criando…"
              />
            </button>
          }
        >
          {state.status === "error"
            ? state.message
            : `${missing.length === 1 ? "Falta 1 categoria sugerida" : `Faltam ${missing.length} categorias sugeridas`}: ${missing.join(", ")}.`}
        </Notice>
      </form>
    );
  }

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
