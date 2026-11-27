"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { IconArrowRight, IconClose } from "@/components/icons";
import { useUrlFlag } from "@/components/interactive";
import { ui } from "@/components/ui";
import styles from "./regras.module.css";

const FLAG = "testar";

/** Ação da faixa do topo: abre (ou fecha) o painel de teste e explicação logo abaixo. */
export function TestToggle({ label }: { label: string }) {
  const [open, setOpen] = useUrlFlag(FLAG);
  return (
    <button className={`${ui.button} ${ui.secondary}`} type="button" aria-expanded={open} aria-controls="painel-testar" onClick={() => setOpen(!open)}>
      {open ? "Fechar teste" : label}
      <IconArrowRight size={16} />
    </button>
  );
}

/**
 * Painel recolhido por padrão (divulgação progressiva): o simulador e como as regras são
 * aplicadas. Aberto pela faixa, ou sempre quando ainda não há regras.
 */
export function SimulatorPanel({ forceOpen, children }: { forceOpen: boolean; children: ReactNode }) {
  const [flagOpen, setOpen] = useUrlFlag(FLAG);
  const open = forceOpen || flagOpen;
  const ref = useRef<HTMLElement>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    // Só quando abre por ação do usuário: leva ao painel e ao campo de descrição.
    if (open && !wasOpen.current && ref.current) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ref.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      ref.current.querySelector<HTMLElement>("input")?.focus({ preventScroll: true });
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <section ref={ref} id="painel-testar" className={`${styles.testPanel} ${ui.reveal}`} hidden={!open} aria-label="Testar e entender as regras">
      {forceOpen ? null : (
        <button className={`${ui.button} ${ui.ghost} ${ui.iconButton} ${styles.testClose}`} type="button" onClick={() => setOpen(false)} aria-label="Fechar o teste">
          <IconClose size={18} />
        </button>
      )}
      {children}
    </section>
  );
}
