import Link from "next/link";
import {
  IconAccounts,
  IconChevronLeft,
  IconChevronRight,
  IconMovements,
  IconPlus,
} from "@/components/icons";
import { EmptyState, Notice, PageHeader, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages } from "@/lib/api/pagination";
import { listCategories } from "@/lib/categories/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import { listTransactions } from "@/lib/transactions/api";
import { MovementRow } from "./movement-row";
import {
  type AccountOption,
  type CategoryOption,
  PAGE_SIZE,
  parsePageParam,
  totalPages,
} from "./presentation";
import { RegisterPanel } from "./register-panel";
import styles from "./movimentacoes.module.css";

export default async function MovimentacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { pagina, registrar } = await searchParams;
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
  const panelOpen = canRegister && (registrar === "1" || transactions.total === 0);
  const pageHref = (target: number) => `/movimentacoes?pagina=${target}`;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Movimentações"
        context={
          transactions.total === 0
            ? "Receitas, despesas e transferências entre suas contas."
            : `${transactions.total} ${transactions.total === 1 ? "lançamento" : "lançamentos"} · mais recentes primeiro`
        }
        actions={
          canRegister && !panelOpen ? (
            <Link
              className={`${ui.button} ${ui.primary}`}
              href={`/movimentacoes?pagina=${page}&registrar=1`}
              scroll={false}
            >
              <IconPlus size={18} />
              Registrar movimentação
            </Link>
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
          Não foi possível carregar suas categorias. Os nomes podem aparecer como indisponíveis e a
          categorização fica pausada até carregarem.
        </Notice>
      ) : null}

      {accountsTruncated ? (
        <Notice tone="info">
          Você tem muitas contas; apenas as primeiras aparecem na escolha de conta.
        </Notice>
      ) : null}

      {accounts !== null && accounts.length === 0 ? (
        <EmptyState
          icon={<IconAccounts size={22} />}
          title="Comece criando uma conta"
          action={
            <Link className={`${ui.button} ${ui.primary}`} href="/contas?nova=1">
              <IconPlus size={18} />
              Criar conta
            </Link>
          }
        >
          Toda movimentação pertence a uma conta: corrente, poupança, cartão ou dinheiro. Crie a
          primeira para registrar receitas e despesas.
        </EmptyState>
      ) : null}

      {panelOpen && accounts ? (
        <RegisterPanel
          accounts={accounts}
          movementKey={newIdempotencyKey()}
          transferKey={newIdempotencyKey()}
          closeHref={pageHref(page)}
        />
      ) : null}

      <section className={styles.history} aria-labelledby="historico-titulo">
        <h2 className="visually-hidden" id="historico-titulo">
          Histórico
        </h2>

        {transactions.total === 0 ? (
          canRegister ? (
            <EmptyState icon={<IconMovements size={22} />} title="Nenhuma movimentação registrada">
              Use o painel acima para registrar a primeira. O histórico mostra as mais recentes
              primeiro, com conta, categoria e valor.
            </EmptyState>
          ) : null
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
            <div className={styles.listHead} aria-hidden>
              <span>Movimentação</span>
              <span>Categoria</span>
              <span>Valor</span>
            </div>
            <ul className={ui.list}>
              {transactions.items.map((transaction) => (
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

            {pages > 1 ? (
              <nav className={ui.pagination} aria-label="Páginas do histórico">
                {page > 1 ? (
                  <Link className={ui.pageLink} href={pageHref(page - 1)}>
                    <IconChevronLeft size={16} />
                    Anterior
                  </Link>
                ) : (
                  <span />
                )}
                <span className="tabular">
                  Página {page} de {pages}
                </span>
                {page < pages ? (
                  <Link className={`${ui.pageLink} ${ui.pageLinkNext}`} href={pageHref(page + 1)}>
                    Próxima
                    <IconChevronRight size={16} />
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
