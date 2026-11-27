import { IconCalendar, IconCoins, IconTrendUp } from "@/components/icons";
import { StatusChip } from "@/components/ui";
import type { Portfolio } from "@/lib/investments/types";
import {
  availabilityLabel,
  availabilityShare,
  availabilityTone,
  formatAmount,
  referenceAge,
  referenceDay,
  totalNote,
} from "./presentation";
import styles from "./investimentos.module.css";

/**
 * Faixa de resumo: total da carteira (ou o motivo de não haver), totais por moeda sem conversão,
 * disponibilidade contada por conexão e a última atualização. Um painel com quatro células.
 */
export function Summary({ portfolio, now }: { portfolio: Portfolio; now: Date }) {
  const note = totalNote(portfolio);
  const share = availabilityShare(portfolio.connections);
  const age = referenceAge(portfolio.referenceDate, now);
  const segments = [
    { key: "complete", label: "Completas", count: share.complete, percent: share.percent.complete },
    { key: "partial", label: "Parciais", count: share.partial, percent: share.percent.partial },
    { key: "unavailable", label: "Indisponíveis", count: share.unavailable, percent: share.percent.unavailable },
  ] as const;

  return (
    <section className={styles.strip} aria-label="Resumo da carteira">
      <div className={styles.cell}>
        <span className={styles.cellLabel}>
          <IconTrendUp size={16} /> Total da carteira
        </span>
        <span className={`${styles.cellValue} tabular`}>
          {portfolio.total ? formatAmount(portfolio.total.amount, portfolio.total.currencyCode) : "Sem total"}
        </span>
        <span className={styles.cellMeta}>{note ?? `Posições ativas, referência ${referenceDay(portfolio.referenceDate)}`}</span>
      </div>

      <div className={styles.cell}>
        <span className={styles.cellLabel}>
          <IconCoins size={16} /> Por moeda
        </span>
        {portfolio.totalsByCurrency.length === 0 ? (
          <span className={styles.cellMeta}>Sem valores para mostrar.</span>
        ) : (
          <ul className={styles.currencyList}>
            {portfolio.totalsByCurrency.map((money) => (
              <li key={money.currencyCode} className="tabular">
                <span className={styles.currencyCode}>{money.currencyCode}</span>
                {formatAmount(money.amount, money.currencyCode)}
              </li>
            ))}
          </ul>
        )}
        <span className={styles.cellMeta}>Moedas diferentes não são somadas nem convertidas.</span>
      </div>

      <div className={styles.cell}>
        <span className={styles.cellLabel}>Disponibilidade dos dados</span>
        {share.total === 0 ? (
          <span className={styles.cellMeta}>Nenhuma conexão autorizada.</span>
        ) : (
          <>
            <span className={styles.cellHeadline}>
              {share.complete} de {share.total} {share.total === 1 ? "conexão completa" : "conexões completas"}
            </span>
            <div className={styles.availabilityBar} role="img" aria-label={segments.map((s) => `${s.label}: ${s.count}`).join(", ")}>
              {segments.map((segment) =>
                segment.count > 0 ? <span key={segment.key} data-kind={segment.key} style={{ flexGrow: segment.count }} /> : null,
              )}
            </div>
            <ul className={styles.availabilityLegend}>
              {segments.map((segment) => (
                <li key={segment.key} data-kind={segment.key}>
                  <i aria-hidden />
                  <span>{segment.label}</span>
                  <span className="tabular">
                    {segment.count} · {segment.percent}%
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        <StatusChip tone={availabilityTone(portfolio.availability)}>{availabilityLabel(portfolio.availability)}</StatusChip>
      </div>

      <div className={styles.cell}>
        <span className={styles.cellLabel}>
          <IconCalendar size={16} /> Última atualização
        </span>
        <span className={`${styles.cellValue} tabular`}>{referenceDay(portfolio.referenceDate)}</span>
        <span className={styles.cellMeta}>{age ?? "Sem referência de data"}</span>
      </div>
    </section>
  );
}
