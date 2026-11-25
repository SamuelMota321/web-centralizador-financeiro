"use client";

import dynamic from "next/dynamic";
import { useId, useRef, useState, useTransition } from "react";
import { showToast } from "@/components/interactive";
import { Notice, PendingLabel, StatusChip, ui } from "@/components/ui";
import { startUpdateSessionAction } from "./actions";
import { formatTimestamp } from "./presentation";
import { canRequestSync, reasonText, reconciledText, shouldPoll, syncView, triggerText } from "./sync-presentation";
import { useSyncRun } from "./use-sync-run";
import styles from "./conectar.module.css";

const PluggyWidget = dynamic(() => import("./pluggy-widget"), { ssr: false });

/**
 * Sincronização manual da conexão (HU-008). Estado com marcador e rótulo; só opacidade e
 * ícone mudam, nenhum número anima. A última reconciliação continua visível em falha.
 */
export function SyncPanel({ connectionId }: { connectionId: string }) {
  const id = useId();
  const sync = useSyncRun(connectionId);
  const [updateToken, setUpdateToken] = useState<string | null>(null);
  const [opening, startOpening] = useTransition();
  const [updateError, setUpdateError] = useState<string | null>(null);
  const widgetDone = useRef(false);

  const run = sync.latest;
  const view = syncView(run);
  const active = run !== null && shouldPoll(run.status);

  function openUpdate() {
    setUpdateError(null);
    startOpening(async () => {
      const result = await startUpdateSessionAction(connectionId);
      if (result.status === "error") {
        setUpdateError(result.message);
        return;
      }
      widgetDone.current = false;
      setUpdateToken(result.connectToken);
    });
  }

  return (
    <section className={styles.sync} aria-labelledby={`${id}-sync`}>
      <div className={styles.detailHeader}>
        <h3 id={`${id}-sync`} className={styles.syncTitle}>
          Sincronização
        </h3>
        {sync.loading ? null : <StatusChip tone={view.tone}>{view.label}</StatusChip>}
      </div>

      {/* role=status anuncia a troca de estado sem roubar o foco. */}
      <div role="status" aria-live="polite" className={styles.syncState} data-active={active || undefined}>
        {sync.loading ? (
          <p className={styles.syncMeta}>Consultando a última sincronização…</p>
        ) : (
          <>
            <Notice tone={view.noticeTone}>{view.explanation}</Notice>
            {run && run.status === "partial" && run.reasons.length > 0 ? (
              <ul className={styles.syncReasons}>
                {run.reasons.map((reason) => (
                  <li key={`${reason.dataType}-${reason.code}`}>{reasonText(reason)}</li>
                ))}
              </ul>
            ) : null}
            {run ? (
              <p className={styles.syncMeta}>
                {triggerText(run)} em {formatTimestamp(run.acceptedAt)}
              </p>
            ) : null}
            <p className={styles.syncMeta}>{reconciledText(sync.lastReconciled)}</p>
          </>
        )}
      </div>

      {sync.error ? <Notice tone="error">{sync.error.message}</Notice> : null}
      {updateError ? <Notice tone="error">{updateError}</Notice> : null}

      <div className={styles.actions}>
        {run?.status === "action_required" ? (
          <button className={`${ui.button} ${ui.primary}`} type="button" onClick={openUpdate} disabled={opening} aria-busy={opening}>
            <PendingLabel pending={opening} idle="Autorizar de novo no banco" busy="Abrindo…" />
          </button>
        ) : null}
        <button
          className={`${ui.button} ${run?.status === "action_required" ? ui.secondary : ui.primary}`}
          type="button"
          onClick={() => void sync.request()}
          disabled={sync.loading || sync.requesting || !canRequestSync(run)}
          aria-busy={sync.requesting}
        >
          <PendingLabel
            pending={sync.requesting}
            idle={run?.status === "failed" ? "Tentar de novo" : active ? "Sincronizando…" : "Sincronizar agora"}
            busy="Pedindo…"
          />
        </button>
      </div>

      {updateToken ? (
        <PluggyWidget
          connectToken={updateToken}
          onItem={() => {
            if (widgetDone.current) return;
            widgetDone.current = true;
            setUpdateToken(null);
            showToast("success", "Autorização renovada. Pedimos uma nova sincronização.");
            // Após a ação do usuário, uma nova execução; se o backend já criou, a API devolve a ativa.
            void sync.request();
          }}
          onFailure={() => {
            if (widgetDone.current) return;
            widgetDone.current = true;
            setUpdateToken(null);
            setUpdateError("O banco ou o Pluggy recusou a nova autorização. Tente de novo.");
          }}
          onClose={() => {
            if (!widgetDone.current) setUpdateToken(null);
          }}
        />
      ) : null}
    </section>
  );
}
