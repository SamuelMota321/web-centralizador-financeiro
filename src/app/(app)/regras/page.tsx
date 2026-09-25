import Link from "next/link";
import {
  IconCategories,
  IconInfo,
  IconPlus,
  IconRules,
} from "@/components/icons";
import { UrlNoticeToast } from "@/components/interactive";
import { PanelToggle } from "@/components/panel";
import { Disclosure, EmptyState, Notice, PageHeader, Pagination, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages } from "@/lib/api/pagination";
import { listCategories } from "@/lib/categories/api";
import { listCategoryRules } from "@/lib/category-rules/api";
import { PAGE_SIZE, parsePageParam, totalPages } from "../movimentacoes/presentation";
import { isNoticeKey, NOTICES } from "./notices";
import { RuleCreatePanel } from "./rule-create-panel";
import { RuleItem } from "./rule-item";
import type { CategoryOption, NamedOption } from "./rule-logic";
import styles from "./regras.module.css";

export default async function RegrasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { aviso, pagina } = await searchParams;
  const notice = isNoticeKey(aviso) ? NOTICES[aviso] : null;
  const page = parsePageParam(pagina);

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };

  // Regras são o conteúdo; categorias e contas só dão nome. Falha parcial não esconde a lista.
  const [rulesResult, categoriesResult, accountsResult] = await Promise.allSettled([
    listCategoryRules({ page, pageSize: PAGE_SIZE }, context),
    listAllPages((query) => listCategories(query, context)),
    listAllPages((query) => listAccounts(query, context)),
  ]);

  if (rulesResult.status === "rejected") throw rulesResult.reason;

  const rules = rulesResult.value;
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
  const forceOpen = canCreate && rules.total === 0;
  const pages = totalPages(rules.total, PAGE_SIZE);
  const pageHref = (target: number) => `/regras?pagina=${target}`;

  return (
    <div className={styles.page}>
      <UrlNoticeToast notice={notice} />

      <PageHeader
        title="Regras"
        context={
          rules.total === 0
            ? "Categorize automaticamente as próximas movimentações que combinarem."
            : `${rules.total} ${rules.total === 1 ? "regra" : "regras"} · da maior para a menor prioridade`
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
        defaultOpen={rules.total === 0}
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
            <Link className={ui.inlineLink} href={pageHref(page)}>
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
            <Link className={`${ui.button} ${ui.primary}`} href="/categorias?nova=1">
              <IconPlus size={18} />
              Criar categoria
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

      {rules.total === 0 ? (
        canCreate ? (
          <EmptyState icon={<IconRules size={22} />} title="Nenhuma regra ainda">
            Uma regra pessoal diz, por exemplo: “se a descrição contém mercado, use Alimentação”.
            Crie a primeira no painel acima.
          </EmptyState>
        ) : null
      ) : rules.items.length === 0 ? (
        <EmptyState
          icon={<IconRules size={22} />}
          title="Esta página não existe"
          action={
            <Link className={`${ui.button} ${ui.secondary}`} href="/regras">
              Voltar para a primeira página
            </Link>
          }
        >
          A lista tem {pages} {pages === 1 ? "página" : "páginas"}.
        </EmptyState>
      ) : (
        <section className={styles.list} aria-label="Suas regras">
          <div className={styles.listHead} aria-hidden>
            <span>Regra</span>
            <span>Prioridade</span>
            <span>Status</span>
            <span />
          </div>
          <ul className={ui.list}>
            {rules.items.map((rule) => (
              // `updatedAt` na chave remonta o item após editar, fechando o painel.
              <RuleItem
                key={`${rule.id}:${rule.updatedAt}`}
                rule={rule}
                categories={categories}
                accounts={accounts}
              />
            ))}
          </ul>

          <Pagination page={page} pages={pages} href={pageHref} label="Páginas de regras" />
        </section>
      )}
    </div>
  );
}
