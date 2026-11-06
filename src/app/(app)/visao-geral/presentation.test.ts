import { describe, expect, it } from "vitest";
import { categoryColors } from "@/components/charts/category-colors";
import {
  SAMPLE_BALANCES,
  SAMPLE_CATEGORY_ORDER,
  SAMPLE_FLOW_MONTHS,
  SAMPLE_RECENT,
  SAMPLE_SPENDING,
} from "@/lib/overview/fixtures";
import {
  attentionItems,
  formatChange,
  formatDay,
  formatReference,
  freshnessChip,
  monthName,
  monthRange,
  movementsTitle,
  overviewHref,
  pageRange,
  periodOption,
  periodTitle,
  splitAccounts,
  toChartFlow,
  toDonutItems,
  toDailyPoints,
  toRecentLines,
} from "./presentation";

const colors = categoryColors(SAMPLE_CATEGORY_ORDER);

describe("meses", () => {
  it("escreve o mês em pt-BR", () => {
    expect(monthName("2026-03")).toBe("março de 2026");
    expect(periodTitle("2026-10")).toBe("Outubro de 2026");
    expect(periodOption("2026-10", true)).toBe("Out · parcial");
    expect(periodOption("2026-09", false)).toBe("Set");
  });

  it("recusa mês fora do formato", () => {
    expect(() => monthName("2026-13")).toThrow(RangeError);
    expect(() => monthName("10/2026")).toThrow(RangeError);
  });

  it("converte o fluxo para o gráfico mantendo os valores", () => {
    const chart = toChartFlow(SAMPLE_FLOW_MONTHS.slice(-2));
    expect(chart).toEqual([
      expect.objectContaining({ month: "set", monthName: "setembro de 2026", outflow: "4870.00", partial: false }),
      expect.objectContaining({ month: "out", net: "3637.70", partial: true }),
    ]);
  });
});

describe("referência e frescor", () => {
  it("mostra a referência no horário de Brasília", () => {
    expect(formatReference("2026-10-05T12:12:00Z")).toBe("05/10, 09:12");
  });

  it("só marca o que pede atenção", () => {
    expect(freshnessChip("current")).toBeNull();
    expect(freshnessChip("stale")).toEqual({ tone: "warning", label: "Desatualizada" });
    expect(freshnessChip("unavailable")?.tone).toBe("neutral");
  });
});

describe("agrupamentos", () => {
  it("separa cartões das demais contas", () => {
    const { accounts, cards } = splitAccounts(SAMPLE_BALANCES["2026-10"].accounts);
    expect(cards.map((card) => card.type)).toEqual(["credit_card"]);
    expect(accounts.some((account) => account.type === "credit_card")).toBe(false);
  });

  it("fatias têm a cor fixa da categoria, A revisar no fim e só com valor", () => {
    const september = toDonutItems(SAMPLE_SPENDING["2026-09"], colors);
    expect(september.find((item) => item.label === "Moradia")?.color).toBe("var(--cat-1)");
    expect(september.find((item) => item.label === "Educação (arquivada)")?.color).toBe("var(--cat-6)");
    expect(september.at(-1)).toEqual(expect.objectContaining({ label: "A revisar", review: true }));

    const october = toDonutItems(SAMPLE_SPENDING["2026-10"], colors);
    expect(october.find((item) => item.label === "Moradia")?.color).toBe("var(--cat-1)");

    const clean = toDonutItems({ ...SAMPLE_SPENDING["2026-09"], toReview: { amount: "0.00", count: 0 } }, colors);
    expect(clean.some((item) => item.review)).toBe(false);
  });
});

describe("formatChange", () => {
  it("dá a variação com uma casa sobre o mês anterior", () => {
    expect(formatChange("17340.95", "16630.20", "2026-09")).toBe("↑ 4,3% vs. setembro");
    expect(formatChange("90.00", "100.00", "2026-09")).toBe("↓ 10,0% vs. setembro");
    expect(formatChange("100.00", "100.00", "2026-09")).toBe("Igual a setembro");
  });

  it("não inventa percentual sem base positiva", () => {
    expect(formatChange("10.00", "0.00", "2026-09")).toBeNull();
    expect(formatChange("10.00", "-5.00", "2026-09")).toBeNull();
  });
});

describe("Pede sua atenção", () => {
  it("lista só fatos das agregações, com a ação de cada um", () => {
    const items = attentionItems(SAMPLE_BALANCES["2026-10"], SAMPLE_SPENDING["2026-10"]);
    expect(items.map((item) => item.tone)).toEqual(["review", "warning", "info"]);
    expect(items[0].title).toBe("4 saídas sem categoria segura · R$ 161,40");
    expect(items[1]).toEqual(
      expect.objectContaining({
        title: "Conta digital com referência de 01/10",
        action: { label: "Importar extrato OFX", href: "/contas/importar-ofx" },
      }),
    );
  });

  it("sem dados não inventa nada", () => {
    expect(attentionItems(null, null)).toEqual([]);
  });
});

describe("últimas movimentações", () => {
  it("escreve sinal, data e categoria, com a cor fixa", () => {
    const lines = toRecentLines(SAMPLE_RECENT, colors);
    expect(lines[0]).toEqual(
      expect.objectContaining({
        amount: "− R$ 184,90",
        meta: "05/10 · Alimentação · Conta do dia a dia",
        color: "var(--cat-2)",
      }),
    );
    expect(lines[1]).toEqual(expect.objectContaining({ toReview: true, color: null }));
    expect(lines[3]).toEqual(expect.objectContaining({ direction: "transfer", amount: "R$ 500,00", color: null }));
    expect(lines[4].amount).toBe("+ R$ 6.800,00");
    expect(formatDay("2026-10-01")).toBe("01/10");
  });
});

describe("URL e lista de saídas", () => {
  it("monta o link só com o que difere do padrão", () => {
    expect(overviewHref({ periodo: "2026-10" })).toBe("/visao-geral?periodo=2026-10");
    expect(overviewHref({ periodo: "2026-10", categoria: "x", pagina: 2, meses: 1 })).toBe(
      "/visao-geral?periodo=2026-10&categoria=x&pagina=2",
    );
  });

  it("escreve o título e o intervalo da página", () => {
    expect(movementsTitle("2026-10", null)).toBe("Saídas de outubro de 2026");
    expect(movementsTitle("2026-10", "Moradia")).toBe("Saídas de Moradia em outubro de 2026");
    expect(pageRange(2, 6, 34)).toBe("7–12 de 34");
    expect(pageRange(6, 6, 34)).toBe("31–34 de 34");
    expect(pageRange(1, 6, 0)).toBe("Nenhuma saída");
  });
});

describe("monthRange", () => {
  it("escreve o intervalo sem repetir o ano", () => {
    expect(monthRange("2026-04", "2026-10")).toBe("abril a outubro de 2026");
    expect(monthRange("2025-11", "2026-03")).toBe("novembro de 2025 a março de 2026");
    expect(monthRange("2026-03", "2026-03")).toBe("março de 2026");
  });
});

describe("toDailyPoints", () => {
  it("usa o dia curto no eixo e a data completa na tabela", () => {
    expect(toDailyPoints([{ date: "2026-10-05", available: "17340.95" }])).toEqual([
      { label: "05/10", labelName: "05/10/2026", value: "17340.95" },
    ]);
  });

  it("o link do painel entra e sai da URL", () => {
    expect(overviewHref({ periodo: "2026-10", disponivel: true })).toBe("/visao-geral?periodo=2026-10&disponivel=1");
    expect(overviewHref({ periodo: "2026-10", disponivel: false })).toBe("/visao-geral?periodo=2026-10");
  });
});
