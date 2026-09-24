"use client";

import Link from "next/link";
import { useState } from "react";
import { IconClose } from "@/components/icons";
import { ui } from "@/components/ui";
import { MovementForm } from "./movement-form";
import type { AccountOption } from "./presentation";
import { TransferForm } from "./transfer-form";

type Mode = "movement" | "transfer";

interface Props {
  accounts: AccountOption[];
  movementKey: string;
  transferKey: string;
  /** Destino do botão fechar: a mesma página sem o painel aberto. */
  closeHref: string;
}

export function RegisterPanel({ accounts, movementKey, transferKey, closeHref }: Props) {
  const [mode, setMode] = useState<Mode>("movement");

  return (
    <section className={`${ui.panel} ${ui.reveal}`} aria-labelledby="registrar-titulo">
      <div className={ui.panelHeader}>
        <div>
          <h2 className={ui.panelTitle} id="registrar-titulo">
            Registrar
          </h2>
          <p className={ui.panelDescription}>
            A movimentação aparece no histórico assim que o registro é confirmado.
          </p>
        </div>
        <Link
          className={`${ui.button} ${ui.ghost} ${ui.small}`}
          href={closeHref}
          scroll={false}
          aria-label="Fechar o painel de registro"
        >
          <IconClose size={16} />
        </Link>
      </div>

      <div className={ui.segmented} role="group" aria-label="Tipo de registro">
        <button
          className={ui.segment}
          type="button"
          aria-pressed={mode === "movement"}
          onClick={() => setMode("movement")}
        >
          Receita ou despesa
        </button>
        <button
          className={ui.segment}
          type="button"
          aria-pressed={mode === "transfer"}
          onClick={() => setMode("transfer")}
        >
          Transferência entre contas
        </button>
      </div>

      {/* Os dois formulários ficam montados: trocar de aba não perde a chave nem o que foi digitado. */}
      <div hidden={mode !== "movement"}>
        <MovementForm accounts={accounts} initialKey={movementKey} />
      </div>
      <div hidden={mode !== "transfer"}>
        {accounts.length < 2 ? (
          <p className={ui.help}>
            Para registrar uma transferência entre contas, é preciso ter ao menos duas contas
            ativas.{" "}
            <Link className={ui.inlineLink} href="/contas">
              Criar outra conta
            </Link>
          </p>
        ) : (
          <TransferForm accounts={accounts} initialKey={transferKey} />
        )}
      </div>
    </section>
  );
}
