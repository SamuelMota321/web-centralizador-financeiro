"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { createContext, type ReactNode, useContext, useState } from "react";
import { IconChevronDown } from "@/components/icons";
import { motionDuration, motionEase } from "@/lib/motion";
import { type PanelId, panelDomId } from "./panel-ids";
import styles from "./visao-geral.module.css";

interface PanelsState {
  open: PanelId | null;
  setOpen: (id: PanelId | null) => void;
}

const PanelsContext = createContext<PanelsState | null>(null);

function usePanels(): PanelsState {
  const state = useContext(PanelsContext);
  if (!state) throw new Error("PanelToggle, PanelClose e PanelArea precisam de PanelsProvider.");
  return state;
}

/**
 * Qual painel de 30 dias está aberto. Abrir e fechar acontece no navegador, para o
 * painel poder recolher com animação; a URL acompanha (`?painel=`) sem recarregar, e
 * um link com o parâmetro já abre o painel.
 */
export function PanelsProvider({ initialOpen, children }: { initialOpen: PanelId | null; children: ReactNode }) {
  const [open, setOpenState] = useState<PanelId | null>(initialOpen);

  const setOpen = (id: PanelId | null) => {
    setOpenState(id);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("painel", id);
    else url.searchParams.delete("painel");
    window.history.replaceState(null, "", url);
  };

  return <PanelsContext.Provider value={{ open, setOpen }}>{children}</PanelsContext.Provider>;
}

/**
 * Botão do número da faixa. Cobre o número inteiro (o `::after` se estende pelo bloco),
 * mas o nome acessível diz qual painel abre.
 */
export function PanelToggle({ id, name }: { id: PanelId; name: string }) {
  const { open, setOpen } = usePanels();
  const isOpen = open === id;

  return (
    <button
      type="button"
      className={styles.figureButton}
      aria-expanded={isOpen}
      aria-controls={panelDomId(id)}
      onClick={() => setOpen(isOpen ? null : id)}
    >
      <span className={styles.figureToggle} data-open={isOpen ? "" : undefined}>
        {isOpen ? "Fechar" : "Ver últimos 30 dias"}
        <span className="visually-hidden"> de {name}</span>
        <IconChevronDown size={14} />
      </span>
    </button>
  );
}

export function PanelClose() {
  const { setOpen } = usePanels();
  return (
    <button type="button" className={styles.panelClose} onClick={() => setOpen(null)}>
      Fechar
    </button>
  );
}

/**
 * Painel aberto, abaixo da faixa. Abre com altura e opacidade (240ms) e recolhe mais
 * rápido (120ms); trocar de número recolhe um e abre o outro. Com movimento reduzido,
 * a altura muda na hora e só a opacidade transita.
 */
export function PanelArea({ panels }: { panels: Readonly<Record<PanelId, ReactNode>> }) {
  const { open } = usePanels();
  const reduce = useReducedMotion();
  const height = (duration: number) => ({ duration: reduce ? 0 : duration, ease: motionEase.out });

  return (
    <AnimatePresence initial={false} mode="wait">
      {open ? (
        <m.div
          key={open}
          id={panelDomId(open)}
          className={styles.panelSlot}
          initial={{ height: 0, opacity: 0 }}
          animate={{
            height: "auto",
            opacity: 1,
            transition: { height: height(motionDuration.reveal), opacity: { duration: motionDuration.reveal } },
          }}
          exit={{
            height: 0,
            opacity: 0,
            transition: { height: height(motionDuration.feedback), opacity: { duration: motionDuration.feedback } },
          }}
        >
          <div className={styles.panelSlotInner}>{panels[open]}</div>
        </m.div>
      ) : null}
    </AnimatePresence>
  );
}
