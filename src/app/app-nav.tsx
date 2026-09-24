import Link from "next/link";
import styles from "./app-nav.module.css";

type Section = "contas" | "movimentacoes" | "categorias";

const LINKS: { section: Section; href: string; label: string }[] = [
  { section: "contas", href: "/contas", label: "Contas" },
  { section: "movimentacoes", href: "/movimentacoes", label: "Movimentacoes" },
  { section: "categorias", href: "/categorias", label: "Categorias" },
];

/** Navegacao das areas autenticadas. */
export function AppNav({ current }: { current: Section }) {
  return (
    <nav className={styles.nav} aria-label="Principal">
      {LINKS.map((link) => (
        <Link
          key={link.section}
          className={styles.link}
          href={link.href}
          aria-current={link.section === current ? "page" : undefined}
        >
          {link.label}
        </Link>
      ))}
      <a className={styles.signOut} href="/auth/logout">
        Sair
      </a>
    </nav>
  );
}
