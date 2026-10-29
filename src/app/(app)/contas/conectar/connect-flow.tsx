"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { type RefObject, useEffect, useId, useRef, useState, useTransition } from "react";
import { ConfirmDialog, showToast } from "@/components/interactive";
import { Notice, type NoticeTone, PendingLabel, StatusChip, ui } from "@/components/ui";
import type { Connection } from "@/lib/connections/types";
import {
  type ActionError,
  completeConnectionAction,
  disconnectAction,
  refreshConnectionAction,
  startSessionAction,
} from "./actions";
import { canCheckAgain, canDisconnect, consentSummary, formatTimestamp, needsReconnect, statusView } from "./presentation";
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
  | { kind: "widget"; connectToken: string }
  | { kind: "completing"; itemId: string }
  | { kind: "completeFailed"; itemId: string; notice: FlowNotice }
  | { kind: "connection"; connection: Connection };

interface Props {
  initialConnection: Connection | null;
  /** Falha ao abrir a conexao indicada na URL. */
  initialNotice?: FlowNotice;
}

export function ConnectFlow({ initialConnection, initialNotice }: Props) {
  const [phase, setPhase] = useState<Phase>(
    initialConnection ? { kind: "connection", connection: initialConnection } : { kind: "intro", notice: initialNotice },
  );
  const [starting, startTransition] = useTransition();
  // O widget dispara onClose tambem depois do sucesso; so o fechamento sem item e cancelamento.
  const itemReceived = useRef(false);

  function start() {
    startTransition(async () => {
      const result = await startSessionAction();
      if (result.status === "error") {
        setPhase({ kind: "intro", notice: errorNotice(result) });
        return;
      }
      itemReceived.current = false;
      setPhase({ kind: "widget", connectToken: result.connectToken });
    });
  }

  function complete(itemId: string) {
    setPhase({ kind: "completing", itemId });
    startTransition(async () => {
      const result = await completeConnectionAction(itemId);
      if (result.status === "error") {
        setPhase({ kind: "completeFailed", itemId, notice: errorNotice(result) });
        return;
      }
      showConnection(result.connection);
      showToast("success", "Conexão registrada.");
    });
  }

  function showConnection(connection: Connection) {
    // Recarregar a pagina mostra a mesma conexao; nada e guardado no navegador.
    window.history.replaceState(null, "", `${RETURN_TO}?conexao=${connection.id}`);
    setPhase({ kind: "connection", connection });
  }

  function restart(notice?: FlowNotice) {
    window.history.replaceState(null, "", RETURN_TO);
    setPhase({ kind: "intro", notice });
  }

  switch (phase.kind) {
    case "intro":
      return <IntroStep notice={phase.notice} pending={starting} onConnect={start} />;
    case "widget":
      return (
        <>
          <ProgressStep title="Conectando ao banco" text="Siga os passos na janela do Pluggy. Você pode fechá-la para cancelar." />
          <PluggyWidget
            connectToken={phase.connectToken}
            onItem={(itemId) => {
              itemReceived.current = true;
              if (itemId) complete(itemId);
              else restart({ tone: "error", message: "O banco não devolveu uma conexão válida. Tente conectar de novo." });
            }}
            onFailure={() => {
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
          onRetry={() => complete(phase.itemId)}
          onRestart={() => restart()}
        />
      );
    case "connection":
      return (
        <ConnectionDetail
          key={phase.connection.id}
          connection={phase.connection}
          onChange={(connection) => setPhase({ kind: "connection", connection })}
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

function IntroStep({ notice, pending, onConnect }: { notice?: FlowNotice; pending: boolean; onConnect: () => void }) {
  const id = useId();
  const titleRef = useStepFocus();
  return (
    <section className={ui.panel} aria-labelledby={`${id}-title`}>
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
    <section className={ui.panel} aria-labelledby={`${id}-title`} aria-busy>
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
    <section className={ui.panel} aria-labelledby={`${id}-title`}>
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
  onChange,
  onConnectAgain,
}: {
  connection: Connection;
  onChange: (connection: Connection) => void;
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

  function checkAgain() {
    startCheck(async () => {
      const result = await refreshConnectionAction(connection.id);
      if (result.status === "error") {
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
        setRemoveError(result);
        return;
      }
      setRemoveError(null);
      setConfirmOpen(false);
      onChange(result.connection);
      showToast("success", "Conexão removida. A coleta de novos dados parou.");
    });
  }

  return (
    <section className={ui.panel} aria-labelledby={`${id}-title`}>
      <div className={styles.detailHeader}>
        <h2 id={`${id}-title`} ref={titleRef} tabIndex={-1} className={`${ui.panelTitle} ${styles.stepTitle}`}>
          Conexão com o banco
        </h2>
        <StatusChip tone={view.tone}>{view.label}</StatusChip>
      </div>

      <Notice tone={view.noticeTone}>{view.explanation}</Notice>

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

      <p className={styles.note}>
        A importação das movimentações desta conexão ainda não está disponível nesta versão.
      </p>

      {checkError ? (
        <Notice tone="error" actions={checkError.reauth ? <ReauthLink /> : undefined}>
          {checkError.message}
        </Notice>
      ) : null}

      <div className={styles.actions}>
        {canCheckAgain(connection.status) ? (
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

function ReauthLink() {
  return (
    <a className={ui.inlineLink} href={`/auth/login?returnTo=${RETURN_TO}`}>
      Entrar novamente
    </a>
  );
}
