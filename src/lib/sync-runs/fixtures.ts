// Dados ficticios no formato do OpenAPI publicado. Somente para testes.

export const SYNC_CONNECTION_ID = "b2a7e0c4-1f3d-4a5b-8c9d-0e1f2a3b4c5d";
export const RUN_ID = "7c6b5a49-3827-4615-a4b3-c2d1e0f9a8b7";

export function syncRunView(overrides: Record<string, unknown> = {}) {
  return {
    runId: RUN_ID,
    connectionId: SYNC_CONNECTION_ID,
    status: "queued",
    trigger: "manual",
    acceptedAt: "2026-11-02T12:00:00.000Z",
    startedAt: null,
    completedAt: null,
    referenceDate: null,
    reasons: [],
    statusUrl: `/api/v1/connections/${SYNC_CONNECTION_ID}/sync-runs/${RUN_ID}`,
    ...overrides,
  };
}

export function latestSyncRunsView(overrides: Record<string, unknown> = {}) {
  return { latest: syncRunView(), lastReconciled: null, ...overrides };
}
