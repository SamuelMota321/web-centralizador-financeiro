import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { Notice, PageHeader, Pagination, StatusChip, ui } from "@/components/ui";
import { ProblemDetailsError } from "@/lib/api/errors";
import { listAllPages } from "@/lib/api/pagination";
import { auth0 } from "@/lib/auth0";
import { listInvestmentMovements, listInvestments } from "@/lib/investments/api";
import {
  ABSENT,
  CURRENCY_ABSENT,
  availabilityLabel,
  availabilityTone,
  formatAmount,
  formatMaturity,
  formatReference,
  freshnessLabel,
  freshnessTone,
  institutionLabel,
  metaLine,
  optionalAmount,
  optionalText,
  PAGE_SIZE,
  parsePageParam,
  rateText,
  totalPages,
} from "../presentation";
import styles from "../investimentos.module.css";

export default async function PosicaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { pagina, origem } = await searchParams;
  const page = parsePageParam(pagina);
  const backHref = `/investimentos?pagina=${parsePageParam(origem)}`;

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // A API não tem leitura de uma posição isolada: ela é localizada na carteira do usuário.
  // Posição inexistente ou de outro usuário fica fora da lista e responde 404 nos movimentos.
  const [portfolio, movements] = await Promise.all([
    listAllPages((query) =>
      listInvestments(query, context).then((result) => ({
        items: result.positions,
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
      })),
    ),
    listInvestmentMovements(id, { page, pageSize: PAGE_SIZE }, context).catch((error: unknown) => {
      if (error instanceof ProblemDetailsError && error.status === 404) notFound();
      throw error;
    }),
  ]);

  const position = portfolio.items.find((item) => item.id === id.toLowerCase() || item.id === id);
  if (!position) notFound();

  const pages = totalPages(movements.total, PAGE_SIZE);
  const facts: [string, string][] = [
    ["Saldo líquido atual", formatAmount(position.balance, position.currencyCode)],
    ["Valor investido", optionalAmount(position.investedAmount, position.currencyCode)],
    ["Resultado informado pela fonte", optionalAmount(position.resultAmount, position.currencyCode)],
    ["Quantidade", optionalText(position.quantity)],
    ["Instituição", institutionLabel(position.institutionName)],
    ["Tipo do provedor", `${position.assetType}${position.subtype ? ` · ${position.subtype}` : ""}`],
    ["Situação", optionalText(position.providerStatus)],
    ["Taxa", rateText(position)],
    ["Vencimento", formatMaturity(position.maturityDate)],
    ["Moeda", position.currencyCode ?? CURRENCY_ABSENT],
    ["Identificador na fonte", position.externalId],
  ];

  return (
    <div className={styles.page}>
      <Link className={`${ui.button} ${ui.secondary} ${styles.back}`} href={backHref}>
        Voltar para Investimentos
      </Link>
      <PageHeader title={position.name} context={metaLine(position.source, position.referenceDate)} />

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <StatusChip tone={availabilityTone(position.dataQuality.availability)}>
          {availabilityLabel(position.dataQuality.availability)}
        </StatusChip>
        <StatusChip tone={freshnessTone(position.dataQuality.freshness)}>{freshnessLabel(position.dataQuality.freshness)}</StatusChip>
      </div>

      <dl className={styles.facts}>
        {facts.map(([label, value]) => (
          <div key={label} className={styles.fact}>
            <dt>{label}</dt>
            <dd className="tabular">{value}</dd>
          </div>
        ))}
      </dl>
      {position.missingFields.length > 0 ? (
        <p className={styles.sectionNote}>Campos que a fonte não enviou: {position.missingFields.join(", ")}.</p>
      ) : null}

      <section className={styles.section} aria-labelledby="movements-title">
        <h2 id="movements-title" className={styles.sectionTitle}>
          Movimentações da posição
        </h2>
        {movements.availability === "unavailable" ? (
          <Notice tone="warning">A coleta não comprovou a lista de movimentações desta posição. Isso não significa que não houve movimentações.</Notice>
        ) : movements.total === 0 ? (
          <Notice tone="info">A coleta completa não trouxe movimentações para esta posição.</Notice>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Tipo</th>
                  <th scope="col" className={styles.num}>
                    Valor
                  </th>
                </tr>
              </thead>
              <tbody>
                {movements.movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      <div className={styles.cellTitle}>{formatReference(movement.occurredAt)}</div>
                      <div className={styles.cellMeta}>Pluggy · {movement.externalId}</div>
                    </td>
                    <td>{movement.type}</td>
                    <td className={`${styles.num} tabular`}>
                      {movement.amount === null ? ABSENT : formatAmount(movement.amount, movement.currencyCode)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pages={pages}
          href={(target) => `/investimentos/${id}?pagina=${target}&origem=${parsePageParam(origem)}`}
          label="Páginas das movimentações"
        />
      </section>
    </div>
  );
}
