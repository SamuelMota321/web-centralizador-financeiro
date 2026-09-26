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

export async function apiRequest<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const { body, query, headers, accessToken, idempotencyKey, ...rest } = options;

  const finalHeaders = new Headers(headers);
  finalHeaders.set("accept", "application/json");
  if (body !== undefined) {
    finalHeaders.set("content-type", "application/json");
  }
  if (accessToken) {
    finalHeaders.set("authorization", `Bearer ${accessToken}`);
  }
  if (idempotencyKey) {
    finalHeaders.set("idempotency-key", idempotencyKey);
  }

  const response = await fetch(`${apiBaseUrl}${path}${buildQuery(query)}`, {
    ...rest,
    // Dados autenticados nunca entram em cache compartilhado. O Next 16 já não cacheia
    // fetch por padrão; declarar evita que config ou `use cache` futuros mudem isso sem aviso.
    cache: "no-store",
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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
