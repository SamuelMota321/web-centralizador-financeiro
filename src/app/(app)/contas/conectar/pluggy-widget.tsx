"use client";

import { PluggyConnect } from "react-pluggy-connect";
import { itemIdFromSuccess } from "./widget-payload";

export interface PluggyWidgetProps {
  connectToken: string;
  onItem: (itemId: string | null) => void;
  /** Erro do provedor ou falha ao carregar o widget; a mensagem do provedor nao e exibida. */
  onFailure: () => void;
  onClose: () => void;
}

/**
 * Widget do Pluggy Connect. Carregado so no navegador (o SDK usa `window` ao ser importado).
 * Escopo da Sprint 3: conectores do Sandbox.
 */
export default function PluggyWidget({ connectToken, onItem, onFailure, onClose }: PluggyWidgetProps) {
  return (
    <PluggyConnect
      connectToken={connectToken}
      includeSandbox
      language="pt"
      theme="light"
      onSuccess={(data: unknown) => onItem(itemIdFromSuccess(data))}
      onError={() => onFailure()}
      onLoadError={() => onFailure()}
      onClose={() => onClose()}
    />
  );
}
