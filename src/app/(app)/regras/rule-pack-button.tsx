"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Notice, PendingLabel, ui } from "@/components/ui";
import { applyRulePackAction, type RulePackState } from "./actions";
import styles from "./regras.module.css";

const INITIAL: RulePackState = { status: "idle" };

export function RulePackButton() {
  const [state, action, pending] = useActionState(applyRulePackAction, INITIAL);

  return (
    <form action={action} className={styles.packAction}>
      <div>
        <button className={`${ui.button} ${ui.secondary}`} type="submit" disabled={pending} aria-busy={pending}>
          <PendingLabel pending={pending} idle="Adicionar as regras que faltam" busy="Adicionando…" />
        </button>
      </div>
      {state.status === "done" ? (
        <Notice tone={state.created > 0 ? "success" : "info"}>
          {state.created > 0
            ? `${state.created} ${state.created === 1 ? "regra adicionada" : "regras adicionadas"}.`
            : "Todas as regras do pacote já existem para as suas categorias."}
          {state.missingCategories.length > 0 ? (
            <>
              {" "}
              Ficaram de fora as de {state.missingCategories.join(", ")}, porque essas categorias não existem ou estão
              arquivadas.{" "}
              <Link className={ui.inlineLink} href="/categorias">
                Ver categorias
              </Link>
            </>
          ) : null}
        </Notice>
      ) : null}
      {state.status === "error" ? (
        <Notice
          tone="error"
          actions={state.reauth ? <a className={ui.inlineLink} href="/auth/login?returnTo=/regras">Entrar novamente</a> : undefined}
        >
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
