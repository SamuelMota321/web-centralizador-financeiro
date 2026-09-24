import { formatCivilDate } from "@/lib/civil-date";
import type { Transaction } from "@/lib/transactions/types";
import { CategorizeControl } from "./categorize-control";
import {
  accountLabel,
  type AccountOption,
  canCategorize,
  categorizationLabel,
  type CategoryOption,
  signedAmount,
  typeLabel,
} from "./presentation";
import styles from "./movimentacoes.module.css";

export function MovementRow({
  transaction,
  accounts,
  categories,
  categoriesTruncated,
}: {
  transaction: Transaction;
  accounts: AccountOption[] | null;
  /** null: a lista de categorias falhou; o rotulo usa fallback e a acao fica oculta. */
  categories: CategoryOption[] | null;
  categoriesTruncated: boolean;
}) {
  const amount = signedAmount(transaction);

  return (
    <li className={styles.item}>
      <div className={styles.itemRow}>
        <div className={styles.itemMain}>
          <p className={transaction.description ? styles.itemName : styles.itemNameMuted}>
            {transaction.description ?? "Sem descricao"}
          </p>
          <p className={styles.itemMeta}>
            <span className="tabular">{formatCivilDate(transaction.occurredOn)}</span>
            {" · "}
            {accountLabel(transaction.accountId, accounts)}
            {" · "}
            {typeLabel(transaction)}
          </p>
          <p className={styles.itemMeta}>
            {categorizationLabel(transaction, categories)}
            {transaction.status === "voided" ? " · Estornada" : ""}
          </p>
        </div>
        <span
          className={`${styles.amount} ${amount.direction === "in" ? styles.amountIn : styles.amountOut} tabular`}
        >
          {amount.text}
        </span>
      </div>
      {categories && canCategorize(transaction) ? (
        <CategorizeControl
          transaction={transaction}
          activeCategories={categories.filter((category) => category.status === "active")}
          truncated={categoriesTruncated}
        />
      ) : null}
    </li>
  );
}
