import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup, BrandSymbol } from "@/components/brand";
import { IconPlus } from "@/components/icons";
import { AppToaster } from "@/components/interactive";
import { AccountMenu, RegisterShortcut } from "./account-menu";
import { SideNav, TabBar } from "./side-nav";
import shell from "./shell.module.css";

/**
 * Estrutura do app: lateral institucional (Confiança) com marca, atalho de registro,
 * navegação agrupada e conta; no tablet vira trilho de ícones e no celular dá lugar
 * a uma barra superior e a abas inferiores.
 */
export function AppFrame({ identity, children }: { identity: string; children: ReactNode }) {
  return (
    <div className={shell.shell}>
      <a className={shell.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>

      <aside className={shell.sidebar}>
        <Link href="/movimentacoes" className={shell.brand} aria-label="Coinciente, ir para movimentações">
          <span className={shell.brandFull}>
            <BrandLockup />
          </span>
          <span className={shell.brandCompact}>
            <BrandSymbol size={30} />
          </span>
        </Link>

        <RegisterShortcut className={shell.register} label="Registrar movimentação">
          <IconPlus size={18} />
          <span className={shell.registerLabel}>Registrar movimentação</span>
        </RegisterShortcut>

        <SideNav />

        <div className={shell.sidebarFooter}>
          <div className={shell.accountFull}>
            <AccountMenu identity={identity} />
          </div>
          <div className={shell.accountRail}>
            <AccountMenu identity={identity} compact />
          </div>
        </div>
      </aside>

      <header className={shell.mobileBar}>
        <Link href="/movimentacoes" className={shell.brand} aria-label="Coinciente, ir para movimentações">
          <BrandLockup />
        </Link>
        <div className={shell.mobileActions}>
          <RegisterShortcut
            className={shell.mobileRegister}
            label="Registrar movimentação"
            hideOnMovements
          >
            <IconPlus size={20} />
          </RegisterShortcut>
          <AccountMenu identity={identity} compact />
        </div>
      </header>

      <main id="conteudo" className={shell.main} tabIndex={-1}>
        <div className={shell.content}>{children}</div>
      </main>

      <TabBar />
      <AppToaster />
    </div>
  );
}
