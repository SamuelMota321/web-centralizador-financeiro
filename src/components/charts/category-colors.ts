// Cor fixa por categoria (Style Guide 2.1): a posição na ordem estável das categorias do
// usuário (criação, arquivadas incluídas) escolhe a cor. A mesma categoria tem a mesma cor
// em todo mês e em toda tela; arquivar uma não repinta as outras. Sem ciclo: da 7ª em
// diante a cor é neutra, e o nome escrito ao lado é que identifica.

export const CATEGORY_SLOTS = 6;

export const CATEGORY_OTHER = "var(--cat-other)";

export function categoryColors(orderedIds: readonly string[]): Map<string, string> {
  return new Map(
    orderedIds.map((id, index) => [id, index < CATEGORY_SLOTS ? `var(--cat-${index + 1})` : CATEGORY_OTHER]),
  );
}

/** Categoria fora da ordem conhecida (criada depois da leitura) fica neutra. */
export function colorOf(colors: ReadonlyMap<string, string>, id: string): string {
  return colors.get(id) ?? CATEGORY_OTHER;
}
