import { redirect } from "next/navigation";
import { BrandLockup } from "@/components/brand";
import { IconAccounts, IconCategories, IconMovements } from "@/components/icons";
import { auth0 } from "@/lib/auth0";
import styles from "./page.module.css";

const AREAS = [
  {
    Icon: IconAccounts,
    title: "Contas",
    text: "Correntes, poupanças, cartões e dinheiro em um só lugar.",
  },
  {
    Icon: IconMovements,
    title: "Movimentações",
    text: "Receitas, despesas e transferências entre suas contas, com data e origem.",
  },
  {
    Icon: IconCategories,
    title: "Categorias",
    text: "Suas próprias categorias para entender para onde vai o dinheiro.",
  },
] as const;

export default async function Home() {
  const session = await auth0.getSession();
  if (session) redirect("/movimentacoes");

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <BrandLockup />
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <h1 className={styles.title}>Clareza para cuidar do que é seu.</h1>
          <p className={styles.lead}>
            Reúna suas contas em uma leitura única, rastreável e honesta. O Coinciente organiza;
            ele não movimenta dinheiro nem faz recomendações de investimento.
          </p>
          {/* Link do Next faria prefetch e iniciaria a transação de login por engano. */}
          <a className={styles.action} href="/auth/login?returnTo=/movimentacoes">
            Entrar
          </a>
        </section>

        <ul className={styles.areas} aria-label="O que você organiza aqui">
          {AREAS.map(({ Icon, title, text }) => (
            <li key={title} className={styles.area}>
              <span className={styles.areaIcon}>
                <Icon size={20} />
              </span>
              <div>
                <h2 className={styles.areaTitle}>{title}</h2>
                <p className={styles.areaText}>{text}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className={styles.footer}>
        Demonstração acadêmica com dados fictícios · UCB 2026
      </footer>
    </div>
  );
}
