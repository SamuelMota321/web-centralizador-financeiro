import Link from "next/link";
import { IconAccounts, IconInfo, IconTrendUp } from "@/components/icons";
import { SectionPanel } from "@/components/section-panel";
import { Disclosure, EmptyState, Notice, PageHeader, Pagination, StatusChip, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listInvestments } from "@/lib/investments/api";
import { investmentsPreviewEnabled, investmentsPreviewPage } from "@/lib/investments/preview";
import type { PositionPage } from "@/lib/investments/types";
import { Composition } from "./composition";
import {
  ABSENT,
  assetClassColor,
  assetClassLabel,
  classByPosition,
  formatAmount,
  institutionLabel,
  PAGE_SIZE,
  parsePageParam,
  positionDataText,
  rateCell,
  resultCell,
  selectedCurrency,
  totalPages,
} from "./presentation";
import { RefreshButton } from "./refresh-button";
import { Summary } from "./summary";
import styles from "./investimentos.module.css";

function firstParam(value: string | string[] | undefined): string | null {
  return (Array.isArray(value) ? value[0] : value) ?? null;
}

function Dash({ value }: { value: string }) {
  return value === "—" ? (
    <>
      <span aria-hidden>—</span>
      <span className="visually-hidden">{ABSENT}</span>
    </>
  ) : (
    <>{value}</>
  );
}

export default async function InvestimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const page = parsePageParam(query.pagina);
  const requestedCurrency = firstParam(query.moeda)?.toUpperCase().slice(0, 8) ?? null;
  const preview = investmentsPreviewEnabled();
  const now = new Date();

  let data: PositionPage;
  if (preview) {
    data = investmentsPreviewPage(now);
  } else {
    const { token } = await auth0.getAccessToken();
    // Falha de API vai para error.tsx: sem a carteira não há o que mostrar parcialmente.
    data = await listInvestments({ page, pageSize: PAGE_SIZE }, { accessToken: token });
  }
  const { portfolio, positions } = data;
  const pages = totalPages(data.total, PAGE_SIZE);
  const incomplete = portfolio.connections.filter((connection) => connection.availability !== "complete");
  const classes = classByPosition(portfolio.allocation);
  const selected = selectedCurrency(portfolio.allocation, requestedCurrency);

  // Pagina e moeda escolhida ficam na URL; trocar um preserva o outro.
  const href = (params: { pagina?: number; moeda?: string | null }) => {
    const search = new URLSearchParams();
    const targetPage = params.pagina ?? page;
    if (targetPage > 1) search.set("pagina", String(targetPage));
    const currency = params.moeda === undefined ? requestedCurrency : params.moeda;
    if (currency) search.set("moeda", currency);
    const text = search.toString();
    return text ? `/investimentos?${text}` : "/investimentos";
  };

  if (!preview && data.total === 0 && portfolio.connections.length === 0) {
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
        context="Posições lidas das suas conexões autorizadas."
        actions={preview ? null : <RefreshButton disabled={portfolio.connections.length === 0} />}
      />

      {preview ? (
        <Notice tone="info">Prévia com dados de exemplo (INVESTMENTS_PREVIEW). Nada aqui vem das suas conexões.</Notice>
      ) : null}

      <Summary portfolio={portfolio} now={now} />

      {incomplete.length > 0 ? (
        <Notice tone="warning">
          {incomplete.length === 1 ? "Uma conexão não entregou todos os dados" : `${incomplete.length} conexões não entregaram todos os dados`}.
          Os valores abaixo cobrem só o que foi coletado.
        </Notice>
      ) : null}

      <Composition allocation={portfolio.allocation} selected={selected} currencyHref={(code) => href({ moeda: code })} />

      <SectionPanel
        id="positions-title"
        icon={<IconTrendUp size={22} />}
        title="Posições"
        count={data.total}
        hint="Fonte: Pluggy. A bolinha mostra a classe, quando a posição entra na composição."
      >
        {positions.length === 0 ? (
          <div className={styles.panelPad}>
            <Notice tone="info">Nenhuma posição nesta página.</Notice>
          </div>
        ) : (
          <div className={`${styles.tableWrap} ${styles.tableFlat}`}>
            <table className={`${styles.table} ${styles.positions}`}>
              <thead>
                <tr>
                  <th scope="col">Posição</th>
                  <th scope="col">Instituição</th>
                  <th scope="col" className={styles.num}>
                    Saldo
                  </th>
                  <th scope="col">Taxa</th>
                  <th scope="col" className={styles.num}>
                    Resultado informado pela fonte
                  </th>
                  <th scope="col">Dados</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position) => {
                  const assetClass = classes.get(position.id);
                  const dataText = positionDataText(position, now);
                  return (
                    <tr key={position.id}>
                      <td>
                        <div className={styles.positionName}>
                          <span
                            className={styles.dot}
                            data-known={assetClass ? "" : undefined}
                            style={assetClass ? { background: assetClassColor(assetClass) } : undefined}
                            aria-hidden
                          />
                          <span className={styles.cellTitle}>
                            {preview ? position.name : <Link href={`/investimentos/${position.id}?pagina=${page}`}>{position.name}</Link>}
                          </span>
                          {assetClass ? <span className="visually-hidden"> ({assetClassLabel(assetClass)})</span> : null}
                        </div>
                      </td>
                      <td>{institutionLabel(position.institutionName)}</td>
                      <td className={`${styles.num} tabular`}>{formatAmount(position.balance, position.currencyCode)}</td>
                      <td className="tabular">
                        <Dash value={rateCell(position)} />
                      </td>
                      <td className={`${styles.num} tabular`}>
                        <Dash value={resultCell(position)} />
                      </td>
                      <td>
                        <StatusChip tone={dataText.tone}>{dataText.label}</StatusChip>
                        {dataText.detail ? <div className={styles.cellMeta}>{dataText.detail}</div> : null}
                        {position.providerStatus && position.providerStatus !== "ACTIVE" ? (
                          <div className={styles.cellMeta}>Situação: {position.providerStatus}</div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={page}
          pages={pages}
          href={(target) => href({ pagina: target })}
          label="Páginas das posições"
          anchor="positions-title"
        />
      </SectionPanel>

      <Disclosure icon={<IconInfo size={18} />} summary="Como lemos seus investimentos">
        <ul>
          <li>As posições vêm das suas conexões autorizadas. O Coinciente só lê: não compra, não vende e não recomenda.</li>
          <li>
            <strong>Disponibilidade</strong> diz se a coleta de cada conexão veio completa, parcial ou indisponível.{" "}
            <strong>Atualização</strong> diz se a referência do dado é recente. São duas coisas separadas.
          </li>
          <li>
            A composição só considera posições ativas, com saldo positivo, moeda conhecida, coleta completa e referência atual. O que
            fica de fora aparece escrito, com o motivo: coleta incompleta ou dados desatualizados, posição que não está ativa, saldo
            zerado ou negativo, moeda não informada.
          </li>
          <li>Moedas diferentes nunca são somadas nem convertidas: cada moeda tem o seu total e a sua composição.</li>
          <li>Nenhuma rentabilidade é calculada. Taxa e resultado aparecem como a fonte enviou.</li>
        </ul>
      </Disclosure>
    </div>
  );
}
