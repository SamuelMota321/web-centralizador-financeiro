import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages } from "@/lib/api/pagination";
import { listCategories } from "@/lib/categories/api";
import { newIdempotencyKey } from "@/lib/idempotency";
import { listTransactions } from "@/lib/transactions/api";
import { AppNav } from "../app-nav";
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
  const { pagina } = await searchParams;
  const page = parsePageParam(pagina);

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // Contas, categorias e movimentacoes sao independentes: uma falha parcial nao esconde a lista.
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
  // Ativas e arquivadas: arquivadas continuam legiveis no historico.
  const categories: CategoryOption[] | null =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.items.map(({ id, name, status }) => ({ id, name, status }))
      : null;
  const categoriesTruncated =
    categoriesResult.status === "fulfilled" && categoriesResult.value.truncated;
  const pages = totalPages(transactions.total, PAGE_SIZE);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Movimentacoes</h1>
        <AppNav current="movimentacoes" />
      </header>

      {accounts === null ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <p>
            Nao foi possivel carregar suas contas. As movimentacoes aparecem abaixo, mas o
            registro fica indisponivel ate as contas carregarem.
          </p>
          <Link className={styles.inlineLink} href={`/movimentacoes?pagina=${page}`}>
            Tentar de novo
          </Link>
        </div>
      ) : accounts.length === 0 ? (
        <section className={styles.state}>
          <p>Para registrar movimentacoes, crie primeiro uma conta.</p>
          <Link className={styles.inlineLink} href="/contas">
            Ir para contas
          </Link>
        </section>
      ) : (
        <>
          {accountsTruncated ? (
            <p className={styles.notice} role="status">
              Voce tem muitas contas; apenas as primeiras aparecem na escolha de conta.
            </p>
          ) : null}
          <RegisterPanel
            accounts={accounts}
            movementKey={newIdempotencyKey()}
            transferKey={newIdempotencyKey()}
          />
        </>
      )}

      {categories === null ? (
        <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
          <p>
            Nao foi possivel carregar suas categorias. Os nomes podem aparecer como
            indisponiveis e a categorizacao fica pausada ate carregarem.
          </p>
          <Link className={styles.inlineLink} href={`/movimentacoes?pagina=${page}`}>
            Tentar de novo
          </Link>
        </div>
      ) : null}

      <section className={styles.listSection} aria-labelledby="lista-titulo">
        <h2 className={styles.panelTitle} id="lista-titulo">
          Historico
        </h2>

        {transactions.total === 0 ? (
          <p className={styles.state}>
            Nenhuma movimentacao registrada.
            {accounts && accounts.length > 0 ? " Use o formulario acima para registrar a primeira." : ""}
          </p>
        ) : transactions.items.length === 0 ? (
          <div className={styles.state}>
            <p>Esta pagina nao existe.</p>
            <Link className={styles.inlineLink} href="/movimentacoes">
              Voltar para a primeira pagina
            </Link>
          </div>
        ) : (
          <>
            <ul className={styles.list}>
              {transactions.items.map((transaction) => (
                // `updatedAt` na chave remonta a linha apos categorizar, fechando o painel.
                <MovementRow
                  key={`${transaction.id}:${transaction.updatedAt}`}
                  transaction={transaction}
                  accounts={accounts}
                  categories={categories}
                  categoriesTruncated={categoriesTruncated}
                />
              ))}
            </ul>

            <nav className={styles.pagination} aria-label="Paginas do historico">
              {page > 1 ? (
                <Link className={styles.inlineLink} href={`/movimentacoes?pagina=${page - 1}`}>
                  Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className={styles.itemMeta}>
                Pagina {page} de {pages} · {transactions.total}{" "}
                {transactions.total === 1 ? "lancamento" : "lancamentos"}
              </span>
              {page < pages ? (
                <Link className={styles.inlineLink} href={`/movimentacoes?pagina=${page + 1}`}>
                  Proxima
                </Link>
              ) : (
                <span />
              )}
            </nav>
          </>
        )}
      </section>
    </div>
  );
}
