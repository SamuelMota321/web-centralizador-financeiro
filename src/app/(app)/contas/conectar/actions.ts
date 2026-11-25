"use server";

import { z } from "zod";
import {
  completePluggyConnection,
  disconnectConnection,
  getConnection,
  startPluggySession,
} from "@/lib/connections/api";
import { connectionErrorMessage } from "@/lib/connections/messages";
import { isAccessDenied } from "@/lib/connections/resume-pointer";
import { getLatestSyncRuns, getSyncRun, isTrustedStatusUrl, requestSyncRun, requestUpdateSession } from "@/lib/sync-runs/api";
import type { SyncRun } from "@/lib/sync-runs/types";
import { clearResumePointer, saveResumePointer } from "@/lib/connections/resume-store";
import type { Connection } from "@/lib/connections/types";
import { newIdempotencyKey } from "@/lib/idempotency";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";

// O token da sessao Auth0 fica no servidor; o navegador recebe so o connectToken limitado do
// Pluggy, que abre o widget e expira. Credenciais da aplicacao Pluggy existem so no backend.

const uuidSchema = z.uuid();
const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para continuar.";

export type ActionError = { status: "error"; message: string; reauth?: boolean };

export type SessionResult =
  | { status: "ok"; connectToken: string; connectionId: string; completionKey: string }
  | ActionError;

export type ConnectionResult = { status: "ok"; connection: Connection } | ActionError;

/** Abre uma sessao nova a cada tentativa: o token e de uso curto e nunca e guardado. */
export async function startSessionAction(): Promise<SessionResult> {
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: SESSION_EXPIRED, reauth: true };

  try {
    const session = await startPluggySession({ accessToken: token });
    return { status: "ok", connectToken: session.connectToken, connectionId: session.connection.id, completionKey: newIdempotencyKey() };
  } catch (error) {
    return failure(error, "Não foi possível iniciar a conexão. Tente de novo.");
  }
}

/**
 * `itemId` vem do widget no navegador e e entrada nao confiavel: validado aqui e conferido
 * pelo backend, que liga o item ao tenant. Reenviar o mesmo itemId apos falha e seguro.
 */
export async function completeConnectionAction(itemId: string, idempotencyKey: string): Promise<ConnectionResult> {
  const parsed = uuidSchema.safeParse(itemId);
  const key = uuidSchema.safeParse(idempotencyKey);
  if (!parsed.success || !key.success) {
    return { status: "error", message: "O banco não devolveu uma conexão válida. Tente conectar de novo." };
  }

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: SESSION_EXPIRED, reauth: true };

  try {
    const accepted = await completePluggyConnection(parsed.data, key.data, { accessToken: token });
    // C-01: o id devolvido pela conclusao e o unico ponteiro de retomada (nunca accountId nem o Item).
    await saveResumePointer(accepted.connection.id);
    return { status: "ok", connection: { ...accepted.connection, initialImport: accepted.initialImport } };
  } catch (error) {
    return failure(error, "Não foi possível registrar a conexão. Tente de novo.");
  }
}

export async function refreshConnectionAction(connectionId: string): Promise<ConnectionResult> {
  return withConnection(connectionId, getConnection, "Não foi possível consultar a conexão. Tente de novo.");
}

export async function disconnectAction(connectionId: string): Promise<ConnectionResult> {
  const result = await withConnection(connectionId, disconnectConnection, "Não foi possível remover a conexão. Tente de novo.");
  if (result.status === "ok") await clearResumePointer();
  return result;
}

/** A pagina nao grava cookie: quando o ponteiro guardado e recusado pela API, o cliente pede o descarte. */
export async function forgetResumePointerAction(): Promise<void> {
  await clearResumePointer();
}

async function withConnection(
  connectionId: string,
  call: typeof getConnection,
  fallback: string,
): Promise<ConnectionResult> {
  const id = uuidSchema.safeParse(connectionId);
  if (!id.success) return { status: "error", message: "Não foi possível encontrar esta conexão." };

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: SESSION_EXPIRED, reauth: true };

  try {
    return { status: "ok", connection: await call(id.data, { accessToken: token }) };
  } catch (error) {
    if (isAccessDenied(error)) await clearResumePointer();
    return failure(error, fallback);
  }
}

function failure(error: unknown, fallback: string): ActionError {
  if (isAuthFailure(error)) return { status: "error", message: SESSION_EXPIRED, reauth: true };
  return { status: "error", message: connectionErrorMessage(error, fallback) };
}

// ---------- HU-008: sincronização manual ----------

export type SyncRunResult = { status: "ok"; run: SyncRun } | ActionError;
export type LatestSyncResult = { status: "ok"; latest: SyncRun | null; lastReconciled: SyncRun | null } | ActionError;
export type UpdateSessionResult = { status: "ok"; connectToken: string } | ActionError;

async function withSyncToken<T>(
  connectionId: string,
  run: (id: string, context: { accessToken: string }) => Promise<T>,
  fallback: string,
): Promise<T | ActionError> {
  const id = uuidSchema.safeParse(connectionId);
  if (!id.success) return { status: "error", message: "Não foi possível encontrar esta conexão." };
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: SESSION_EXPIRED, reauth: true };
  try {
    return await run(id.data, { accessToken: token });
  } catch (error) {
    if (isAccessDenied(error)) await clearResumePointer();
    return failure(error, fallback);
  }
}

/** Uma execução por conexão: com outra ativa, a API devolve a existente e a tela a mostra. */
export async function requestSyncAction(connectionId: string): Promise<SyncRunResult> {
  const result = await withSyncToken(
    connectionId,
    async (id, context) => ({ status: "ok", run: await requestSyncRun(id, context) }) as const,
    "Não foi possível pedir a sincronização. Tente de novo.",
  );
  // C-01: a URL de andamento só é aceita na origem da API; a consulta segue pela rota tipada pelo id.
  if (result.status === "ok" && !isTrustedStatusUrl(result.run.statusUrl)) {
    return { status: "error", message: "A resposta do servidor não pôde ser confirmada. Tente de novo." };
  }
  return result;
}

export async function getSyncRunAction(connectionId: string, runId: string): Promise<SyncRunResult> {
  if (!uuidSchema.safeParse(runId).success) return { status: "error", message: "Execução inválida." };
  return withSyncToken(
    connectionId,
    async (id, context) => ({ status: "ok", run: await getSyncRun(id, runId, context) }) as const,
    "Não foi possível consultar a sincronização.",
  );
}

export async function getLatestSyncAction(connectionId: string): Promise<LatestSyncResult> {
  return withSyncToken(
    connectionId,
    async (id, context) => ({ status: "ok", ...(await getLatestSyncRuns(id, context)) }) as const,
    "Não foi possível consultar a última sincronização.",
  );
}

/** Só o token limitado do widget vai ao navegador; ele expira e nunca é guardado. */
export async function startUpdateSessionAction(connectionId: string): Promise<UpdateSessionResult> {
  return withSyncToken(
    connectionId,
    async (id, context) => ({ status: "ok", connectToken: (await requestUpdateSession(id, context)).connectToken }) as const,
    "Não foi possível abrir a autorização no banco. Tente de novo.",
  );
}
