import Link from "next/link";
import { PanelSection, PanelToggle } from "@/components/panel";
import { Notice, PageHeader, Pagination, ui } from "@/components/ui";
import { listAllPages } from "@/lib/api/pagination";
import { auth0 } from "@/lib/auth0";
import { listPatrimony } from "@/lib/patrimony/api";
import { PATRIMONY_COLLECTIONS, type PatrimonyCollection, type PatrimonyItem } from "@/lib/patrimony/types";
import { ItemRow } from "./item-rows";
import { PatrimonyForm } from "./patrimony-form";
import { PAGE_PARAMS, PAGE_SIZE, parsePageParam, SECTIONS, sectionHref, totalPages } from "./presentation";
import styles from "./patrimonio.module.css";

const HEADERS: Record<PatrimonyCollection, string[]> = {
  assets: ["Bem", "Valor estimado", ""],
  financings: ["Financiamento", "Bem associado", "Saldo devedor", ""],
  liabilities: ["Dívida", "Saldo devedor", ""],
};

export default async function PatrimonioPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const query = await searchParams;
  const pages = Object.fromEntries(
    PATRIMONY_COLLECTIONS.map((collection) => [collection, parsePageParam(query[PAGE_PARAMS[collection]])]),
  ) as Record<PatrimonyCollection, number>;

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // Cada seção é independente: a falha de uma não esconde as outras.
  const [assets, financings, liabilities, allAssets] = await Promise.allSettled([
    listPatrimony("assets", { page: pages.assets, pageSize: PAGE_SIZE }, context),
    listPatrimony("financings", { page: pages.financings, pageSize: PAGE_SIZE }, context),
    listPatrimony("liabilities", { page: pages.liabilities, pageSize: PAGE_SIZE }, context),
    // Todos os bens, para o seletor do financiamento e para nomear o bem associado.
    listAllPages((page) => listPatrimony("assets", page, context)),
  ]);
  const results = { assets, financings, liabilities };
  const assetOptions =
    allAssets.status === "fulfilled"
      ? allAssets.value.items.map(({ id, description }) => ({ id, description }))
      : null;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Bens e dívidas"
        context="Bens com o valor que você estima e dívidas com o saldo devedor. Os valores são informados por você; o app não soma nem calcula patrimônio."
      />

      {allAssets.status === "fulfilled" && allAssets.value.truncated ? (
        <Notice tone="info">Você tem mais de 500 bens: o seletor de financiamento mostra só os primeiros.</Notice>
      ) : null}

      {PATRIMONY_COLLECTIONS.map((collection) => {
        const section = SECTIONS[collection];
        const result = results[collection];
        const titleId = `section-${collection}`;
        const sectionPages = result.status === "fulfilled" ? totalPages(result.value.total, PAGE_SIZE) : 1;
        const empty = result.status === "fulfilled" && result.value.total === 0;

        return (
          <section key={collection} className={styles.section} aria-labelledby={titleId}>
            <div className={styles.sectionHeader}>
              <h2 id={titleId} className={styles.sectionTitle}>
                {section.title}
                {result.status === "fulfilled" && result.value.total > 0 ? (
                  <span className={styles.note}> · {result.value.total}</span>
                ) : null}
              </h2>
              <PanelToggle flag={section.flag}>{section.create}</PanelToggle>
            </div>

            <PanelSection
              flag={section.flag}
              title={section.create}
              description={
                collection === "assets"
                  ? "Informe o valor que você estima e de onde ele veio. Você pode atualizar depois; cada mudança fica no histórico."
                  : collection === "financings"
                    ? "Informe o saldo devedor atual. Se o financiamento pagou um bem, associe-o."
                    : "Empréstimos, parcelamentos e outras dívidas, com o saldo devedor atual."
              }
              closeLabel={`Fechar o painel de ${section.create.toLowerCase()}`}
            >
              <PatrimonyForm collection={collection} assets={assetOptions} />
            </PanelSection>

            {result.status === "rejected" ? (
              <Notice
                tone="error"
                actions={
                  <Link className={ui.inlineLink} href={sectionHref(pages, collection, pages[collection])}>
                    Tentar de novo
                  </Link>
                }
              >
                Não foi possível carregar {section.title.toLowerCase()}. As outras seções seguem disponíveis.
              </Notice>
            ) : empty ? (
              <p className={styles.note}>{section.empty}</p>
            ) : result.value.items.length === 0 ? (
              <Notice tone="info">
                Esta página não existe.{" "}
                <Link className={ui.inlineLink} href={sectionHref(pages, collection, 1)}>
                  Voltar para a primeira página
                </Link>
              </Notice>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      {HEADERS[collection].map((header, index) => (
                        <th
                          key={`${header}-${index}`}
                          scope="col"
                          className={index === HEADERS[collection].length - 2 ? styles.num : undefined}
                        >
                          {header || <span className="visually-hidden">Ações</span>}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(result.value.items as PatrimonyItem[]).map((item) => (
                      // `version` na chave remonta a linha depois de salvar, fechando a edição.
                      <ItemRow
                        key={`${item.id}:${item.version}`}
                        collection={collection}
                        item={item}
                        assets={assetOptions}
                        columns={HEADERS[collection].length}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={pages[collection]}
              pages={sectionPages}
              href={(target) => sectionHref(pages, collection, target)}
              label={`Páginas de ${section.title.toLowerCase()}`}
              anchor={titleId}
            />
          </section>
        );
      })}
    </div>
  );
}
