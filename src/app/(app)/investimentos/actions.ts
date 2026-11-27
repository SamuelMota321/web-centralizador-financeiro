"use server";

import { revalidatePath } from "next/cache";
import { ProblemDetailsError } from "@/lib/api/errors";
import { BATCH_SIZE } from "@/lib/api/batch";
import { listInvestments } from "@/lib/investments/api";
import { accessTokenOrNull, isAuthFailure } from "@/lib/session";
import { requestSyncRun } from "@/lib/sync-runs/api";

const REAUTH_MESSAGE = "Sua sessão expirou. Entre novamente para continuar.";

export type RefreshState =
  | { status: "idle" }
  | { status: "done"; total: number; requested: number; running: number; failed: number }
  | { status: "error"; message: string; reauth?: boolean };

/**
 * Pede a sincronização de cada conexão da carteira, em lotes. As conexões vêm do servidor (a
 * carteira), nunca do navegador. Não acompanha o andamento: isso é do painel de "Conectar banco".
 * Uma conexão que já sincroniza (409) conta como "em andamento", não como falha.
 */
export async function refreshInvestmentsAction(): Promise<RefreshState> {
  const token = await accessTokenOrNull();
  if (!token) return { status: "error", message: REAUTH_MESSAGE, reauth: true };
  const context = { accessToken: token };

  let ids: string[];
  try {
    const { portfolio } = await listInvestments({ page: 1, pageSize: 1 }, context);
    ids = portfolio.connections.map((connection) => connection.connectionId);
  } catch (error) {
    if (isAuthFailure(error)) return { status: "error", message: REAUTH_MESSAGE, reauth: true };
    return { status: "error", message: "Não foi possível ler suas conexões. Tente de novo." };
  }
  if (ids.length === 0) return { status: "done", total: 0, requested: 0, running: 0, failed: 0 };

  let requested = 0;
  let running = 0;
  let failed = 0;
  for (let start = 0; start < ids.length; start += BATCH_SIZE) {
    const results = await Promise.allSettled(ids.slice(start, start + BATCH_SIZE).map((id) => requestSyncRun(id, context)));
    for (const result of results) {
      if (result.status === "fulfilled") requested += 1;
      else if (isAuthFailure(result.reason)) return { status: "error", message: REAUTH_MESSAGE, reauth: true };
      else if (result.reason instanceof ProblemDetailsError && result.reason.status === 409) running += 1;
      else failed += 1;
    }
  }

  revalidatePath("/investimentos");
  return { status: "done", total: ids.length, requested, running, failed };
}
