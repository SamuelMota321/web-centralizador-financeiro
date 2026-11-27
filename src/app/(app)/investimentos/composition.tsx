import { IconCoins } from "@/components/icons";
import { SegmentedLinks } from "@/components/list-toolbar";
import { SectionPanel } from "@/components/section-panel";
import { Notice } from "@/components/ui";
import { shareWidth } from "@/lib/investments/allocation";
import type { Allocation, CurrencyAllocation } from "@/lib/investments/types";
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

/**
 * Composição de UMA moeda por vez: nunca soma moedas, e cada moeda tem a sua base. Barra 100%
 * empilhada por classe, com a legenda escrita ao lado (a cor sozinha não identifica), e a lista
 * por instituição. A largura vem dos valores exatos; o percentual escrito é o arredondado do backend.
 */
export function Composition({
  allocation,
  selected,
  currencyHref,
}: {
  allocation: Allocation;
  selected: CurrencyAllocation | null;
  currencyHref: (currencyCode: string) => string;
}) {
  const excluded = Object.entries(allocation.excludedByReason).filter(([, count]) => count > 0) as [keyof Allocation["excludedByReason"], number][];

  return (
    <SectionPanel
      id="composition-title"
      icon={<IconCoins size={22} />}
      title="Composição da carteira"
      hint="Considera só posições ativas, com saldo positivo, moeda conhecida, coleta completa e referência atual. Os percentuais são arredondados e podem não somar 100,0%."
      actions={
        allocation.currencies.length > 1 && selected ? (
          <SegmentedLinks
            label="Moeda"
            options={allocation.currencies.map((currency) => ({
              href: currencyHref(currency.currencyCode),
              label: currency.currencyCode,
              current: currency.currencyCode === selected.currencyCode,
            }))}
          />
        ) : undefined
      }
    >
      {allocation.availability !== "complete" ? (
        <div className={styles.panelPad}>
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
        </div>
      ) : null}

      {selected ? (
        <div className={styles.composition}>
          <div className={styles.compositionBlock}>
            <h3 className={styles.blockTitle}>
              Por classe de ativo <span className={styles.blockBase}>· base {formatAmount(selected.denominatorAmount, selected.currencyCode)}</span>
            </h3>
            <div
              className={styles.classBar}
              role="img"
              aria-label={selected.byClass.map((group) => `${assetClassLabel(group.assetClass)} ${percentageText(group.percentage)}`).join(", ")}
            >
              {selected.byClass.map((group) => (
                <span
                  key={group.assetClass}
                  style={{ flexBasis: shareWidth(group.amount, selected.denominatorAmount), background: assetClassColor(group.assetClass) }}
                />
              ))}
            </div>
            <ul className={styles.legend}>
              {selected.byClass.map((group) => (
                <li key={group.assetClass}>
                  <i style={{ background: assetClassColor(group.assetClass) }} aria-hidden />
                  <span className={styles.legendName}>
                    {assetClassLabel(group.assetClass)}
                    <small>{groupMeta(group.positions)}</small>
                  </span>
                  <span className="tabular">{percentageText(group.percentage)}</span>
                  <span className={`${styles.legendAmount} tabular`}>{formatAmount(group.amount, selected.currencyCode)}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.compositionBlock}>
            <h3 className={styles.blockTitle}>Por instituição</h3>
            <table className={styles.institutions}>
              <thead>
                <tr>
                  <th scope="col">Instituição</th>
                  <th scope="col" className={styles.num}>
                    Valor
                  </th>
                  <th scope="col" className={styles.num}>
                    Parcela
                  </th>
                </tr>
              </thead>
              <tbody>
                {selected.byInstitution.map((group, index) => (
                  <tr key={`${group.institutionName ?? "none"}-${index}`}>
                    <td>
                      <div className={styles.cellTitle}>{institutionLabel(group.institutionName)}</div>
                      <div className={styles.cellMeta}>{groupMeta(group.positions)}</div>
                    </td>
                    <td className={`${styles.num} tabular`}>{formatAmount(group.amount, selected.currencyCode)}</td>
                    <td className={`${styles.num} tabular`}>{percentageText(group.percentage)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </SectionPanel>
  );
}
