"use client";

import Link from "next/link";
import {
  type FormEvent,
  type ReactNode,
  type RefObject,
  useActionState,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
} from "react";
import { showToast } from "@/components/interactive";
import { FieldError, Notice, PendingLabel, StatusChip, ui } from "@/components/ui";
import { formatCivilDate } from "@/lib/civil-date";
import { checkOfxFile, OFX_FILE_MESSAGES } from "@/lib/ingestions/file-validation";
import type { ImportRun, IngestionItem } from "@/lib/ingestions/types";
import { AccountSelect, selectableAccount } from "../../movimentacoes/form-parts";
import { accountLabel, type AccountOption } from "../../movimentacoes/presentation";
import {
  type ConfirmState,
  confirmOfxAction,
  type PreviewState,
  previewOfxAction,
  refreshImportAction,
  type RefreshResult,
} from "./actions";
import {
  countLabel,
  FAILED_ITEM_MESSAGE,
  itemAmount,
  itemSituation,
  previewSummary,
  resultSummary,
  stepForStatus,
} from "./presentation";
import styles from "./importar-ofx.module.css";

const RETURN_TO = "/contas/importar-ofx";

interface Props {
  accounts: AccountOption[];
  initialKey: string;
}

/** Escolher conta e arquivo, conferir a previa, confirmar e ver o resultado. */
export function OfxImport({ accounts, initialKey }: Props) {
  const [state, previewAction, pending] = useActionState<PreviewState, FormData>(previewOfxAction, {
    status: "idle",
    idempotencyKey: initialKey,
  });
  const [, startTransition] = useTransition();
  // "Escolher outro arquivo" volta ao primeiro passo sem descartar a resposta anterior.
  const [dismissedRunId, setDismissedRunId] = useState<string | null>(null);

  if (state.status === "ready" && state.run.id !== dismissedRunId) {
    const runId = state.run.id;
    return (
      <ImportFlow
        key={runId}
        initialRun={state.run}
        confirmKey={state.confirmKey}
        accounts={accounts}
        onRestart={() => setDismissedRunId(runId)}
      />
    );
  }

  const lastAccount =
    state.status === "ready"
      ? state.run.destinationAccountId
      : state.status === "idle"
        ? undefined
        : state.destinationAccountId;

  return (
    <SelectStep
      state={state}
      pending={pending}
      accounts={accounts}
      defaultAccount={lastAccount}
      // Sem `action` no form: o React nao limpa o campo de arquivo, entao uma nova
      // tentativa (rede, 503) reaproveita o arquivo escolhido.
      onSubmit={(data) => startTransition(() => previewAction(data))}
    />
  );
}

function SelectStep({
  state,
  pending,
  accounts,
  defaultAccount,
  onSubmit,
}: {
  state: PreviewState;
  pending: boolean;
  accounts: AccountOption[];
  defaultAccount: string | undefined;
  onSubmit: (data: FormData) => void;
}) {
  const id = useId();
  // undefined: nada escolhido desde o ultimo envio (vale o erro do servidor); null: arquivo ok.
  const [localFileError, setLocalFileError] = useState<string | null | undefined>(undefined);
  const fieldErrors = state.status === "invalid" ? state.fieldErrors : undefined;
  const fileError = localFileError === undefined ? fieldErrors?.file : (localFileError ?? undefined);

  function check(file: File | undefined): boolean {
    const problem = file ? checkOfxFile(file) : null;
    setLocalFileError(problem ? OFX_FILE_MESSAGES[problem] : null);
    return problem === null;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const file = data.get("file");
    if (file instanceof File && file.name !== "" && !check(file)) return;
    setLocalFileError(undefined);
    onSubmit(data);
  }

  const helpId = `${id}-file-help`;
  const errorId = `${id}-file-error`;

  return (
    <section className={ui.panel} aria-labelledby={`${id}-title`}>
      <div>
        <h2 id={`${id}-title`} className={ui.panelTitle}>
          Conta e arquivo
        </h2>
        <p className={ui.panelDescription}>
          Escolha a conta que vai receber as movimentações: os duplicados são verificados para ela.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={ui.form}>
        <input type="hidden" name="idempotencyKey" value={state.idempotencyKey} />
        <AccountSelect
          id={`${id}-account`}
          name="destinationAccountId"
          label="Conta de destino"
          accounts={accounts}
          defaultValue={selectableAccount(defaultAccount, accounts)}
          error={fieldErrors?.destinationAccountId}
        />

        <div className={ui.field}>
          <label className={ui.label} htmlFor={`${id}-file`}>
            Arquivo OFX
          </label>
          <input
            className={ui.input}
            id={`${id}-file`}
            name="file"
            type="file"
            accept=".ofx"
            required
            onChange={(event) => check(event.currentTarget.files?.[0])}
            aria-invalid={fileError ? true : undefined}
            aria-describedby={fileError ? `${helpId} ${errorId}` : helpId}
          />
          <p id={helpId} className={ui.help}>
            Extrato exportado pelo banco, até 4 MB. PDF não é aceito.
          </p>
          <FieldError id={errorId} message={fileError} />
        </div>

        {state.status === "error" ? (
          <Notice
            tone="error"
            className={ui.fullWidth}
            actions={state.reauth ? <ReauthLink /> : undefined}
          >
            {state.message}
          </Notice>
        ) : null}

        <div className={ui.formFooter}>
          <button
            className={`${ui.button} ${ui.primary}`}
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            <PendingLabel pending={pending} idle="Gerar prévia" busy="Lendo o arquivo…" />
          </button>
        </div>
      </form>
    </section>
  );
}

/** Refresh feito sob uma resposta de confirmacao; uma confirmacao mais nova prevalece. */
interface Refreshed {
  run: ImportRun;
  after: ConfirmState;
}

function ImportFlow({
  initialRun,
  confirmKey,
  accounts,
  onRestart,
}: {
  initialRun: ImportRun;
  confirmKey: string;
  accounts: AccountOption[];
  onRestart: () => void;
}) {
  const [confirm, confirmAction, confirming] = useActionState<ConfirmState, FormData>(
    confirmOfxAction,
    { status: "idle", idempotencyKey: confirmKey },
  );
  const [refreshed, setRefreshed] = useState<Refreshed | null>(null);
  const [refreshError, setRefreshError] = useState<Extract<RefreshResult, { status: "error" }> | null>(null);
  const [refreshing, startRefresh] = useTransition();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const announced = useRef<ConfirmState | null>(null);

  const run =
    refreshed && refreshed.after === confirm
      ? refreshed.run
      : confirm.status === "done"
        ? confirm.run
        : initialRun;
  const step = stepForStatus(run.status);

  // Cada passo novo leva o foco ao seu titulo, para quem navega por teclado ou leitor de tela.
  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (confirm.status !== "done" || announced.current === confirm) return;
    announced.current = confirm;
    if (stepForStatus(confirm.run.status) === "result") {
      showToast("success", "Importação concluída. Confira o resultado abaixo.");
    }
  }, [confirm]);

  function refresh() {
    startRefresh(async () => {
      const result = await refreshImportAction(run.id);
      if (result.status === "ok") {
        setRefreshError(null);
        setRefreshed({ run: result.run, after: confirm });
      } else {
        setRefreshError(result);
      }
    });
  }

  const destination = accountLabel(run.destinationAccountId, accounts);

  if (step === "processing") {
    return (
      <section className={ui.panel} aria-labelledby={`${run.id}-title`}>
        <StepTitle id={`${run.id}-title`} headingRef={headingRef}>
          Importação em processamento
        </StepTitle>
        <Notice
          tone="info"
          actions={
            <button
              className={`${ui.button} ${ui.secondary}`}
              type="button"
              onClick={refresh}
              disabled={refreshing}
              aria-busy={refreshing}
            >
              <PendingLabel pending={refreshing} idle="Verificar de novo" busy="Verificando…" />
            </button>
          }
        >
          O extrato para {destination} ainda está sendo processado. Você pode verificar de novo em
          alguns instantes.
        </Notice>
        {refreshError ? (
          <Notice tone="error" actions={refreshError.reauth ? <ReauthLink /> : undefined}>
            {refreshError.message}
          </Notice>
        ) : null}
      </section>
    );
  }

  if (step === "expired") {
    return (
      <section className={ui.panel} aria-labelledby={`${run.id}-title`}>
        <StepTitle id={`${run.id}-title`} headingRef={headingRef}>
          Prévia expirada
        </StepTitle>
        <Notice tone="warning" actions={<RestartButton onRestart={onRestart} />}>
          Esta prévia não pode mais ser confirmada. Envie o arquivo de novo para gerar outra.
        </Notice>
      </section>
    );
  }

  if (step === "result") {
    return <ResultStep run={run} destination={destination} headingRef={headingRef} onRestart={onRestart} />;
  }

  const summary = previewSummary(run.items);
  const nothingNew = summary.fresh === 0;

  return (
    <section className={ui.panel} aria-labelledby={`${run.id}-title`}>
      <div>
        <StepTitle id={`${run.id}-title`} headingRef={headingRef}>
          Prévia da importação
        </StepTitle>
        <p className={ui.panelDescription}>Nada foi gravado ainda. Confira as linhas e confirme.</p>
      </div>

      <dl className={styles.summary}>
        <SummaryItem label="Conta de destino" value={destination} />
        <SummaryItem
          label="Período"
          value={
            summary.period
              ? `${formatCivilDate(summary.period.from)} a ${formatCivilDate(summary.period.to)}`
              : "Sem movimentações"
          }
        />
        <SummaryItem label="Linhas no arquivo" value={String(summary.total)} />
        <SummaryItem label="Novas" value={String(summary.fresh)} />
        <SummaryItem label="Já registradas nesta conta" value={String(summary.duplicates)} />
      </dl>

      {summary.withoutBankId > 0 ? (
        <Notice tone="info">
          {countLabel(summary.withoutBankId, "linha veio", "linhas vieram")} sem o identificador do
          banco. A duplicidade foi verificada por data, valor e descrição.
        </Notice>
      ) : null}

      {summary.total === 0 ? (
        <Notice tone="info">O arquivo não tem movimentações para importar.</Notice>
      ) : nothingNew ? (
        <Notice tone="info">
          Todas as linhas já estão registradas nesta conta. Não há nada novo para importar.
        </Notice>
      ) : summary.duplicates > 0 ? (
        <p className={ui.help}>
          As linhas já registradas nesta conta são ignoradas na importação.
        </p>
      ) : null}

      {summary.total > 0 ? <ItemList items={run.items} label="Linhas do extrato" /> : null}

      <form action={confirmAction} className={styles.actions}>
        <input type="hidden" name="importRunId" value={run.id} />
        <input type="hidden" name="destinationAccountId" value={run.destinationAccountId} />
        <input type="hidden" name="idempotencyKey" value={confirm.idempotencyKey} />

        {confirm.status === "error" ? (
          <Notice
            tone="error"
            className={ui.fullWidth}
            actions={
              confirm.reauth ? (
                <ReauthLink />
              ) : confirm.restart ? (
                <RestartButton onRestart={onRestart} />
              ) : undefined
            }
          >
            {confirm.message}
          </Notice>
        ) : null}

        <button
          className={`${ui.button} ${ui.primary}`}
          type="submit"
          disabled={confirming || nothingNew}
          aria-busy={confirming}
        >
          <PendingLabel
            pending={confirming}
            idle={`Importar ${countLabel(summary.fresh, "movimentação", "movimentações")}`}
            busy="Importando…"
          />
        </button>
        <button
          className={`${ui.button} ${ui.secondary}`}
          type="button"
          onClick={onRestart}
          disabled={confirming}
        >
          Escolher outro arquivo
        </button>
      </form>
    </section>
  );
}

function ResultStep({
  run,
  destination,
  headingRef,
  onRestart,
}: {
  run: ImportRun;
  destination: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  onRestart: () => void;
}) {
  const summary = resultSummary(run);
  const failed = run.items.filter((item) => item.status === "failed");

  return (
    <section className={ui.panel} aria-labelledby={`${run.id}-title`}>
      <StepTitle id={`${run.id}-title`} headingRef={headingRef}>
        Resultado da importação
      </StepTitle>
      <Notice tone={summary.tone}>{summary.text}</Notice>

      <dl className={styles.summary}>
        <SummaryItem label="Conta de destino" value={destination} />
        <SummaryItem label="Importadas" value={String(run.importedItems)} />
        <SummaryItem label="Ignoradas (já registradas)" value={String(run.ignoredItems)} />
        <SummaryItem label="Com erro" value={String(run.failedItems)} />
      </dl>

      {failed.length > 0 ? (
        <div className={styles.failed}>
          <h3 className={styles.subtitle}>Linhas não importadas</h3>
          <p className={ui.help}>{FAILED_ITEM_MESSAGE}</p>
          <ItemList items={failed} label="Linhas não importadas" />
        </div>
      ) : null}

      <div className={styles.actions}>
        <Link className={`${ui.button} ${ui.primary}`} href="/movimentacoes">
          Ver em Movimentações
        </Link>
        <button className={`${ui.button} ${ui.secondary}`} type="button" onClick={onRestart}>
          Importar outro arquivo
        </button>
      </div>
    </section>
  );
}

function ItemList({ items, label }: { items: IngestionItem[]; label: string }) {
  return (
    <ul className={styles.items} aria-label={label}>
      {items.map((item) => {
        const amount = itemAmount(item);
        const situation = itemSituation(item);
        return (
          <li key={item.ordinal} className={styles.item}>
            <span className={styles.itemDate}>{formatCivilDate(item.occurredOn)}</span>
            <span className={styles.itemDescription}>{item.description ?? "Sem descrição"}</span>
            <span className={`${styles.itemAmount} tabular`} data-direction={amount.direction}>
              {amount.text}
            </span>
            <span className={styles.itemSituation}>
              <StatusChip tone={situation.tone}>{situation.label}</StatusChip>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.summaryItem}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StepTitle({
  id,
  headingRef,
  children,
}: {
  id: string;
  headingRef: RefObject<HTMLHeadingElement | null>;
  children: ReactNode;
}) {
  return (
    <h2 id={id} ref={headingRef} tabIndex={-1} className={`${ui.panelTitle} ${styles.stepTitle}`}>
      {children}
    </h2>
  );
}

function RestartButton({ onRestart }: { onRestart: () => void }) {
  return (
    <button className={`${ui.button} ${ui.secondary}`} type="button" onClick={onRestart}>
      Escolher outro arquivo
    </button>
  );
}

function ReauthLink() {
  // Link do Next faria prefetch e iniciaria a transacao de login por engano.
  return (
    <a className={ui.inlineLink} href={`/auth/login?returnTo=${RETURN_TO}`}>
      Entrar novamente
    </a>
  );
}
