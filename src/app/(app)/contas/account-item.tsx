"use client";

import { useActionState, useState } from "react";
import { IconPause } from "@/components/icons";
import { ActionMenu, ConfirmDialog } from "@/components/interactive";
import { Notice, StatusChip, ui } from "@/components/ui";
import { formatCivilDate } from "@/lib/civil-date";
import { formatMoney } from "@/lib/money";
import type { Account } from "@/lib/accounts/types";
import { deactivateAccountAction, type DeactivateAccountState } from "./actions";
import { AccountEditForm } from "./account-edit-form";
import { TYPE_LABELS } from "./account-type-labels";
import styles from "./contas.module.css";

const INITIAL_STATE: DeactivateAccountState = { status: "idle" };

export function AccountItem({ account }: { account: Account }) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [state, deactivate, pending] = useActionState(
    deactivateAccountAction.bind(null, account.id),
    INITIAL_STATE,
  );
  const isManual = account.origin === "manual";

  return (
    <li className={styles.row} data-open={editing || undefined}>
      <div className={styles.rowMain}>
        <p className={styles.rowTitle}>{account.name}</p>
        <p className={styles.rowMeta}>
          {TYPE_LABELS[account.type]}
          {account.institutionName ? ` · ${account.institutionName}` : ""}
        </p>
      </div>

      <div className={styles.rowOrigin}>
        <StatusChip tone={isManual ? "neutral" : "info"}>
          {isManual ? "Manual" : "Conectada"}
        </StatusChip>
      </div>

      <div className={styles.rowBalance}>
        <p className={`${styles.balance} tabular`}>{formatMoney(account.initialBalance)}</p>
        <p className={styles.rowMeta}>
          saldo inicial em{" "}
          <span className="tabular">{formatCivilDate(account.initialBalanceAsOf)}</span>
        </p>
      </div>

      <div className={ui.rowActions}>
        {isManual ? (
          <button
            className={`${ui.button} ${ui.ghost} ${ui.small}`}
            type="button"
            aria-expanded={editing}
            onClick={() => setEditing(!editing)}
          >
            Editar<span className="visually-hidden"> {account.name}</span>
          </button>
        ) : null}
        <ActionMenu
          label={`Mais ações para ${account.name}`}
          items={[
            {
              label: "Desativar conta",
              icon: <IconPause size={17} />,
              tone: "danger",
              onSelect: () => setConfirming(true),
            },
          ]}
        />
      </div>

      {editing ? (
        <div className={`${ui.rowPanel} ${ui.reveal}`}>
          <AccountEditForm account={account} onClose={() => setEditing(false)} />
        </div>
      ) : null}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Desativar “${account.name}”?`}
        description="Ela deixa de aparecer na lista e não poderá ser editada nem reativada. O histórico é preservado."
        confirmLabel="Desativar conta"
        pendingLabel="Desativando…"
        action={deactivate}
        pending={pending}
        error={state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}
      />
    </li>
  );
}
