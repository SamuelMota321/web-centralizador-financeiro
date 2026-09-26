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

interface NavItem {
  href: string;
  label: string;
  Icon: ComponentType<{ size?: number }>;
}

/** Registros guardam o que aconteceu; Organização define como ler (categorias e regras). */
export const NAV_GROUPS: readonly { label: string; items: readonly NavItem[] }[] = [
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

function isCurrent(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Navegação lateral (desktop e tablet): grupos com rótulo, item atual marcado. */
export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className={shell.nav} aria-label="Principal">
      {NAV_GROUPS.map((group) => (
        <div key={group.label} className={shell.navGroup}>
          <p className={shell.navGroupLabel}>{group.label}</p>
          <ul className={shell.navList}>
            {group.items.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link
                  href={href}
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

/** Barra de abas do celular: os mesmos quatro destinos, ao alcance do polegar. */
export function TabBar() {
  const pathname = usePathname();
  const items = NAV_GROUPS.flatMap((group) => group.items);

  return (
    <nav className={shell.tabBar} aria-label="Principal">
      {items.map(({ href, label, Icon }) => (
        <Link
          key={href}
          href={href}
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
