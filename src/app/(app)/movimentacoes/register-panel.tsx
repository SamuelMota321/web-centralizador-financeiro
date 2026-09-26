"use client";

import Link from "next/link";
import { useState } from "react";
import { SegmentedControl } from "@/components/interactive";
import { PanelSection } from "@/components/panel";
import { ui } from "@/components/ui";
import { MovementForm } from "./movement-form";
import type { AccountOption } from "./presentation";
import { TransferForm } from "./transfer-form";

type Mode = "movement" | "transfer";

const MODES = [
  { value: "movement", label: "Receita ou despesa" },
  { value: "transfer", label: "Transferência entre contas" },
] as const;

interface Props {
  accounts: AccountOption[];
  movementKey: string;
  transferKey: string;
  /** Sem nenhum lançamento o painel fica aberto: é a próxima ação óbvia. */
  forceOpen: boolean;
}

export function RegisterPanel({ accounts, movementKey, transferKey, forceOpen }: Props) {
  const [mode, setMode] = useState<Mode>("movement");

  return (
    <PanelSection
      flag="registrar"
      forceOpen={forceOpen}
      title="Registrar"
      description="A movimentação aparece no histórico assim que o registro é confirmado."
      closeLabel="Fechar o painel de registro"
    >
      <SegmentedControl label="Tipo de registro" options={MODES} value={mode} onChange={setMode} />

      {/* Os dois formulários ficam montados: trocar de aba não perde a chave nem o que foi digitado. */}
      <div hidden={mode !== "movement"}>
        <MovementForm accounts={accounts} initialKey={movementKey} />
      </div>
      <div hidden={mode !== "transfer"}>
        {accounts.length < 2 ? (
          <p className={ui.help}>
            Para registrar uma transferência entre contas, é preciso ter ao menos duas contas
            ativas.{" "}
            <Link className={ui.inlineLink} href="/contas?nova=1">
              Criar outra conta
            </Link>
          </p>
        ) : (
          <TransferForm accounts={accounts} initialKey={transferKey} />
        )}
      </div>
    </PanelSection>
  );
}
