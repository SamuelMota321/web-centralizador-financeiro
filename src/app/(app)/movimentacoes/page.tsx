import Link from "next/link";
import { Sparkline } from "@/components/charts/sparkline";
import { IconInflow, IconMovements, IconOutflow, IconTransfer } from "@/components/icons";
import { ListToolbar, SegmentedLinks } from "@/components/list-toolbar";
import { PanelToggle } from "@/components/panel";
import { StatCard, StatGrid } from "@/components/stat-card";
import { EmptyState, Notice, PageHeader, Pagination, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages } from "@/lib/api/pagination";
import { categoryColors } from "@/components/charts/category-colors";
import { listCategories } from "@/lib/categories/api";
import { todayCivilDate } from "@/lib/civil-date";
import { newIdempotencyKey } from "@/lib/idempotency";
import { formatMoney } from "@/lib/money";
import { listTransactions, listTransactionsSince, PERIOD_SCAN_LIMIT } from "@/lib/transactions/api";
import { GettingStarted, isOnboardingComplete, type OnboardingState } from "./getting-started";
import { MovementRow } from "./movement-row";
import {
  type AccountOption,
  type CategoryOption,
  changeText,
  dailySeries,
  dateRange,
  filterMovements,
  hasContentFilters,
  hasMovementFilters,
  movementsHref,
  PAGE_SIZE,
  paginate,
  parseMovementFilters,
  parsePageParam,
  percentChange,
  PERIOD_PRESETS,
  periodTotals,
  previousRange,
  type PeriodPreset,
  SEARCH_WINDOW,
  showingText,
  SITUATION_FILTERS,
  totalPages,
  TYPE_FILTERS,
  withinRange,
} from "./presentation";
import { RecentMovementsProvider } from "./recent";
import { RegisterPanel } from "./register-panel";
import styles from "./movimentacoes.module.css";

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const page = parsePageParam(params.pagina);
  const filters = parseMovementFilters(params);
  const filtering = hasMovementFilters(filters);
  const contentFilters = hasContentFilters(filters);
  const today = todayCivilDate();
  // Com início definido, o período é lido inteiro (até o teto) e as somas são exatas.
  const range = dateRange(filters, today);
  const period = range.since ? { since: range.since, until: range.until ?? today } : null;
  const previous = period ? previousRange(period.since, period.until) : null;

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // Contas, categorias e movimentações são independentes: uma falha parcial não esconde a lista.
  // A API não filtra nem soma. Com período: lê do mais recente até o início do período
  // anterior. Sem período ("Tudo"): busca na janela dos mais recentes, ou paginação da API.
  const [scanResult, windowResult, pageResult, accountsResult, categoriesResult] = await Promise.allSettled([
    previous ? listTransactionsSince(previous.since, context) : Promise.resolve(null),
    !period && contentFilters ? listAllPages((query) => listTransactions(query, context), SEARCH_WINDOW) : Promise.resolve(null),
    !period && !contentFilters ? listTransactions({ page, pageSize: PAGE_SIZE }, context) : Promise.resolve(null),
    listAllPages((query) => listAccounts(query, context)),
    listAllPages((query) => listCategories(query, context)),
  ]);

  if (scanResult.status === "rejected") throw scanResult.reason;
  if (windowResult.status === "rejected") throw windowResult.reason;
  if (pageResult.status === "rejected") throw pageResult.reason;

  const recent = windowResult.status === "fulfilled" ? windowResult.value : null;
  const windowTruncated = recent?.truncated ?? false;
  const accounts: AccountOption[] | null =
    accountsResult.status === "fulfilled"
      ? accountsResult.value.items.map(({ id, name }) => ({ id, name }))
      : null;
  const accountsTruncated = accountsResult.status === "fulfilled" && accountsResult.value.truncated;
  // Ativas e arquivadas: arquivadas continuam legíveis no histórico.
  const categories: CategoryOption[] | null =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.items.map(({ id, name, status }) => ({ id, name, status }))
      : null;
  const categoriesTruncated =
    categoriesResult.status === "fulfilled" && categoriesResult.value.truncated;
  // Cor fixa por categoria (Style Guide 2.1): a ordem de criação, arquivadas incluídas,
  // escolhe o tom, a mesma regra da Visão geral. Sem a lista, os quadrados ficam neutros.
  const categoryColorById: Record<string, string> =
    categoriesResult.status === "fulfilled"
      ? Object.fromEntries(
          categoryColors(
            [...categoriesResult.value.items]
              .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
              .map((category) => category.id),
          ),
        )
      : {};

  const names = { accounts, categories };
  const scan = scanResult.value;
  // O período está inteiro quando a leitura terminou ou já passou do início dele.
  const periodCovered = Boolean(period && scan && (scan.complete || scan.items.some((item) => item.occurredOn < period.since)));
  const periodItems =
    period && scan ? filterMovements(withinRange(scan.items, period.since, period.until), filters, today, names) : null;
  const filtered = periodItems ?? (contentFilters && recent ? filterMovements(recent.items, filters, today, names) : null);
  const historyTotal = scan?.total ?? pageResult.value?.total ?? recent?.items.length ?? 0;
  const listItems = filtered ? paginate(filtered, page, PAGE_SIZE) : (pageResult.value?.items ?? []);
  const listTotal = filtered ? filtered.length : historyTotal;

  // Somas só com o período e o anterior inteiros: nunca um número parcial.
  const totals = period && periodItems && periodCovered ? periodTotals(periodItems) : null;
  const previousTotals =
    totals && previous && scan?.complete !== false
      ? periodTotals(
          filterMovements(
            withinRange(scan?.items ?? [], previous.since, previous.until),
            { ...filters, period: "personalizado", from: previous.since, to: previous.until },
            today,
            names,
          ),
        )
      : null;
  const series = totals && period && periodItems ? dailySeries(periodItems, period.since, period.until) : null;
  // Período sem lançamentos: os cards dizem isso em texto, sem variação nem linha reta.
  const periodEmpty = periodItems !== null && periodItems.length === 0;
  const allHistoryHref = movementsHref({ ...filters, period: null, from: null, to: null }, 1);
  const change = (current: string, before: string | undefined) =>
    periodEmpty
      ? "Nenhum lançamento neste período"
      : before === undefined
        ? "Período anterior grande demais para comparar"
        : changeText(percentChange(current, before));

  const pages = totalPages(listTotal, PAGE_SIZE);
  const canRegister = accounts !== null && accounts.length > 0;
  // Sem nenhum lançamento, o painel já começa aberto: é a próxima ação óbvia.
  const forceOpen = canRegister && historyTotal === 0;
  const pageHref = (target: number) => movementsHref(filters, target);

  const periodOptions = [
    ...(Object.entries(PERIOD_PRESETS) as [PeriodPreset, string][]).map(([value, label]) => ({
      href: movementsHref({ ...filters, period: value, from: null, to: null }, 1),
      label,
      current: filters.period === value,
    })),
    { href: movementsHref({ ...filters, period: null, from: null, to: null }, 1), label: "Tudo", current: filters.period === null },
    {
      href: movementsHref({ ...filters, period: "personalizado" }, 1),
      label: "Personalizado",
      current: filters.period === "personalizado",
    },
  ];
  const moreActive = [filters.situation, filters.period === "personalizado" ? "periodo" : null].filter(Boolean).length;

  // Primeiros passos só com o quadro completo; em falha parcial, os avisos abaixo explicam.
  const onboarding: OnboardingState | null =
    accounts !== null && categories !== null
      ? {
          hasAccount: accounts.length > 0,
          hasMovement: historyTotal > 0,
          hasCategory: categories.length > 0,
        }
      : null;
  const showOnboarding = onboarding !== null && !isOnboardingComplete(onboarding);

  return (
    <RecentMovementsProvider>
      <div className={styles.page}>
        <PageHeader
          title="Movimentações"
          context={
            historyTotal === 0
              ? "Receitas, despesas e transferências entre suas contas."
              : "Receitas, despesas e transferências, das mais recentes às mais antigas."
          }
          actions={
            <>
              {historyTotal > 0 ? <SegmentedLinks label="Período" options={periodOptions} /> : null}
              {canRegister ? (
                <PanelToggle flag="registrar" forceOpen={forceOpen}>
                  Registrar movimentação
                </PanelToggle>
              ) : null}
            </>
          }
        />

        {accounts === null ? (
          <Notice
            tone="error"
            actions={
              <Link className={ui.inlineLink} href={pageHref(page)}>
                Tentar de novo
              </Link>
            }
          >
            Não foi possível carregar suas contas. O histórico aparece abaixo, mas o registro fica
            indisponível até as contas carregarem.
          </Notice>
        ) : null}

        {categories === null ? (
          <Notice
            tone="warning"
            actions={
              <Link className={ui.inlineLink} href={pageHref(page)}>
                Tentar de novo
              </Link>
            }
          >
            Não foi possível carregar suas categorias. Os nomes podem aparecer como indisponíveis
            e a categorização fica pausada até carregarem.
          </Notice>
        ) : null}

        {accountsTruncated ? (
          <Notice tone="info">
            Você tem muitas contas; apenas as primeiras aparecem na escolha de conta.
          </Notice>
        ) : null}

        {showOnboarding && onboarding ? <GettingStarted state={onboarding} /> : null}

        {canRegister && accounts ? (
          <RegisterPanel
            accounts={accounts}
            movementKey={newIdempotencyKey()}
            transferKey={newIdempotencyKey()}
            forceOpen={forceOpen}
          />
        ) : null}

        {historyTotal > 0 && totals && series ? (
          <StatGrid label="Entradas, saídas e balanço do período">
            <StatCard
              icon={<IconInflow size={20} />}
              tone="positive"
              label="Entradas"
              value={formatMoney(totals.income)}
              meta={change(totals.income, previousTotals?.income)}
              trend={periodEmpty ? undefined : <Sparkline values={series.income} />}
            />
            <StatCard
              icon={<IconOutflow size={20} />}
              tone="negative"
              label="Saídas"
              value={formatMoney(totals.expense)}
              meta={change(totals.expense, previousTotals?.expense)}
              trend={periodEmpty ? undefined : <Sparkline values={series.expense} />}
            />
            <StatCard
              icon={<IconTransfer size={20} />}
              label="Balanço do período"
              value={formatMoney(totals.balance)}
              meta={periodEmpty ? "Nenhum lançamento neste período" : "Entradas menos saídas, sem transferências"}
              trend={periodEmpty ? undefined : <Sparkline values={series.balance} />}
            />
          </StatGrid>
        ) : historyTotal > 0 && period && !periodCovered ? (
          <Notice tone="info">
            Este período tem mais de {PERIOD_SCAN_LIMIT} lançamentos: escolha um período menor para ver entradas,
            saídas e balanço.
          </Notice>
        ) : historyTotal > 0 && !period ? (
          <Notice tone="info">Escolha um período para ver entradas, saídas e balanço.</Notice>
        ) : null}

        <section className={styles.history} aria-labelledby="historico-titulo">
          <div className={styles.historyTop}>
            <h2 className={styles.historyTitle} id="historico-titulo">
              Histórico
            </h2>
            {historyTotal > 0 ? (
              <ListToolbar
                action="/movimentacoes"
                label="Buscar movimentações"
                search={filters.search}
                placeholder="Buscar por descrição, categoria ou conta"
                active={filtering}
                hidden={filters.period === null ? { periodo: "tudo" } : filters.period !== "personalizado" ? { periodo: filters.period } : {}}
                filters={[
                  ...(accounts && accounts.length > 1
                    ? [
                        {
                          name: "conta",
                          label: "Conta",
                          value: filters.accountId ?? "",
                          options: [{ value: "", label: "Todas as contas" }, ...accounts.map(({ id, name }) => ({ value: id.toLowerCase(), label: name }))],
                        },
                      ]
                    : []),
                  ...(categories && categories.length > 0
                    ? [
                        {
                          name: "categoria",
                          label: "Categoria",
                          value: filters.categoryId ?? "",
                          options: [
                            { value: "", label: "Todas as categorias" },
                            ...categories.map(({ id, name, status }) => ({
                              value: id.toLowerCase(),
                              label: status === "archived" ? `${name} (arquivada)` : name,
                            })),
                          ],
                        },
                      ]
                    : []),
                  {
                    name: "tipo",
                    label: "Tipo",
                    value: filters.type ?? "",
                    options: [{ value: "", label: "Todos os tipos" }, ...Object.entries(TYPE_FILTERS).map(([value, label]) => ({ value, label }))],
                  },
                ]}
                more={{
                  open: filters.period === "personalizado" && !filters.from && !filters.to,
                  activeCount: moreActive,
                  children: (
                    <>
                      <div className={ui.field}>
                        <label className={ui.label} htmlFor="filtro-situacao">
                          Situação da categoria
                        </label>
                        <select id="filtro-situacao" className={ui.select} name="situacao" defaultValue={filters.situation ?? ""}>
                          <option value="">Todas as situações</option>
                          {Object.entries(SITUATION_FILTERS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <fieldset className={styles.dateRange}>
                        <legend className={ui.label}>Período personalizado</legend>
                        <div className={styles.dateRangeFields}>
                          <label className={styles.dateField}>
                            <span>De</span>
                            <input className={ui.input} type="date" name="de" defaultValue={filters.from ?? ""} />
                          </label>
                          <label className={styles.dateField}>
                            <span>Até</span>
                            <input className={ui.input} type="date" name="ate" defaultValue={filters.to ?? ""} />
                          </label>
                        </div>
                      </fieldset>
                    </>
                  ),
                }}
              />
            ) : null}
          </div>

          {!period && contentFilters && windowTruncated ? (
            <Notice tone="info" className={styles.windowNote}>
              A busca e os filtros cobrem os {SEARCH_WINDOW} lançamentos mais recentes. Para ver os mais antigos, limpe
              os filtros e use as páginas do histórico.
            </Notice>
          ) : null}

          {historyTotal === 0 ? (
            // Com os primeiros passos na tela, um segundo estado vazio só repetiria o convite.
            showOnboarding ? null : (
              <EmptyState icon={<IconMovements size={22} />} title="Nenhuma movimentação registrada">
                O histórico mostra as mais recentes primeiro, agrupadas por dia, com conta,
                categoria e valor.
              </EmptyState>
            )
          ) : contentFilters && listTotal === 0 ? (
            <EmptyState
              icon={<IconMovements size={22} />}
              title="Nenhuma movimentação encontrada"
              action={
                <Link className={`${ui.button} ${ui.secondary}`} href="/movimentacoes">
                  Limpar filtros
                </Link>
              }
            >
              Nenhum lançamento combina com a busca ou os filtros escolhidos.
            </EmptyState>
          ) : period && listTotal === 0 ? (
            <EmptyState
              icon={<IconMovements size={22} />}
              title="Nenhuma movimentação neste período"
              action={
                <Link className={`${ui.button} ${ui.secondary}`} href={allHistoryHref} scroll={false}>
                  Ver todo o histórico
                </Link>
              }
            >
              Escolha um período maior ou veja todo o histórico para encontrar lançamentos mais antigos.
            </EmptyState>
          ) : listItems.length === 0 ? (
            <EmptyState
              icon={<IconMovements size={22} />}
              title="Esta página não existe"
              action={
                <Link className={`${ui.button} ${ui.secondary}`} href={pageHref(1)} scroll={false}>
                  Voltar para a primeira página
                </Link>
              }
            >
              O histórico tem {pages} {pages === 1 ? "página" : "páginas"}.
            </EmptyState>
          ) : (
            <>
              <div className={styles.historyPanel}>
                <div className={styles.listHead} aria-hidden>
                  <span>Data</span>
                  <span>Movimentação</span>
                  <span>Conta</span>
                  <span>Categoria</span>
                  <span>Tipo</span>
                  <span>Valor</span>
                  <span>Status</span>
                  <span />
                </div>
                <ul className={styles.rows} aria-label="Lançamentos, dos mais recentes aos mais antigos">
                  {listItems.map((transaction) => (
                    // `updatedAt` na chave remonta a linha após categorizar, fechando o painel.
                    <MovementRow
                      key={`${transaction.id}:${transaction.updatedAt}`}
                      transaction={transaction}
                      accounts={accounts}
                      categories={categories}
                      categoriesTruncated={categoriesTruncated}
                      categoryColors={categoryColorById}
                    />
                  ))}
                </ul>
                <div className={styles.historyFooter}>
                  <p className="tabular">{showingText(page, PAGE_SIZE, listItems.length, listTotal)}</p>
                  <Pagination page={page} pages={pages} href={pageHref} label="Páginas do histórico" anchor="historico-titulo" />
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </RecentMovementsProvider>
  );
}
