"use client";

import { IconAlert } from "@/components/icons";
import { EmptyState, ui } from "@/components/ui";

export default function PatrimonioError({ reset }: { reset: () => void }) {
  // A mensagem do erro não é exibida: pode carregar detalhe do backend ou da sessão.
  return (
    <EmptyState
      icon={<IconAlert size={22} />}
      title="Não foi possível carregar bens e dívidas"
      action={
        <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          <button className={`${ui.button} ${ui.primary}`} type="button" onClick={reset}>
            Tentar de novo
          </button>
          <a className={`${ui.button} ${ui.secondary}`} href="/auth/login?returnTo=/patrimonio">
            Entrar novamente
          </a>
        </span>
      }
    >
      Pode ser uma falha momentânea de conexão. Seus dados não foram alterados.
    </EmptyState>
  );
}
