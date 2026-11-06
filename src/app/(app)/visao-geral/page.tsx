import Link from "next/link";
import { notFound } from "next/navigation";
import { categoryColors } from "@/components/charts/category-colors";
import { DonutChart } from "@/components/charts/donut-chart";
import { LineChart } from "@/components/charts/line-chart";
import { DONUT_OTHER_ID } from "@/components/charts/model";
import { PairedBarsChart } from "@/components/charts/paired-bars";
import { IconAccounts, IconChevronDown } from "@/components/icons";
import { SyncedDetails, SyncedDetailsGroup } from "@/components/synced-details";
import { EmptyState, Notice, PageHeader, Pagination, ui } from "@/components/ui";
import { overviewPreviewEnabled } from "@/lib/overview/flag";
import {
  getAvailableDaily,
  getBalances,
  getCategoryOrder,
  getFlow,
  getRecentMovements,
  getSpending,
  getSpendingMovements,
  listPeriods,
  MOVEMENTS_PAGE_SIZE,
  parseCategory,
  parsePage,
  parsePeriod,
  REVIEW_FILTER,
} from "@/lib/overview/source";
import { AttentionList, BalancesTable, Block, BlockError, FigureStrip, RecentList } from "./blocks";
import { PeriodSelector } from "./period-selector";
import {
  attentionItems,
  monthName,
  formatDay,
  monthRange,
  movementsTitle,
  overviewHref,
  type OverviewQuery,
  pageRange,
  periodOption,
  periodTitle,
  toChartFlow,
  toDailyPoints,
  toDonutItems,
  toRecentLines,
  toSpendingLines,
} from "./presentation";
import chartStyles from "@/components/charts/charts.module.css";
import styles from "./visao-geral.module.css";

const SAMPLE_META = "Dados de exemplo";
const AVAILABLE_PANEL = "disponivel-30-dias";

export default async function VisaoGeralPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Prévia com dados de exemplo: sem a flag, a rota não existe.
  if (!overviewPreviewEnabled()) notFound();

  const params = await searchParams;
  const period = parsePeriod(params.periodo);
  const monthsPage = parsePage(params.meses);
  const availableOpen = params.disponivel === "1";
  const periods = listPeriods();
  const retryHref = overviewHref({ periodo: period });

  // Cada bloco depende de uma agregação; uma falha não esconde os outros (RNF-008).
  // A faixa de números usa sempre os meses mais recentes, mesmo com o fluxo paginado.
  const [balancesResult, latestFlowResult, flowResult, spendingResult, recentResult, orderResult] =
    await Promise.allSettled([
      getBalances(period),
      getFlow(period),
      monthsPage > 1 ? getFlow(period, monthsPage) : Promise.resolve(null),
      getSpending(period),
      getRecentMovements(),
      getCategoryOrder(),
    ]);
  const balances = balancesResult.status === "fulfilled" ? balancesResult.value : null;
  const latestFlow = latestFlowResult.status === "fulfilled" ? latestFlowResult.value : null;
  const flow = monthsPage > 1 ? (flowResult.status === "fulfilled" ? flowResult.value : null) : latestFlow;
  const spending = spendingResult.status === "fulfilled" ? spendingResult.value : null;
  const recent = recentResult.status === "fulfilled" ? recentResult.value : null;
  // Sem a ordem das categorias, as cores ficam neutras; nomes e valores continuam.
  const colors = categoryColors(orderResult.status === "fulfilled" ? orderResult.value : []);
  const current = periods[0];

  // O filtro só vale para uma categoria com gasto no período; o resto mostra todas.
  const category = parseCategory(params.categoria, spending);
  const daily = availableOpen ? await getAvailableDaily(period).catch(() => null) : null;
  // Links que mudam uma parte da URL mantêm o resto (filtro, páginas, painel aberto).
  const hrefWith = (change: Partial<OverviewQuery>) =>
    overviewHref({
      periodo: period,
      categoria: category,
      pagina: movements?.page,
      meses: monthsPage,
      disponivel: availableOpen,
      ...change,
    });
  const movements = spending
    ? await getSpendingMovements(period, { category, page: parsePage(params.pagina) }).catch(() => null)
    : null;
  // Com filtro ou página na URL, a pessoa veio ver a lista: o grupo já começa aberto.
  const detailsOpen = category !== null || parsePage(params.pagina) > 1 || monthsPage > 1;
  const categoryLabel =
    category === REVIEW_FILTER
      ? "A revisar"
      : (spending?.categories.find((item) => item.categoryId === category)?.name ?? null);

  const donutItems = spending ? toDonutItems(spending, colors) : [];
  // Clicar na categoria filtra; clicar de novo na mesma tira o filtro. Página volta à 1.
  const donutLinks = Object.fromEntries(
    donutItems
      .filter((item) => item.id !== DONUT_OTHER_ID)
      .map((item) => [
        item.id,
        hrefWith({ categoria: item.id === category ? null : item.id, pagina: 1 }),
      ]),
  );

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
          <FigureStrip
            balances={balances}
            months={latestFlow?.months ?? null}
            availableToggle={{
              href: hrefWith({ disponivel: !availableOpen }),
              open: availableOpen,
              controls: AVAILABLE_PANEL,
            }}
          />

          {/* Painel dos últimos 30 dias: abre ao clicar no Disponível e entra com animação. */}
          {availableOpen ? (
            <div className={styles.reveal} id={AVAILABLE_PANEL}>
              <Block
                id="disponivel-dias"
                title="Disponível nos últimos 30 dias"
                meta={
                  <>
                    {daily && daily.points.length > 0
                      ? `${formatDay(daily.points[0].date)} a ${formatDay(daily.points[daily.points.length - 1].date)} · ${SAMPLE_META} · `
                      : null}
                    <Link className={ui.inlineLink} href={hrefWith({ disponivel: false })} scroll={false}>
                      Fechar
                    </Link>
                  </>
                }
              >
                {daily ? (
                  <LineChart
                    caption="Disponível no fim de cada um dos últimos 30 dias"
                    points={toDailyPoints(daily.points)}
                    valueLabel="Disponível"
                    tableCollapsed
                    drawIn
                    quietPoints
                  />
                ) : (
                  <BlockError what="o Disponível dos últimos 30 dias" retryHref={hrefWith({ disponivel: true })} />
                )}
              </Block>
            </div>
          ) : null}

          {/* Saídas e valores por mês abrem e fecham juntos: os dois blocos ficam alinhados. */}
          <SyncedDetailsGroup defaultOpen={detailsOpen} openKey={category}>
            <div className={styles.columns}>
              <Block
                id="gastos"
                title="Gastos por categoria"
                meta={spending ? `${monthName(period)} · ${SAMPLE_META}` : undefined}
              >
                {spending ? (
                  spending.total === "0.00" ? (
                    <p className={styles.meta}>Nenhuma saída no período.</p>
                  ) : (
                    <>
                      <DonutChart
                        caption={`Gastos de ${monthName(period)} por categoria, do maior para o menor. Escolha uma categoria para ver as saídas dela.`}
                        items={donutItems}
                        total={spending.total}
                        links={donutLinks}
                        selectedId={category}
                      />

                      <section className={styles.subsection} aria-labelledby="saidas">
                        <header className={styles.panelHead}>
                          <h3 className={styles.subsectionTitle} id="saidas">
                            {movementsTitle(period, categoryLabel)}
                          </h3>
                          {movements ? (
                            <p className={styles.meta}>
                              {pageRange(movements.page, MOVEMENTS_PAGE_SIZE, movements.total)}
                              {category ? (
                                <>
                                  {" · "}
                                  <Link
                                    className={ui.inlineLink}
                                    href={hrefWith({ categoria: null, pagina: 1 })}
                                    scroll={false}
                                  >
                                    Mostrar todas
                                  </Link>
                                </>
                              ) : null}
                            </p>
                          ) : null}
                        </header>
                        {movements ? (
                          <SyncedDetails
                            className={chartStyles.values}
                            summaryClassName={chartStyles.valuesSummary}
                            summary={
                              <>
                                Ver saídas
                                <IconChevronDown className={chartStyles.valuesChevron} size={16} />
                              </>
                            }
                          >
                            <RecentList lines={toSpendingLines(movements.items, colors)} compact />
                          </SyncedDetails>
                        ) : (
                          <BlockError what="as saídas do período" retryHref={retryHref} />
                        )}
                        {/* Fora do "Ver saídas", como a do fluxo: fica visível com a lista recolhida. */}
                        <div className={styles.paginationSlot}>
                          {movements ? (
                            <Pagination
                              page={movements.page}
                              pages={movements.pages}
                              href={(target) =>
                                hrefWith({ pagina: target })
                              }
                              label="Páginas das saídas"
                            />
                          ) : null}
                        </div>
                      </section>
                    </>
                  )
                ) : (
                  <BlockError what="os gastos por categoria" retryHref={retryHref} />
                )}
              </Block>

              <Block
                id="fluxo"
                title="Entradas e saídas por mês"
                meta={
                  flow
                    ? `${monthRange(flow.months[0].month, flow.months[flow.months.length - 1].month)} · ${SAMPLE_META}`
                    : undefined
                }
              >
                {flow ? (
                  <div className={styles.flowBody}>
                    <PairedBarsChart
                      caption={`Entradas, saídas e resultado por mês, de ${monthName(flow.months[0].month)} a ${monthName(flow.months[flow.months.length - 1].month)}`}
                      data={toChartFlow(flow.months)}
                      height={240}
                      tableCollapsed
                      tableOrder="newest-first"
                      tableHeader={
                        <header className={`${styles.panelHead} ${styles.subsectionHead}`}>
                          <h3 className={styles.subsectionTitle}>
                            Valores de {monthRange(flow.months[0].month, flow.months[flow.months.length - 1].month)}
                          </h3>
                          <p className={styles.meta}>
                            {flow.months.length} {flow.months.length === 1 ? "mês" : "meses"}
                          </p>
                        </header>
                      }
                    />
                    {/* Página 1 = meses mais recentes; "Próxima" anda para trás no tempo. No rodapé
                        do bloco, na mesma linha da paginação das saídas ao lado. */}
                    <div className={`${styles.flowPagination} ${styles.paginationSlot}`}>
                      <Pagination
                        page={flow.page}
                        pages={flow.pages}
                        href={(target) =>
                          hrefWith({ meses: target })
                        }
                        label="Páginas dos meses, dos mais recentes aos mais antigos"
                      />
                    </div>
                  </div>
                ) : (
                  <BlockError what="o fluxo por mês" retryHref={retryHref} />
                )}
              </Block>
            </div>
          </SyncedDetailsGroup>

          <div className={styles.columns}>
            <Block
              id="ultimas"
              title="Últimas movimentações"
              meta={
                <Link className={ui.inlineLink} href="/movimentacoes">
                  Ver todas
                </Link>
              }
            >
              {recent ? (
                <RecentList lines={toRecentLines(recent, colors)} />
              ) : (
                <BlockError what="as últimas movimentações" retryHref={retryHref} />
              )}
            </Block>

            <Block id="atencao" title="Pede sua atenção" meta="Fatos dos seus registros">
              <AttentionList items={attentionItems(balances, spending)} />
            </Block>
          </div>

          <Block id="saldos" title="Saldos por conta" meta={balances ? SAMPLE_META : undefined}>
            {balances ? (
              <BalancesTable accounts={balances.accounts} />
            ) : (
              <BlockError what="os saldos das contas" retryHref={retryHref} />
            )}
          </Block>
        </>
      )}
    </div>
  );
}
