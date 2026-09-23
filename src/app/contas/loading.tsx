import styles from "./contas.module.css";

export default function Loading() {
  return (
    <div className={styles.page}>
      <p className={styles.state}>Carregando suas contas...</p>
    </div>
  );
}
