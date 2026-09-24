import styles from "./movimentacoes.module.css";

export default function Loading() {
  return (
    <div className={styles.page}>
      <p className={styles.state} role="status">
        Carregando suas movimentacoes...
      </p>
    </div>
  );
}
