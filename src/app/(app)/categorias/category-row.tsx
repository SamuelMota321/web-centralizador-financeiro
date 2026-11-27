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

export interface RowFigure {
  kind: "gasto" | "recebido" | "nenhum";
  value: string | null;
  share: string | null;
  count: number;
  series: string[];
}

/**
 * Linha da tabela de categorias: círculo na cor fixa, nome com lançamentos e regras, evolução
 * acumulada no período (na cor da categoria), valor e parte das despesas. Receita mostra
 * "recebido" no lugar da parte, para não misturar entradas com saídas.
 */
export function CategoryRow({
  category,
  color,
  figure,
  rules,
  periodName,
  movementsHref,
}: {
  category: Category;
  color: string | null;
  /** null: o período não foi lido por inteiro; a linha não mostra valores. */
  figure: RowFigure | null;
  rules: number;
  periodName: string;
  movementsHref: string;
}) {
  const router = useRouter();
  const [renaming, setRenaming] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [archiveState, archive, archiving] = useActionState(archiveCategoryAction.bind(null, category.id), ARCHIVE_INITIAL);
  const archived = category.status === "archived";
  const rowStyle = { "--row-color": color ?? "var(--cat-other)" } as React.CSSProperties;

  return (
    <li className={styles.row} data-archived={archived || undefined} data-open={renaming || undefined} style={rowStyle}>
      <IconBadge name={category.name} color={archived ? null : color} />
      <div className={styles.rowName}>
        <p className={styles.rowTitle}>
          {category.name}
          {archived ? <StatusChip tone="neutral">Arquivada</StatusChip> : null}
        </p>
        <p className={styles.rowMeta}>
          {figure ? `${figure.count} ${figure.count === 1 ? "lançamento" : "lançamentos"} · ` : null}
          {rules === 0 ? (
            archived ? "sem regras" : <Link className={ui.inlineLink} href="/regras">sem regras</Link>
          ) : (
            `${rules} ${rules === 1 ? "regra" : "regras"}`
          )}
        </p>
      </div>
      <div className={styles.rowSpark} aria-hidden>
        {figure && figure.value && figure.series.length > 1 ? <Sparkline values={figure.series} width={88} height={28} /> : null}
      </div>
      <p className={`${styles.rowValue} tabular`}>
        {figure?.value ? (
          <>
            <span className="visually-hidden">{figure.kind === "gasto" ? `Gasto em ${periodName}: ` : `Recebido em ${periodName}: `}</span>
            {formatMoney(figure.value)}
          </>
        ) : (
          <span className={styles.rowEmpty}>
            —<span className="visually-hidden">{figure ? `sem lançamentos em ${periodName}` : "valor indisponível"}</span>
          </span>
        )}
      </p>
      <p className={`${styles.rowShare} tabular`}>
        {figure?.kind === "gasto" && figure.share ? (
          <>
            {figure.share}
            <span className="visually-hidden"> das despesas</span>
          </>
        ) : figure?.kind === "recebido" ? (
          <span className={styles.rowIncome}>recebido</span>
        ) : null}
      </p>
      <div className={styles.rowMenu}>
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

      {renaming ? (
        <div className={`${ui.rowPanel} ${ui.reveal}`}>
          <RenamePanel category={category} onClose={() => setRenaming(false)} />
        </div>
      ) : null}

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
    <form action={formAction} className={styles.rowRename}>
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
      <div className={styles.rowRenameActions}>
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
