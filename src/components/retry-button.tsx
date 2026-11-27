"use client";

import { useState } from "react";
import { ui } from "./ui";

/**
 * "Tentar de novo" das telas de erro. Usa `retry()` do Next, que busca os dados de novo e redesenha;
 * `reset()` só limpa o erro e redesenha SEM buscar, então um erro vindo do servidor voltava na hora e o
 * botão parecia morto. Mostra "Tentando…" até a tentativa terminar: se falhar de novo, chega um novo
 * `error` (outra instância) e o botão volta ao normal, sem precisar de efeito para destravar.
 */
export function RetryButton({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  // O erro que estava na tela quando se clicou; ocupado só enquanto ele continuar sendo o mesmo.
  const [triedFor, setTriedFor] = useState<unknown>(null);
  const busy = triedFor === error;

  return (
    <button
      className={`${ui.button} ${ui.primary}`}
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        setTriedFor(error);
        retry();
      }}
    >
      {busy ? "Tentando…" : "Tentar de novo"}
    </button>
  );
}
