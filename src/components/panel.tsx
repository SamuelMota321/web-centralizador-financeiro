"use client";

import { type ReactNode, useEffect, useId, useRef } from "react";
import { IconClose, IconPlus } from "./icons";
import { useUrlFlag } from "./interactive";
import { ui } from "./ui";

/**
 * Ação principal do cabeçalho que abre o painel de criação na própria página.
 * Some enquanto o painel está aberto: a mesma ação não aparece duas vezes.
 */
export function PanelToggle({
  flag,
  forceOpen,
  children,
}: {
  /** Parâmetro da URL que guarda o painel aberto (`nova`, `registrar`). */
  flag: string;
  /** Painel aberto pela própria página (lista vazia): o botão não faz sentido. */
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useUrlFlag(flag);
  if (open || forceOpen) return null;

  return (
    <button className={`${ui.button} ${ui.primary}`} type="button" onClick={() => setOpen(true)}>
      <IconPlus size={18} />
      {children}
    </button>
  );
}

/**
 * Painel de criação (divulgação progressiva). Fica montado mesmo fechado: o que foi
 * digitado e a Idempotency-Key sobrevivem a fechar e abrir. Ao abrir por uma ação do
 * usuário, leva o foco ao primeiro campo.
 */
export function PanelSection({
  flag,
  forceOpen,
  title,
  description,
  closeLabel,
  children,
}: {
  flag: string;
  forceOpen?: boolean;
  title: string;
  description: ReactNode;
  closeLabel: string;
  children: ReactNode;
}) {
  const [flagOpen, setOpen] = useUrlFlag(flag);
  const open = Boolean(forceOpen) || flagOpen;
  const id = useId();
  const ref = useRef<HTMLElement>(null);
  const wasOpen = useRef(open);

  useEffect(() => {
    // Só quando abre por ação do usuário; o painel aberto no carregamento não rouba o foco.
    if (open && !wasOpen.current && ref.current) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ref.current.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
      ref.current.querySelector<HTMLElement>("select, input:not([type=hidden]), textarea")?.focus({
        preventScroll: true,
      });
    }
    wasOpen.current = open;
  }, [open]);

  return (
    <section
      ref={ref}
      className={`${ui.panel} ${ui.reveal}`}
      aria-labelledby={`${id}-title`}
      hidden={!open}
    >
      <div className={ui.panelHeader}>
        <div>
          <h2 className={ui.panelTitle} id={`${id}-title`}>
            {title}
          </h2>
          <p className={ui.panelDescription}>{description}</p>
        </div>
        {forceOpen ? null : (
          <button
            className={`${ui.button} ${ui.ghost} ${ui.iconButton}`}
            type="button"
            onClick={() => setOpen(false)}
            aria-label={closeLabel}
          >
            <IconClose size={18} />
          </button>
        )}
      </div>
      {children}
    </section>
  );
}
