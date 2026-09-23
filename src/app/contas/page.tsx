import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import type { Account } from "@/lib/accounts/types";
import { AccountForm } from "./account-form";
import styles from "./contas.module.css";

const TYPE_LABELS: Record<Account["type"], string> = {
  checking: "Conta corrente",
  savings: "Poupanca",
  payment: "Conta de pagamento",
  cash: "Dinheiro",
  credit_card: "Cartao de credito",
  investment: "Investimento",
  other: "Outra",
};

export default async function ContasPage() {
  const { token } = await auth0.getAccessToken();
  const accounts = await listAccounts({}, { accessToken: token });

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Suas contas</h1>
        <a className={styles.signOut} href="/auth/logout">
          Sair
        </a>
      </header>

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
            <li key={account.id} className={styles.item}>
              <div>
                <p className={styles.itemName}>{account.name}</p>
                <p className={styles.itemMeta}>
                  {TYPE_LABELS[account.type]}
                  {account.institutionName ? ` · ${account.institutionName}` : ""}
                  {account.origin === "connected" ? " · conectada" : ""}
                </p>
              </div>
              <span className={styles.balance}>{account.initialBalance}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
