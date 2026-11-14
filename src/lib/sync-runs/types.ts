// Contrato publico das execucoes de sincronizacao (HU-008), consolidado no adendo de
// 2026-10-27 da S4-01 (C-03). O backend ainda nao publicou estas rotas no OpenAPI:
// reconferir campos e codigos quando forem publicadas, antes de ligar qualquer tela.

export const SYNC_RUN_STATUSES = [
  "queued",
  "running",
  "action_required",
  "succeeded",
  "partial",
  "failed",
] as const;
export type SyncRunStatus = (typeof SYNC_RUN_STATUSES)[number];

/** Estados finais: a consulta de andamento para aqui (C-03). */
export const FINAL_SYNC_RUN_STATUSES = ["succeeded", "partial", "failed"] as const satisfies readonly SyncRunStatus[];

/** Execucao como a API devolve; sem dados financeiros, credenciais ou payload do provedor. */
export interface SyncRun {
  runId: string;
  connectionId: string;
  status: SyncRunStatus;
  acceptedAt: string;
  statusUrl: string;
  /** Quando aplicavel (C-03): nulo enquanto a execucao nao comecou ou nao terminou. */
  startedAt: string | null;
  completedAt: string | null;
}
