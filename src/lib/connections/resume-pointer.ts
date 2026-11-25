import { createHash } from "node:crypto";
import { z } from "zod";

// C-01: ponteiro de retomada da conexao. O backend nao lista conexoes, entao o `connection.id`
// devolvido na conclusao e guardado no servidor, em cookie httpOnly amarrado ao usuario da
// sessao. Nunca deriva de accountId nem do Item da Pluggy, e nao guarda token nem dados
// financeiros. Este modulo e puro; a leitura e escrita do cookie ficam em resume-store.ts.

export const RESUME_COOKIE = "coinciente_conexao";
/** Mesmo caminho da tela, para o cookie nao viajar nas demais rotas. */
export const RESUME_COOKIE_PATH = "/contas/conectar";

const uuidSchema = z.uuid();

/** Identificador estavel e opaco do usuario; o `sub` bruto nao vai para o cookie. */
export function userKey(sub: string): string {
  return createHash("sha256").update(sub).digest("hex").slice(0, 32);
}

export function encodePointer(sub: string, connectionId: string): string {
  return `${userKey(sub)}.${uuidSchema.parse(connectionId)}`;
}

/** Devolve o connectionId so quando o cookie e bem formado e pertence ao usuario da sessao. */
export function decodePointer(raw: string | undefined, sub: string | undefined): string | null {
  if (!raw || !sub) return null;
  const [key, connectionId, ...rest] = raw.split(".");
  if (rest.length > 0 || key !== userKey(sub)) return null;
  const parsed = uuidSchema.safeParse(connectionId);
  return parsed.success ? parsed.data : null;
}

/** 403 e 404 do backend: a conexao nao existe ou nao e desta pessoa. */
export function isAccessDenied(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status;
  return status === 403 || status === 404;
}

export const resumeCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: RESUME_COOKIE_PATH,
} as const;
