"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconAccounts, IconCategories, IconMovements } from "@/components/icons";
import shell from "./shell.module.css";

const ITEMS = [
  { href: "/movimentacoes", label: "Movimentações", Icon: IconMovements },
  { href: "/contas", label: "Contas", Icon: IconAccounts },
  { href: "/categorias", label: "Categorias", Icon: IconCategories },
] as const;

export function SideNav() {
  const pathname = usePathname();

  return (
    <nav className={shell.nav} aria-label="Principal">
      {ITEMS.map(({ href, label, Icon }) => {
        const current = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={shell.navItem}
            aria-current={current ? "page" : undefined}
          >
            <Icon size={18} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
