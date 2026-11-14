// Fora de figure-panels.tsx (módulo de navegador): a página, no servidor, lê `?painel=`
// com parsePanel, e o servidor não pode chamar funções de um módulo "use client".

export const PANEL_IDS = ["disponivel", "entradas", "saidas"] as const;
export type PanelId = (typeof PANEL_IDS)[number];

export const panelDomId = (id: PanelId) => `painel-${id}`;

/** `?painel=`: um dos três números da faixa, senão nenhum painel aberto. */
export function parsePanel(value: string | string[] | undefined): PanelId | null {
  return PANEL_IDS.find((id) => id === value) ?? null;
}
