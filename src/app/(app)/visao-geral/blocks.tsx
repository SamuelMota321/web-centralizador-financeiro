import Link from "next/link";
import type { ReactNode } from "react";
import { Notice, StatusChip, ui } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { AccountBalance, BalancesSummary, FlowMonth } from "@/lib/overview/types";
import { TYPE_LABELS } from "../contas/account-type-labels";
import {
  formatReference,
  freshnessChip,
  monthName,
  SOURCE_LABELS,
  splitAccounts,
} from "./presentation";
import styles from "./visao-geral.module.css";

/** Painel de um bloco: título, metadados à direita e o conteúdo. */
export function Block({
  id,
  title,
  meta,
  children,
}: {
  id: string;
  title: string;
  meta?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel} aria-labelledby={id}>
      <header className={styles.panelHead}>
        <h2 className={styles.panelTitle} id={id}>
          {title}
        </h2>
        {meta ? <p className={styles.meta}>{meta}</p> : null}
      </header>
      {children}
    </section>
  );
}

/** Falha de uma agregação: só o bloco afetado avisa; os outros continuam (RNF-008). */
export function BlockError({ what, retryHref }: { what: string; retryHref: string }) {
  return (
    <Notice
      tone="error"
      actions={
        <Link className={ui.inlineLink} href={retryHref}>
          Tentar de novo
        </Link>
      }
    >
      Não foi possível carregar {what}. Os outros blocos continuam valendo.
    </Notice>
  );
}

function Figure({
  label,
  value,
  meta,
  marker,
}: {
  label: string;
  /** null: indisponível, escrito como indisponível e nunca como zero. */
  value: string | null;
  meta: ReactNode;
  marker?: ReactNode;
}) {
  return (
    <div className={styles.figure}>
      <p className={styles.label}>{label}</p>
      {value === null ? (
        <p className={styles.figureValue} data-unavailable="">
          Indisponível
        </p>
      ) : (
        <p className={styles.figureValue}>{formatMoney(value)}</p>
      )}
      <p className={styles.meta}>{meta}</p>
      {marker ? <div className={styles.figureMarker}>{marker}</div> : null}
    </div>
  );
}

/** Disponível · Entradas · Saídas do período (bloco 2). */
export function FigureStrip({
  balances,
  month,
}: {
  balances: BalancesSummary | null;
  month: FlowMonth | null;
}) {
  const period = month ? `${monthName(month.month)}${month.partial ? " · parcial" : ""}` : "Fluxo indisponível";
  const zero = (value: string, text: string) => (value === "0.00" ? text : period);

  return (
    <section className={styles.figures} aria-label="Números do período">
      <Figure
        label="Disponível"
        value={balances?.available ?? null}
        meta={
          balances
            ? `${balances.availableAccounts} ${balances.availableAccounts === 1 ? "conta" : "contas"} · ref. ${formatReference(balances.asOf)}`
            : "Saldos indisponíveis"
        }
        marker={
          balances?.includesStale ? (
            <StatusChip tone="warning">Inclui conta desatualizada</StatusChip>
          ) : null
        }
      />
      <Figure
        label="Entradas do período"
        value={month?.inflow ?? null}
        meta={month ? zero(month.inflow, "Nenhuma entrada no período") : period}
      />
      <Figure
        label="Saídas do período"
        value={month?.outflow ?? null}
        meta={month ? zero(month.outflow, "Nenhuma saída no período") : period}
      />
    </section>
  );
}

function AccountRow({ account }: { account: AccountBalance }) {
  const chip = freshnessChip(account.freshness);
  const reference = (
    <span className={styles.reference}>
      <span className={styles.meta}>ref. {formatReference(account.asOf)}</span>
      {chip ? <StatusChip tone={chip.tone}>{chip.label}</StatusChip> : null}
    </span>
  );

  return (
    <tr>
      <th scope="row">
        <span className={styles.accountName}>{account.name}</span>
        <span className={styles.meta}>
          {[TYPE_LABELS[account.type], SOURCE_LABELS[account.source], account.institutionName]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </th>
      <td className={styles.num}>
        <span className={styles.balance}>
          {account.freshness === "unavailable" ? "Indisponível" : formatMoney(account.balance)}
        </span>
        <span className={styles.referenceInline}>{reference}</span>
      </td>
      <td className={`${styles.num} ${styles.referenceColumn}`}>{reference}</td>
    </tr>
  );
}

/** Saldos por conta (bloco 3); cartões em grupo próprio, fora do Disponível (D-03). */
export function BalancesTable({ accounts: all }: { accounts: readonly AccountBalance[] }) {
  const { accounts, cards } = splitAccounts(all);

  return (
    <table className={styles.table}>
      <caption className="visually-hidden">Saldo atual e referência de cada conta</caption>
      <thead>
        <tr>
          <th scope="col" className={styles.label}>
            Conta
          </th>
          <th scope="col" className={`${styles.label} ${styles.num}`}>
            Saldo atual
          </th>
          <th scope="col" className={`${styles.label} ${styles.num} ${styles.referenceColumn}`}>
            Referência
          </th>
        </tr>
      </thead>
      <tbody>
        {accounts.map((account) => (
          <AccountRow key={account.accountId} account={account} />
        ))}
      </tbody>
      {cards.length > 0 ? (
        <tbody>
          <tr className={styles.group}>
            <th scope="rowgroup" colSpan={3} className={styles.label}>
              Cartões · fora do Disponível
            </th>
          </tr>
          {cards.map((account) => (
            <AccountRow key={account.accountId} account={account} />
          ))}
        </tbody>
      ) : null}
    </table>
  );
}
