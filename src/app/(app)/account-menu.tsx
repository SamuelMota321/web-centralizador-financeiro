"use client";

import { Menu } from "@base-ui/react/menu";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";
import { IconChevronDown, IconSignOut } from "@/components/icons";
import { ui } from "@/components/ui";
import shell from "./shell.module.css";

/** Até duas iniciais do nome exibido; o avatar é só identificação, sem foto. */
export function initials(identity: string): string {
  const words = identity.split(/[\s@._-]+/).filter(Boolean);
  const letters = words.slice(0, 2).map((word) => word[0]);
  return (letters.join("") || "?").toUpperCase();
}

/**
 * Conta do usuário: quem está conectado, o aviso de dados fictícios e a saída,
 * juntos em um só lugar. `compact` mostra só o avatar (trilho e celular).
 */
export function AccountMenu({ identity, compact }: { identity: string; compact?: boolean }) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={compact ? shell.accountTriggerCompact : shell.accountTrigger}
        aria-label={`Conta de ${identity}`}
      >
        <span className={shell.avatar} aria-hidden>
          {initials(identity)}
        </span>
        {compact ? null : (
          <>
            <span className={shell.accountText}>
              <span className={shell.accountName}>{identity}</span>
              <span className={shell.accountMeta}>dados fictícios</span>
            </span>
            <IconChevronDown className={shell.accountChevron} size={16} />
          </>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner
          className={ui.menuPositioner}
          side={compact ? "bottom" : "top"}
          align={compact ? "end" : "start"}
          sideOffset={8}
        >
          <Menu.Popup className={ui.menuPopup}>
            <div className={shell.menuIdentity}>
              <span className={shell.menuIdentityName}>{identity}</span>
              <span className={shell.menuIdentityMeta}>
                Demonstração acadêmica com dados fictícios
              </span>
            </div>
            <Menu.Separator className={ui.menuSeparator} />
            {/* Âncora comum: a saída precisa de navegação completa, sem prefetch. */}
            <Menu.LinkItem className={ui.menuItem} href="/auth/logout">
              <IconSignOut size={18} />
              Sair
            </Menu.LinkItem>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/**
 * Atalho global para a ação mais frequente. Em Movimentações abre o painel na hora,
 * sem refazer a página; nas outras telas leva até ele.
 */
export function RegisterShortcut({
  className,
  children,
  label,
  hideOnMovements,
}: {
  className: string;
  children: ReactNode;
  /** Nome acessível quando o botão mostra só o ícone. */
  label?: string;
  /** No celular, Movimentações já tem a mesma ação no cabeçalho: não repetir. */
  hideOnMovements?: boolean;
}) {
  const pathname = usePathname();
  if (hideOnMovements && pathname === "/movimentacoes") return null;

  function openHere(event: MouseEvent<HTMLAnchorElement>) {
    if (pathname !== "/movimentacoes") return;
    event.preventDefault();
    const search = new URLSearchParams(window.location.search);
    search.set("registrar", "1");
    window.history.replaceState(null, "", `?${search.toString()}`);
  }

  return (
    <Link
      href="/movimentacoes?registrar=1"
      className={className}
      aria-label={label}
      onClick={openHere}
    >
      {children}
    </Link>
  );
}
