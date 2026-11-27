import Link from "next/link";
import { createHash } from "node:crypto";
import { z } from "zod";
import { PageHeader, ui } from "@/components/ui";
import { getConnection } from "@/lib/connections/api";
import { connectionErrorMessage, isConnectionDenied } from "@/lib/connections/messages";
import { isAccessDenied } from "@/lib/connections/resume-pointer";
import { readResumePointer } from "@/lib/connections/resume-store";
import type { Connection } from "@/lib/connections/types";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";
import { auth0 } from "@/lib/auth0";
import { ConnectFlow } from "./connect-flow";
import styles from "./conectar.module.css";

const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para continuar.";

export default async function ConectarPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // O backend nao lista conexoes: o id vem do link (`conexao`) ou do ponteiro guardado no servidor
  // na ultima conclusao deste usuario (C-01).
  const { conexao } = await searchParams;
  const session = await auth0.getSession();
  const owner = session?.user.sub
    ? createHash("sha256").update(session.user.sub).digest("hex")
    : "";
  const fromUrl = z.uuid().safeParse(conexao);
  const pointer = fromUrl.success ? null : await readResumePointer();
  const connectionId = fromUrl.success ? fromUrl : z.uuid().safeParse(pointer);

  let connection: Connection | null = null;
  let stalePointer = false;
  let notice: { tone: "error"; message: string; reauth?: boolean } | undefined;
  let deniedConnectionId: string | undefined;
  if (connectionId.success) {
    const token = await accessTokenOrNull();
    if (!token) {
      notice = { tone: "error", message: SESSION_EXPIRED, reauth: true };
    } else {
      try {
        connection = await getConnection(connectionId.data, { accessToken: token });
      } catch (error) {
        if (isConnectionDenied(error)) deniedConnectionId = connectionId.data;
        if (pointer && isAccessDenied(error)) {
          // Ponteiro de outra epoca: volta ao inicio sem alarme e pede o descarte do cookie.
          stalePointer = true;
        } else {
          notice = isAuthFailure(error)
            ? { tone: "error", message: SESSION_EXPIRED, reauth: true }
            : { tone: "error", message: connectionErrorMessage(error, "Não foi possível abrir esta conexão. Tente de novo.") };
        }
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
      <ConnectFlow owner={owner} initialConnection={connection} initialNotice={notice} deniedConnectionId={deniedConnectionId} stalePointer={stalePointer} />
    </div>
  );
}
