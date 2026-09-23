"use client";

import { useActionState, useId, useState } from "react";
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
    <li className={styles.item}>
      <div className={styles.itemRow}>
        <div>
          <p className={styles.itemName}>{account.name}</p>
          <p className={styles.itemMeta}>
            {TYPE_LABELS[account.type]}
            {account.institutionName ? ` · ${account.institutionName}` : ""}
            {isManual ? "" : " · conectada"}
          </p>
        </div>
        <span className={styles.balance}>{account.initialBalance}</span>
      </div>

      <div className={styles.actions}>
        {isManual ? (
          <button
            className={styles.linkButton}
            type="button"
            aria-expanded={panel === "edit"}
            onClick={() => setPanel(panel === "edit" ? "none" : "edit")}
          >
            Editar
          </button>
        ) : (
          <span className={styles.itemMeta}>Conectada · somente desativacao</span>
        )}
        <button
          className={`${styles.linkButton} ${styles.linkDanger}`}
          type="button"
          aria-expanded={panel === "deactivate"}
          onClick={() => setPanel("deactivate")}
        >
          Desativar
        </button>
      </div>

      {panel === "edit" ? (
        <AccountEditForm account={account} onClose={() => setPanel("none")} />
      ) : null}

      {panel === "deactivate" ? (
        <form
          action={deactivate}
          className={`${styles.confirm} ${styles.inlinePanel}`}
          aria-describedby={confirmTextId}
        >
          <p id={confirmTextId}>
            Desativar &ldquo;{account.name}&rdquo;? Ela deixa de aparecer na lista e nao
            podera ser editada nem reativada. O historico e preservado.
          </p>

          {state.status === "error" ? (
            <p className={`${styles.notice} ${styles.noticeError}`} role="alert">
              {state.message}
            </p>
          ) : null}

          <div className={styles.formFooter}>
            {/* Foco inicial na opcao segura: a acao destrutiva exige escolha explicita. */}
            <button
              className={styles.secondary}
              type="button"
              onClick={() => setPanel("none")}
              disabled={pending}
              autoFocus
            >
              Cancelar
            </button>
            <button className={styles.danger} type="submit" disabled={pending}>
              {pending ? "Desativando..." : "Confirmar desativacao"}
            </button>
          </div>
        </form>
      ) : null}
    </li>
  );
}
