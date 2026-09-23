import { ACCOUNT_UNAVAILABLE_MESSAGE } from "@/lib/accounts/messages";

// Lista fechada: a pagina so exibe estes textos e nunca ecoa o valor da query.
export const NOTICES = {
  "conta-atualizada": "Conta atualizada.",
  "conta-desativada":
    "Conta desativada. Ela deixou de aparecer na lista e o historico foi preservado.",
  "conta-indisponivel": ACCOUNT_UNAVAILABLE_MESSAGE,
} as const;

export type NoticeKey = keyof typeof NOTICES;

export function isNoticeKey(value: unknown): value is NoticeKey {
  return typeof value === "string" && Object.hasOwn(NOTICES, value);
}
