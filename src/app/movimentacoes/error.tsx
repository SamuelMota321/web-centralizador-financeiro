"use client";

import styles from "./movimentacoes.module.css";

export default function MovimentacoesError({ reset }: { reset: () => void }) {
  // A mensagem do erro nao e exibida: pode carregar detalhe do backend ou da sessao.
  return (
    <div className={styles.page}>
      <div className={styles.state} role="alert">
        <p>Nao foi possivel carregar suas movimentacoes.</p>
        <div className={styles.stateActions}>
          <button className={styles.retry} type="button" onClick={reset}>
            Tentar de novo
          </button>
          {/* Se a sessao expirou, tentar de novo nao basta. */}
          <a className={styles.inlineLink} href="/auth/login?returnTo=/movimentacoes">
            Entrar novamente
          </a>
        </div>
      </div>
    </div>
  );
}
