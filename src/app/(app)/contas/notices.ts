import type { NoticeTone } from "@/components/ui";
import { ACCOUNT_UNAVAILABLE_MESSAGE } from "@/lib/accounts/messages";

// Lista fechada: a página só exibe estes textos e nunca ecoa o valor da query.
export const NOTICES = {
  "conta-atualizada": { tone: "success", text: "Conta atualizada." },
  "conta-desativada": {
    tone: "success",
    text: "Conta desativada. Ela deixou de aparecer na lista e o histórico foi preservado.",
  },
  "conta-indisponivel": { tone: "info", text: ACCOUNT_UNAVAILABLE_MESSAGE },
} as const satisfies Record<string, { tone: NoticeTone; text: string }>;

export type NoticeKey = keyof typeof NOTICES;

export function isNoticeKey(value: unknown): value is NoticeKey {
  return typeof value === "string" && Object.hasOwn(NOTICES, value);
}
