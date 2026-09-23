"use client";

import styles from "./contas.module.css";

export default function ContasError({ reset }: { reset: () => void }) {
  // A mensagem do erro nao e exibida: pode carregar detalhe do backend ou da sessao.
  return (
    <div className={styles.page}>
      <div className={styles.state}>
        <p>Nao foi possivel carregar suas contas.</p>
        <button className={styles.retry} type="button" onClick={reset}>
          Tentar de novo
        </button>
      </div>
    </div>
  );
}
