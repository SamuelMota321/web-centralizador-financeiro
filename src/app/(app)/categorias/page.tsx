import Link from "next/link";
import {
  IconCategories,
} from "@/components/icons";
import { UrlNoticeToast } from "@/components/interactive";
import { PanelSection, PanelToggle } from "@/components/panel";
import { EmptyState, PageHeader, Pagination, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAllPages } from "@/lib/api/pagination";
import { listCategories } from "@/lib/categories/api";
import { categoriesToCreate } from "@/lib/categories/suggestions";
import { PAGE_SIZE, parsePageParam, totalPages } from "../movimentacoes/presentation";
import { CategoryForm } from "./category-form";
import { CategoryItem } from "./category-item";
import { isNoticeKey, NOTICES } from "./notices";
import { SuggestedCategories } from "./suggested-categories";
import styles from "./categorias.module.css";

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { aviso, pagina } = await searchParams;
  const notice = isNoticeKey(aviso) ? NOTICES[aviso] : null;
  const page = parsePageParam(pagina);

  const { token } = await auth0.getAccessToken();
  const context = { accessToken: token };
  // A lista completa de nomes só serve para saber quais sugeridas faltam; se falhar, o aviso some.
  const [categories, allNames] = await Promise.all([
    listCategories({ page, pageSize: PAGE_SIZE }, context),
    listAllPages((query) => listCategories(query, context)).catch(() => null),
  ]);
  const missingSuggested = categories.total > 0 && allNames ? categoriesToCreate(allNames.items) : [];
  const pages = totalPages(categories.total, PAGE_SIZE);
  const pageHref = (target: number) => `/categorias?pagina=${target}`;
  // Sem nenhuma categoria, o painel já começa aberto: é a próxima ação óbvia.
  const forceOpen = categories.total === 0;

  return (
    <div className={styles.page}>
      <UrlNoticeToast notice={notice} />

      <PageHeader
        title="Categorias"
        context={
          categories.total === 0
            ? "Organize suas movimentações com categorias pessoais."
            : `${categories.total} ${categories.total === 1 ? "categoria" : "categorias"} · ativas e arquivadas`
        }
        actions={
          <PanelToggle flag="nova" forceOpen={forceOpen}>
            Nova categoria
          </PanelToggle>
        }
      />

      <PanelSection
        flag="nova"
        forceOpen={forceOpen}
        title="Nova categoria"
        description="Use nomes que façam sentido para você. As sugeridas são só um ponto de partida."
        closeLabel="Fechar o painel de nova categoria"
      >
        <CategoryForm />
      </PanelSection>

      {missingSuggested.length > 0 ? <SuggestedCategories missing={missingSuggested} /> : null}

      {categories.total === 0 ? (
        <EmptyState icon={<IconCategories size={22} />} title="Nenhuma categoria ainda" action={<SuggestedCategories />}>
          Categorias ajudam a entender para onde vai o dinheiro. Crie a sua no painel acima ou use um
          conjunto básico pronto.
        </EmptyState>
      ) : categories.items.length === 0 ? (
        <EmptyState
          icon={<IconCategories size={22} />}
          title="Esta página não existe"
          action={
            <Link className={`${ui.button} ${ui.secondary}`} href="/categorias">
              Voltar para a primeira página
            </Link>
          }
        >
          A lista tem {pages} {pages === 1 ? "página" : "páginas"}.
        </EmptyState>
      ) : (
        <section className={styles.list} aria-label="Suas categorias">
          <ul className={ui.list}>
            {categories.items.map((category) => (
              // `updatedAt` na chave remonta o item após renomear, fechando o painel.
              <CategoryItem key={`${category.id}:${category.updatedAt}`} category={category} />
            ))}
          </ul>

          <Pagination page={page} pages={pages} href={pageHref} label="Páginas de categorias" />
        </section>
      )}
    </div>
  );
}
