import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { listCategories } from "@/lib/categories/api";
import { AppNav } from "../app-nav";
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
  const { aviso, pagina } = await searchParams;
  const notice = isNoticeKey(aviso) ? NOTICES[aviso] : null;
  const page = parsePageParam(pagina);

  const { token } = await auth0.getAccessToken();
  const categories = await listCategories({ page, pageSize: PAGE_SIZE }, { accessToken: token });
  const pages = totalPages(categories.total, PAGE_SIZE);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Categorias</h1>
        <AppNav current="categorias" />
      </header>

      {notice ? (
        <div className={styles.notice} role="status">
          <p>{notice}</p>
          <Link className={styles.inlineLink} href="/categorias" replace>
            Fechar aviso
          </Link>
        </div>
      ) : null}

      <section className={styles.panel}>
        <CategoryForm />
      </section>

      {categories.total === 0 ? (
        <p className={styles.state}>
          Suas categorias sao pessoais: nenhuma vem pronta. Crie a primeira no formulario
          acima para organizar suas movimentacoes.
        </p>
      ) : categories.items.length === 0 ? (
        <div className={styles.state}>
          <p>Esta pagina nao existe.</p>
          <Link className={styles.inlineLink} href="/categorias">
            Voltar para a primeira pagina
          </Link>
        </div>
      ) : (
        <>
          <ul className={styles.list}>
            {categories.items.map((category) => (
              // `updatedAt` na chave remonta o item apos renomear, fechando o painel.
              <CategoryItem key={`${category.id}:${category.updatedAt}`} category={category} />
            ))}
          </ul>

          <nav className={styles.pagination} aria-label="Paginas de categorias">
            {page > 1 ? (
              <Link className={styles.inlineLink} href={`/categorias?pagina=${page - 1}`}>
                Anterior
              </Link>
            ) : (
              <span />
            )}
            <span className={styles.itemMeta}>
              Pagina {page} de {pages} · {categories.total}{" "}
              {categories.total === 1 ? "categoria" : "categorias"}
            </span>
            {page < pages ? (
              <Link className={styles.inlineLink} href={`/categorias?pagina=${page + 1}`}>
                Proxima
              </Link>
            ) : (
              <span />
            )}
          </nav>
        </>
      )}
    </div>
  );
}
