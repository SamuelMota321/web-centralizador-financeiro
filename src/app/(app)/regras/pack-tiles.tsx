"use client";

import { type ReactNode, useState } from "react";
import { IconChevronDown, IconPause, IconPlus } from "@/components/icons";
import { IconTile, type TileState } from "@/components/icon-tile";
import { ui } from "@/components/ui";
import styles from "./regras.module.css";

export interface PackTile {
  category: string;
  color: string | null;
  state: TileState;
  detail: string;
  /** Grupo pausado (tem regras, nenhuma ativa) ou faltando: selo no canto. */
  mark?: "paused" | "add";
}

/**
 * Fileira com uma categoria do pacote por ícone. Um toque abre aquele grupo logo abaixo
 * (termos, ativar ou desativar o grupo, as regras); "Ver todas" abre todos. Os grupos chegam
 * prontos do servidor; aqui só se escolhe qual mostrar.
 */
export function PackTiles({ tiles, groups }: { tiles: PackTile[]; groups: Record<string, ReactNode> }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [all, setAll] = useState(false);
  const shown = all ? tiles.map((tile) => tile.category) : selected ? [selected] : [];

  return (
    <>
      <div className={styles.packBar}>
        <ul className={`${ui.tiles} ${styles.packTiles}`}>
          {tiles.map((tile) => (
            <li key={tile.category}>
              <IconTile
                name={tile.category}
                color={tile.color}
                label={tile.category}
                detail={tile.detail}
                state={tile.state}
                mark={tile.mark === "paused" ? <IconPause size={10} strokeWidth={2.5} /> : tile.mark === "add" ? <IconPlus size={11} strokeWidth={2.5} /> : undefined}
                aria-pressed={!all && selected === tile.category}
                aria-controls={`grupo-${tile.category}`}
                onClick={() => {
                  setAll(false);
                  setSelected(selected === tile.category ? null : tile.category);
                }}
              />
            </li>
          ))}
        </ul>
        <button className={styles.packToggle} type="button" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? "Recolher" : "Ver todas"}
          <IconChevronDown size={16} data-open={all || undefined} />
        </button>
      </div>
      {shown.length > 0 ? (
        <div className={`${styles.packGroups} ${ui.reveal}`}>
          {shown.map((category) => (
            <div key={category} id={`grupo-${category}`} className={styles.packGroup}>
              {groups[category]}
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
}
