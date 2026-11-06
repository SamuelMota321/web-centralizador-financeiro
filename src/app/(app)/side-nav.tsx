"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import {
  IconAccounts,
  IconCategories,
  IconMovements,
  IconRules,
} from "@/components/icons";
import shell from "./shell.module.css";

// Só a navegação principal faz crossfade (ADR-002); o AppFrame anima apenas este tipo.
const NAV_TRANSITION = ["nav"];

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

// Visão geral: barras de leitura sobre a linha de base, no traço dos ícones do app.
// Fica aqui enquanto a tela é prévia atrás de flag; vai para icons.tsx quando for definitiva.
function IconOverview({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M4 20h16M7 16v-5M12 16V6M17 16v-8" />
    </svg>
  );
}

const OVERVIEW_GROUP = {
  label: "Resumo",
  items: [{ href: "/visao-geral", label: "Visão geral", Icon: IconOverview }],
} as const;

/** Registros guardam o que aconteceu; Organização define como ler (categorias e regras). */
const NAV_GROUPS: readonly { label: string; items: readonly NavItem[] }[] = [
  {
    label: "Registros",
    items: [
      { href: "/movimentacoes", label: "Movimentações", Icon: IconMovements },
      { href: "/contas", label: "Contas", Icon: IconAccounts },
    ],
  },
  {
    label: "Organização",
    items: [
      { href: "/categorias", label: "Categorias", Icon: IconCategories },
      { href: "/regras", label: "Regras", Icon: IconRules },
    ],
  },
];

/** Com a prévia ligada, a Visão geral entra no topo, acima de Registros. */
export function navGroups(showOverview: boolean) {
  return showOverview ? [OVERVIEW_GROUP, ...NAV_GROUPS] : NAV_GROUPS;
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Navegação lateral (desktop e tablet): grupos com rótulo, item atual marcado. */
export function SideNav({ showOverview }: { showOverview: boolean }) {
  const pathname = usePathname();

  return (
    <nav className={shell.nav} aria-label="Principal">
      {navGroups(showOverview).map((group) => (
        <div key={group.label} className={shell.navGroup}>
          <p className={shell.navGroupLabel}>{group.label}</p>
          <ul className={shell.navList}>
            {group.items.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  transitionTypes={NAV_TRANSITION}
                  className={shell.navItem}
                  aria-current={isCurrent(pathname, href) ? "page" : undefined}
                >
                  <Icon size={19} />
                  <span className={shell.navLabel}>{label}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );
}

/** Barra de abas do celular: os mesmos destinos da lateral, ao alcance do polegar. */
export function TabBar({ showOverview }: { showOverview: boolean }) {
  const pathname = usePathname();
  const items = navGroups(showOverview).flatMap((group) => group.items);

  return (
    <nav
      className={shell.tabBar}
      aria-label="Principal"
      style={{ "--tabs": items.length } as React.CSSProperties}
    >
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
          transitionTypes={NAV_TRANSITION}
          className={shell.tab}
          aria-current={isCurrent(pathname, href) ? "page" : undefined}
        >
          <Icon size={21} />
          <span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}
