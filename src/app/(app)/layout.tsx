import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand";
import { IconSignOut } from "@/components/icons";
import { auth0 } from "@/lib/auth0";
import { SideNav } from "./side-nav";
import shell from "./shell.module.css";

/** Estrutura do app (style guide): barra superior, navegacao lateral e area principal. */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const session = await auth0.getSession();
  // O proxy ja protege estas rotas; aqui apenas evita renderizar sem identidade.
  if (!session) redirect("/auth/login");

  const identity = session.user.name ?? session.user.email ?? "Sua conta";

  return (
    <div className={shell.shell}>
      <a className={shell.skipLink} href="#conteudo">
        Pular para o conteúdo
      </a>

      <header className={shell.topbar}>
        <a href="/movimentacoes" className={shell.brand} aria-label="Coinciente, ir para movimentações">
          <BrandLockup />
        </a>
        <div className={shell.user}>
          <span className={shell.userName}>{identity}</span>
          <span className={shell.userMeta}>dados fictícios</span>
        </div>
      </header>

      <div className={shell.body}>
        <aside className={shell.sidebar}>
          <SideNav />
          <a className={shell.signOut} href="/auth/logout">
            <IconSignOut size={18} />
            Sair
          </a>
        </aside>

        <main id="conteudo" className={shell.main} tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
