"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { type RefObject, useCallback, useEffect, useId, useRef, useState, useTransition } from "react";
import { BrandSymbol } from "@/components/brand";
import { ConfirmDialog, showToast } from "@/components/interactive";
import { Notice, type NoticeTone, PendingLabel, StatusChip, ui } from "@/components/ui";
import type { Connection } from "@/lib/connections/types";
import { clearConnectionPointer, loadConnectionPointer, saveConnectionPointer } from "@/lib/connections/recovery";
import {
  type ActionError,
  completeConnectionAction,
  disconnectAction,
  forgetResumePointerAction,
  refreshConnectionAction,
  startSessionAction,
} from "./actions";
import {
  canCheckAgain,
  canDisconnect,
  canRefreshInitialImport,
  connectionCelebrates,
  consentSummary,
  formatTimestamp,
  initialImportStatus,
  needsAccountMapping,
  needsReconnect,
  statusView,
} from "./presentation";
import { AccountMapping } from "./account-mapping";
import { SyncPanel } from "./sync-panel";
import styles from "./conectar.module.css";

const RETURN_TO = "/contas/conectar";

// O SDK do Pluggy usa `window` ao ser importado: so pode rodar no navegador.
const PluggyWidget = dynamic(() => import("./pluggy-widget"), { ssr: false });

interface FlowNotice {
  tone: NoticeTone;
  message: string;
  reauth?: boolean;
}

/**
 * - intro: explica o que sera autorizado e oferece "Conectar".
 * - widget: o widget esta aberto com o token desta tentativa (so em memoria).
 * - completing/completeFailed: o banco devolveu o item e o backend esta registrando; em
 *   falha, "Tentar de novo" reenvia o mesmo itemId (seguro no backend).
 * - connection: detalhe da conexao devolvida pelo backend.
 */
type Phase =
  | { kind: "intro"; notice?: FlowNotice }
  | { kind: "widget"; connectToken: string; completionKey: string }
  | { kind: "completing"; itemId: string; completionKey: string }
  | { kind: "completeFailed"; itemId: string; completionKey: string; notice: FlowNotice }
  // `fresh`: a conexao acabou de ser concluida nesta sessao (reabrir pelo link nao celebra).
  | { kind: "connection"; connection: Connection; fresh?: boolean };

interface Props {
  owner: string;
  initialConnection: Connection | null;
  /** Falha ao abrir a conexao indicada na URL. */
  initialNotice?: FlowNotice;
  deniedConnectionId?: string;
  /** O ponteiro de retomada guardado foi recusado pela API: descartar o cookie. */
  stalePointer?: boolean;
}

export function ConnectFlow({ owner, initialConnection, initialNotice, deniedConnectionId, stalePointer }: Props) {
  const [phase, setPhase] = useState<Phase>(
    initialConnection ? { kind: "connection", connection: initialConnection } : { kind: "intro", notice: initialNotice },
  );
  const [starting, startTransition] = useTransition();
  const [restoring, setRestoring] = useState(false);
  const [retryRecovery, setRetryRecovery] = useState(false);
  useEffect(() => {
    if (stalePointer) void forgetResumePointerAction();
  }, [stalePointer]);
  // O widget dispara onClose tambem depois do sucesso; so o fechamento sem item e cancelamento.
  const itemReceived = useRef(false);
  const completionInFlight = useRef(false);

  const restore = useCallback(async () => {
    if (!owner) return;
    const connectionId = loadConnectionPointer(owner);
    if (!connectionId) return;
    setRestoring(true);
    const result = await refreshConnectionAction(connectionId);
    if (result.status === "ok") {
      window.history.replaceState(null, "", `${RETURN_TO}?conexao=${result.connection.id}`);
      setPhase({ kind: "connection", connection: result.connection });
      setRetryRecovery(false);
    } else if (result.clearPointer) {
      clearConnectionPointer();
      setPhase({ kind: "intro", notice: { tone: "error", message: "A conexão salva não está disponível. Conecte o banco novamente." } });
      setRetryRecovery(false);
    } else {
      setPhase({ kind: "intro", notice: errorNotice(result) });
      setRetryRecovery(!result.reauth);
    }
    setRestoring(false);
  }, [owner]);

  useEffect(() => {
    if (!owner) return;
    if (initialConnection) {
      saveConnectionPointer(owner, initialConnection.id);
    } else if (deniedConnectionId) {
      if (loadConnectionPointer(owner) === deniedConnectionId) clearConnectionPointer();
      window.history.replaceState(null, "", RETURN_TO);
    } else if (!initialNotice) {
      queueMicrotask(() => void restore());
    }
  }, [owner, initialConnection, initialNotice, deniedConnectionId, restore]);

  function start() {
    startTransition(async () => {
      const result = await startSessionAction();
      if (result.status === "error") {
        setPhase({ kind: "intro", notice: errorNotice(result) });
        return;
      }
      itemReceived.current = false;
      setPhase({ kind: "widget", connectToken: result.connectToken, completionKey: result.completionKey });
    });
  }

  function complete(itemId: string, completionKey: string) {
    if (completionInFlight.current) return;
    completionInFlight.current = true;
    setPhase({ kind: "completing", itemId, completionKey });
    startTransition(async () => {
      try {
        const result = await completeConnectionAction(itemId, completionKey);
        if (result.status === "error") {
          setPhase({ kind: "completeFailed", itemId, completionKey, notice: errorNotice(result) });
          return;
        }
        showConnection(result.connection);
        showToast("success", "Conexão registrada. Verifique o estado da importação inicial.");
      } finally {
        completionInFlight.current = false;
      }
    });
  }

  function showConnection(connection: Connection) {
    if (owner) saveConnectionPointer(owner, connection.id);
    window.history.replaceState(null, "", `${RETURN_TO}?conexao=${connection.id}`);
    setPhase({ kind: "connection", connection, fresh: true });
  }

  function restart(notice?: FlowNotice) {
    window.history.replaceState(null, "", RETURN_TO);
    setPhase({ kind: "intro", notice });
  }

  switch (phase.kind) {
    case "intro":
      return <IntroStep notice={phase.notice} pending={starting || restoring} onConnect={start} onRecover={retryRecovery ? () => void restore() : undefined} />;
    case "widget":
      return (
        <>
          <ProgressStep title="Conectando ao banco" text="Siga os passos na janela do Pluggy. Você pode fechá-la para cancelar." />
          <PluggyWidget
            connectToken={phase.connectToken}
            onItem={(itemId) => {
              if (itemReceived.current) return;
              itemReceived.current = true;
              if (itemId) complete(itemId, phase.completionKey);
              else restart({ tone: "error", message: "O banco não devolveu uma conexão válida. Tente conectar de novo." });
            }}
            onFailure={() => {
              if (itemReceived.current) return;
              itemReceived.current = true;
              restart({ tone: "error", message: "O banco ou o Pluggy recusou a conexão. Nada foi registrado. Tente de novo." });
            }}
            onClose={() => {
              if (!itemReceived.current) restart({ tone: "info", message: "Conexão cancelada. Nada foi registrado." });
            }}
          />
        </>
      );
    case "completing":
      return <ProgressStep title="Registrando a conexão" text="O banco autorizou. Estamos confirmando os dados com o servidor." />;
    case "completeFailed":
      return (
        <CompleteFailedStep
          notice={phase.notice}
          pending={starting}
          onRetry={() => complete(phase.itemId, phase.completionKey)}
          onRestart={() => restart()}
        />
      );
    case "connection":
      return (
        <ConnectionDetail
          key={phase.connection.id}
          connection={phase.connection}
          celebrate={Boolean(phase.fresh) && connectionCelebrates(phase.connection.status)}
          onChange={(connection) =>
            setPhase((current) => ({
              kind: "connection",
              connection,
              fresh: current.kind === "connection" && current.fresh,
            }))
          }
          onDenied={() => {
            clearConnectionPointer();
            restart({ tone: "error", message: "A conexão não está disponível. Conecte o banco novamente." });
          }}
          onConnectAgain={() => restart()}
        />
      );
  }
}

function errorNotice(error: ActionError): FlowNotice {
  return { tone: "error", message: error.message, reauth: error.reauth };
}

/** Leva o foco ao titulo do passo quando ele aparece, para leitores de tela e teclado. */
function useStepFocus(): RefObject<HTMLHeadingElement | null> {
  const ref = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  return ref;
}

function IntroStep({ notice, pending, onConnect, onRecover }: { notice?: FlowNotice; pending: boolean; onConnect: () => void; onRecover?: () => void }) {
  const id = useId();
  const titleRef = useStepFocus();
  return (
    <section className={`${ui.panel} ${ui.reveal}`} aria-labelledby={`${id}-title`}>
      <div>
        <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className={`${ui.panelTitle} ${styles.stepTitle}`}>
          O que você vai autorizar
        </h2>
        <p className={ui.panelDescription}>A conexão usa o Pluggy, em ambiente de testes (Sandbox).</p>
      </div>

      <ul className={styles.terms}>
        <li>Leitura dos dados que você escolher no banco, como contas, saldos e movimentações.</li>
        <li>Os dados ficam só na sua conta do Coinciente.</li>
        <li>
          <strong>Nunca</strong> movimentar dinheiro, fazer pagamentos ou Pix.
        </li>
        <li>Sua senha do banco é digitada na janela do Pluggy e não passa pelo Coinciente.</li>
        <li>Você pode remover a conexão quando quiser; a coleta de novos dados para.</li>
      </ul>

      {notice ? (
        <Notice tone={notice.tone} actions={notice.reauth ? <ReauthLink /> : undefined}>
          {notice.message}
        </Notice>
      ) : null}

      <div className={styles.actions}>
        {onRecover ? (
          <button className={`${ui.button} ${ui.secondary}`} type="button" onClick={onRecover} disabled={pending}>
            Tentar recuperar
          </button>
        ) : null}
        <button className={`${ui.button} ${ui.primary}`} type="button" onClick={onConnect} disabled={pending} aria-busy={pending}>
          <PendingLabel pending={pending} idle="Conectar banco" busy="Abrindo…" />
        </button>
      </div>
    </section>
  );
}

function ProgressStep({ title, text }: { title: string; text: string }) {
  const id = useId();
  const titleRef = useStepFocus();
  return (
    <section className={`${ui.panel} ${ui.reveal}`} aria-labelledby={`${id}-title`} aria-busy>
      <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className={`${ui.panelTitle} ${styles.stepTitle}`}>
        {title}
      </h2>
      <p className={ui.panelDescription} role="status">
        {text}
      </p>
    </section>
  );
}

function CompleteFailedStep({
  notice,
  pending,
  onRetry,
  onRestart,
}: {
  notice: FlowNotice;
  pending: boolean;
  onRetry: () => void;
  onRestart: () => void;
}) {
  const id = useId();
  const titleRef = useStepFocus();
  return (
    <section className={`${ui.panel} ${ui.reveal}`} aria-labelledby={`${id}-title`}>
      <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className={`${ui.panelTitle} ${styles.stepTitle}`}>
        A conexão não foi registrada
      </h2>
      <Notice tone="error" actions={notice.reauth ? <ReauthLink /> : undefined}>
        {notice.message}
      </Notice>
      <div className={styles.actions}>
        {notice.reauth ? null : (
          <button className={`${ui.button} ${ui.primary}`} type="button" onClick={onRetry} disabled={pending} aria-busy={pending}>
            <PendingLabel pending={pending} idle="Tentar de novo" busy="Registrando…" />
          </button>
        )}
        <button className={`${ui.button} ${ui.secondary}`} type="button" onClick={onRestart} disabled={pending}>
          Começar de novo
        </button>
      </div>
    </section>
  );
}

function ConnectionDetail({
  connection,
  celebrate,
  onChange,
  onDenied,
  onConnectAgain,
}: {
  connection: Connection;
  celebrate: boolean;
  onChange: (connection: Connection) => void;
  onDenied: () => void;
  onConnectAgain: () => void;
}) {
  const id = useId();
  const titleRef = useStepFocus();
  const [checking, startCheck] = useTransition();
  const [removing, startRemove] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [checkError, setCheckError] = useState<ActionError | null>(null);
  const [removeError, setRemoveError] = useState<ActionError | null>(null);

  const view = statusView(connection.status);
  const consent = consentSummary(connection);
  const importView = connection.initialImport ? initialImportStatus(connection.initialImport.status) : null;

  function checkAgain() {
    startCheck(async () => {
      const result = await refreshConnectionAction(connection.id);
      if (result.status === "error") {
        if (result.clearPointer) {
          onDenied();
          return;
        }
        setCheckError(result);
        return;
      }
      setCheckError(null);
      onChange(result.connection);
    });
  }

  function remove() {
    startRemove(async () => {
      const result = await disconnectAction(connection.id);
      if (result.status === "error") {
        if (result.clearPointer) {
          onDenied();
          return;
        }
        setRemoveError(result);
        return;
      }
      setRemoveError(null);
      setConfirmOpen(false);
      clearConnectionPointer();
      onChange(result.connection);
      showToast("success", "Conexão removida. A coleta de novos dados parou.");
    });
  }

  return (
    <section className={`${ui.panel} ${ui.reveal}`} aria-labelledby={`${id}-title`}>
      <div className={styles.detailHeader}>
        <div className={styles.titleGroup}>
          {celebrate ? <BrandSymbol size={40} animated /> : null}
          <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className={`${ui.panelTitle} ${styles.stepTitle}`}>
            Conexão com o banco
          </h2>
        </div>
        <StatusChip tone={view.tone}>{view.label}</StatusChip>
      </div>

      <Notice tone={view.noticeTone}>{view.explanation}</Notice>
      {importView ? <Notice tone={importView.tone}>{importView.message}</Notice> : null}
      {needsAccountMapping(connection.initialImport) ? (
        <AccountMapping
          connectionId={connection.id}
          initialImport={connection.initialImport}
          onMapped={(initialImport) => onChange({ ...connection, initialImport })}
        />
      ) : null}

      <dl className={styles.summary}>
        <div className={styles.summaryItem}>
          <dt>Dados autorizados</dt>
          <dd>{consent.products.length > 0 ? consent.products.join(", ") : "Nenhum ainda"}</dd>
        </div>
        {consent.permissionCount > 0 ? (
          <div className={styles.summaryItem}>
            <dt>Permissões Open Finance</dt>
            <dd>{consent.permissionCount}</dd>
          </div>
        ) : null}
        {consent.grantedAt ? (
          <div className={styles.summaryItem}>
            <dt>Autorizada em</dt>
            <dd>{consent.grantedAt}</dd>
          </div>
        ) : null}
        {consent.expiresAt ? (
          <div className={styles.summaryItem}>
            <dt>Autorização válida até</dt>
            <dd>{consent.expiresAt}</dd>
          </div>
        ) : null}
        <div className={styles.summaryItem}>
          <dt>Última atualização</dt>
          <dd>{formatTimestamp(connection.updatedAt)}</dd>
        </div>
      </dl>

      {canSync(connection.status) ? <SyncPanel connectionId={connection.id} /> : null}

      {checkError ? (
        <Notice tone="error" actions={checkError.reauth ? <ReauthLink /> : undefined}>
          {checkError.message}
        </Notice>
      ) : null}

      <div className={styles.actions}>
        {canCheckAgain(connection.status) || canRefreshInitialImport(connection.initialImport?.status) ? (
          <button className={`${ui.button} ${ui.primary}`} type="button" onClick={checkAgain} disabled={checking} aria-busy={checking}>
            <PendingLabel pending={checking} idle="Verificar de novo" busy="Verificando…" />
          </button>
        ) : null}
        {needsReconnect(connection.status) ? (
          <button className={`${ui.button} ${ui.primary}`} type="button" onClick={onConnectAgain}>
            Conectar de novo
          </button>
        ) : null}
        {canDisconnect(connection.status) ? (
          <button
            className={`${ui.button} ${ui.secondary}`}
            type="button"
            onClick={() => {
              setRemoveError(null);
              setConfirmOpen(true);
            }}
          >
            Remover conexão
          </button>
        ) : null}
        <Link className={`${ui.button} ${ui.secondary}`} href="/contas">
          Voltar para Contas
        </Link>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Remover conexão com o banco?"
        description={
          <p>
            A autorização será revogada e a coleta de novos dados deste banco vai parar. Para voltar a coletar, será
            preciso conectar de novo.
          </p>
        }
        confirmLabel="Remover conexão"
        pendingLabel="Removendo…"
        action={() => remove()}
        pending={removing}
        error={
          removeError ? (
            <Notice tone="error" actions={removeError.reauth ? <ReauthLink /> : undefined}>
              {removeError.message}
            </Notice>
          ) : undefined
        }
      />
    </section>
  );
}

/** Sincronizar só faz sentido com a conexão ativa; expirada ou revogada pede nova conexão. */
function canSync(status: Connection["status"]): boolean {
  return status === "connected" || status === "partially_available";
}

function ReauthLink() {
  return (
    <a className={ui.inlineLink} href={`/auth/login?returnTo=${RETURN_TO}`}>
      Entrar novamente
    </a>
  );
}
