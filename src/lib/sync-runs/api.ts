import { z } from "zod";
import { apiBaseUrl } from "../api/config";
import { apiRequest } from "../api/http-client";
import { toProblemError } from "../api/problem-error";
import { syncRunSchema } from "./schema";
import { FINAL_SYNC_RUN_STATUSES, type SyncRun, type SyncRunStatus } from "./types";

// HU-008 — contrato C-03 da S4-01. Uma nova solicitacao com execucao ativa devolve a
// execucao existente (no maximo uma por conexao), entao o cliente nao envia
// Idempotency-Key: o contrato nao a define. O intervalo de consulta continua pendente
// entre Developer 1 e Developer 3; nada aqui consulta periodicamente.

/** Credencial da requisicao em curso, sempre explicita. Ver `RequestOptions.accessToken`. */
export interface SyncRunsRequestContext {
  accessToken: string;
}

const uuidSchema = z.uuid();

/** POST /api/v1/connections/{connectionId}/sync-runs — 202 quando aceita para processamento. */
export async function requestSyncRun(connectionId: string, context: SyncRunsRequestContext): Promise<SyncRun> {
  const id = uuidSchema.parse(connectionId);
  try {
    const raw = await apiRequest<unknown>(`/connections/${id}/sync-runs`, {
      method: "POST",
      accessToken: context.accessToken,
    });
    return syncRunSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** GET /api/v1/connections/{connectionId}/sync-runs/{runId} — andamento de uma execucao. */
export async function getSyncRun(
  connectionId: string,
  runId: string,
  context: SyncRunsRequestContext,
): Promise<SyncRun> {
  const connection = uuidSchema.parse(connectionId);
  const run = uuidSchema.parse(runId);
  try {
    const raw = await apiRequest<unknown>(`/connections/${connection}/sync-runs/${run}`, {
      method: "GET",
      accessToken: context.accessToken,
    });
    return syncRunSchema.parse(raw);
  } catch (error) {
    throw toProblemError(error);
  }
}

/** `succeeded`, `partial` e `failed` encerram a consulta; os demais ainda estao em andamento. */
export function isFinalSyncRunStatus(status: SyncRunStatus): boolean {
  return (FINAL_SYNC_RUN_STATUSES as readonly SyncRunStatus[]).includes(status);
}

/**
 * C-01: validar a origem de `statusUrl` antes de usa-la. So aceita a mesma origem da API
 * (URL relativa resolve contra ela); qualquer outra origem e recusada.
 */
export function isTrustedStatusUrl(statusUrl: string, baseUrl: string = apiBaseUrl): boolean {
  try {
    const base = new URL(baseUrl);
    return new URL(statusUrl, `${base.origin}/`).origin === base.origin;
  } catch {
    return false;
  }
}
