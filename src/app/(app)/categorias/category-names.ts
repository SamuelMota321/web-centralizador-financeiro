import type { Category } from "@/lib/categories/types";

export const DUPLICATE_NAME_MESSAGE =
  "Você já tem uma categoria com este nome (inclusive arquivada). Use outro nome.";

/**
 * Espelha o indice unico do banco (tenant_id, name): comparacao exata do nome ja
 * normalizado, diferenciando maiusculas e incluindo arquivadas. `exceptId` ignora a
 * propria categoria ao renomear.
 */
export function hasNameConflict(
  normalizedName: string,
  categories: Pick<Category, "id" | "name">[],
  exceptId?: string,
): boolean {
  return categories.some(
    (category) => category.id !== exceptId && category.name === normalizedName,
  );
}
