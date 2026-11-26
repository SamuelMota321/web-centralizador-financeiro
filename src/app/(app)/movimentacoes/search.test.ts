import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/transactions/types";
import {
  filterMovements,
  hasMovementFilters,
  movementsHref,
  categoryChip,
  changeText,
  dailySeries,
  dateRange,
  monthsBefore,
  paginate,
  parseMovementFilters,
  percentChange,
  periodTotals,
  previousRange,
  showingText,
  statusLabel,
  statusSource,
  typeTag,
} from "./presentation";

const ACCOUNT_A = "3f1c2b4e-8a6d-4c1e-9b2a-7d5e6f8a9b0c";
const ACCOUNT_B = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const TODAY = "2026-11-26";

let sequence = 0;
function movement(overrides: Partial<Transaction>): Transaction {
  sequence += 1;
  return {
    id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
    accountId: ACCOUNT_A,
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

const mercado = movement({ description: "Mercado São João" });
const salario = movement({
  type: "income",
  description: "Salário",
  occurredOn: "2026-11-01",
  categorizationStatus: "categorized",
  categorizationSource: "rule",
  categoryId: "c1",
});
const aluguel = movement({
  description: "Aluguel",
  occurredOn: "2026-07-10",
  accountId: ACCOUNT_B,
  categorizationStatus: "categorized",
  categorizationSource: "manual",
  categoryId: "c2",
});
const transferencia = movement({ type: "transfer", transferSide: "outgoing", categorizationStatus: "not_applicable" });
const incerta = movement({ description: "Pix recebido", categorizationStatus: "uncertain" });
const all = [mercado, salario, aluguel, transferencia, incerta];
const CATEGORY_ID = "5b6c7d8e-9f0a-4b1c-8d2e-3f4a5b6c7d8e";
const names = {
  accounts: [
    { id: ACCOUNT_A, name: "Conta Corrente" },
    { id: ACCOUNT_B, name: "Poupança Família" },
  ],
  categories: [{ id: "c1", name: "Trabalho", status: "active" as const }],
};

const defaults = parseMovementFilters({});
// Base dos testes de filtro: "Tudo", para que o período padrão não interfira.
const none = { ...defaults, period: null };

describe("parseMovementFilters", () => {
  it("lê os filtros conhecidos da URL", () => {
    expect(
      parseMovementFilters({
        busca: " mercado ",
        tipo: "despesas",
        situacao: "sem-categoria",
        conta: ACCOUNT_A.toUpperCase(),
        categoria: CATEGORY_ID,
        periodo: "3m",
      }),
    ).toEqual({
      search: "mercado",
      type: "despesas",
      situation: "sem-categoria",
      accountId: ACCOUNT_A,
      categoryId: CATEGORY_ID,
      period: "3m",
      from: null,
      to: null,
    });
  });

  it("descarta valores desconhecidos, ids que não são UUID e datas inexistentes", () => {
    expect(
      parseMovementFilters({ tipo: "expense", situacao: "toString", conta: "../x", categoria: "x", periodo: "30", de: "2026-02-30" }),
    ).toEqual(defaults);
    expect(hasMovementFilters(defaults)).toBe(false);
    expect(hasMovementFilters(none)).toBe(true);
  });

  it("sem período na URL vale 1 mês; 'tudo' é o histórico inteiro", () => {
    expect(defaults.period).toBe("1m");
    expect(parseMovementFilters({ periodo: "tudo" }).period).toBeNull();
  });

  it("datas informadas viram período personalizado, na ordem certa", () => {
    expect(parseMovementFilters({ periodo: "1m", de: "2026-11-20", ate: "2026-11-01" })).toMatchObject({
      period: "personalizado",
      from: "2026-11-01",
      to: "2026-11-20",
    });
    expect(parseMovementFilters({ periodo: "personalizado" })).toMatchObject({ period: "personalizado", from: null, to: null });
  });
});

describe("períodos", () => {
  it("volta meses no calendário, ajustando o fim do mês", () => {
    expect(monthsBefore(TODAY, 1)).toBe("2026-10-26");
    expect(monthsBefore("2026-05-31", 3)).toBe("2026-02-28");
    expect(monthsBefore("2026-01-15", 12)).toBe("2025-01-15");
  });

  it("intervalo do atalho e do personalizado", () => {
    expect(dateRange({ ...none, period: "6m" }, TODAY)).toEqual({ since: "2026-05-26", until: null });
    expect(dateRange({ ...none, period: "personalizado", from: null, to: "2026-11-10" }, TODAY)).toEqual({ since: null, until: "2026-11-10" });
    expect(dateRange(none, TODAY)).toEqual({ since: null, until: null });
  });
});

describe("filterMovements", () => {
  it("busca na descrição sem acento nem caixa", () => {
    expect(filterMovements(all, { ...none, search: "SAO JOAO" }, TODAY)).toEqual([mercado]);
  });

  it("busca também pelo nome da conta e da categoria", () => {
    expect(filterMovements(all, { ...none, search: "familia" }, TODAY, names)).toEqual([aluguel]);
    expect(filterMovements(all, { ...none, search: "trabalho" }, TODAY, names)).toEqual([salario]);
    expect(filterMovements(all, { ...none, search: "trabalho" }, TODAY)).toEqual([]);
  });

  it("filtra por tipo, situação, conta, categoria e período", () => {
    expect(filterMovements(all, { ...none, type: "transferencias" }, TODAY)).toEqual([transferencia]);
    expect(filterMovements(all, { ...none, situation: "incertas" }, TODAY)).toEqual([incerta]);
    expect(filterMovements(all, { ...none, situation: "sem-categoria" }, TODAY)).toEqual([mercado]);
    expect(filterMovements(all, { ...none, accountId: ACCOUNT_B }, TODAY)).toEqual([aluguel]);
    expect(filterMovements(all, { ...none, categoryId: "c1" }, TODAY)).toEqual([salario]);
    expect(filterMovements(all, { ...none, period: "3m" }, TODAY)).not.toContain(aluguel);
  });

  it("período personalizado é inclusivo nas duas pontas", () => {
    const range = { ...none, period: "personalizado" as const, from: "2026-07-10", to: "2026-11-01" };
    expect(filterMovements(all, range, TODAY)).toEqual([salario, aluguel]);
  });

  it("combina filtros e mantém a ordem recebida", () => {
    expect(filterMovements(all, { ...none, type: "despesas", period: "1m" }, TODAY)).toEqual([mercado, incerta]);
  });
});

describe("colunas da tabela", () => {
  it("status curto e origem da categorização", () => {
    expect([mercado, salario, transferencia, incerta].map(statusLabel)).toEqual([
      "Sem categoria",
      "Categorizada",
      "Não se aplica",
      "Incerta",
    ]);
    expect(statusSource(salario)).toBe("por regra");
    expect(statusSource(aluguel)).toBe("por você");
    expect(statusSource(mercado)).toBeNull();
  });

  it("chip só para lançamento categorizado, com fallback sem expor o id", () => {
    expect(categoryChip(salario, names.categories)).toEqual({ id: "c1", label: "Trabalho" });
    expect(categoryChip(aluguel, names.categories)).toEqual({ id: "c2", label: "Categoria indisponível" });
    expect(categoryChip(mercado, names.categories)).toBeNull();
  });

  it("texto do rodapé", () => {
    expect(showingText(2, 20, 20, 124)).toBe("Mostrando 21–40 de 124 movimentações");
    expect(showingText(1, 20, 1, 1)).toBe("Mostrando 1–1 de 1 movimentação");
  });
});

describe("resumo e paginação", () => {
  it("pagina a lista filtrada", () => {
    expect(paginate([1, 2, 3, 4, 5], 2, 2)).toEqual([3, 4]);
    expect(paginate([1, 2], 3, 2)).toEqual([]);
  });

  it("rótulo curto do tipo", () => {
    expect([salario, mercado, transferencia].map(typeTag)).toEqual(["Receita", "Despesa", "Transferência"]);
  });

  it("monta a URL com os filtros ativos e a página", () => {
    expect(movementsHref(defaults, 1)).toBe("/movimentacoes");
    expect(movementsHref(none, 1)).toBe("/movimentacoes?periodo=tudo");
    expect(movementsHref({ ...defaults, search: "café", situation: "sem-categoria" }, 3)).toBe(
      "/movimentacoes?busca=caf%C3%A9&situacao=sem-categoria&pagina=3",
    );
    expect(movementsHref({ ...none, period: "personalizado", from: "2026-11-01", to: "2026-11-20" }, 1)).toBe(
      "/movimentacoes?periodo=personalizado&de=2026-11-01&ate=2026-11-20",
    );
  });
});

describe("entradas, saídas e balanço", () => {
  const estornada = movement({ type: "income", amount: "999.99", status: "voided" });
  const entrada = movement({ type: "income", amount: "1000.50" });
  const saida = movement({ type: "expense", amount: "250.25" });
  const saida2 = movement({ type: "expense", amount: "0.25", occurredOn: "2026-11-24" });
  const transf = movement({ type: "transfer", transferSide: "incoming", amount: "5000.00" });

  it("soma em centavos, sem estornos nem transferências", () => {
    expect(periodTotals([entrada, saida, saida2, estornada, transf])).toEqual({
      income: "1000.50",
      expense: "250.50",
      balance: "750.00",
    });
    expect(periodTotals([saida]).balance).toBe("-250.25");
    expect(periodTotals([])).toEqual({ income: "0.00", expense: "0.00", balance: "0.00" });
  });

  it("período anterior com o mesmo número de dias", () => {
    expect(previousRange("2026-10-26", "2026-11-26")).toEqual({ since: "2026-09-24", until: "2026-10-25" });
    expect(previousRange("2026-03-01", "2026-03-01")).toEqual({ since: "2026-02-28", until: "2026-02-28" });
  });

  it("variação inteira e sem base quando o anterior é zero", () => {
    expect(percentChange("112.00", "100.00")).toBe(12);
    expect(percentChange("50.00", "100.00")).toBe(-50);
    expect(percentChange("-50.00", "-100.00")).toBe(50);
    expect(percentChange("10.00", "0.00")).toBeNull();
    expect(changeText(12)).toBe("+12% vs. período anterior");
    expect(changeText(-50)).toBe("\u221250% vs. período anterior");
    expect(changeText(null)).toMatch(/Sem base/);
  });

  it("séries acumuladas no período, terminando nos totais", () => {
    expect(dailySeries([entrada, saida, saida2, estornada], "2026-11-24", "2026-11-26")).toEqual({
      income: ["0.00", "0.00", "1000.50"],
      expense: ["0.25", "0.25", "250.50"],
      balance: ["-0.25", "-0.25", "750.00"],
    });
  });
});
