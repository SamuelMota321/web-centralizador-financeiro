"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ui } from "@/components/ui";
import type { PatrimonyCollection, PatrimonyItem } from "@/lib/patrimony/types";
import { PatrimonyForm } from "./patrimony-form";
import { formatCivilDate } from "@/lib/civil-date";
import { AssetBadge } from "./asset-badge";
import { amountText, assetLabel, SLUGS, valuationAge } from "./presentation";
import styles from "./patrimonio.module.css";

/** Linha da tabela com edição no lugar: a linha seguinte abre o formulário. */
export function ItemRow({
  collection,
  item,
  assets,
  columns,
  today,
  readOnly = false,
}: {
  collection: PatrimonyCollection;
  item: PatrimonyItem;
  assets: { id: string; description: string; type?: string }[] | null;
  columns: number;
  /** Hoje (AAAA-MM-DD), vindo do servidor: o texto "há N meses" não muda entre servidor e navegador. */
  today: string;
  /** Prévia com dados de exemplo: sem editar nem histórico. */
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  return (
    <>
      <tr data-open={editing || undefined}>
        <td>
          {item.kind === "asset" ? (
            <div className={styles.identity}>
              <AssetBadge type={item.type} />
              <div className={styles.cellTitle}>{item.description}</div>
            </div>
          ) : (
            <div className={styles.cellTitle}>{item.description}</div>
          )}
        </td>
        {item.kind === "financing" ? (
          <td>
            {item.assetId === null ? (
              <span className={styles.note}>{assetLabel(item.assetId, assets)}</span>
            ) : (
              <div className={styles.identity}>
                <AssetBadge type={assets?.find((asset) => asset.id === item.assetId)?.type} />
                <span>{assetLabel(item.assetId, assets)}</span>
              </div>
            )}
          </td>
        ) : null}
        <td className={`${styles.num} tabular`}>
          {amountText(item.kind === "asset" ? item.estimatedValue : item.outstandingBalance)}
        </td>
        {item.kind === "asset" ? (
          <>
            <td>
              <div className="tabular">{formatCivilDate(item.valuationDate)}</div>
              {valuationAge(item.valuationDate, today) ? (
                <div className={styles.cellMeta}>{valuationAge(item.valuationDate, today)}</div>
              ) : null}
            </td>
            <td className={styles.source}>{item.source}</td>
          </>
        ) : null}
        <td className={styles.actions}>
          {readOnly ? null : (
            <>
            <button
              className={`${ui.button} ${ui.ghost} ${ui.small}`}
              type="button"
              aria-expanded={editing}
              onClick={() => setEditing(!editing)}
            >
              Editar<span className="visually-hidden"> {item.description}</span>
            </button>
            <Link className={`${ui.button} ${ui.ghost} ${ui.small}`} href={`/patrimonio/${SLUGS[collection]}/${item.id}`}>
              Histórico<span className="visually-hidden"> de {item.description}</span>
            </Link>
            </>
          )}
        </td>
      </tr>
      {editing ? (
        <tr className={styles.editRow}>
          <td colSpan={columns}>
            <PatrimonyForm collection={collection} item={item} assets={assets} onDone={close} />
          </td>
        </tr>
      ) : null}
    </>
  );
}
