import Link from "next/link";
import {
  IconCategories,
  IconChevronLeft,
  IconChevronRight,
  IconPlus,
} from "@/components/icons";
import { EmptyState, Notice, PageHeader, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listCategories } from "@/lib/categories/api";
import { PAGE_SIZE, parsePageParam, totalPages } from "../movimentacoes/presentation";
import { CategoryForm } from "./category-form";
import { CategoryItem } from "./category-item";
import { isNoticeKey, NOTICES } from "./notices";
import styles from "./categorias.module.css";

export default async function CategoriasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { aviso, pagina, nova } = await searchParams;
  const notice = isNoticeKey(aviso) ? NOTICES[aviso] : null;
  const page = parsePageParam(pagina);

  const { token } = await auth0.getAccessToken();
  const categories = await listCategories({ page, pageSize: PAGE_SIZE }, { accessToken: token });
  const pages = totalPages(categories.total, PAGE_SIZE);
  const pageHref = (target: number) => `/categorias?pagina=${target}`;
  // Sem nenhuma categoria, o painel já começa aberto: é a próxima ação óbvia.
  const formOpen = nova === "1" || categories.total === 0;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Categorias"
        context={
          categories.total === 0
            ? "Organize suas movimentações com categorias pessoais."
            : `${categories.total} ${categories.total === 1 ? "categoria" : "categorias"} · ativas e arquivadas`
        }
        actions={
          formOpen ? null : (
            <Link
              className={`${ui.button} ${ui.primary}`}
              href={`/categorias?pagina=${page}&nova=1`}
              scroll={false}
            >
              <IconPlus size={18} />
              Nova categoria
            </Link>
          )
        }
      />

      {notice ? (
        <Notice
          tone={notice.tone}
          actions={
            <Link className={ui.inlineLink} href={pageHref(page)} replace>
              Fechar aviso
            </Link>
          }
        >
          {notice.text}
        </Notice>
      ) : null}

      {formOpen ? <CategoryForm closeHref={pageHref(page)} /> : null}

      {categories.total === 0 ? (
        <EmptyState icon={<IconCategories size={22} />} title="Nenhuma categoria ainda">
          Categorias ajudam a entender para onde vai o dinheiro. Crie a primeira no painel acima e
          atribua às suas movimentações.
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

          {pages > 1 ? (
            <nav className={ui.pagination} aria-label="Páginas de categorias">
              {page > 1 ? (
                <Link className={ui.pageLink} href={pageHref(page - 1)}>
                  <IconChevronLeft size={16} />
                  Anterior
                </Link>
              ) : (
                <span />
              )}
              <span className="tabular">
                Página {page} de {pages}
              </span>
              {page < pages ? (
                <Link className={`${ui.pageLink} ${ui.pageLinkNext}`} href={pageHref(page + 1)}>
                  Próxima
                  <IconChevronRight size={16} />
                </Link>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </section>
      )}
    </div>
  );
}
