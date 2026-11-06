import Link from "next/link";
import type { ReactNode } from "react";
import { Sparkline } from "@/components/charts/sparkline";
import { Notice, StatusChip, ui } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import type { AccountBalance, BalancesSummary, FlowMonth } from "@/lib/overview/types";
import { TYPE_LABELS } from "../contas/account-type-labels";
import {
  type AttentionItem,
  formatChange,
  formatReference,
  freshnessChip,
  monthName,
  type RecentLine,
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
  change,
  meta,
  marker,
  spark,
}: {
  label: string;
  /** null: indisponível, escrito como indisponível e nunca como zero. */
  value: string | null;
  /** Variação sobre o mês anterior, ou o motivo de não haver comparação. */
  change?: string | null;
  meta: ReactNode;
  marker?: ReactNode;
  spark?: ReactNode;
}) {
  return (
    <div className={styles.figure}>
      <div className={styles.figureBody}>
        <p className={styles.label}>{label}</p>
        {value === null ? (
          <p className={styles.figureValue} data-unavailable="">
            Indisponível
          </p>
        ) : (
          <p className={styles.figureValue}>{formatMoney(value)}</p>
        )}
        {change ? <p className={styles.change}>{change}</p> : null}
        <p className={styles.meta}>{meta}</p>
        {marker ? <div className={styles.figureMarker}>{marker}</div> : null}
      </div>
      {spark}
    </div>
  );
}

const NO_COMPARISON = "Mês em andamento: sem comparação";

/** Disponível · Entradas · Saídas do período (bloco 2), com tendência e variação. */
export function FigureStrip({
  balances,
  months,
}: {
  balances: BalancesSummary | null;
  /** Fluxo até o período escolhido; null quando a agregação falhou. */
  months: readonly FlowMonth[] | null;
}) {
  const month = months?.at(-1) ?? null;
  const previous = months && months.length > 1 ? months[months.length - 2] : null;
  const period = month ? `${monthName(month.month)}${month.partial ? " · parcial" : ""}` : "Fluxo indisponível";
  const zero = (value: string, text: string) => (value === "0.00" ? text : period);
  // Mês em andamento contra mês fechado não é comparação justa: não há percentual.
  const flowChange = (pick: (m: FlowMonth) => string) =>
    !month ? null : month.partial ? NO_COMPARISON : previous ? formatChange(pick(month), pick(previous), previous.month) : null;
  const priorBalance = balances && balances.history.length > 1 ? balances.history[balances.history.length - 2] : null;

  return (
    <section className={styles.figures} aria-label="Números do período">
      <Figure
        label="Disponível"
        value={balances?.available ?? null}
        change={balances && priorBalance ? formatChange(balances.available, priorBalance.available, priorBalance.month) : null}
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
        spark={balances ? <Sparkline values={balances.history.map((entry) => entry.available)} /> : null}
      />
      <Figure
        label="Entradas do período"
        value={month?.inflow ?? null}
        change={flowChange((m) => m.inflow)}
        meta={month ? zero(month.inflow, "Nenhuma entrada no período") : period}
        spark={months ? <Sparkline values={months.map((m) => m.inflow)} partialLast={month?.partial} /> : null}
      />
      <Figure
        label="Saídas do período"
        value={month?.outflow ?? null}
        change={flowChange((m) => m.outflow)}
        meta={month ? zero(month.outflow, "Nenhuma saída no período") : period}
        spark={months ? <Sparkline values={months.map((m) => m.outflow)} partialLast={month?.partial} /> : null}
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

/** Últimas movimentações: a cor da categoria marca a linha; o sinal e o texto dizem o resto. */
export function RecentList({
  lines,
  compact = false,
}: {
  lines: readonly RecentLine[];
  /** Linhas mais baixas, para a lista de saídas sob a rosca. */
  compact?: boolean;
}) {
  if (lines.length === 0) return <p className={styles.meta}>Nenhuma movimentação registrada.</p>;
  return (
    <ul className={compact ? `${styles.recent} ${styles.compact}` : styles.recent}>
      {lines.map((line) => (
        <li key={line.id} className={styles.recentRow}>
          <span
            className={line.toReview ? `${styles.recentMark} ${styles.hatched}` : styles.recentMark}
            style={line.color ? ({ "--mark": line.color } as React.CSSProperties) : undefined}
            aria-hidden
          />
          <span className={styles.recentText}>
            <span className={styles.recentTitle}>{line.title}</span>
            <span className={styles.meta}>{line.meta}</span>
          </span>
          <span className={styles.recentAmount} data-direction={line.direction}>
            {line.amount}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** "Pede sua atenção": fatos com a ação que resolve cada um, nunca conselho. */
export function AttentionList({ items }: { items: readonly AttentionItem[] }) {
  if (items.length === 0) return <p className={styles.meta}>Nada pendente neste período.</p>;
  return (
    <ul className={styles.recent}>
      {items.map((item) => (
        <li key={item.id} className={styles.attentionRow}>
          <span className={styles.attentionMark} data-tone={item.tone} aria-hidden />
          <span className={styles.recentText}>
            <span className={styles.recentTitle}>{item.title}</span>
            <span className={styles.attentionText}>
              {item.text}{" "}
              <Link className={ui.inlineLink} href={item.action.href}>
                {item.action.label}
              </Link>
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
