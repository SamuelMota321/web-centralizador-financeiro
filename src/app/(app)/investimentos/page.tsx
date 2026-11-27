import Link from "next/link";
import { IconAccounts } from "@/components/icons";
import { EmptyState, Notice, PageHeader, Pagination, StatusChip, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listInvestments } from "@/lib/investments/api";
import { Composition } from "./composition";
import {
  availabilityLabel,
  availabilityTone,
  formatAmount,
  formatReference,
  freshnessLabel,
  freshnessTone,
  institutionLabel,
  metaLine,
  optionalAmount,
  PAGE_SIZE,
  parsePageParam,
  totalNote,
  totalPages,
} from "./presentation";
import styles from "./investimentos.module.css";

export default async function InvestimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { pagina } = await searchParams;
  const page = parsePageParam(pagina);

  const { token } = await auth0.getAccessToken();
  // Falha de API vai para error.tsx: sem a carteira não há o que mostrar parcialmente.
  const data = await listInvestments({ page, pageSize: PAGE_SIZE }, { accessToken: token });
  const { portfolio, positions } = data;
  const pages = totalPages(data.total, PAGE_SIZE);
  const note = totalNote(portfolio);
  const incomplete = portfolio.connections.filter((connection) => connection.availability !== "complete");

  if (data.total === 0 && portfolio.connections.length === 0) {
    return (
      <div className={styles.page}>
        <PageHeader title="Investimentos" context="Posições lidas das suas conexões autorizadas." />
        <EmptyState
          icon={<IconAccounts size={22} />}
          title="Nenhuma posição de investimento ainda"
          action={
            <Link className={`${ui.button} ${ui.primary}`} href="/contas/conectar">
              Conectar um banco
            </Link>
          }
        >
          Quando uma conexão autorizar a leitura de investimentos, as posições aparecem aqui, com a origem e a data de cada dado.
        </EmptyState>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Investimentos"
        context={`${data.total} ${data.total === 1 ? "posição" : "posições"}, lidas das suas conexões autorizadas`}
      />

      <section className={styles.summary} aria-label="Resumo da carteira">
        <div className={styles.figure}>
          <span className={styles.figureLabel}>Total da carteira</span>
          <span className={`${styles.figureValue} tabular`}>
            {portfolio.total ? formatAmount(portfolio.total.amount, portfolio.total.currencyCode) : "Sem total"}
          </span>
          <span className={styles.figureMeta}>{note ?? `Posições ativas, referência ${formatReference(portfolio.referenceDate)}`}</span>
        </div>
        {portfolio.totalsByCurrency.length > 1 ? (
          <div className={styles.figure}>
            <span className={styles.figureLabel}>Por moeda (sem conversão)</span>
            <ul className={styles.currencyList}>
              {portfolio.totalsByCurrency.map((money) => (
                <li key={money.currencyCode} className="tabular">
                  {formatAmount(money.amount, money.currencyCode)}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className={styles.figure}>
          <span className={styles.figureLabel}>Disponibilidade dos dados</span>
          <StatusChip tone={availabilityTone(portfolio.availability)}>{availabilityLabel(portfolio.availability)}</StatusChip>
          <span className={styles.figureMeta}>Referência mais recente: {formatReference(portfolio.referenceDate)}</span>
        </div>
      </section>

      {incomplete.length > 0 ? (
        <Notice tone="warning">
          {incomplete.length === 1 ? "Uma conexão não entregou todos os dados" : `${incomplete.length} conexões não entregaram todos os dados`}.
          Os valores abaixo cobrem só o que foi coletado.
        </Notice>
      ) : null}

      <Composition allocation={portfolio.allocation} />

      <section className={styles.section} aria-labelledby="positions-title">
        <h2 id="positions-title" className={styles.sectionTitle}>
          Posições
        </h2>
        {positions.length === 0 ? (
          <Notice tone="info">Nenhuma posição nesta página.</Notice>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Posição</th>
                  <th scope="col">Instituição</th>
                  <th scope="col" className={styles.num}>
                    Saldo
                  </th>
                  <th scope="col" className={styles.num}>
                    Resultado informado pela fonte
                  </th>
                  <th scope="col">Dados</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => (
                  <tr key={position.id}>
                    <td>
                      <div className={styles.cellTitle}>
                        <Link href={`/investimentos/${position.id}?pagina=${page}`}>{position.name}</Link>
                      </div>
                      <div className={styles.cellMeta}>{metaLine(position.source, position.referenceDate)}</div>
                    </td>
                    <td>{institutionLabel(position.institutionName)}</td>
                    <td className={`${styles.num} tabular`}>{formatAmount(position.balance, position.currencyCode)}</td>
                    <td className={`${styles.num} tabular`}>{optionalAmount(position.resultAmount, position.currencyCode)}</td>
                    <td>
                      <StatusChip tone={freshnessTone(position.dataQuality.freshness)}>
                        {freshnessLabel(position.dataQuality.freshness)}
                      </StatusChip>
                      {position.providerStatus && position.providerStatus !== "ACTIVE" ? (
                        <div className={styles.cellMeta}>Situação: {position.providerStatus}</div>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={pages} href={(target) => `/investimentos?pagina=${target}`} label="Páginas das posições" anchor="positions-title" />
      </section>
    </div>
  );
}
