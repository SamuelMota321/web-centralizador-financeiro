export type PageSlot = number | "gap";

/**
 * Páginas exibidas na paginação: sempre a primeira, a última e as vizinhas da atual;
 * o resto vira reticências. Uma reticência nunca esconde uma única página.
 * Com poucas páginas (até 7, na configuração padrão) todas aparecem.
 * Ex.: página 6 de 12 -> 1 … 5 6 7 … 12.
 */
export function pageWindow(page: number, pages: number, siblings = 1): PageSlot[] {
  if (pages <= 1) return [1];
  if (pages <= 2 * siblings + 5) return Array.from({ length: pages }, (_, index) => index + 1);
  const current = Math.min(Math.max(page, 1), pages);
  const start = Math.max(2, current - siblings);
  const end = Math.min(pages - 1, current + siblings);
  const slots: PageSlot[] = [1];
  if (start === 3) slots.push(2);
  else if (start > 3) slots.push("gap");
  for (let n = start; n <= end; n += 1) slots.push(n);
  if (end === pages - 2) slots.push(pages - 1);
  else if (end < pages - 2) slots.push("gap");
  slots.push(pages);
  return slots;
}
