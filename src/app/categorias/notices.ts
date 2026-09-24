// Lista fechada: a pagina so exibe estes textos e nunca ecoa o valor da query.
export const NOTICES = {
  "categoria-renomeada": "Categoria renomeada. As movimentacoes passam a mostrar o novo nome.",
  "categoria-arquivada":
    "Categoria arquivada. Ela continua no historico, mas nao pode mais ser atribuida.",
  "categoria-indisponivel": "Esta categoria nao foi encontrada ou nao esta mais disponivel.",
} as const;

export type NoticeKey = keyof typeof NOTICES;

export function isNoticeKey(value: unknown): value is NoticeKey {
  return typeof value === "string" && Object.hasOwn(NOTICES, value);
}
