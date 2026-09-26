import Link from "next/link";
import { IconAccounts } from "@/components/icons";
import { UrlNoticeToast } from "@/components/interactive";
import { PanelSection, PanelToggle } from "@/components/panel";
import { EmptyState, PageHeader, Pagination, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { PAGE_SIZE, parsePageParam, totalPages } from "../movimentacoes/presentation";
import { AccountForm } from "./account-form";
import { AccountItem } from "./account-item";
import { isNoticeKey, NOTICES } from "./notices";
import styles from "./contas.module.css";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { aviso, pagina } = await searchParams;
  const notice = isNoticeKey(aviso) ? NOTICES[aviso] : null;

  const { token } = await auth0.getAccessToken();
  const page = parsePageParam(pagina);
  const accounts = await listAccounts({ page, pageSize: PAGE_SIZE }, { accessToken: token });
  const pages = totalPages(accounts.total, PAGE_SIZE);
  const pageHref = (target: number) => `/contas?pagina=${target}`;
  // Sem nenhuma conta, o painel já começa aberto: é a próxima ação óbvia.
  const forceOpen = accounts.total === 0;

  return (
    <div className={styles.page}>
      <UrlNoticeToast notice={notice} />

      <PageHeader
        title="Contas"
        context={
          accounts.total === 0
            ? "Contas correntes, poupanças, cartões e dinheiro que você acompanha."
            : `${accounts.total} ${accounts.total === 1 ? "conta ativa" : "contas ativas"}`
        }
        actions={
          <PanelToggle flag="nova" forceOpen={forceOpen}>
            Nova conta
          </PanelToggle>
        }
      />

      <PanelSection
        flag="nova"
        forceOpen={forceOpen}
        title="Nova conta manual"
        description="Registre uma conta que não está conectada. O saldo inicial vale a partir da data de referência."
        closeLabel="Fechar o painel de nova conta"
      >
        <AccountForm />
      </PanelSection>

      {accounts.total === 0 ? (
        <EmptyState icon={<IconAccounts size={22} />} title="Nenhuma conta ainda">
          Crie sua primeira conta no painel acima. Depois, registre as movimentações dela em
          Movimentações.
        </EmptyState>
      ) : accounts.items.length === 0 ? (
        <EmptyState
          icon={<IconAccounts size={22} />}
          title="Esta página não existe"
          action={
            <Link className={`${ui.button} ${ui.secondary}`} href="/contas">
              Voltar para a primeira página
            </Link>
          }
        >
          A lista tem {pages} {pages === 1 ? "página" : "páginas"}.
        </EmptyState>
      ) : (
        <section className={styles.list} aria-label="Suas contas">
          <div className={styles.listHead} aria-hidden>
            <span>Conta</span>
            <span>Origem</span>
            <span>Saldo inicial</span>
            <span />
          </div>
          <ul className={ui.list}>
            {accounts.items.map((account) => (
              // `updatedAt` na chave remonta o item após edição, descartando campos antigos.
              <AccountItem key={`${account.id}:${account.updatedAt}`} account={account} />
            ))}
          </ul>
          <Pagination page={page} pages={pages} href={pageHref} label="Páginas de contas" />
        </section>
      )}
    </div>
  );
}
