import Link from "next/link";
import {
  IconMovements,
} from "@/components/icons";
import { PanelToggle } from "@/components/panel";
import { EmptyState, Notice, PageHeader, Pagination, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages } from "@/lib/api/pagination";
import { listCategories } from "@/lib/categories/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import { listTransactions } from "@/lib/transactions/api";
import { DayLabel } from "./day-label";
import { GettingStarted, isOnboardingComplete, type OnboardingState } from "./getting-started";
import { MovementRow } from "./movement-row";
import {
  type AccountOption,
  type CategoryOption,
  groupByDay,
  PAGE_SIZE,
  parsePageParam,
  totalPages,
} from "./presentation";
import { RecentMovementsProvider } from "./recent";
import { RegisterPanel } from "./register-panel";
import styles from "./movimentacoes.module.css";

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { pagina } = await searchParams;
  const page = parsePageParam(pagina);

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // Contas, categorias e movimentações são independentes: uma falha parcial não esconde a lista.
  const [transactionsResult, accountsResult, categoriesResult] = await Promise.allSettled([
    listTransactions({ page, pageSize: PAGE_SIZE }, context),
    listAllPages((query) => listAccounts(query, context)),
    listAllPages((query) => listCategories(query, context)),
  ]);

  if (transactionsResult.status === "rejected") {
    throw transactionsResult.reason;
  }

  const transactions = transactionsResult.value;
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

  const pages = totalPages(transactions.total, PAGE_SIZE);
  const canRegister = accounts !== null && accounts.length > 0;
  // Sem nenhum lançamento, o painel já começa aberto: é a próxima ação óbvia.
  const forceOpen = canRegister && transactions.total === 0;
  const pageHref = (target: number) => `/movimentacoes?pagina=${target}`;

  // Primeiros passos só com o quadro completo; em falha parcial, os avisos abaixo explicam.
  const onboarding: OnboardingState | null =
    accounts !== null && categories !== null
      ? {
          hasAccount: accounts.length > 0,
          hasMovement: transactions.total > 0,
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
            transactions.total === 0
              ? "Receitas, despesas e transferências entre suas contas."
              : `${transactions.total} ${transactions.total === 1 ? "lançamento" : "lançamentos"}, dos mais recentes aos mais antigos`
          }
          actions={
            canRegister ? (
              <PanelToggle flag="registrar" forceOpen={forceOpen}>
                Registrar movimentação
              </PanelToggle>
            ) : null
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

        <section className={styles.history} aria-labelledby="historico-titulo">
          <h2 className="visually-hidden" id="historico-titulo">
            Histórico
          </h2>

          {transactions.total === 0 ? (
            // Com os primeiros passos na tela, um segundo estado vazio só repetiria o convite.
            showOnboarding ? null : (
              <EmptyState icon={<IconMovements size={22} />} title="Nenhuma movimentação registrada">
                O histórico mostra as mais recentes primeiro, agrupadas por dia, com conta,
                categoria e valor.
              </EmptyState>
            )
          ) : transactions.items.length === 0 ? (
            <EmptyState
              icon={<IconMovements size={22} />}
              title="Esta página não existe"
              action={
                <Link className={`${ui.button} ${ui.secondary}`} href="/movimentacoes">
                  Voltar para a primeira página
                </Link>
              }
            >
              O histórico tem {pages} {pages === 1 ? "página" : "páginas"}.
            </EmptyState>
          ) : (
            <>
              <div className={styles.historyPanel}>
                {groupByDay(transactions.items).map((group) => (
                  <section key={group.date} aria-labelledby={`dia-${group.date}`}>
                    <h3 className={styles.dayHeader} id={`dia-${group.date}`}>
                      <DayLabel date={group.date} />
                    </h3>
                    <ul className={styles.dayList}>
                      {group.items.map((transaction) => (
                        // `updatedAt` na chave remonta a linha após categorizar, fechando o painel.
                        <MovementRow
                          key={`${transaction.id}:${transaction.updatedAt}`}
                          transaction={transaction}
                          accounts={accounts}
                          categories={categories}
                          categoriesTruncated={categoriesTruncated}
                        />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>

              <Pagination page={page} pages={pages} href={pageHref} label="Páginas do histórico" />
            </>
          )}
        </section>
      </div>
    </RecentMovementsProvider>
  );
}
