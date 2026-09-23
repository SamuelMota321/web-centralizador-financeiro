import { auth0 } from "@/lib/auth0";
import styles from "./page.module.css";

export default async function Home() {
  const session = await auth0.getSession();

  return (
    <div className={styles.page}>
      <main className={styles.card}>
        <p className={styles.brand}>Coinciente</p>
        <h1 className={styles.title}>Clareza para cuidar do que é seu.</h1>
        <p className={styles.lead}>
          Reúna suas contas em uma leitura única, rastreável e honesta.
        </p>
        {session ? (
          <>
            <a className={styles.action} href="/contas">
              Ir para minhas contas
            </a>
            <a className={styles.signOut} href="/auth/logout">
              Sair
            </a>
          </>
        ) : (
          // Link do Next faria prefetch e iniciaria a transacao de login por engano.
          <a className={styles.action} href="/auth/login?returnTo=/contas">
            Entrar
          </a>
        )}
      </main>
    </div>
  );
}
