/**
 * Prévia da Visão geral com dados de exemplo. Desligada por padrão: sem a variável, a
 * rota responde 404 e o destino não aparece na navegação. Ligar só em demonstração.
 */
export function overviewPreviewEnabled(): boolean {
  return process.env.OVERVIEW_PREVIEW === "true";
}
