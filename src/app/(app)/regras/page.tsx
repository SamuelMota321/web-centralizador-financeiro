import Link from "next/link";
import {
  IconCategories,
  IconInfo,
  IconPlus,
  IconRules,
} from "@/components/icons";
import { UrlNoticeToast } from "@/components/interactive";
import { PanelToggle } from "@/components/panel";
import { Disclosure, EmptyState, Notice, PageHeader, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages, SELECTOR_ITEM_LIMIT } from "@/lib/api/pagination";
import { rulesToCreate, splitSuggestedRules } from "@/lib/categories/suggestions";
import { listCategories } from "@/lib/categories/api";
import { listCategoryRules } from "@/lib/category-rules/api";
import { isNoticeKey, NOTICES } from "./notices";
import { RuleCreatePanel } from "./rule-create-panel";
import { RuleItem } from "./rule-item";
import { RulePack } from "./rule-pack";
import type { CategoryOption, NamedOption } from "./rule-logic";
import styles from "./regras.module.css";

export default async function RegrasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { aviso } = await searchParams;
  const notice = isNoticeKey(aviso) ? NOTICES[aviso] : null;

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // Regras são o conteúdo; categorias e contas só dão nome. Falha parcial não esconde a lista.
  const [rulesResult, categoriesResult, accountsResult] = await Promise.allSettled([
    // Todas as regras (até 500): as sugeridas são agrupadas, o que pede a lista inteira.
    listAllPages((query) => listCategoryRules(query, context)),
    listAllPages((query) => listCategories(query, context)),
    listAllPages((query) => listAccounts(query, context)),
  ]);

  if (rulesResult.status === "rejected") throw rulesResult.reason;

  const allRules = rulesResult.value.items;
  const rulesTruncated = rulesResult.value.truncated;
  const categories: CategoryOption[] | null =
    categoriesResult.status === "fulfilled"
      ? categoriesResult.value.items.map(({ id, name, status }) => ({ id, name, status }))
      : null;
  const accounts: NamedOption[] | null =
    accountsResult.status === "fulfilled"
      ? accountsResult.value.items.map(({ id, name }) => ({ id, name }))
      : null;
  const activeCategories = (categories ?? []).filter((category) => category.status === "active");
  const canCreate = categories !== null && accounts !== null && activeCategories.length > 0;
  // Sem nenhuma regra, o painel já começa aberto: é a próxima ação óbvia.
  const forceOpen = canCreate && allRules.length === 0;
  const pageHref = () => "/regras";
  // Só exibição: as regras do pacote ficam num grupo recolhido; as da pessoa aparecem abertas.
  const { personal, suggested, suggestedCount } = splitSuggestedRules(allRules, categories);
  const pack = categories ? rulesToCreate(categories, allRules) : null;
  const missingFromPack = pack?.toCreate.length ?? 0;

  return (
    <div className={styles.page}>
      <UrlNoticeToast notice={notice} />

      <PageHeader
        title="Regras"
        context={
          allRules.length === 0
            ? "Categorize automaticamente as próximas movimentações que combinarem."
            : `${allRules.length} ${allRules.length === 1 ? "regra" : "regras"} · da maior para a menor prioridade`
        }
        actions={
          canCreate ? (
            <PanelToggle flag="nova" forceOpen={forceOpen}>
              Nova regra
            </PanelToggle>
          ) : null
        }
      />

      {/* Explicação permanente da precedência (S2-06): a interface explica, o backend decide. */}
      <Disclosure
        icon={<IconInfo size={18} />}
        summary="Como as regras são aplicadas"
        defaultOpen={allRules.length === 0}
      >
        <ul>
          <li>Uma regra categoriza as movimentações novas que combinarem com a condição.</li>
          <li>
            Quando uma movimentação combina com mais de uma regra ativa, vale a de maior
            prioridade; em empate, a regra mais antiga.
          </li>
          <li>Sua escolha manual de categoria sempre prevalece.</li>
          <li>As regras valem só para movimentações novas e não alteram as já registradas.</li>
        </ul>
      </Disclosure>

      {categories === null || accounts === null ? (
        <Notice
          tone="warning"
          actions={
            <Link className={ui.inlineLink} href={pageHref()}>
              Tentar de novo
            </Link>
          }
        >
          Não foi possível carregar suas {categories === null ? "categorias" : "contas"}. Os nomes
          podem aparecer como indisponíveis e a criação de regras fica pausada até carregarem.
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
          Uma regra aplica uma categoria sua. Você precisa de ao menos uma categoria ativa para
          criar regras.
        </EmptyState>
      ) : null}

      {canCreate && accounts ? (
        <RuleCreatePanel categories={activeCategories} accounts={accounts} forceOpen={forceOpen} />
      ) : null}

      {rulesTruncated ? (
        <Notice tone="info">Você tem mais de {SELECTOR_ITEM_LIMIT} regras: a lista mostra só as primeiras.</Notice>
      ) : null}

      {personal.length === 0 ? (
        canCreate && suggestedCount === 0 ? (
          <EmptyState icon={<IconRules size={22} />} title="Nenhuma regra ainda">
            Uma regra pessoal diz, por exemplo: “se a descrição contém mercado, use Alimentação”.
            Crie a primeira no painel acima ou adicione o pacote de regras sugeridas abaixo.
          </EmptyState>
        ) : null
      ) : (
        <section className={styles.list} aria-labelledby="suas-regras">
          <h2 className={styles.listTitle} id="suas-regras">
            Suas regras <span className={styles.listCount}>({personal.length})</span>
          </h2>
          <div className={styles.listHead} aria-hidden>
            <span>Regra</span>
            <span>Prioridade</span>
            <span>Status</span>
            <span />
          </div>
          <ul className={ui.list}>
            {personal.map((rule) => (
              // `updatedAt` na chave remonta o item após editar, fechando o painel.
              <RuleItem key={`${rule.id}:${rule.updatedAt}`} rule={rule} categories={categories} accounts={accounts} />
            ))}
          </ul>
        </section>
      )}

      {categories !== null ? (
        <RulePack
          hasActiveCategories={activeCategories.length > 0}
          groups={suggested}
          count={suggestedCount}
          missing={missingFromPack}
          missingCategories={pack?.missingCategories ?? []}
          categories={categories}
          accounts={accounts}
        />
      ) : null}
    </div>
  );
}
