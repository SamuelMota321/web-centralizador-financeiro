"use client";

import { useActionState, useId, useState } from "react";
import { Notice, StatusChip, ui } from "@/components/ui";
import { formatCivilDate } from "@/lib/civil-date";
import { formatMoney } from "@/lib/money";
import type { Account } from "@/lib/accounts/types";
import { deactivateAccountAction, type DeactivateAccountState } from "./actions";
import { AccountEditForm } from "./account-edit-form";
import { TYPE_LABELS } from "./account-type-labels";
import styles from "./contas.module.css";

const INITIAL_STATE: DeactivateAccountState = { status: "idle" };

type Panel = "none" | "edit" | "deactivate";

export function AccountItem({ account }: { account: Account }) {
  const [panel, setPanel] = useState<Panel>("none");
  const [state, deactivate, pending] = useActionState(
    deactivateAccountAction.bind(null, account.id),
    INITIAL_STATE,
  );
  const confirmTextId = useId();
  const isManual = account.origin === "manual";

  return (
    <li className={styles.row}>
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

      <div className={styles.rowActions}>
        {isManual ? (
          <button
            className={ui.linkButton}
            type="button"
            aria-expanded={panel === "edit"}
            onClick={() => setPanel(panel === "edit" ? "none" : "edit")}
          >
            Editar<span className="visually-hidden"> {account.name}</span>
          </button>
        ) : null}
        <button
          className={`${ui.linkButton} ${ui.linkDanger}`}
          type="button"
          aria-expanded={panel === "deactivate"}
          onClick={() => setPanel(panel === "deactivate" ? "none" : "deactivate")}
        >
          Desativar<span className="visually-hidden"> {account.name}</span>
        </button>
      </div>

      {panel === "edit" ? (
        <div className={styles.rowPanel}>
          <AccountEditForm account={account} onClose={() => setPanel("none")} />
        </div>
      ) : null}

      {panel === "deactivate" ? (
        <div className={styles.rowPanel}>
          <form
            action={deactivate}
            className={`${styles.confirm} ${ui.reveal}`}
            aria-describedby={confirmTextId}
          >
            <p id={confirmTextId}>
              Desativar &ldquo;{account.name}&rdquo;? Ela deixa de aparecer na lista e não
              poderá ser editada nem reativada. O histórico é preservado.
            </p>

            {state.status === "error" ? <Notice tone="error">{state.message}</Notice> : null}

            <div className={ui.formFooter}>
              {/* Foco inicial na opção segura: a ação destrutiva exige escolha explícita. */}
              <button
                className={`${ui.button} ${ui.secondary} ${ui.small}`}
                type="button"
                onClick={() => setPanel("none")}
                disabled={pending}
                autoFocus
              >
                Cancelar
              </button>
              <button
                className={`${ui.button} ${ui.danger} ${ui.small}`}
                type="submit"
                disabled={pending}
                aria-busy={pending}
              >
                {pending ? "Desativando…" : "Desativar conta"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </li>
  );
}
