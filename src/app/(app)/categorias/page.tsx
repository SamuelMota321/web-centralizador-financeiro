import Link from "next/link";
import { categoryColors } from "@/components/charts/category-colors";
import { CategoryMark } from "@/components/category-mark";
import { HeroBanner } from "@/components/hero-banner";
import { IconArrowRight, IconChevronDown, IconLightbulb, IconSparkles, IconTag } from "@/components/icons";
import { UrlNoticeToast } from "@/components/interactive";
import { ListToolbar, SegmentedLinks } from "@/components/list-toolbar";
import { PanelSection, PanelToggle } from "@/components/panel";
import { SectionPanel } from "@/components/section-panel";
import { Notice, PageHeader, Pagination, ui } from "@/components/ui";
import { listAllPages, SELECTOR_ITEM_LIMIT } from "@/lib/api/pagination";
import { auth0 } from "@/lib/auth0";
import { listCategories } from "@/lib/categories/api";
import { categoriesToCreate, SUGGESTED_CATEGORIES } from "@/lib/categories/suggestions";
import { listCategoryRules } from "@/lib/category-rules/api";
import { todayCivilDate } from "@/lib/civil-date";
import { formatMoney } from "@/lib/money";
import { listTransactionsSince, PERIOD_SCAN_LIMIT } from "@/lib/transactions/api";
import { fromCents } from "@/components/charts/model";
import { PERIOD_PRESETS, type PeriodPreset } from "../movimentacoes/presentation";
import { CategoryForm } from "./category-form";
import { CategoryRow } from "./category-row";
import { isNoticeKey, NOTICES } from "./notices";
import {
  arrangeCategories,
  categoriesHref,
  DEFAULT_PERIOD,
  expenseShare,
  paginate,
  parseCategoryParams,
  periodLabel,
  periodRange,
  periodUsage,
  reviewHref,
  rulesPerCategory,
  SORTS,
  suggestionTiles,
  usageFigure,
} from "./presentation";
import { RulesIllustration } from "./rules-illustration";
import { AddMissingButton, SuggestedTiles } from "./suggested-tiles";
import styles from "./categorias.module.css";

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const notice = isNoticeKey(raw.aviso) ? NOTICES[raw.aviso] : null;
  const params = parseCategoryParams(raw);
  const today = todayCivilDate();
  const range = periodRange(params.period, today);

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // Categorias são o conteúdo; regras e lançamentos só enriquecem as linhas. Falha parcial
  // esconde o enriquecimento, nunca a lista.
  const [categoriesResult, rulesResult, scanResult] = await Promise.allSettled([
    listAllPages((query) => listCategories(query, context)),
    listAllPages((query) => listCategoryRules(query, context)),
    listTransactionsSince(range.since, context),
  ]);
  if (categoriesResult.status === "rejected") throw categoriesResult.reason;

  const { items: categories, truncated } = categoriesResult.value;
  const total = categories.length;
  // Cor fixa pela ordem de criação (arquivadas incluídas), a mesma de Movimentações e Regras.
  const colors = categoryColors([...categories].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((c) => c.id));
  const ruleCounts = rulesResult.status === "fulfilled" ? rulesPerCategory(rulesResult.value.items) : null;

  // Valores só com o período lido por inteiro (regra do PRODUCT.md): nunca um número parcial.
  const scan = scanResult.status === "fulfilled" ? scanResult.value : null;
  const covered = Boolean(scan && (scan.complete || scan.items.some((item) => item.occurredOn < range.since)));
  const usage = scan && covered ? periodUsage(scan.items, range.since, range.until) : null;

  const active = categories.filter((category) => category.status === "active");
  const archived = categories.filter((category) => category.status === "archived");
  const arranged = arrangeCategories(active, usage?.byCategory ?? null, params.search, params.sort);
  const arrangedArchived = arrangeCategories(archived, usage?.byCategory ?? null, params.search, "nome");
  const activePage = paginate(arranged, params.page);
  const archivedPage = paginate(arrangedArchived, params.archivedPage);
  const shown = activePage.items;
  const shownArchived = archivedPage.items;
  const missing = categoriesToCreate(categories);
  const withoutRules = ruleCounts ? active.filter((category) => !ruleCounts.get(category.id)).length : 0;
  const periodName = periodLabel(params.period);
  const filtering = params.search !== "" || params.sort !== "uso";

  const tiles = suggestionTiles(SUGGESTED_CATEGORIES, categories, colors);

  const movementsHref = (id: string) =>
    `/movimentacoes?categoria=${id.toLowerCase()}${params.period !== DEFAULT_PERIOD ? `&periodo=${params.period}` : ""}`;
  const row = (category: (typeof categories)[number]) => {
    const figure = usage ? usageFigure(usage.byCategory.get(category.id), usage.totalExpense) : null;
    const entry = usage?.byCategory.get(category.id);
    return (
      <CategoryRow
        key={`${category.id}:${category.updatedAt}`}
        category={category}
        color={colors.get(category.id) ?? null}
        figure={figure ? { ...figure, count: entry?.count ?? 0, series: entry?.series ?? [] } : null}
        rules={ruleCounts?.get(category.id) ?? 0}
        periodName={periodName}
        movementsHref={movementsHref(category.id)}
      />
    );
  };

  return (
    <div className={styles.page}>
      <UrlNoticeToast notice={notice} />

      <PageHeader
        title="Categorias"
        context="Organize seus gastos e veja para onde seu dinheiro vai."
        actions={<PanelToggle flag="nova">Nova categoria</PanelToggle>}
      />

      <PanelSection
        flag="nova"
        title="Nova categoria"
        description="Use nomes que façam sentido para você. As sugeridas são só um ponto de partida."
        closeLabel="Fechar o painel de nova categoria"
      >
        <CategoryForm />
      </PanelSection>

      {missing.length > 0 ? (
        <HeroBanner
          icon={<IconLightbulb size={24} />}
          title={
            total === 0
              ? "Comece com as categorias sugeridas"
              : `Ainda ${missing.length === 1 ? "falta 1 categoria sugerida" : `faltam ${missing.length} categorias sugeridas`}`
          }
          action={<AddMissingButton count={missing.length} />}
        >
          {total === 0
            ? "Um conjunto básico para começar: alimentação, moradia, transporte, saúde e mais. Depois, elas são suas para renomear ou arquivar."
            : "Adicione as que faltam para ter uma visão mais completa das suas finanças."}
        </HeroBanner>
      ) : null}

      <details className={`${ui.sectionPanel} ${styles.suggested}`} open={missing.length > 0 || undefined}>
        <summary className={`${ui.sectionPanelHead} ${styles.suggestedSummary}`}>
          <span className={ui.sectionPanelIcon} aria-hidden>
            <IconSparkles size={22} />
          </span>
          <span className={ui.sectionPanelText}>
            <span className={ui.sectionPanelTitle}>
              Categorias sugeridas <span className={ui.countPill}>{SUGGESTED_CATEGORIES.length}</span>
            </span>
            <span className={ui.sectionPanelHint}>
              {missing.length === 0 ? "Todas adicionadas." : "Um toque adiciona a categoria."}
            </span>
          </span>
          <span className={styles.suggestedToggle}>
            <span data-closed>Ver todas</span>
            <span data-open>Recolher</span>
            <IconChevronDown size={16} />
          </span>
        </summary>
        <SuggestedTiles tiles={tiles} />
      </details>

      {truncated ? <Notice tone="info">Você tem mais de {SELECTOR_ITEM_LIMIT} categorias: a lista mostra só as primeiras.</Notice> : null}

      <SectionPanel
        id="suas-categorias"
        icon={<IconTag size={22} />}
        title="Suas categorias"
        count={arranged.length}
        actions={
          total > 0 ? (
            <>
              <SegmentedLinks
                label="Período"
                options={(Object.entries(PERIOD_PRESETS) as [PeriodPreset, string][]).map(([value, label]) => ({
                  href: categoriesHref(params, { period: value }),
                  label,
                  current: params.period === value,
                }))}
              />
              <ListToolbar
                action="/categorias"
                label="Buscar categorias"
                search={params.search}
                placeholder="Buscar categoria…"
                active={filtering}
                hidden={params.period !== DEFAULT_PERIOD ? { periodo: params.period } : {}}
                filters={[
                  {
                    name: "ordem",
                    label: "Ordenar",
                    value: params.sort,
                    options: Object.entries(SORTS).map(([value, label]) => ({ value, label })),
                  },
                ]}
              />
            </>
          ) : undefined
        }
      >
        {scan && !covered ? (
          <div className={styles.tableNotice}>
            <Notice tone="info">
              Este período tem mais de {PERIOD_SCAN_LIMIT} lançamentos: escolha um período menor para ver os valores por categoria.
            </Notice>
          </div>
        ) : null}

        {total === 0 ? (
          <p className={styles.tableEmpty}>Nenhuma categoria ainda. Adicione as sugeridas acima ou crie a sua em “Nova categoria”.</p>
        ) : arranged.length === 0 ? (
          <p className={styles.tableEmpty}>
            Nenhuma categoria ativa combina com a busca.{" "}
            <Link className={ui.inlineLink} href={categoriesHref(params, { search: "" })} scroll={false}>
              Limpar busca
            </Link>
          </p>
        ) : (
          <>
            <div className={styles.tableHead} aria-hidden>
              <span />
              <span>Categoria</span>
              <span>Evolução em {periodName}</span>
              <span>Valor</span>
              <span>% despesas</span>
              <span />
            </div>
            <ul className={styles.table}>
              {shown.map(row)}
              {usage && usage.uncategorizedExpense > BigInt(0) && !params.search ? (
                <li className={styles.row} data-review>
                  <CategoryMark kind="review" />
                  <div className={styles.rowName}>
                    <p className={styles.rowTitle}>A revisar</p>
                    <p className={styles.rowMeta}>
                      {usage.uncategorizedCount} {usage.uncategorizedCount === 1 ? "despesa sem categoria ou incerta" : "despesas sem categoria ou incertas"}
                    </p>
                  </div>
                  <div className={styles.rowSpark} />
                  <p className={`${styles.rowValue} tabular`}>{formatMoney(fromCents(usage.uncategorizedExpense))}</p>
                  <p className={`${styles.rowShare} tabular`}>{expenseShare(usage.uncategorizedExpense, usage.totalExpense)}</p>
                  <div className={styles.rowMenu}>
                    <Link className={ui.inlineLink} href={reviewHref(usage.reviewKinds, params.period)}>
                      Revisar
                    </Link>
                  </div>
                </li>
              ) : null}
            </ul>
            {usage && usage.totalExpense > BigInt(0) ? (
              <p className={styles.tableFoot}>
                Total de despesas em {periodName}: <strong className="tabular">{formatMoney(fromCents(usage.totalExpense))}</strong> · sem
                transferências
              </p>
            ) : usage ? (
              <p className={styles.tableFoot}>Nenhuma despesa em {periodName}.</p>
            ) : null}
            <Pagination
              page={activePage.page}
              pages={activePage.pages}
              href={(page) => categoriesHref(params, { page })}
              label="Páginas das categorias"
              anchor="suas-categorias"
            />
          </>
        )}
      </SectionPanel>

      {arrangedArchived.length > 0 ? (
        <details id="arquivadas" className={`${ui.sectionPanel} ${styles.archived}`} open={params.archivedPage > 1 || undefined}>
          <summary className={`${ui.sectionPanelHead} ${styles.suggestedSummary}`}>
            <span className={ui.sectionPanelText}>
              <span className={ui.sectionPanelTitle}>
                Arquivadas <span className={ui.countPill}>{arrangedArchived.length}</span>
              </span>
            </span>
            <span className={styles.suggestedToggle}>
              <span data-closed>Ver</span>
              <span data-open>Recolher</span>
              <IconChevronDown size={16} />
            </span>
          </summary>
          <ul className={styles.table}>{shownArchived.map(row)}</ul>
          <Pagination
            page={archivedPage.page}
            pages={archivedPage.pages}
            href={(page) => categoriesHref(params, { archivedPage: page })}
            label="Páginas das categorias arquivadas"
            anchor="arquivadas"
          />
        </details>
      ) : null}

      {ruleCounts && active.length > 0 ? (
        <HeroBanner
          media={<RulesIllustration />}
          title="Automatize ainda mais com regras"
          action={
            <Link className={`${ui.button} ${ui.secondary}`} href="/regras">
              Gerenciar regras
              <IconArrowRight size={16} />
            </Link>
          }
        >
          {withoutRules > 0
            ? `${withoutRules} ${withoutRules === 1 ? "categoria ainda não tem" : "categorias ainda não têm"} regra. `
            : "Todas as suas categorias têm regra. "}
          Regras categorizam sozinhas os lançamentos novos, como “se a descrição contém Uber, use Transporte”.
        </HeroBanner>
      ) : null}
    </div>
  );
}
