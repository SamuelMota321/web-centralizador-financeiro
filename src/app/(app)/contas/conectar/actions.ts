"use server";

import { z } from "zod";
import {
  completePluggyConnection,
  disconnectConnection,
  getConnection,
  startPluggySession,
} from "@/lib/connections/api";
import { connectionErrorMessage } from "@/lib/connections/messages";
import type { Connection } from "@/lib/connections/types";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";

// O token da sessao Auth0 fica no servidor; o navegador recebe so o connectToken limitado do
// Pluggy, que abre o widget e expira. Credenciais da aplicacao Pluggy existem so no backend.

const uuidSchema = z.uuid();
const SESSION_EXPIRED = "Sua sessão expirou. Entre novamente para continuar.";

export type ActionError = { status: "error"; message: string; reauth?: boolean };

export type SessionResult =
  | { status: "ok"; connectToken: string; connectionId: string }
  | ActionError;

export type ConnectionResult = { status: "ok"; connection: Connection } | ActionError;

/** Abre uma sessao nova a cada tentativa: o token e de uso curto e nunca e guardado. */
export async function startSessionAction(): Promise<SessionResult> {
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: SESSION_EXPIRED, reauth: true };

  try {
    const session = await startPluggySession({ accessToken: token });
    return { status: "ok", connectToken: session.connectToken, connectionId: session.connection.id };
  } catch (error) {
    return failure(error, "Não foi possível iniciar a conexão. Tente de novo.");
  }
}

/**
 * `itemId` vem do widget no navegador e e entrada nao confiavel: validado aqui e conferido
 * pelo backend, que liga o item ao tenant. Reenviar o mesmo itemId apos falha e seguro.
 */
export async function completeConnectionAction(itemId: string): Promise<ConnectionResult> {
  const parsed = uuidSchema.safeParse(itemId);
  if (!parsed.success) {
    return { status: "error", message: "O banco não devolveu uma conexão válida. Tente conectar de novo." };
  }

  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: SESSION_EXPIRED, reauth: true };

  try {
    return { status: "ok", connection: await completePluggyConnection(parsed.data, { accessToken: token }) };
  } catch (error) {
    return failure(error, "Não foi possível registrar a conexão. Tente de novo.");
  }
}

export async function refreshConnectionAction(connectionId: string): Promise<ConnectionResult> {
  return withConnection(connectionId, getConnection, "Não foi possível consultar a conexão. Tente de novo.");
}

export async function disconnectAction(connectionId: string): Promise<ConnectionResult> {
  return withConnection(connectionId, disconnectConnection, "Não foi possível remover a conexão. Tente de novo.");
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
    return failure(error, fallback);
  }
}

function failure(error: unknown, fallback: string): ActionError {
  if (isAuthFailure(error)) return { status: "error", message: SESSION_EXPIRED, reauth: true };
  return { status: "error", message: connectionErrorMessage(error, fallback) };
}
