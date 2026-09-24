import Link from "next/link";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { AppNav } from "../app-nav";
import { AccountForm } from "./account-form";
import { AccountItem } from "./account-item";
import { isNoticeKey, NOTICES } from "./notices";
import styles from "./contas.module.css";

export default async function ContasPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { aviso } = await searchParams;
  const notice = isNoticeKey(aviso) ? NOTICES[aviso] : null;

  const { token } = await auth0.getAccessToken();
  const accounts = await listAccounts({}, { accessToken: token });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Suas contas</h1>
        <AppNav current="contas" />
      </header>

      {notice ? (
        <div className={styles.notice} role="status">
          <p>{notice}</p>
          <Link className={styles.signOut} href="/contas" replace>
            Fechar aviso
          </Link>
        </div>
      ) : null}

      <section className={styles.panel}>
        <AccountForm />
      </section>

      {accounts.items.length === 0 ? (
        <p className={styles.empty}>
          Voce ainda nao tem contas. Crie a primeira no formulario acima.
        </p>
      ) : (
        <ul className={styles.list}>
          {accounts.items.map((account) => (
            // `updatedAt` na chave remonta o item apos edicao, descartando campos antigos.
            <AccountItem key={`${account.id}:${account.updatedAt}`} account={account} />
          ))}
        </ul>
      )}
    </div>
  );
}
