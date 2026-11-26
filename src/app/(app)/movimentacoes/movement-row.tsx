"use client";

import { useState } from "react";
import { CATEGORY_OTHER } from "@/components/charts/category-colors";
import { CategoryIcon, CategoryMark } from "@/components/category-mark";
import { IconMore, IconTag } from "@/components/icons";
import { ActionMenu, type ActionMenuItem } from "@/components/interactive";
import { Monogram } from "@/components/monogram";
import { StatusChip, ui } from "@/components/ui";
import { formatCivilDate } from "@/lib/civil-date";
import type { Transaction } from "@/lib/transactions/types";
import { CategorizePanel } from "./categorize-panel";
import {
  accountLabel,
  type AccountOption,
  canCategorize,
  categorizationTone,
  categoryChip,
  type CategoryOption,
  movementMark,
  signedAmount,
  statusLabel,
  statusSource,
  typeLabel,
  typeTag,
} from "./presentation";
import { useRecentMovements } from "./recent";
import styles from "./movimentacoes.module.css";

export function MovementRow({
  transaction,
  accounts,
  categories,
  categoriesTruncated,
  categoryColors,
}: {
  transaction: Transaction;
  accounts: AccountOption[] | null;
  /** null: a lista de categorias falhou; o rótulo usa fallback e a ação fica oculta. */
  categories: CategoryOption[] | null;
  categoriesTruncated: boolean;
  /** Cor fixa por id de categoria; categoria fora do mapa fica neutra. */
  categoryColors: Readonly<Record<string, string>>;
}) {
  const [open, setOpen] = useState(false);
  const { isRecent } = useRecentMovements();
  const amount = signedAmount(transaction);
  const mark = movementMark(transaction, categories);
  const description = transaction.description ?? "Sem descrição";
  const account = accountLabel(transaction.accountId, accounts);
  const chip = categoryChip(transaction, categories);
  const chipColor = chip ? (categoryColors[chip.id] ?? CATEGORY_OTHER) : null;
  const source = statusSource(transaction);
  const categorizable = categories !== null && canCategorize(transaction);
  // Sem categoria é o caso que pede ação: o botão fica visível. Corrigir vai para o menu.
  const needsCategory = transaction.categorizationStatus === "unclassified";
  const date = formatCivilDate(transaction.occurredOn);
  const menuItem: ActionMenuItem = categorizable
    ? {
        label: open ? "Fechar categorização" : needsCategory ? "Categorizar" : "Corrigir categoria",
        icon: <IconTag size={17} />,
        onSelect: () => setOpen(!open),
      }
    : {
        // Regra do backend: transferência e estorno não recebem categoria.
        label:
          transaction.type === "transfer"
            ? "Transferências não recebem categoria"
            : transaction.status === "voided"
              ? "Lançamento estornado não recebe categoria"
              : "Categorias indisponíveis no momento",
        icon: <IconTag size={17} />,
        onSelect: () => {},
        disabled: true,
      };

  return (
    <li
      className={styles.row}
      data-recent={isRecent(transaction.id) || undefined}
      data-open={open || undefined}
    >
      <p className={`${styles.rowDate} tabular`}>{date}</p>

      <div className={styles.rowMain}>
        <CategoryMark kind={mark.kind} name={mark.name} color={chipColor} />
        <div className={styles.rowText}>
          <p className={transaction.description ? styles.rowTitle : styles.rowTitleMuted}>{description}</p>
          <p className={styles.rowMeta}>
            {/* Data, conta e tipo têm colunas no desktop; em telas menores voltam para cá. */}
            <span className={styles.compactOnly}>
              <span className="tabular">{date}</span>
              <span aria-hidden> · </span>
              {account}
              <span aria-hidden> · </span>
            </span>
            {typeLabel(transaction)}
            {transaction.status === "voided" ? " · Estornada" : ""}
          </p>
        </div>
      </div>

      <div className={styles.rowAccount}>
        <Monogram text={account} />
        <span className={styles.rowAccountName}>{account}</span>
      </div>

      <div className={styles.rowCategory}>
        {chip ? (
          <span
            className={styles.categoryChip}
            style={chipColor ? ({ "--chip-color": chipColor } as React.CSSProperties) : undefined}
          >
            <CategoryIcon name={chip.label} color={chipColor ?? undefined} size={14} />
            <span className={styles.categoryChipLabel}>{chip.label}</span>
          </span>
        ) : (
          // Sem categoria definida: chip neutro "Outro"; a coluna Status diz a situação real.
          <span className={styles.categoryChip}>
            <IconMore size={14} />
            <span className={styles.categoryChipLabel}>Outro</span>
          </span>
        )}
      </div>

      <div className={styles.rowType}>
        <span className={styles.typeTag} data-type={transaction.type}>
          {typeTag(transaction)}
        </span>
      </div>

      <p className={`${styles.rowAmount} tabular`} data-direction={amount.direction}>
        {amount.text}
      </p>

      <div className={styles.rowStatus}>
        <StatusChip tone={categorizationTone(transaction)}>{statusLabel(transaction)}</StatusChip>
        {source ? <span className={styles.rowMeta}>{source}</span> : null}
        {categorizable && needsCategory ? (
          <button
            className={`${ui.button} ${ui.secondary} ${ui.small}`}
            type="button"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <IconTag size={15} />
            Categorizar
            <span className="visually-hidden"> {description}</span>
          </button>
        ) : null}
      </div>

      <div className={`${ui.rowActions} ${styles.rowActionsCell}`}>
        {/* Menu em todas as linhas; quando não dá para categorizar, a opção diz o motivo. */}
        <ActionMenu label={`Ações para ${description}`} items={[menuItem]} />
      </div>

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
