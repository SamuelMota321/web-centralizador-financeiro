"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { showToast } from "@/components/interactive";
import { Notice, PendingLabel, ui } from "@/components/ui";
import type { Account } from "@/lib/accounts/types";
import type { AccountMappingChoice, InitialImport } from "@/lib/connections/schema";
import { type ActionError, listLinkableAccountsAction, mapAccountAction } from "./actions";
import { canCreateFromProvider, mappingStatusText, type ProviderAccount, providerAccountTypeLabel } from "./presentation";
import styles from "./conectar.module.css";

const CREATE = "create";

type Linkable = { status: "loading" } | { status: "ok"; accounts: Account[] } | ActionError;

/**
 * Etapa `awaiting_account_mapping`: para cada conta do banco, a pessoa escolhe criar uma conta
 * conectada ou vincular a uma conta manual existente. Sem essa escolha a importação não segue.
 */
export function AccountMapping({
  connectionId,
  initialImport,
  onMapped,
}: {
  connectionId: string;
  initialImport: InitialImport;
  onMapped: (initialImport: InitialImport) => void;
}) {
  const id = useId();
  const [linkable, setLinkable] = useState<Linkable>({ status: "loading" });

  useEffect(() => {
    let active = true;
    void listLinkableAccountsAction().then((result) => {
      if (active) setLinkable(result);
    });
    return () => {
      active = false;
    };
  }, []);

  const { accounts, mapped, total } = initialImport.accountMapping;

  return (
    <section className={styles.sync} aria-labelledby={`${id}-mapping`}>
      <div>
        <h3 id={`${id}-mapping`} className={styles.syncTitle}>
          Contas encontradas no banco
        </h3>
        <p className={styles.syncMeta}>
          Escolha o que fazer com cada conta para a importação continuar. {mapped} de {total} já{" "}
          {mapped === 1 ? "está vinculada" : "estão vinculadas"}.
        </p>
      </div>

      {linkable.status === "error" ? <Notice tone="error">{linkable.message}</Notice> : null}

      <ul className={styles.mappingList}>
        {accounts.map((account) => (
          <li key={account.providerAccountId} className={styles.mappingItem}>
            {account.mappingStatus === "pending" ? (
              <PendingMapping
                connectionId={connectionId}
                account={account}
                linkable={linkable.status === "ok" ? linkable.accounts : null}
                onMapped={onMapped}
              />
            ) : (
              <>
                <ProviderAccountName account={account} />
                <p className={styles.syncMeta}>{mappingStatusText(account)}</p>
              </>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function ProviderAccountName({ account }: { account: ProviderAccount }) {
  return (
    <p className={styles.mappingName}>
      {account.name} <span className={styles.syncMeta}>· {providerAccountTypeLabel(account.accountType)}</span>
    </p>
  );
}

function PendingMapping({
  connectionId,
  account,
  linkable,
  onMapped,
}: {
  connectionId: string;
  account: ProviderAccount;
  /** null enquanto as contas manuais carregam ou quando a lista falhou. */
  linkable: Account[] | null;
  onMapped: (initialImport: InitialImport) => void;
}) {
  const id = useId();
  const canCreate = canCreateFromProvider(account);
  const [selection, setSelection] = useState(canCreate ? CREATE : "");
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const noOption = !canCreate && (linkable?.length ?? 0) === 0;

  function confirm() {
    const choice: AccountMappingChoice = selection === CREATE ? { action: "create" } : { action: "link", accountId: selection };
    setError(null);
    startSaving(async () => {
      const result = await mapAccountAction(connectionId, account.providerAccountId, choice);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      showToast("success", choice.action === "create" ? `Conta “${account.name}” criada.` : `Conta “${account.name}” vinculada.`);
      onMapped(result.initialImport);
    });
  }

  return (
    <>
      <ProviderAccountName account={account} />
      <div className={styles.mappingControls}>
        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${id}-choice`}>
            O que fazer com esta conta
          </label>
          <select
            id={`${id}-choice`}
            className={ui.select}
            value={selection}
            onChange={(event) => setSelection(event.target.value)}
            disabled={saving || noOption}
          >
            {canCreate ? null : (
              <option value="" disabled>
                Escolha uma conta manual
              </option>
            )}
            {canCreate ? <option value={CREATE}>Criar uma conta nova com os dados do banco</option> : null}
            {linkable && linkable.length > 0 ? (
              <optgroup label="Vincular a uma conta que já tenho">
                {linkable.map((local) => (
                  <option key={local.id} value={local.id}>
                    {local.name}
                    {local.institutionName ? ` (${local.institutionName})` : ""}
                  </option>
                ))}
              </optgroup>
            ) : null}
          </select>
        </div>
        <button
          className={`${ui.button} ${ui.primary}`}
          type="button"
          onClick={confirm}
          disabled={saving || selection === ""}
          aria-busy={saving}
        >
          <PendingLabel pending={saving} idle="Confirmar" busy="Salvando…" />
        </button>
      </div>
      {noOption && linkable !== null ? (
        <p className={styles.syncMeta}>
          O banco não informou o tipo desta conta. Crie uma conta manual em Contas e volte para vinculá-la.
        </p>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
    </>
  );
}
