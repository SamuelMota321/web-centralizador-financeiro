import Link from "next/link";
import { ListToolbar, SegmentedLinks } from "@/components/list-toolbar";
import { categoryColors } from "@/components/charts/category-colors";
import { fromCents } from "@/components/charts/model";
import { HeroBanner } from "@/components/hero-banner";
import { IconCategories, IconRules } from "@/components/icons";
import { UrlNoticeToast } from "@/components/interactive";
import { PanelSection, PanelToggle } from "@/components/panel";
import { SectionHeader } from "@/components/section-header";
import { EmptyState, Notice, PageHeader, ui } from "@/components/ui";
import { listAllPages, SELECTOR_ITEM_LIMIT } from "@/lib/api/pagination";
import { auth0 } from "@/lib/auth0";
import { listCategories } from "@/lib/categories/api";
import { categoriesToCreate } from "@/lib/categories/suggestions";
import { listCategoryRules } from "@/lib/category-rules/api";
import { todayCivilDate } from "@/lib/civil-date";
import { listTransactionsSince, PERIOD_SCAN_LIMIT } from "@/lib/transactions/api";
import { PERIOD_PRESETS, type PeriodPreset } from "../movimentacoes/presentation";
import { CategoryCard } from "./category-card";
import { CategoryForm } from "./category-form";
import { Composition } from "./composition";
import { isNoticeKey, NOTICES } from "./notices";
import {
  arrangeCategories,
  categoriesHref,
  composition,
  DEFAULT_PERIOD,
  parseCategoryParams,
  periodLabel,
  periodRange,
  periodUsage,
  rulesPerCategory,
  SORTS,
  usageFigure,
} from "./presentation";
import { SuggestedCategories } from "./suggested-categories";
import { SuggestedChips } from "./suggested-chips";
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

  // Categorias são o conteúdo; regras e lançamentos só enriquecem os cartões. Falha parcial
  // esconde o enriquecimento, nunca a lista.
  const [categoriesResult, rulesResult, scanResult] = await Promise.allSettled([
    listAllPages((query) => listCategories(query, context)),
    listAllPages((query) => listCategoryRules(query, context)),
    listTransactionsSince(range.since, context),
  ]);
  if (categoriesResult.status === "rejected") throw categoriesResult.reason;

  const { items: categories, truncated } = categoriesResult.value;
  const total = categories.length;
  // Cor fixa pela ordem de criação (arquivadas incluídas), a mesma de Movimentações.
  const colors = categoryColors([...categories].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((c) => c.id));
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const ruleCounts = rulesResult.status === "fulfilled" ? rulesPerCategory(rulesResult.value.items) : null;

  // Valores só com o período lido por inteiro (regra do PRODUCT.md): nunca um número parcial.
  const scan = scanResult.status === "fulfilled" ? scanResult.value : null;
  const covered = Boolean(scan && (scan.complete || scan.items.some((item) => item.occurredOn < range.since)));
  const usage = scan && covered ? periodUsage(scan.items, range.since, range.until) : null;
  const parts = usage ? composition(usage, names, colors) : [];

  const active = categories.filter((category) => category.status === "active");
  const archived = categories.filter((category) => category.status === "archived");
  const shown = arrangeCategories(active, usage?.byCategory ?? null, params.search, params.sort);
  const shownArchived = arrangeCategories(archived, usage?.byCategory ?? null, params.search, "nome");
  const missing = total > 0 ? categoriesToCreate(categories) : [];
  const withoutRules = ruleCounts ? active.filter((category) => !ruleCounts.get(category.id)).length : 0;
  const periodName = periodLabel(params.period);
  const filtering = params.search !== "" || params.sort !== "uso";

  const movementsHref = (id: string) =>
    `/movimentacoes?categoria=${id.toLowerCase()}${params.period !== DEFAULT_PERIOD ? `&periodo=${params.period}` : ""}`;
  const card = (category: (typeof categories)[number]) => {
    const figure = usage ? usageFigure(usage.byCategory.get(category.id), usage.totalExpense) : null;
    const entry = usage?.byCategory.get(category.id);
    return (
      <CategoryCard
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
        context={total === 0 ? "Organize suas movimentações com categorias pessoais." : "Para onde vai o seu dinheiro, categoria por categoria."}
        actions={
          <>
            {total > 0 ? (
              <SegmentedLinks
                label="Período"
                options={(Object.entries(PERIOD_PRESETS) as [PeriodPreset, string][]).map(([value, label]) => ({
                  href: categoriesHref(params, { period: value }),
                  label,
                  current: params.period === value,
                }))}
              />
            ) : null}
            <PanelToggle flag="nova" forceOpen={total === 0}>
              Nova categoria
            </PanelToggle>
          </>
        }
      />

      <PanelSection
        flag="nova"
        forceOpen={total === 0}
        title="Nova categoria"
        description="Use nomes que façam sentido para você. As sugeridas são só um ponto de partida."
        closeLabel="Fechar o painel de nova categoria"
      >
        <CategoryForm />
      </PanelSection>

      {total === 0 ? (
        <EmptyState icon={<IconCategories size={22} />} title="Nenhuma categoria ainda" action={<SuggestedCategories />}>
          Categorias ajudam a entender para onde vai o dinheiro. Crie a sua no painel acima ou use um conjunto básico
          pronto.
        </EmptyState>
      ) : (
        <>
          {usage && parts.length > 0 ? (
            <Composition items={parts} total={fromCents(usage.totalExpense)} periodName={periodName} />
          ) : scan && !covered ? (
            <Notice tone="info">
              Este período tem mais de {PERIOD_SCAN_LIMIT} lançamentos: escolha um período menor para ver os valores por categoria.
            </Notice>
          ) : usage ? (
            <Notice tone="info">Nenhuma despesa em {periodName}. Os cartões mostram as receitas, quando houver.</Notice>
          ) : null}

          {missing.length > 0 ? <SuggestedChips missing={missing} /> : null}

          {truncated ? <Notice tone="info">Você tem mais de {SELECTOR_ITEM_LIMIT} categorias: a lista mostra só as primeiras.</Notice> : null}

          <section className={styles.listSection} aria-labelledby="suas-categorias">
            <SectionHeader
              id="suas-categorias"
              title="Suas categorias"
              count={active.length}
              actions={
                <ListToolbar
                  action="/categorias"
                  label="Buscar categorias"
                  search={params.search}
                  placeholder="Buscar categoria"
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
              }
            />
            {shown.length > 0 ? (
              <ul className={styles.grid}>{shown.map(card)}</ul>
            ) : (
              <EmptyState
                icon={<IconCategories size={22} />}
                title="Nenhuma categoria encontrada"
                action={
                  <Link className={`${ui.button} ${ui.secondary}`} href={categoriesHref(params, { search: "" })}>
                    Limpar busca
                  </Link>
                }
              >
                Nenhuma categoria ativa combina com a busca.
              </EmptyState>
            )}
          </section>

          {shownArchived.length > 0 ? (
            <details className={styles.archived}>
              <summary className={styles.archivedSummary}>
                Arquivadas <span className={ui.countPill}>{shownArchived.length}</span>
              </summary>
              <ul className={styles.grid}>{shownArchived.map(card)}</ul>
            </details>
          ) : null}

          {ruleCounts && active.length > 0 ? (
            <HeroBanner
              icon={<IconRules size={20} />}
              tone="neutral"
              title={withoutRules > 0 ? `${withoutRules} ${withoutRules === 1 ? "categoria ainda não tem" : "categorias ainda não têm"} regra` : "Todas as suas categorias têm regras"}
              action={
                <Link className={`${ui.button} ${ui.secondary}`} href="/regras">
                  Gerenciar regras
                </Link>
              }
            >
              Regras categorizam sozinhas as próximas movimentações, como “se a descrição contém uber, use Transporte”.
            </HeroBanner>
          ) : null}
        </>
      )}
    </div>
  );
}
