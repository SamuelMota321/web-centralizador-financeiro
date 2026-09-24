"use client";

import { useState } from "react";
import { MovementForm } from "./movement-form";
import type { AccountOption } from "./presentation";
import { TransferForm } from "./transfer-form";
import styles from "./movimentacoes.module.css";

type Mode = "movement" | "transfer";

interface Props {
  accounts: AccountOption[];
  movementKey: string;
  transferKey: string;
}

export function RegisterPanel({ accounts, movementKey, transferKey }: Props) {
  const [mode, setMode] = useState<Mode>("movement");

  return (
    <section className={styles.panel} aria-labelledby="registrar-titulo">
      <h2 className={styles.panelTitle} id="registrar-titulo">
        Registrar
      </h2>

      <div className={styles.switcher} role="group" aria-label="Tipo de registro">
        <button
          className={styles.switch}
          type="button"
          aria-pressed={mode === "movement"}
          onClick={() => setMode("movement")}
        >
          Receita ou despesa
        </button>
        <button
          className={styles.switch}
          type="button"
          aria-pressed={mode === "transfer"}
          onClick={() => setMode("transfer")}
        >
          Transferencia entre contas
        </button>
      </div>

      {/* Os dois formularios ficam montados: trocar de aba nao perde a chave nem o que foi digitado. */}
      <div hidden={mode !== "movement"}>
        <MovementForm accounts={accounts} initialKey={movementKey} />
      </div>
      <div hidden={mode !== "transfer"}>
        {accounts.length < 2 ? (
          <p className={styles.helper}>
            Para registrar uma transferencia entre contas, e preciso ter ao menos duas contas
            ativas. <a className={styles.inlineLink} href="/contas">Criar outra conta</a>
          </p>
        ) : (
          <TransferForm accounts={accounts} initialKey={transferKey} />
        )}
      </div>
    </section>
  );
}
