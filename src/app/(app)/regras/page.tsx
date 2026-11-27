import Link from "next/link";
import { categoryColors } from "@/components/charts/category-colors";
import { HeroBanner } from "@/components/hero-banner";
import { IconCategories, IconCheck, IconChevronDown, IconLightbulb, IconPause, IconPlus, IconRules, IconSparkles, IconTrash } from "@/components/icons";
import { UrlNoticeToast } from "@/components/interactive";
import { ListToolbar } from "@/components/list-toolbar";
import { PanelToggle } from "@/components/panel";
import { SectionPanel } from "@/components/section-panel";
import { EmptyState, Notice, PageHeader, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages, SELECTOR_ITEM_LIMIT } from "@/lib/api/pagination";
import { rulePackSize, rulesToCreate, splitSuggestedRules } from "@/lib/categories/suggestions";
import { listCategories } from "@/lib/categories/api";
import { listCategoryRules } from "@/lib/category-rules/api";
import { applicationQueue } from "@/lib/category-rules/evaluation";
import type { CategoryRule } from "@/lib/category-rules/types";
import { listTransactions } from "@/lib/transactions/api";
import { isNoticeKey, NOTICES } from "./notices";
import { filterRules, parseRuleParams, RULE_SORTS, rulesHref, sortRules, statusCounts, uncategorizedDescriptions } from "./presentation";
import { RuleCreatePanel } from "./rule-create-panel";
import { RuleItem } from "./rule-item";
import { RulePack } from "./rule-pack";
import { RuleSimulator } from "./rule-simulator";
import { SimulatorPanel, TestToggle } from "./simulator-panel";
import { CATEGORY_FALLBACK, type CategoryOption, type NamedOption } from "./rule-logic";
import styles from "./regras.module.css";

export default async function RegrasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const raw = await searchParams;
  const notice = isNoticeKey(raw.aviso) ? NOTICES[raw.aviso] : null;
  const params = parseRuleParams(raw);

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // Regras são o conteúdo; categorias e contas dão nome, e os lançamentos recentes só sugerem
  // descrições para o simulador. Falha parcial nunca esconde a lista.
  const [rulesResult, categoriesResult, accountsResult, recentResult] = await Promise.allSettled([
    // Todas as regras (até 500): a fila de aplicação e os grupos pedem a lista inteira.
    listAllPages((query) => listCategoryRules(query, context)),
    listAllPages((query) => listCategories(query, context)),
    listAllPages((query) => listAccounts(query, context)),
    listTransactions({ page: 1, pageSize: 50 }, context),
  ]);

  if (rulesResult.status === "rejected") throw rulesResult.reason;

  const allRules = rulesResult.value.items;
  const rulesTruncated = rulesResult.value.truncated;
  const rawCategories = categoriesResult.status === "fulfilled" ? categoriesResult.value.items : null;
  const categories: CategoryOption[] | null = rawCategories?.map(({ id, name, status }) => ({ id, name, status })) ?? null;
  const accounts: NamedOption[] | null =
    accountsResult.status === "fulfilled" ? accountsResult.value.items.map(({ id, name }) => ({ id, name })) : null;
  const recent = recentResult.status === "fulfilled" ? uncategorizedDescriptions(recentResult.value.items) : [];

  const activeCategories = (categories ?? []).filter((category) => category.status === "active");
  const activeIds = new Set(activeCategories.map((category) => category.id.toLowerCase()));
  const canCreate = categories !== null && accounts !== null && activeCategories.length > 0;
  const forceOpen = canCreate && allRules.length === 0;

  // Cor fixa pela ordem de criação (arquivadas incluídas), a mesma de Categorias e Movimentações.
  const colors = categoryColors([...(rawCategories ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((c) => c.id));
  const colorOf = (categoryId: string) => {
    const found = rawCategories?.find((category) => category.id.toLowerCase() === categoryId.toLowerCase());
    return found ? (colors.get(found.id) ?? null) : null;
  };
  const categoryName = (categoryId: string) =>
    categories?.find((category) => category.id.toLowerCase() === categoryId.toLowerCase())?.name ?? CATEGORY_FALLBACK;

  // A fila real (igual ao backend) só alimenta o simulador, que explica quem decide.
  const queue = applicationQueue(allRules, activeIds);
  const counts = statusCounts(allRules);
  const live = allRules.filter((rule) => rule.status !== "removed");
  const removed = allRules.filter((rule) => rule.status === "removed");
  // Só exibição: as do pacote ficam agrupadas; removidas têm grupo próprio.
  const { personal, suggested, suggestedCount } = splitSuggestedRules(live, categories);
  const pack = categories ? rulesToCreate(categories, allRules) : null;
  const suggestedIds = new Set(suggested.flatMap((group) => group.rules.map((rule) => rule.id)));

  // Com busca ou filtro de status, a lista procura em todas as regras (pessoais e sugeridas).
  const filtering = params.search !== "" || params.status !== "todas";
  const listed = sortRules(filterRules(filtering ? live : personal, params, categoryName, accounts), params.sort, categoryName);

  const row = (rule: CategoryRule) => (
    // `updatedAt` na chave remonta o item após editar, fechando o painel.
    <RuleItem
      key={`${rule.id}:${rule.updatedAt}`}
      rule={rule}
      categories={categories}
      accounts={accounts}
      color={colorOf(rule.categoryId)}
      suggested={filtering && suggestedIds.has(rule.id)}
    />
  );

  // Resumo: cada célula é um atalho (filtra a lista ou leva ao grupo).
  const stats = [
    {
      key: "ativas",
      icon: <IconCheck size={20} strokeWidth={2.25} />,
      value: String(counts.active),
      label: counts.active === 1 ? "Regra ativa" : "Regras ativas",
      href: rulesHref(params, { status: params.status === "ativas" ? "todas" : "ativas" }),
      current: params.status === "ativas",
    },
    {
      key: "sugeridas",
      icon: <IconSparkles size={20} />,
      value: `${suggestedCount} / ${rulePackSize()}`,
      label: "Sugeridas aplicadas",
      href: "#sugeridas",
      current: false,
    },
    {
      key: "inativas",
      icon: <IconPause size={20} />,
      value: String(counts.inactive),
      label: counts.inactive === 1 ? "Regra inativa" : "Regras inativas",
      href: rulesHref(params, { status: params.status === "inativas" ? "todas" : "inativas" }),
      current: params.status === "inativas",
    },
    {
      key: "removidas",
      icon: <IconTrash size={20} />,
      value: String(counts.removed),
      label: counts.removed === 1 ? "Regra removida" : "Regras removidas",
      href: `${rulesHref(params, { showRemoved: true })}#removidas`,
      current: false,
    },
  ];

  return (
    <div className={styles.page}>
      <UrlNoticeToast notice={notice} />

      <PageHeader
        title="Regras"
        context="Automatize a categorização dos seus lançamentos e ganhe tempo."
        actions={
          canCreate ? (
            <PanelToggle flag="nova" forceOpen={forceOpen}>
              Nova regra
            </PanelToggle>
          ) : null
        }
      />

      <HeroBanner
        icon={<IconLightbulb size={24} />}
        title="Deixe o Coinciente trabalhar por você!"
        action={allRules.length > 0 ? <TestToggle label={live.length > 0 ? "Testar uma descrição" : "Como funciona"} /> : undefined}
      >
        Crie regras para categorizar sozinho os lançamentos novos, como “se a descrição contém Uber, use Transporte”.
      </HeroBanner>

      <SimulatorPanel forceOpen={allRules.length === 0}>
        <div className={styles.testGrid}>
          {categories !== null && live.length > 0 ? (
            <RuleSimulator
              rules={live}
              categories={categories}
              colors={Object.fromEntries(colors)}
              accounts={accounts}
              positions={Object.fromEntries(queue.position)}
              recent={recent}
            />
          ) : null}
          {/* Explicação permanente da precedência (S2-06): a interface explica, o backend decide. */}
          <div className={styles.howTo}>
            <h2 className={styles.howToTitle}>Como as regras são aplicadas</h2>
            <ul className={styles.howToList}>
              <li>Uma regra categoriza os lançamentos novos que combinarem com a condição.</li>
              <li>Vale a primeira que combinar: maior prioridade primeiro e, no empate, a mais antiga.</li>
              <li>Maiúsculas não importam, acentos sim: “farmacia” não pega “Farmácia”.</li>
              <li>Sua escolha manual de categoria sempre prevalece.</li>
              <li>
                Não alteram lançamentos já registrados e, por enquanto, valem para os lançados no app: os importados por OFX
                ou pela conexão bancária ainda não passam por elas.
              </li>
            </ul>
          </div>
        </div>
      </SimulatorPanel>

      {allRules.length > 0 ? (
        <nav className={styles.stats} aria-label="Resumo das regras">
          {stats.map((stat) => (
            <Link key={stat.key} className={styles.stat} data-kind={stat.key} href={stat.href} aria-current={stat.current ? "true" : undefined}>
              <span className={styles.statIcon} aria-hidden>
                {stat.icon}
              </span>
              <span className={styles.statText}>
                <strong className={`${styles.statValue} tabular`}>{stat.value}</strong>
                <span className={styles.statLabel}>{stat.label}</span>
              </span>
            </Link>
          ))}
        </nav>
      ) : null}

      {categories === null || accounts === null ? (
        <Notice
          tone="warning"
          actions={
            <Link className={ui.inlineLink} href={rulesHref(params)}>
              Tentar de novo
            </Link>
          }
        >
          Não foi possível carregar suas {categories === null ? "categorias" : "contas"}. Os nomes podem aparecer como
          indisponíveis e a criação de regras fica pausada até carregarem.
        </Notice>
      ) : null}

      {categories !== null && activeCategories.length === 0 ? (
        <EmptyState
          icon={<IconCategories size={22} />}
          title="Crie uma categoria primeiro"
          action={
            <Link className={`${ui.button} ${ui.primary}`} href="/categorias">
              <IconPlus size={18} />
              Criar ou usar as sugeridas
            </Link>
          }
        >
          Uma regra aplica uma categoria sua. Você precisa de ao menos uma categoria ativa para criar regras, ou use um
          grupo de regras sugeridas abaixo, que cria a categoria junto.
        </EmptyState>
      ) : null}

      {canCreate && accounts ? <RuleCreatePanel categories={activeCategories} accounts={accounts} forceOpen={forceOpen} /> : null}

      {categories !== null ? (
        <RulePack
          groups={suggested}
          count={suggestedCount}
          missing={pack?.toCreate.length ?? 0}
          missingCategories={pack?.missingCategories ?? []}
          hasActiveCategories={activeCategories.length > 0}
          categories={categories}
          accounts={accounts}
          colorOf={colorOf}
        />
      ) : null}

      {rulesTruncated ? <Notice tone="info">Você tem mais de {SELECTOR_ITEM_LIMIT} regras: a lista mostra só as primeiras.</Notice> : null}

      <SectionPanel
        id="suas-regras"
        icon={<IconRules size={22} />}
        title={filtering ? "Regras encontradas" : "Suas regras"}
        count={listed.length}
        hint={
          filtering ? (
            <>
              {params.status === "ativas" ? "Só as ativas, " : params.status === "inativas" ? "Só as inativas, " : ""}
              incluindo as sugeridas.{" "}
              <Link className={ui.inlineLink} href="/regras">
                Limpar filtros
              </Link>
            </>
          ) : (
            "Regras criadas por você."
          )
        }
        actions={
          live.length > 0 ? (
            <ListToolbar
              action="/regras"
              label="Buscar regras"
              search={params.search}
              placeholder="Buscar regras…"
              active={params.search !== "" || params.sort !== "aplicacao"}
              hidden={params.status !== "todas" ? { status: params.status } : {}}
              filters={[
                {
                  name: "ordem",
                  label: "Ordenar",
                  value: params.sort,
                  options: Object.entries(RULE_SORTS).map(([value, label]) => ({ value, label })),
                },
              ]}
            />
          ) : undefined
        }
      >
        {listed.length > 0 ? (
          <>
            <div className={styles.tableHead} aria-hidden>
              <span />
              <span>Regra</span>
              <span>Prioridade</span>
              <span>Status</span>
              <span>Ações</span>
            </div>
            <ul className={styles.table}>{listed.map(row)}</ul>
          </>
        ) : (
          <p className={styles.tableEmpty}>
            {filtering
              ? "Nenhuma regra combina com a busca ou o status escolhido."
              : live.length > 0
                ? "Você ainda não criou regras próprias; só as sugeridas estão valendo. Teste uma descrição na faixa acima para achar o que fica sem categoria."
                : canCreate
                  ? "Nenhuma regra ainda. Crie a primeira em “Nova regra” ou adicione um grupo de sugeridas acima."
                  : "Nenhuma regra ainda."}
          </p>
        )}
      </SectionPanel>

      {removed.length > 0 ? (
        <details id="removidas" className={`${ui.sectionPanel} ${styles.removed}`} open={params.showRemoved || undefined}>
          <summary className={`${ui.sectionPanelHead} ${styles.removedSummary}`}>
            <span className={ui.sectionPanelIcon} aria-hidden>
              <IconTrash size={20} />
            </span>
            <span className={ui.sectionPanelText}>
              <span className={ui.sectionPanelTitle}>
                Regras removidas <span className={ui.countPill}>{removed.length}</span>
              </span>
              <span className={ui.sectionPanelHint}>Somente leitura: não são aplicadas nem voltam.</span>
            </span>
            <IconChevronDown className={styles.removedChevron} size={18} />
          </summary>
          <ul className={styles.table}>{removed.map(row)}</ul>
        </details>
      ) : null}
    </div>
  );
}
