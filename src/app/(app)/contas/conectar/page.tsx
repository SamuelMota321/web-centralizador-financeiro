import Link from "next/link";
import { z } from "zod";
import { PageHeader, ui } from "@/components/ui";
import { getConnection } from "@/lib/connections/api";
import { connectionErrorMessage } from "@/lib/connections/messages";
import type { Connection } from "@/lib/connections/types";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";
import { ConnectFlow } from "./connect-flow";
import styles from "./conectar.module.css";

const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para continuar.";

export default async function ConectarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // `conexao` so existe depois de uma conexao concluida nesta tela: o backend nao lista conexoes.
  const { conexao } = await searchParams;
  const connectionId = z.uuid().safeParse(conexao);

  let connection: Connection | null = null;
  let notice: { tone: "error"; message: string; reauth?: boolean } | undefined;
  if (connectionId.success) {
    const token = await accessTokenOrNull();
    if (!token) {
      notice = { tone: "error", message: SESSION_EXPIRED, reauth: true };
    } else {
      try {
        connection = await getConnection(connectionId.data, { accessToken: token });
      } catch (error) {
        notice = isAuthFailure(error)
          ? { tone: "error", message: SESSION_EXPIRED, reauth: true }
          : { tone: "error", message: connectionErrorMessage(error, "Não foi possível abrir esta conexão. Tente de novo.") };
      }
    }
  }

  return (
    <div className={styles.page}>
      <PageHeader
        title="Conectar banco"
        context="Autorize a leitura dos dados de um banco pelo Open Finance, em ambiente de testes (Sandbox)."
        actions={
          <Link className={`${ui.button} ${ui.secondary}`} href="/contas">
            Voltar para Contas
          </Link>
        }
      />
      <ConnectFlow initialConnection={connection} initialNotice={notice} />
    </div>
  );
}
