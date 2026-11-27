"use client";

import { IconAlert } from "@/components/icons";
import { RetryButton } from "@/components/retry-button";
import { EmptyState, ui } from "@/components/ui";

export default function ConectarError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  // A mensagem do erro não é exibida: pode carregar detalhe do backend, do provedor ou da sessão.
  return (
    <EmptyState
      icon={<IconAlert size={22} />}
      title="Não foi possível abrir a conexão com o banco"
      action={
        <span style={{ display: "inline-flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
          <RetryButton error={error} retry={retry} />
          {/* Se a sessão expirou, tentar de novo não basta. */}
          <a className={`${ui.button} ${ui.secondary}`} href="/auth/login?returnTo=/contas/conectar">
            Entrar novamente
          </a>
        </span>
      }
    >
      Pode ser uma falha momentânea de conexão ou o servidor ainda acordando, o que pode levar até 1 minuto. Tente de novo em alguns segundos. Nenhuma autorização foi alterada.
    </EmptyState>
  );
}
