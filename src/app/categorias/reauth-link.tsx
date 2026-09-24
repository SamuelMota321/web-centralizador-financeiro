import styles from "./categorias.module.css";

export function ReauthLink() {
  // Link do Next faria prefetch e iniciaria a transacao de login por engano.
  return (
    <a className={styles.inlineLink} href="/auth/login?returnTo=/categorias">
      Entrar novamente
    </a>
  );
}
