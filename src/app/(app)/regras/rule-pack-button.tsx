"use client";

import { useTransition } from "react";
import { showToast } from "@/components/interactive";
import { PendingLabel, ui } from "@/components/ui";
import { applyRulePackAction } from "./actions";

/**
 * Adiciona as regras do pacote que faltam. O resultado vai num aviso temporário (toast) e não
 * dentro do cabeçalho do bloco, onde um texto longo estourava o layout.
 */
export function RulePackButton({ missing }: { missing: number }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className={`${ui.button} ${ui.secondary}`}
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const state = await applyRulePackAction();
          if (state.status === "error") {
            showToast(
              "error",
              state.reauth ? (
                <>
                  {state.message}{" "}
                  <a className={ui.inlineLink} href="/auth/login?returnTo=/regras">
                    Entrar novamente
                  </a>
                </>
              ) : (
                state.message
              ),
            );
          } else if (state.status === "done") {
            const text =
              state.created > 0
                ? `${state.created} ${state.created === 1 ? "regra adicionada" : "regras adicionadas"}.`
                : "Todas as regras do pacote já existem para as suas categorias.";
            const left =
              state.missingCategories.length > 0
                ? ` Ficaram de fora as de ${state.missingCategories.join(", ")}: essas categorias não existem ou estão arquivadas.`
                : "";
            showToast(state.created > 0 ? "success" : "info", text + left);
          }
        })
      }
    >
      <PendingLabel pending={pending} idle={`Adicionar ${missing === 1 ? "a regra que falta" : `as ${missing} regras que faltam`}`} busy="Adicionando…" />
    </button>
  );
}
