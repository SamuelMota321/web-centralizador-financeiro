import Link from "next/link";
import { IconAccounts } from "@/components/icons";
import { EmptyState, PageHeader, ui } from "@/components/ui";
import { auth0 } from "@/lib/auth0";
import { listAccounts } from "@/lib/accounts/api";
import { listAllPages } from "@/lib/api/pagination";
import { newIdempotencyKey } from "@/lib/idempotency";
import { OfxImport } from "./ofx-import";
import styles from "./importar-ofx.module.css";

export default async function ImportarOfxPage() {
  const { token } = await auth0.getAccessToken();
  // GET /accounts devolve so contas ativas: arquivadas nao recebem movimentacoes.
  const { items } = await listAllPages((query) => listAccounts(query, { accessToken: token }));
  const accounts = items.map(({ id, name }) => ({ id, name }));

  return (
    <div className={styles.page}>
      <PageHeader
        title="Importar extrato OFX"
        context="Envie o extrato exportado pelo banco, confira a prévia e confirme. Nada é gravado antes da confirmação."
        actions={
          <Link className={`${ui.button} ${ui.secondary}`} href="/contas">
            Voltar para Contas
          </Link>
        }
      />

      {accounts.length === 0 ? (
        <EmptyState
          icon={<IconAccounts size={22} />}
          title="Crie uma conta antes de importar"
          action={
            <Link className={`${ui.button} ${ui.primary}`} href="/contas?nova=1">
              Criar conta
            </Link>
          }
        >
          As movimentações do extrato entram em uma das suas contas ativas.
        </EmptyState>
      ) : (
        <OfxImport accounts={accounts} initialKey={newIdempotencyKey()} />
      )}
    </div>
  );
}
