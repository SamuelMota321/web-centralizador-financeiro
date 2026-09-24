import Link from "next/link";
import { IconAccounts, IconPlus } from "@/components/icons";
import { EmptyState, Notice, PageHeader, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { AccountForm } from "./account-form";
import { AccountItem } from "./account-item";
import { isNoticeKey, NOTICES } from "./notices";
import styles from "./contas.module.css";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { aviso, nova } = await searchParams;
  const notice = isNoticeKey(aviso) ? NOTICES[aviso] : null;

  const { token } = await auth0.getAccessToken();
  const accounts = await listAccounts({}, { accessToken: token });
  // Sem nenhuma conta, o painel já começa aberto: é a próxima ação óbvia.
  const formOpen = nova === "1" || accounts.items.length === 0;

  return (
    <div className={styles.page}>
      <PageHeader
        title="Contas"
        context={
          accounts.total === 0
            ? "Contas correntes, poupanças, cartões e dinheiro que você acompanha."
            : `${accounts.total} ${accounts.total === 1 ? "conta ativa" : "contas ativas"}`
        }
        actions={
          formOpen ? null : (
            <Link className={`${ui.button} ${ui.primary}`} href="/contas?nova=1" scroll={false}>
              <IconPlus size={18} />
              Nova conta
            </Link>
          )
        }
      />

      {notice ? (
        <Notice
          tone={notice.tone}
          actions={
            <Link className={ui.inlineLink} href="/contas" replace>
              Fechar aviso
            </Link>
          }
        >
          {notice.text}
        </Notice>
      ) : null}

      {formOpen ? <AccountForm closeHref="/contas" /> : null}

      {accounts.items.length === 0 ? (
        <EmptyState icon={<IconAccounts size={22} />} title="Nenhuma conta ainda">
          Crie sua primeira conta no painel acima. Depois, registre as movimentações dela em
          Movimentações.
        </EmptyState>
      ) : (
        <section className={styles.list} aria-label="Suas contas">
          <ul className={ui.list}>
            {accounts.items.map((account) => (
              // `updatedAt` na chave remonta o item após edição, descartando campos antigos.
              <AccountItem key={`${account.id}:${account.updatedAt}`} account={account} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
