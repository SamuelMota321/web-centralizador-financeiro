import type { NoticeTone } from "@/components/ui";

// Lista fechada: a página só exibe estes textos e nunca ecoa o valor da query.
export const NOTICES = {
  "regra-atualizada": {
    tone: "success",
    text: "Regra atualizada. Ela vale para as próximas movimentações; as já registradas não mudam.",
  },
  "regra-ativada": { tone: "success", text: "Regra ativada. Ela volta a valer para novas movimentações." },
  "regra-desativada": {
    tone: "success",
    text: "Regra desativada. Ela deixa de ser aplicada até ser ativada de novo.",
  },
  "regra-removida": {
    tone: "success",
    text: "Regra removida. Ela continua visível como removida e não pode ser reativada.",
  },
  "regra-indisponivel": {
    tone: "info",
    text: "Esta regra não foi encontrada ou não está mais disponível.",
  },
  "regra-removida-antes": {
    tone: "info",
    text: "Esta regra já tinha sido removida e não pode mais ser alterada.",
  },
} as const satisfies Record<string, { tone: NoticeTone; text: string }>;

export type NoticeKey = keyof typeof NOTICES;

export function isNoticeKey(value: unknown): value is NoticeKey {
  return typeof value === "string" && Object.hasOwn(NOTICES, value);
}
