import { describe, expect, it } from "vitest";
import { SAMPLE_BALANCES, SAMPLE_FLOW_MONTHS, SAMPLE_SPENDING } from "@/lib/overview/fixtures";
import {
  formatReference,
  freshnessChip,
  monthName,
  periodOption,
  periodTitle,
  splitAccounts,
  toChartFlow,
  toRankedItems,
} from "./presentation";

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

  it("inclui A revisar só quando há valor e marca categoria arquivada", () => {
    const september = toRankedItems(SAMPLE_SPENDING["2026-09"]);
    expect(september.at(-1)).toEqual(expect.objectContaining({ label: "A revisar", review: true }));
    expect(september.map((item) => item.label)).toContain("Educação (arquivada)");

    const clean = toRankedItems({ ...SAMPLE_SPENDING["2026-09"], toReview: { amount: "0.00", count: 0 } });
    expect(clean.some((item) => item.review)).toBe(false);
  });
});
