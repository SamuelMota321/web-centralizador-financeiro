"use client";

import { useState, useTransition } from "react";
import { IconArrowRight, IconCheck, IconPlus } from "@/components/icons";
import { IconTile } from "@/components/icon-tile";
import { showToast } from "@/components/interactive";
import { PendingLabel, ui } from "@/components/ui";
import { createOneSuggestedCategoryAction, createSuggestedCategoriesAction, type SuggestionState } from "./actions";
import styles from "./categorias.module.css";

export interface SuggestionTile {
  name: string;
  color: string | null;
  state: "added" | "archived" | "missing";
}

function report(result: SuggestionState) {
  if (result.status !== "error") return;
  showToast(
    "error",
    result.reauth ? (
      <>
        {result.message}{" "}
        <a className={ui.inlineLink} href="/auth/login?returnTo=/categorias">
          Entrar novamente
        </a>
      </>
    ) : (
      result.message
    ),
  );
}

/**
 * As 12 sugeridas lado a lado: adicionadas em cor com ✓; as que faltam, tracejadas, viram a
 * categoria com um toque. Depois ela é da pessoa (renomear, arquivar).
 */
export function SuggestedTiles({ tiles }: { tiles: SuggestionTile[] }) {
  const [pendingName, setPendingName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const add = (name: string) => {
    setPendingName(name);
    startTransition(async () => {
      const result = await createOneSuggestedCategoryAction(name);
      report(result);
      if (result.status === "done" && result.created > 0) showToast("success", `Categoria “${name}” adicionada.`);
      setPendingName(null);
    });
  };

  return (
    <ul className={`${ui.tiles} ${styles.tiles}`}>
      {tiles.map((tile) => (
        <li key={tile.name}>
          {tile.state === "missing" ? (
            <IconTile
              name={tile.name}
              color={null}
              label={tile.name}
              detail={pendingName === tile.name ? "Adicionando…" : "Adicionar"}
              state="missing"
              mark={<IconPlus size={11} strokeWidth={2.5} />}
              onClick={() => add(tile.name)}
              disabled={pending}
              aria-busy={pendingName === tile.name}
              aria-label={`Adicionar a categoria ${tile.name}`}
            />
          ) : (
            <IconTile
              name={tile.name}
              color={tile.state === "archived" ? null : tile.color}
              label={tile.name}
              detail={tile.state === "archived" ? "Arquivada" : "Adicionada"}
              state={tile.state === "archived" ? "off" : "on"}
              mark={tile.state === "added" ? <IconCheck size={11} strokeWidth={2.75} /> : undefined}
            />
          )}
        </li>
      ))}
    </ul>
  );
}

/** "Adicionar as N que faltam": cria todas as sugeridas que ainda não existem. */
export function AddMissingButton({ count }: { count: number }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      className={`${ui.button} ${ui.secondary}`}
      type="button"
      disabled={pending}
      aria-busy={pending}
      onClick={() =>
        startTransition(async () => {
          const result = await createSuggestedCategoriesAction();
          report(result);
          if (result.status === "done" && result.created > 0) {
            showToast("success", `${result.created} ${result.created === 1 ? "categoria adicionada" : "categorias adicionadas"}.`);
          }
        })
      }
    >
      <PendingLabel pending={pending} idle={count === 1 ? "Adicionar a que falta" : `Adicionar as ${count} que faltam`} busy="Adicionando…" />
      <IconArrowRight size={16} />
    </button>
  );
}
