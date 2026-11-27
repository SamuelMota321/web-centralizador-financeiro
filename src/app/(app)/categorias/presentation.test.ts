import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/transactions/types";
import {
  arrangeCategories,
  categoriesHref,
  downsample,
  expenseShare,
  parseCategoryParams,
  periodRange,
  paginate,
  periodUsage,
  reviewHref,
  rulesPerCategory,
  suggestionTiles,
  usageFigure,
} from "./presentation";

const TODAY = "2026-11-26";
let sequence = 0;
function tx(overrides: Partial<Transaction>): Transaction {
  sequence += 1;
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    accountId: "a",
    type: "expense",
    amount: "10.00",
    occurredOn: TODAY,
    description: null,
    status: "posted",
    transferId: null,
    transferSide: null,
    categoryId: null,
    categorizationStatus: "unclassified",
    categorizationSource: null,
    createdAt: "2026-11-26T12:00:00.000Z",
    updatedAt: "2026-11-26T12:00:00.000Z",
    ...overrides,
  };
}
const cat = (categoryId: string) => ({ categoryId, categorizationStatus: "categorized" as const, categorizationSource: "manual" as const });

describe("parâmetros", () => {
  it("lê período, busca e ordem; valores desconhecidos voltam ao padrão", () => {
    expect(parseCategoryParams({ periodo: "3m", busca: " mer ", ordem: "nome" })).toEqual({ period: "3m", search: "mer", sort: "nome", page: 1, archivedPage: 1 });
    expect(parseCategoryParams({ periodo: "tudo", ordem: "toString" })).toEqual({ period: "1m", search: "", sort: "uso", page: 1, archivedPage: 1 });
  });

  it("monta a URL omitindo os padrões", () => {
    const base = parseCategoryParams({});
    expect(categoriesHref(base)).toBe("/categorias");
    expect(categoriesHref(base, { period: "6m", sort: "recentes" })).toBe("/categorias?periodo=6m&ordem=recentes");
  });

  it("período de 1 mês até hoje", () => {
    expect(periodRange("1m", TODAY)).toEqual({ since: "2026-10-26", until: TODAY });
  });
});

describe("periodUsage", () => {
  const items = [
    tx({ ...cat("mercado"), amount: "100.00", occurredOn: "2026-11-01" }),
    tx({ ...cat("mercado"), amount: "50.50", occurredOn: "2026-11-20" }),
    tx({ ...cat("salario"), type: "income", amount: "4800.00", occurredOn: "2026-11-05" }),
    tx({ amount: "40.00" }), // despesa sem categoria
    tx({ ...cat("mercado"), amount: "999.00", status: "voided" }), // estorno: fora
    tx({ type: "transfer", transferSide: "outgoing", amount: "1000.00", categorizationStatus: "not_applicable" }), // fora
    tx({ ...cat("mercado"), amount: "77.00", occurredOn: "2026-09-01" }), // antes do período: fora
  ];
  const usage = periodUsage(items, "2026-10-26", TODAY);

  it("soma por categoria em centavos, sem estornos, transferências nem fora do período", () => {
    expect(usage.byCategory.get("mercado")).toMatchObject({ expense: BigInt(15050), income: BigInt(0), count: 2 });
    expect(usage.byCategory.get("salario")).toMatchObject({ expense: BigInt(0), income: BigInt(480000), count: 1 });
    expect(usage.totalExpense).toBe(BigInt(19050));
    expect(usage.uncategorizedExpense).toBe(BigInt(4000));
    expect(usage.uncategorizedCount).toBe(1);
  });

  it("série acumulada termina no total do fluxo principal", () => {
    expect(usage.byCategory.get("mercado")?.series.at(-1)).toBe("150.50");
    expect(usage.byCategory.get("salario")?.series.at(-1)).toBe("4800.00");
    expect(usage.byCategory.get("mercado")?.series.length).toBeLessThanOrEqual(30);
  });

  it("figura do cartão: gasto com participação, recebido sem participação, ou nada", () => {
    expect(usageFigure(usage.byCategory.get("mercado"), usage.totalExpense)).toEqual({ kind: "gasto", value: "150.50", share: "79,0%" });
    expect(usageFigure(usage.byCategory.get("salario"), usage.totalExpense)).toEqual({ kind: "recebido", value: "4800.00", share: null });
    expect(usageFigure(undefined, usage.totalExpense)).toEqual({ kind: "nenhum", value: null, share: null });
  });

  it("a revisar: separa sem categoria de incertas e aponta o filtro certo", () => {
    expect(usage.reviewKinds).toEqual({ unclassified: 1, uncertain: 0 });
    expect(reviewHref({ unclassified: 1, uncertain: 0 }, "1m")).toBe("/movimentacoes?tipo=despesas&situacao=sem-categoria");
    expect(reviewHref({ unclassified: 0, uncertain: 2 }, "3m")).toBe("/movimentacoes?tipo=despesas&situacao=incertas&periodo=3m");
    expect(reviewHref({ unclassified: 1, uncertain: 1 }, "1m")).toBe("/movimentacoes?tipo=despesas");
  });

  it("parte das despesas; sem despesa no período não há parte", () => {
    expect(expenseShare(usage.uncategorizedExpense, usage.totalExpense)).toBe("21,0%");
    expect(expenseShare(BigInt(10), BigInt(0))).toBeNull();
  });
});

describe("lista", () => {
  const categories = [
    { id: "a", name: "Saúde", createdAt: "2026-09-01" },
    { id: "b", name: "Alimentação", createdAt: "2026-10-01" },
    { id: "c", name: "Lazer", createdAt: "2026-11-01" },
  ];
  const usage = new Map([
    ["b", { expense: BigInt(500), income: BigInt(0), count: 3, series: [] }],
    ["c", { expense: BigInt(500), income: BigInt(0), count: 5, series: [] }],
  ]);

  it("ordena por uso (valor, depois quantidade), nome e criação", () => {
    expect(arrangeCategories(categories, usage, "", "uso").map((c) => c.id)).toEqual(["c", "b", "a"]);
    expect(arrangeCategories(categories, usage, "", "nome").map((c) => c.id)).toEqual(["b", "c", "a"]);
    expect(arrangeCategories(categories, usage, "", "recentes").map((c) => c.id)).toEqual(["c", "b", "a"]);
  });

  it("busca sem acento e sem caixa", () => {
    expect(arrangeCategories(categories, null, "SAUDE", "uso").map((c) => c.id)).toEqual(["a"]);
  });

  it("conta regras por categoria, sem as removidas", () => {
    const counts = rulesPerCategory([
      { categoryId: "a", status: "active" },
      { categoryId: "a", status: "inactive" },
      { categoryId: "a", status: "removed" },
    ]);
    expect(counts.get("a")).toBe(2);
  });

  it("reduz séries longas mantendo as pontas", () => {
    const reduced = downsample(Array.from({ length: 366 }, (_, i) => i));
    expect(reduced).toHaveLength(30);
    expect([reduced[0], reduced.at(-1)]).toEqual([0, 365]);
  });
});

describe("paginação", () => {
  it("10 por página; página além do fim vale a última; vazio tem uma página", () => {
    const items = Array.from({ length: 23 }, (_, i) => i);
    expect(paginate(items, 1)).toMatchObject({ pages: 3, page: 1, items: items.slice(0, 10) });
    expect(paginate(items, 3).items).toEqual([20, 21, 22]);
    expect(paginate(items, 99)).toMatchObject({ page: 3 });
    expect(paginate([], 1)).toEqual({ items: [], page: 1, pages: 1 });
  });

  it("URL: trocar de página mantém a outra lista; mudar filtro volta ao início", () => {
    const base = parseCategoryParams({ pagina: "2", arquivadas: "3", periodo: "3m" });
    expect(base).toMatchObject({ page: 2, archivedPage: 3 });
    expect(categoriesHref(base, { page: 3 })).toBe("/categorias?periodo=3m&pagina=3&arquivadas=3");
    expect(categoriesHref(base, { search: "x" })).toBe("/categorias?periodo=3m&busca=x");
    expect(parseCategoryParams({ pagina: "0", arquivadas: "abc" })).toMatchObject({ page: 1, archivedPage: 1 });
  });
});

describe("sugeridas", () => {
  const names = ["Alimentação", "Mercado", "Moradia"];
  const colors = new Map([["a", "var(--cat-1)"]]);

  it("faltando, adicionada e arquivada; adicionar uma a mais muda só aquela", () => {
    const before = suggestionTiles(names, [{ id: "a", name: "Alimentação", status: "active" }, { id: "m", name: "Mercado", status: "archived" }], colors);
    expect(before.map((tile) => tile.state)).toEqual(["added", "archived", "missing"]);
    expect(before[0].color).toBe("var(--cat-1)");
    const after = suggestionTiles(
      names,
      [{ id: "a", name: "Alimentação", status: "active" }, { id: "m", name: "Mercado", status: "archived" }, { id: "o", name: "Moradia", status: "active" }],
      colors,
    );
    expect(after.map((tile) => tile.state)).toEqual(["added", "archived", "added"]);
  });
});
