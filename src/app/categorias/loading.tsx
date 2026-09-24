import styles from "./categorias.module.css";

export default function Loading() {
  return (
    <div className={styles.page}>
      <p className={styles.state} role="status">
        Carregando suas categorias...
      </p>
    </div>
  );
}
