"use client";

import { useTransition } from "react";
import { IconRefresh } from "@/components/icons";
import { showToast } from "@/components/interactive";
import { PendingLabel, ui } from "@/components/ui";
import { refreshInvestmentsAction } from "./actions";
import { refreshMessage } from "./presentation";

/** Pede a sincronização das conexões da carteira. Reversível e sem efeito sobre os dados já lidos. */
export function RefreshButton({ disabled }: { disabled: boolean }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className={`${ui.button} ${ui.secondary}`}
      type="button"
      disabled={disabled || pending}
      aria-busy={pending}
      title={disabled ? "Você ainda não tem conexões para atualizar." : undefined}
      onClick={() =>
        startTransition(async () => {
          const result = await refreshInvestmentsAction();
          if (result.status === "error") {
            showToast(
              "error",
              result.reauth ? (
                <>
                  {result.message}{" "}
                  <a className={ui.inlineLink} href="/auth/login?returnTo=/investimentos">
                    Entrar novamente
                  </a>
                </>
              ) : (
                result.message
              ),
            );
            return;
          }
          if (result.status === "done") {
            const { tone, text } = refreshMessage(result);
            showToast(tone, text);
          }
        })
      }
    >
      <IconRefresh size={16} />
      <PendingLabel pending={pending} idle="Atualizar dados" busy="Pedindo…" />
    </button>
  );
}
