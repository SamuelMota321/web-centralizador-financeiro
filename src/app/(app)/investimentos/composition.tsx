import { shareWidth } from "@/lib/investments/allocation";
import type { Allocation, CurrencyAllocation } from "@/lib/investments/types";
import { Notice } from "@/components/ui";
import {
  assetClassColor,
  assetClassLabel,
  coverageText,
  exclusionLabel,
  formatAmount,
  groupMeta,
  institutionLabel,
  percentageText,
} from "./presentation";
import styles from "./investimentos.module.css";

interface Row {
  key: string;
  label: string;
  color: string;
  amount: string;
  percentage: string;
  members: { source: string; referenceDate: string | null }[];
}

function Table({
  caption,
  rows,
  currency,
}: {
  caption: string;
  rows: Row[];
  currency: CurrencyAllocation;
}) {
  return (
    <div className={`${styles.tableWrap} ${styles.compositionTable}`}>
      <table className={styles.table}>
        <caption className={styles.hidden}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{caption}</th>
            <th scope="col" className={styles.num}>
              Valor
            </th>
            <th scope="col" className={styles.num}>
              Parcela
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>
                <div className={styles.cellTitle}>
                  <span className={styles.swatch} style={{ background: row.color }} aria-hidden />
                  {row.label}
                </div>
                {/* Largura pelos valores exatos; o percentual escrito é o arredondado do backend. */}
                <div className={styles.barTrack} role="img" aria-label={`${row.label}: ${percentageText(row.percentage)} da base`}>
                  <span className={styles.barFill} style={{ width: shareWidth(row.amount, currency.denominatorAmount), background: row.color }} />
                </div>
                <div className={styles.cellMeta}>{groupMeta(row.members)}</div>
              </td>
              <td className={`${styles.num} tabular`}>{formatAmount(row.amount, currency.currencyCode)}</td>
              <td className={`${styles.num} tabular`}>{percentageText(row.percentage)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Composição por moeda: nunca soma moedas; cada uma tem a sua base e as suas tabelas. */
export function Composition({ allocation }: { allocation: Allocation }) {
  const excluded = Object.entries(allocation.excludedByReason).filter(([, count]) => count > 0) as [
    keyof Allocation["excludedByReason"],
    number,
  ][];

  return (
    <section className={styles.section} aria-labelledby="composition-title">
      <div>
        <h2 id="composition-title" className={styles.sectionTitle}>
          Composição da carteira
        </h2>
        <p className={styles.sectionNote}>
          Considera só posições ativas, com saldo positivo, moeda conhecida, coleta completa e referência atual. Os percentuais
          são arredondados para uma casa e podem não somar 100,0%.
        </p>
      </div>

      {allocation.availability !== "complete" ? (
        <Notice tone={allocation.availability === "unavailable" ? "info" : "warning"}>
          {allocation.availability === "unavailable"
            ? "Não há base para calcular a composição: nenhuma posição elegível com saldo positivo."
            : "A composição é parcial: não cobre toda a carteira."}{" "}
          {coverageText(allocation.includedPositionCount, allocation.knownPositionCount)}
          {excluded.length > 0 ? (
            <>
              {" "}
              Ficaram de fora: {excluded.map(([reason, count]) => `${count} por ${exclusionLabel(reason)}`).join("; ")}.
            </>
          ) : null}
        </Notice>
      ) : null}

      {allocation.currencies.map((currency) => (
        <div key={currency.currencyCode} className={styles.section}>
          <h3 className={styles.sectionTitle}>
            Em {currency.currencyCode} · base {formatAmount(currency.denominatorAmount, currency.currencyCode)}
          </h3>
          <div className={styles.composition}>
            <Table
              caption="Por classe"
              currency={currency}
              rows={currency.byClass.map((group) => ({
                key: group.assetClass,
                label: assetClassLabel(group.assetClass),
                color: assetClassColor(group.assetClass),
                amount: group.amount,
                percentage: group.percentage,
                members: group.positions,
              }))}
            />
            <Table
              caption="Por instituição"
              currency={currency}
              rows={currency.byInstitution.map((group, index) => ({
                key: `${group.institutionName ?? "none"}-${index}`,
                label: institutionLabel(group.institutionName),
                color: group.institutionName === null ? "var(--cat-other)" : `var(--cat-${(index % 6) + 1})`,
                amount: group.amount,
                percentage: group.percentage,
                members: group.positions,
              }))}
            />
          </div>
        </div>
      ))}
    </section>
  );
}
