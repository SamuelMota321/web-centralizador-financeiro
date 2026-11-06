import Link from "next/link";
import { notFound } from "next/navigation";
import { PairedBarsChart } from "@/components/charts/paired-bars";
import { RankedBars } from "@/components/charts/ranked-bars";
import { IconAccounts } from "@/components/icons";
import { EmptyState, Notice, PageHeader, ui } from "@/components/ui";
import { formatMoney } from "@/lib/money";
import { overviewPreviewEnabled } from "@/lib/overview/flag";
import { getBalances, getFlow, getSpending, listPeriods, parsePeriod } from "@/lib/overview/source";
import { BalancesTable, Block, BlockError, FigureStrip } from "./blocks";
import { PeriodSelector } from "./period-selector";
import { monthName, periodOption, periodTitle, toChartFlow, toRankedItems } from "./presentation";
import styles from "./visao-geral.module.css";

const SAMPLE_META = "Dados de exemplo";

export default async function VisaoGeralPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Prévia com dados de exemplo: sem a flag, a rota não existe.
  if (!overviewPreviewEnabled()) notFound();

  const { periodo } = await searchParams;
  const period = parsePeriod(periodo);
  const periods = listPeriods();
  const retryHref = `/visao-geral?periodo=${period}`;

  // Cada bloco depende de uma agregação; uma falha não esconde os outros (RNF-008).
  const [balancesResult, flowResult, spendingResult] = await Promise.allSettled([
    getBalances(period),
    getFlow(period),
    getSpending(period),
  ]);
  const balances = balancesResult.status === "fulfilled" ? balancesResult.value : null;
  const flow = flowResult.status === "fulfilled" ? flowResult.value : null;
  const spending = spendingResult.status === "fulfilled" ? spendingResult.value : null;
  const month = flow?.months.at(-1) ?? null;
  const current = periods[0];

  return (
    <div className={styles.page}>
      <PageHeader
        title="Visão geral"
        context={`${periodTitle(period)}${period === current ? " · parcial" : ""}`}
        actions={
          <PeriodSelector
            options={periods.map((value) => ({ value, label: periodOption(value, value === current) }))}
            value={period}
          />
        }
      />

      <Notice tone="info">
        Prévia com dados de exemplo: estes não são os seus números. A Visão geral passa a
        mostrar seus saldos quando o cálculo no servidor estiver pronto.
      </Notice>

      {balances !== null && balances.accounts.length === 0 ? (
        <EmptyState
          icon={<IconAccounts size={22} />}
          title="Crie sua primeira conta"
          action={
            <Link className={`${ui.button} ${ui.primary}`} href="/contas?nova=1">
              Criar conta
            </Link>
          }
        >
          A Visão geral soma os saldos das suas contas e mostra entradas, saídas e gastos por
          categoria em cada mês.
        </EmptyState>
      ) : (
        <>
          <FigureStrip balances={balances} month={month} />

          <Block
            id="saldos"
            title="Saldos por conta"
            meta={balances ? SAMPLE_META : undefined}
          >
            {balances ? (
              <BalancesTable accounts={balances.accounts} />
            ) : (
              <BlockError what="os saldos das contas" retryHref={retryHref} />
            )}
          </Block>

          <div className={styles.columns}>
            <Block
              id="fluxo"
              title="Entradas e saídas por mês"
              meta={flow ? `Últimos ${flow.months.length} meses · ${SAMPLE_META}` : undefined}
            >
              {flow ? (
                <PairedBarsChart
                  caption={`Entradas, saídas e resultado por mês, até ${monthName(period)}`}
                  data={toChartFlow(flow.months)}
                />
              ) : (
                <BlockError what="o fluxo por mês" retryHref={retryHref} />
              )}
            </Block>

            <Block
              id="gastos"
              title="Gastos por categoria"
              meta={spending ? `Total ${formatMoney(spending.total)} · ${SAMPLE_META}` : undefined}
            >
              {spending ? (
                spending.total === "0.00" ? (
                  <p className={styles.meta}>Nenhuma saída no período.</p>
                ) : (
                  <>
                    <RankedBars
                      caption={`Gastos de ${monthName(period)} por categoria, do maior para o menor`}
                      items={toRankedItems(spending)}
                      total={spending.total}
                    />
                    {spending.toReview.amount !== "0.00" ? (
                      <p className={styles.panelFoot}>
                        {spending.toReview.count}{" "}
                        {spending.toReview.count === 1 ? "saída ainda sem categoria segura" : "saídas ainda sem categoria segura"}.{" "}
                        <Link className={ui.inlineLink} href="/movimentacoes">
                          Revisar em Movimentações
                        </Link>
                      </p>
                    ) : null}
                  </>
                )
              ) : (
                <BlockError what="os gastos por categoria" retryHref={retryHref} />
              )}
            </Block>
          </div>
        </>
      )}
    </div>
  );
}
