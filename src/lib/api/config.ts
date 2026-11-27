const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!rawBaseUrl) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL não definido. Copie .env.example para .env e ajuste o valor.",
  );
}

const trim = (value: string) => value.replace(/\/+$/, "");

/** Base URL pública da API do backend, sem barra final. Contrato OpenAPI sob /api/v1. */
export const apiBaseUrl = trim(rawBaseUrl);

/**
 * Base que o SERVIDOR do front usa para chamar o backend. Com `API_INTERNAL_BASE_URL` (a URL da rede
 * privada do Render, ex.: http://backend-centralizador-financeiro:10000/api/v1), as chamadas das
 * telas renderizadas no servidor não passam pela borda pública, que devolve 429 em rajadas. Sem a
 * variável, vale a pública. Não tem prefixo NEXT_PUBLIC_: nunca vai para o navegador.
 */
function resolveServerBaseUrl(): string {
  const internal = process.env.API_INTERNAL_BASE_URL?.trim();
  if (!internal) return apiBaseUrl;
  let parsed: URL;
  try {
    parsed = new URL(internal);
  } catch {
    throw new Error("API_INTERNAL_BASE_URL inválido: informe uma URL completa, como http://servico:10000/api/v1.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("API_INTERNAL_BASE_URL inválido: use http ou https.");
  }
  return trim(internal);
}

export const apiServerBaseUrl = resolveServerBaseUrl();
