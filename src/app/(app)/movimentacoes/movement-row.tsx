"use client";

import { useState } from "react";
import { IconInflow, IconOutflow, IconTag, IconTransfer } from "@/components/icons";
import { StatusChip, ui } from "@/components/ui";
import type { Transaction } from "@/lib/transactions/types";
import { CategorizePanel } from "./categorize-panel";
import {
  accountLabel,
  type AccountOption,
  canCategorize,
  categorizationLabel,
  categorizationTone,
  type CategoryOption,
  movementDirection,
  signedAmount,
  typeLabel,
} from "./presentation";
import { useRecentMovements } from "./recent";
import styles from "./movimentacoes.module.css";

const DIRECTION_ICONS = { in: IconInflow, out: IconOutflow, transfer: IconTransfer } as const;

export function MovementRow({
  transaction,
  accounts,
  categories,
  categoriesTruncated,
}: {
  transaction: Transaction;
  accounts: AccountOption[] | null;
  /** null: a lista de categorias falhou; o rótulo usa fallback e a ação fica oculta. */
  categories: CategoryOption[] | null;
  categoriesTruncated: boolean;
}) {
  const [open, setOpen] = useState(false);
  const { isRecent } = useRecentMovements();
  const amount = signedAmount(transaction);
  const direction = movementDirection(transaction);
  const DirectionIcon = DIRECTION_ICONS[direction];
  const description = transaction.description ?? "Sem descrição";
  const categorizable = categories !== null && canCategorize(transaction);
  // Sem categoria é o caso que pede ação: vira botão. Corrigir fica discreto.
  const needsCategory = transaction.categorizationStatus === "unclassified";

  return (
    <li
      className={styles.row}
      data-recent={isRecent(transaction.id) || undefined}
      data-open={open || undefined}
    >
      <div className={styles.rowMain}>
        <span className={styles.rowIcon} data-direction={direction}>
          <DirectionIcon size={16} />
        </span>
        <div className={styles.rowText}>
          <p className={transaction.description ? styles.rowTitle : styles.rowTitleMuted}>
            {description}
          </p>
          <p className={styles.rowMeta}>
            {accountLabel(transaction.accountId, accounts)}
            <span aria-hidden> · </span>
            {typeLabel(transaction)}
            {transaction.status === "voided" ? " · Estornada" : ""}
          </p>
        </div>
      </div>

      <div className={styles.rowCategory}>
        <StatusChip tone={categorizationTone(transaction)}>
          {categorizationLabel(transaction, categories)}
        </StatusChip>
        {categorizable ? (
          <button
            className={
              needsCategory ? `${ui.button} ${ui.secondary} ${ui.small}` : ui.linkButton
            }
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {needsCategory ? <IconTag size={15} /> : null}
            {needsCategory ? "Categorizar" : "Corrigir"}
            <span className="visually-hidden"> a categoria de {description}</span>
          </button>
        ) : null}
      </div>

      <p className={`${styles.rowAmount} tabular`} data-direction={amount.direction}>
        {amount.text}
      </p>

      {open && categories ? (
        <div className={`${ui.rowPanel} ${ui.reveal}`}>
          <CategorizePanel
            transaction={transaction}
            activeCategories={categories.filter((category) => category.status === "active")}
            truncated={categoriesTruncated}
            onClose={() => setOpen(false)}
          />
        </div>
      ) : null}
    </li>
  );
}
