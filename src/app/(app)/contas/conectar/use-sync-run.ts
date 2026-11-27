"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { SyncRun } from "@/lib/sync-runs/types";
import { type ActionError, getLatestSyncAction, getSyncRunAction, requestSyncAction } from "./actions";
import { nextPollDelay, shouldPoll } from "./sync-presentation";

export interface SyncState {
  latest: SyncRun | null;
  lastReconciled: SyncRun | null;
  loading: boolean;
  requesting: boolean;
  error: ActionError | null;
}

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const update = () => setVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  return visible;
}

/**
 * Andamento da sincronização de uma conexão (HU-008, C-03). Lê a última execução ao abrir;
 * com uma em andamento, consulta a cada 10 s só com a aba visível e para em
 * `action_required` ou num estado final. As chamadas passam pelo servidor Next: o token
 * Auth0 nunca chega ao navegador.
 */
export function useSyncRun(connectionId: string) {
  const [state, setState] = useState<SyncState>({
    latest: null,
    lastReconciled: null,
    loading: true,
    requesting: false,
    error: null,
  });
  const visible = usePageVisible();
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const loadLatest = useCallback(async () => {
    const result = await getLatestSyncAction(connectionId);
    if (!mounted.current) return;
    setState((current) =>
      result.status === "ok"
        ? { ...current, latest: result.latest, lastReconciled: result.lastReconciled, loading: false, error: null }
        : { ...current, loading: false, error: result },
    );
  }, [connectionId]);

  useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  const runId = state.latest?.runId;
  const status = state.latest?.status;
  const delay = nextPollDelay(state.latest, visible);

  useEffect(() => {
    if (delay === null || !runId) return;
    let cancelled = false;
    // setTimeout encadeado: a próxima consulta só é agendada depois que a anterior volta.
    const timer = window.setTimeout(async () => {
      const result = await getSyncRunAction(connectionId, runId);
      if (cancelled || !mounted.current) return;
      if (result.status === "error") {
        setState((current) => ({ ...current, error: result }));
        return;
      }
      setState((current) => ({ ...current, latest: result.run, error: null }));
      // Ao terminar, relê `latest` para atualizar a última reconciliação.
      if (!shouldPoll(result.run.status)) void loadLatest();
    }, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // `status` entra para reagendar a cada resposta em andamento.
  }, [connectionId, runId, status, delay, loadLatest]);

  const request = useCallback(async () => {
    setState((current) => ({ ...current, requesting: true, error: null }));
    const result = await requestSyncAction(connectionId);
    if (!mounted.current) return;
    setState((current) =>
      result.status === "error"
        ? { ...current, requesting: false, error: result }
        : { ...current, requesting: false, latest: result.run },
    );
  }, [connectionId]);

  return { ...state, request, reload: loadLatest };
}
