"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useId, useState } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { IconArchive, IconMovements, IconTag } from "@/components/icons";
import { IconBadge } from "@/components/icon-badge";
import { ActionMenu, ConfirmDialog } from "@/components/interactive";
import { errorProps, FieldError, Notice, PendingLabel, StatusChip, ui } from "@/components/ui";
import type { Category } from "@/lib/categories/types";
import { formatMoney } from "@/lib/money";
import {
  archiveCategoryAction,
  type ArchiveCategoryState,
  type CategoryFormState,
  renameCategoryAction,
} from "./actions";
import styles from "./categorias.module.css";

const ARCHIVE_INITIAL: ArchiveCategoryState = { status: "idle" };
const RENAME_INITIAL: CategoryFormState = { status: "idle" };

export interface CardFigure {
  kind: "gasto" | "recebido" | "nenhum";
  value: string | null;
  share: string | null;
  count: number;
  series: string[];
}

/**
 * Cartão da categoria: cor e ícone fixos, valor do período (quando o período inteiro foi lido),
 * participação nas despesas, quantidade de lançamentos e de regras, minigráfico acumulado.
 * O texto sempre diz o que a cor e o gráfico mostram.
 */
export function CategoryCard({
  category,
  color,
  figure,
  rules,
  periodName,
  movementsHref,
}: {
  category: Category;
  color: string | null;
  /** null: o período não foi lido por inteiro; o cartão não mostra valores. */
  figure: CardFigure | null;
  rules: number;
  periodName: string;
  movementsHref: string;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [archiveState, archive, archiving] = useActionState(archiveCategoryAction.bind(null, category.id), ARCHIVE_INITIAL);
  const archived = category.status === "archived";
  const cardStyle = { "--card-color": color ?? "var(--cat-other)" } as React.CSSProperties;

  return (
    <li className={styles.card} data-archived={archived || undefined} data-open={renaming || undefined} style={cardStyle}>
      <div className={styles.cardTop}>
        <IconBadge name={category.name} color={color} size="large" />
        <div className={styles.cardTitleGroup}>
          <p className={styles.cardTitle}>{category.name}</p>
          {archived ? <StatusChip tone="neutral">Arquivada</StatusChip> : null}
        </div>
        <ActionMenu
          label={`Ações para ${category.name}`}
          items={[
            ...(archived ? [] : [{ label: renaming ? "Fechar renomear" : "Renomear", icon: <IconTag size={17} />, onSelect: () => setRenaming(!renaming) }]),
            { label: "Ver lançamentos", icon: <IconMovements size={17} />, onSelect: () => router.push(movementsHref) },
            ...(archived
              ? []
              : [{ label: "Arquivar categoria", icon: <IconArchive size={17} />, tone: "danger" as const, onSelect: () => setConfirming(true) }]),
          ]}
        />
      </div>

      {figure ? (
        <div className={styles.cardFigure}>
          <div>
            <p className={styles.cardLabel}>
              {figure.kind === "gasto" ? `Gasto em ${periodName}` : figure.kind === "recebido" ? `Recebido em ${periodName}` : `Em ${periodName}`}
            </p>
            <p className={`${styles.cardValue} tabular`}>
              {figure.value ? formatMoney(figure.value) : <span className={styles.cardEmpty}>Sem lançamentos</span>}
            </p>
            {figure.share ? <p className={styles.cardShare}>{figure.share} das despesas</p> : null}
          </div>
          {figure.series.length > 1 && figure.value ? (
            <div className={styles.cardSpark} aria-hidden>
              <Sparkline values={figure.series} width={96} height={32} />
            </div>
          ) : null}
        </div>
      ) : null}

      <p className={styles.cardMeta}>
        {figure ? `${figure.count} ${figure.count === 1 ? "lançamento" : "lançamentos"} · ` : null}
        {rules === 0 ? (
          archived ? "sem regras" : <Link className={ui.inlineLink} href="/regras">sem regras</Link>
        ) : (
          `${rules} ${rules === 1 ? "regra" : "regras"}`
        )}
        {archived ? " · continua no histórico" : null}
      </p>

      {renaming ? <RenamePanel category={category} onClose={() => setRenaming(false)} /> : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Arquivar “${category.name}”?`}
        description="Ela continua visível no histórico das movimentações, mas não poderá ser atribuída de novo nem reativada. As regras dela deixam de ser aplicadas."
        confirmLabel="Arquivar categoria"
        pendingLabel="Arquivando…"
        action={archive}
        pending={archiving}
        error={
          archiveState.status === "error" ? (
            <Notice tone="error" actions={archiveState.reauth ? <ReauthLink /> : undefined}>
              {archiveState.message}
            </Notice>
          ) : null
        }
      />
    </li>
  );
}

function ReauthLink() {
  // Link do Next faria prefetch e iniciaria a transação de login por engano.
  return (
    <a className={ui.inlineLink} href="/auth/login?returnTo=/categorias">
      Entrar novamente
    </a>
  );
}

function RenamePanel({ category, onClose }: { category: Category; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(renameCategoryAction.bind(null, category.id), RENAME_INITIAL);
  const id = useId();
  const error = state.status === "invalid" ? state.message : undefined;

  return (
    <form action={formAction} className={styles.cardRename}>
      <label className={ui.label} htmlFor={`${id}-name`}>
        Novo nome
      </label>
      <input
        className={ui.input}
        id={`${id}-name`}
        name="name"
        maxLength={100}
        defaultValue={"name" in state ? state.name : category.name}
        required
        autoFocus
        {...errorProps(`${id}-name-error`, error)}
      />
      <FieldError id={`${id}-name-error`} message={error} />
      {state.status === "error" ? (
        <Notice tone="error" actions={state.reauth ? <ReauthLink /> : undefined}>
          {state.message}
        </Notice>
      ) : null}
      <div className={styles.cardRenameActions}>
        <button className={`${ui.button} ${ui.primary} ${ui.small}`} type="submit" disabled={pending} aria-busy={pending}>
          <PendingLabel pending={pending} idle="Salvar nome" busy="Salvando…" />
        </button>
        <button className={ui.linkButton} type="button" onClick={onClose} disabled={pending}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
