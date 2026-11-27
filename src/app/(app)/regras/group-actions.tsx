"use client";

import { useState, useTransition } from "react";
import { IconPause, IconPlay, IconPlus } from "@/components/icons";
import { showToast } from "@/components/interactive";
import { PendingLabel, ui } from "@/components/ui";
import { addPackGroupAction, setSuggestedGroupStatusAction } from "./actions";

function reportError(message: string, reauth?: boolean) {
  showToast(
    "error",
    reauth ? (
      <>
        {message}{" "}
        <a className={ui.inlineLink} href="/auth/login?returnTo=/regras">
          Entrar novamente
        </a>
      </>
    ) : (
      message
    ),
  );
}

/** Ativa ou desativa o grupo inteiro de sugeridas de uma categoria. Reversível: sem confirmação. */
export function GroupToggle({ category, target }: { category: string; target: "active" | "inactive" }) {
  const [pending, startTransition] = useTransition();
  const verb = target === "active" ? "Ativar" : "Desativar";

  return (
    <button
      className={`${ui.button} ${ui.ghost} ${ui.small}`}
      type="button"
      disabled={pending}
      aria-busy={pending}
      aria-label={`${verb} as regras sugeridas de ${category}`}
      onClick={() =>
        startTransition(async () => {
          const result = await setSuggestedGroupStatusAction(category, target);
          if (result.status === "error") reportError(result.message, result.reauth);
          else if (result.status === "done" && result.changed > 0) {
            const one = result.changed === 1;
            const done = target === "active" ? (one ? "ativada" : "ativadas") : one ? "desativada" : "desativadas";
            showToast("success", `${result.changed} ${one ? "regra" : "regras"} de ${category} ${done}.`);
          }
        })
      }
    >
      {target === "active" ? <IconPlay size={15} /> : <IconPause size={15} />}
      <PendingLabel pending={pending} idle={`${verb} grupo`} busy={target === "active" ? "Ativando…" : "Desativando…"} />
    </button>
  );
}

/** Adiciona o grupo do pacote: a categoria, se faltar, e as regras dela que faltam. */
export function AddGroupButton({ category, count, needsCategory }: { category: string; count: number; needsCategory: boolean }) {
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(false);
  const label = needsCategory ? `Adicionar ${category} e ${count} regras` : `Adicionar ${count === 1 ? "1 regra" : `${count} regras`}`;

  return (
    <button
      className={`${ui.button} ${ui.secondary} ${ui.small}`}
      type="button"
      disabled={pending || done}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await addPackGroupAction(category);
          if (result.status === "error") reportError(result.message, result.reauth);
          else if (result.status === "done") {
            setDone(true);
            showToast("success", `${category}: ${result.created} ${result.created === 1 ? "regra adicionada" : "regras adicionadas"}.`);
          }
        })
      }
    >
      <IconPlus size={15} />
      <PendingLabel pending={pending} idle={label} busy="Adicionando…" />
    </button>
  );
}
