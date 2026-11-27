// Diagnóstico das respostas do backend que dão problema (429, 5xx, falha de rede, tempo limite).
// Vai para o log do servidor (Render). O objetivo é descobrir QUEM emite um 429: o corpo e os
// cabeçalhos dizem se é o backend, a borda do Render ou outra coisa. Nunca registra credencial.

export interface UpstreamLogEntry {
  event: "status" | "network" | "timeout";
  /** Caminho sem parâmetros, com identificadores trocados por `:id`. */
  path: string;
  /** Tentativa, começando em 1. */
  attempt: number;
  status?: number;
  retryAfter?: string | null;
  server?: string | null;
  cfRay?: string | null;
  via?: string | null;
  contentType?: string | null;
  /** Primeiros 160 caracteres do corpo, sem credencial. */
  bodyPreview?: string;
  errorName?: string;
  errorCode?: string;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const BODY_LIMIT = 160;

/** Sem query (que pode carregar filtros) e sem identificadores: só a forma da rota. */
export function safePath(path: string): string {
  return path.split("?")[0].replace(UUID, ":id");
}

/** Corpo curto e inofensivo: espaços colapsados, `Bearer …` e textos longos de aparência de token redigidos. */
export function bodyPreview(raw: string): string {
  const cleaned = raw
    .replace(/bearer\s+\S+/gi, "Bearer [redigido]")
    .replace(/[A-Za-z0-9_\-.]{24,}/g, "[redigido]")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > BODY_LIMIT ? `${cleaned.slice(0, BODY_LIMIT)}…` : cleaned;
}

export function describeResponse(path: string, attempt: number, response: Response, raw: string): UpstreamLogEntry {
  return {
    event: "status",
    path: safePath(path),
    attempt,
    status: response.status,
    retryAfter: response.headers.get("retry-after"),
    server: response.headers.get("server"),
    cfRay: response.headers.get("cf-ray"),
    via: response.headers.get("via"),
    contentType: response.headers.get("content-type"),
    bodyPreview: bodyPreview(raw),
  };
}

export function describeError(path: string, attempt: number, error: unknown, timeout: boolean): UpstreamLogEntry {
  const cause = error instanceof Error ? (error as Error & { cause?: { code?: string } }).cause : undefined;
  return {
    event: timeout ? "timeout" : "network",
    path: safePath(path),
    attempt,
    errorName: error instanceof Error ? error.name : "desconhecido",
    errorCode: typeof cause?.code === "string" ? cause.code : undefined,
  };
}

/** Uma linha por ocorrência, em JSON, com um prefixo fácil de filtrar no log. */
export function logUpstream(entry: UpstreamLogEntry): void {
  console.warn("[api-upstream]", JSON.stringify(entry));
}
