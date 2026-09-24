"use client";

import { useState } from "react";
import { IconInflow, IconOutflow, IconTransfer } from "@/components/icons";
import { StatusChip, ui } from "@/components/ui";
import { formatCivilDate } from "@/lib/civil-date";
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
  const amount = signedAmount(transaction);
  const direction = movementDirection(transaction);
  const DirectionIcon = DIRECTION_ICONS[direction];
  const description = transaction.description ?? "Sem descrição";
  const categorizable = categories !== null && canCategorize(transaction);

  return (
    <li className={styles.row}>
      <div className={styles.rowMain}>
        <span className={styles.rowIcon} data-direction={direction}>
          <DirectionIcon size={16} />
        </span>
        <div className={styles.rowText}>
          <p className={transaction.description ? styles.rowTitle : styles.rowTitleMuted}>
            {description}
          </p>
          <p className={styles.rowMeta}>
            <span className="tabular">{formatCivilDate(transaction.occurredOn)}</span>
            <span aria-hidden> · </span>
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
            className={ui.linkButton}
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {transaction.categorizationStatus === "unclassified" ? "Categorizar" : "Corrigir"}
            <span className="visually-hidden"> a categoria de {description}</span>
          </button>
        ) : null}
      </div>

      <p className={`${styles.rowAmount} tabular`} data-direction={amount.direction}>
        {amount.text}
      </p>

      {open && categories ? (
        <div className={styles.rowPanel}>
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
