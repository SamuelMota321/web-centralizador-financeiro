import { apiBaseUrl } from "./config";

export interface ApiErrorShape {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(error: ApiErrorShape) {
    super(error.message);
    this.name = "ApiRequestError";
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /**
   * Token da requisicao em curso. E explicito de proposito: um provedor guardado
   * em modulo seria compartilhado entre requisicoes concorrentes do servidor e
   * poderia enviar o token de um usuario na requisicao de outro.
   */
  accessToken?: string;
  /** Enviada no header `Idempotency-Key` (POST de movimentacoes). */
  idempotencyKey?: string;
}

/**
 * Leituras (GET) repetem em falha de rede e em 429, 502, 503 e 504: no plano gratuito do Render o
 * backend hiberna e a borda responde assim enquanto ele acorda. Escritas nunca repetem aqui, para
 * não duplicar movimentações; quem escreve decide (a Idempotency-Key cobre o caso).
 */
export const RETRY_DELAYS_MS: readonly number[] = [1000, 2500, 5000];
const RETRYABLE_STATUS: ReadonlySet<number> = new Set([429, 502, 503, 504]);
/** Espera máxima aceita de um `Retry-After`: acima disso, melhor falhar e avisar. */
const RETRY_AFTER_CAP_MS = 8000;

function isRead(method: string | undefined): boolean {
  return (method ?? "GET").toUpperCase() === "GET";
}

/** `Retry-After` em segundos; datas HTTP e valores absurdos são ignorados. */
export function retryAfterMs(header: string | null): number | null {
  if (header === null || !/^\d{1,3}$/.test(header.trim())) return null;
  return Math.min(Number(header.trim()) * 1000, RETRY_AFTER_CAP_MS);
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, query, headers, accessToken, idempotencyKey, ...rest } = options;

  // FormData segue como esta: o fetch define o content-type com o boundary do multipart.
  const isFormData = body instanceof FormData;
  const finalHeaders = new Headers(headers);
  finalHeaders.set("accept", "application/json");
  if (body !== undefined && !isFormData) {
    finalHeaders.set("content-type", "application/json");
  }
  if (accessToken) {
    finalHeaders.set("authorization", `Bearer ${accessToken}`);
  }
  if (idempotencyKey) {
    finalHeaders.set("idempotency-key", idempotencyKey);
  }

  const url = `${apiBaseUrl}${path}${buildQuery(query)}`;
  const init: RequestInit = {
    ...rest,
    // Dados autenticados nunca entram em cache compartilhado. O Next 16 já não cacheia
    // fetch por padrão; declarar evita que config ou `use cache` futuros mudem isso sem aviso.
    cache: "no-store",
    headers: finalHeaders,
    body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
  };

  const retries = isRead(rest.method) ? RETRY_DELAYS_MS : [];
  let response: Response | undefined;
  for (let attempt = 0; ; attempt += 1) {
    try {
      response = await fetch(url, init);
    } catch (error) {
      // Falha de rede: instância acordando ou conexão caiu. Sem tentativas sobrando, propaga.
      if (attempt >= retries.length) throw error;
      await sleep(retries[attempt]);
      continue;
    }
    if (!RETRYABLE_STATUS.has(response.status) || attempt >= retries.length) break;
    await response.body?.cancel();
    await sleep(Math.max(retries[attempt], retryAfterMs(response.headers.get("retry-after")) ?? 0));
  }

  const raw = await response.text();
  const payload: unknown = raw.length > 0 ? safeJsonParse(raw) : undefined;

  if (!response.ok) {
    throw new ApiRequestError(normalizeError(response.status, payload));
  }

  return payload as T;
}

function buildQuery(
  query: Record<string, string | number | boolean | undefined> | undefined,
): string {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) {
      params.set(key, String(value));
    }
  }
  const serialized = params.toString();
  return serialized.length > 0 ? `?${serialized}` : "";
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function normalizeError(status: number, payload: unknown): ApiErrorShape {
  if (payload !== null && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    // O backend responde erros como Problem Details (RFC 7807): detail/title/code.
    const message =
      pickString(record.detail) ??
      pickString(record.message) ??
      pickString(record.title) ??
      `Falha na requisicao (${status})`;
    return {
      status,
      code: pickString(record.code) ?? `http_${status}`,
      message,
      details: record,
    };
  }
  return {
    status,
    code: `http_${status}`,
    message: `Falha na requisicao (${status})`,
  };
}

function pickString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
