"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { ui } from "@/components/ui";
import type { PatrimonyCollection, PatrimonyItem } from "@/lib/patrimony/types";
import { PatrimonyForm } from "./patrimony-form";
import { amountText, assetLabel, assetMeta, SLUGS } from "./presentation";
import styles from "./patrimonio.module.css";

/** Linha da tabela com edição no lugar: a linha seguinte abre o formulário. */
export function ItemRow({
  collection,
  item,
  assets,
  columns,
}: {
  collection: PatrimonyCollection;
  item: PatrimonyItem;
  assets: { id: string; description: string }[] | null;
  columns: number;
}) {
  const [editing, setEditing] = useState(false);
  const close = useCallback(() => setEditing(false), []);

  return (
    <>
      <tr data-open={editing || undefined}>
        <td>
          <div className={styles.cellTitle}>{item.description}</div>
          {item.kind === "asset" ? <div className={styles.cellMeta}>{assetMeta(item)}</div> : null}
        </td>
        {item.kind === "financing" ? <td>{assetLabel(item.assetId, assets)}</td> : null}
        <td className={`${styles.num} tabular`}>
          {amountText(item.kind === "asset" ? item.estimatedValue : item.outstandingBalance)}
        </td>
        <td className={styles.actions}>
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
