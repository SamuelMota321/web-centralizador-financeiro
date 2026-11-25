import type { ChipTone, NoticeTone } from "@/components/ui";
import type { SyncReason, SyncRun, SyncRunStatus } from "@/lib/sync-runs/types";
import { formatTimestamp } from "./presentation";

/** Intervalo aprovado por Produto em 16/11/2026 (S4-01, C-03). */
export const POLL_INTERVAL_MS = 10_000;

export interface SyncView {
  label: string;
  tone: ChipTone;
  noticeTone: NoticeTone;
  explanation: string;
}

const VIEWS: Record<SyncRunStatus, SyncView> = {
  queued: {
    label: "Na fila",
    tone: "info",
    noticeTone: "info",
    explanation: "A sincronização foi aceita e vai começar em instantes. Os dados anteriores continuam valendo.",
  },
  running: {
    label: "Sincronizando",
    tone: "info",
    noticeTone: "info",
    explanation: "Buscando os dados autorizados no banco. Você pode sair desta tela; o andamento continua.",
  },
  action_required: {
    label: "Ação necessária",
    tone: "warning",
    noticeTone: "warning",
    explanation:
      "O banco pediu uma nova confirmação (autorização, código ou senha). Autorize de novo para continuar; nada foi perdido.",
  },
  succeeded: {
    label: "Sincronizada",
    tone: "positive",
    noticeTone: "success",
    explanation: "Os dados autorizados foram coletados e reconciliados.",
  },
  partial: {
    label: "Parcial",
    tone: "warning",
    noticeTone: "warning",
    explanation: "Parte dos dados foi coletada. O que faltou está listado abaixo.",
  },
  failed: {
    label: "Falhou",
    tone: "neutral",
    noticeTone: "error",
    explanation: "A sincronização não terminou. Os dados da última sincronização bem-sucedida continuam visíveis.",
  },
};

export const NO_ACTIVE_RUN: SyncView = {
  label: "Sem execução ativa",
  tone: "neutral",
  noticeTone: "info",
  explanation: "Nenhuma sincronização foi pedida ainda. A coleta diária acontece automaticamente ao meio-dia.",
};

export function syncView(run: SyncRun | null): SyncView {
  return run ? VIEWS[run.status] : NO_ACTIVE_RUN;
}

/** Só `queued` e `running` seguem em andamento; `action_required` pausa e para a consulta. */
export function shouldPoll(status: SyncRunStatus): boolean {
  return status === "queued" || status === "running";
}

/** Próxima consulta em ms, ou null: nunca em segundo plano nem fora do andamento. */
export function nextPollDelay(run: SyncRun | null, visible: boolean): number | null {
  if (!run || !visible || !shouldPoll(run.status)) return null;
  return POLL_INTERVAL_MS;
}

export function canRequestSync(run: SyncRun | null): boolean {
  return !run || !shouldPoll(run.status);
}

const DATA_TYPES: Record<SyncReason["dataType"], string> = {
  accounts: "Contas",
  transactions: "Transações",
  investments: "Investimentos",
  investment_transactions: "Movimentações de investimentos",
  connection: "Conexão",
};

const CODES: Record<SyncReason["code"], string> = {
  unavailable: "indisponíveis na fonte",
  failed: "falharam na coleta",
  ambiguous_identity: "com correspondência incerta, aguardando revisão",
};

/** "Investimentos: indisponíveis na fonte". Sem valores financeiros nem payload do provedor. */
export function reasonText(reason: SyncReason): string {
  return `${DATA_TYPES[reason.dataType]}: ${CODES[reason.code]}`;
}

/** Linha da última reconciliação: quando terminou e a data de referência da fonte. */
export function reconciledText(run: SyncRun | null): string {
  if (!run) return "Nenhuma sincronização reconciliada ainda.";
  const done = run.completedAt ? formatTimestamp(run.completedAt) : "horário não informado";
  const reference = run.referenceDate ? ` · ref. da fonte ${formatTimestamp(run.referenceDate)}` : " · referência da fonte não informada";
  return `Última reconciliação em ${done}${reference}${run.status === "partial" ? " (parcial)" : ""}.`;
}

export function triggerText(run: SyncRun): string {
  return run.trigger === "manual" ? "Pedida por você" : "Coleta diária";
}
