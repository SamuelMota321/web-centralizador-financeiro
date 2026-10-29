import type { ChipTone, NoticeTone } from "@/components/ui";
import type { Connection, ConnectionStatus } from "@/lib/connections/types";

export interface StatusView {
  label: string;
  tone: ChipTone;
  /** Explicacao em texto: a cor do chip e so reforco. */
  explanation: string;
  noticeTone: NoticeTone;
}

const STATUS_VIEWS: Record<ConnectionStatus, StatusView> = {
  pending_authorization: {
    label: "Aguardando autorização",
    tone: "warning",
    explanation:
      "O banco ainda não confirmou a autorização. Se você concluiu no banco, verifique de novo em alguns instantes.",
    noticeTone: "info",
  },
  connected: {
    label: "Conectada",
    tone: "positive",
    explanation: "A autorização está ativa para os dados listados abaixo.",
    noticeTone: "success",
  },
  partially_available: {
    label: "Parcialmente disponível",
    tone: "warning",
    explanation:
      "O banco liberou só parte dos dados. Os tipos de dado autorizados estão listados abaixo; os demais não serão coletados.",
    noticeTone: "warning",
  },
  expired: {
    label: "Autorização expirada",
    tone: "neutral",
    explanation: "A autorização venceu e nenhum dado novo é coletado. Para voltar a coletar, conecte de novo.",
    noticeTone: "warning",
  },
  revoked: {
    label: "Autorização revogada",
    tone: "neutral",
    explanation: "A autorização foi revogada no banco e nenhum dado novo é coletado. Para voltar a coletar, conecte de novo.",
    noticeTone: "warning",
  },
  disconnected: {
    label: "Desconectada",
    tone: "neutral",
    explanation: "A conexão foi removida e a coleta de novos dados parou.",
    noticeTone: "info",
  },
};

export function statusView(status: ConnectionStatus): StatusView {
  return STATUS_VIEWS[status];
}

const PRODUCT_LABELS: Record<string, string> = {
  ACCOUNTS: "Contas e saldos",
  TRANSACTIONS: "Movimentações",
  CREDIT_CARDS: "Cartões de crédito",
  IDENTITY: "Dados cadastrais",
  INVESTMENTS: "Investimentos",
  INVESTMENTS_TRANSACTIONS: "Movimentações de investimentos",
  LOANS: "Empréstimos",
  PAYMENT_DATA: "Dados de pagamento",
};

/** O contrato nao fecha a lista de produtos: um produto desconhecido aparece pelo codigo. */
export function productLabel(product: string): string {
  return PRODUCT_LABELS[product] ?? product;
}

/** "Verificar de novo" so faz sentido enquanto o banco nao respondeu a autorizacao. */
export function canCheckAgain(status: ConnectionStatus): boolean {
  return status === "pending_authorization";
}

/** Remover para a coleta; uma conexao ja desconectada nao tem o que remover. */
export function canDisconnect(status: ConnectionStatus): boolean {
  return status !== "disconnected";
}

/** Expirada, revogada ou desconectada: conectar de novo e o unico caminho. */
export function needsReconnect(status: ConnectionStatus): boolean {
  return status === "expired" || status === "revoked" || status === "disconnected";
}

const TIMESTAMP = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Sao_Paulo",
});

/** Data e hora de Brasilia, ex.: "09/10/2026, 09:05". */
export function formatTimestamp(value: string): string {
  return TIMESTAMP.format(new Date(value));
}

export interface ConsentSummary {
  products: string[];
  permissionCount: number;
  grantedAt: string | null;
  expiresAt: string | null;
}

export function consentSummary(connection: Pick<Connection, "consent">): ConsentSummary {
  const { consent } = connection;
  return {
    products: consent.products.map(productLabel),
    permissionCount: consent.openFinancePermissionsGranted.length,
    grantedAt: consent.grantedAt ? formatTimestamp(consent.grantedAt) : null,
    expiresAt: consent.expiresAt ? formatTimestamp(consent.expiresAt) : null,
  };
}
