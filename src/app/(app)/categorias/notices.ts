import type { NoticeTone } from "@/components/ui";

// Lista fechada: a página só exibe estes textos e nunca ecoa o valor da query.
export const NOTICES = {
  "categoria-renomeada": {
    tone: "success",
    text: "Categoria renomeada. As movimentações passam a mostrar o novo nome.",
  },
  "categoria-arquivada": {
    tone: "success",
    text: "Categoria arquivada. Ela continua no histórico, mas não pode mais ser atribuída.",
  },
  "categoria-indisponivel": {
    tone: "info",
    text: "Esta categoria não foi encontrada ou não está mais disponível.",
  },
} as const satisfies Record<string, { tone: NoticeTone; text: string }>;

export type NoticeKey = keyof typeof NOTICES;

export function isNoticeKey(value: unknown): value is NoticeKey {
  return typeof value === "string" && Object.hasOwn(NOTICES, value);
}
