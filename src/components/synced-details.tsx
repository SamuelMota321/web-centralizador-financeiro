"use client";

import { createContext, type ReactNode, useContext, useState } from "react";

interface GroupState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const GroupContext = createContext<GroupState | null>(null);

/**
 * Blocos lado a lado que recolhem conteúdo juntos: abrir ou fechar um `SyncedDetails` do
 * grupo faz o mesmo com os outros, e os blocos continuam com a mesma altura.
 */
export function SyncedDetailsGroup({
  defaultOpen = false,
  openKey = null,
  children,
}: {
  defaultOpen?: boolean;
  /** Uma chave nova (ex.: outra categoria escolhida) abre o grupo. */
  openKey?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const [seenKey, setSeenKey] = useState(openKey);
  // Estado ajustado durante a renderização quando a prop muda (padrão do React, sem efeito).
  if (openKey !== seenKey) {
    setSeenKey(openKey);
    if (openKey !== null) setOpen(true);
  }

  return <GroupContext.Provider value={{ open, setOpen }}>{children}</GroupContext.Provider>;
}

/** `<details>` nativo que segue o grupo; fora de um grupo, abre e fecha sozinho. */
export function SyncedDetails({
  className,
  summaryClassName,
  summary,
  children,
}: {
  className?: string;
  summaryClassName?: string;
  summary: ReactNode;
  children: ReactNode;
}) {
  const group = useContext(GroupContext);
  const [localOpen, setLocalOpen] = useState(false);
  const open = group ? group.open : localOpen;
  const setOpen = group ? group.setOpen : setLocalOpen;

  return (
    <details
      className={className}
      open={open}
      onToggle={(event) => {
        // O toggle também dispara quando o próprio React muda `open`: só repassa mudança real.
        if (event.currentTarget.open !== open) setOpen(event.currentTarget.open);
      }}
    >
      <summary className={summaryClassName}>{summary}</summary>
      {children}
    </details>
  );
}
