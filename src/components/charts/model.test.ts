import { describe, expect, it } from "vitest";
import { SAMPLE_FLOW, SAMPLE_SPENDING } from "./fixtures";
import {
  MAX_BAR_WIDTH,
  barRatio,
  formatShare,
  formatTick,
  lineLayout,
  maxValue,
  pairedBarsLayout,
  rankByValue,
  toCents,
} from "./model";

describe("toCents", () => {
  it("converte a string decimal do contrato sem ponto flutuante", () => {
    expect(toCents("1234.56")).toBe(BigInt(123456));
    expect(toCents("-0.10")).toBe(BigInt(-10));
    expect(toCents("99999999999999999.99")).toBe(BigInt("9999999999999999999"));
  });

  it("recusa valor fora do formato em vez de assumir zero", () => {
    expect(() => toCents("12,50")).toThrow(RangeError);
    expect(() => toCents("12.5")).toThrow(RangeError);
    expect(() => toCents("")).toThrow(RangeError);
  });
});

describe("formatShare", () => {
  it("dá o percentual com uma casa, como no mockup", () => {
    const { total, items } = SAMPLE_SPENDING;
    expect(items.map((item) => formatShare(item.value, total))).toEqual([
      "41,9%",
      "28,3%",
      "11,9%",
      "7,7%",
      "5,5%",
      "4,7%",
    ]);
  });

  it("arredonda meio para cima", () => {
    expect(formatShare("1.00", "8.00")).toBe("12,5%");
    expect(formatShare("1.00", "16.00")).toBe("6,3%");
    expect(formatShare("1.00", "3.00")).toBe("33,3%");
    expect(formatShare("2.00", "3.00")).toBe("66,7%");
  });

  it("não inventa percentual com total zero", () => {
    expect(formatShare("0.00", "0.00")).toBeNull();
  });
});

describe("barRatio, rankByValue e maxValue", () => {
  it("limita a fração entre 0 e 1", () => {
    expect(barRatio("50.00", "200.00")).toBe(0.25);
    expect(barRatio("10.00", "0.00")).toBe(0);
  });

  it("ordena do maior para o menor e mantém a ordem nos empates", () => {
    const ranked = rankByValue([
      { id: "a", value: "10.00" },
      { id: "b", value: "30.00" },
      { id: "c", value: "10.00" },
    ]);
    expect(ranked.map((item) => item.id)).toEqual(["b", "a", "c"]);
  });

  it("acha o maior valor em centavos", () => {
    expect(maxValue(["9.99", "10.00", "2.50"])).toBe("10.00");
    expect(maxValue([])).toBe("0.00");
  });
});

describe("pairedBarsLayout", () => {
  const layout = pairedBarsLayout(SAMPLE_FLOW, 520, 190);

  it("parte as barras da linha de base e mantém a proporção dos valores", () => {
    const july = layout.months[2];
    expect(july.inflow.y + july.inflow.height).toBeCloseTo(layout.plot.bottom);
    expect(july.outflow.y + july.outflow.height).toBeCloseTo(layout.plot.bottom);
    expect(july.outflow.height / july.inflow.height).toBeCloseTo(6120 / 7050, 3);
  });

  it("começa o eixo em zero e põe a saída à direita da entrada", () => {
    expect(layout.ticks[0]).toEqual({ value: 0, y: layout.plot.bottom });
    for (const month of layout.months) {
      expect(month.outflow.x).toBeGreaterThan(month.inflow.x + month.inflow.width);
    }
  });

  it("com poucos meses a barra não passa do máximo e o par fica centralizado", () => {
    const single = pairedBarsLayout([SAMPLE_FLOW[0]], 520, 190);
    const month = single.months[0];
    expect(month.inflow.width).toBe(MAX_BAR_WIDTH);
    const pairCenter = (month.inflow.x + month.outflow.x + month.outflow.width) / 2;
    expect(pairCenter).toBeCloseTo(month.center, 5);
  });

  it("período sem movimentação desenha barras de altura zero", () => {
    const empty = pairedBarsLayout(
      [{ month: "nov", monthName: "novembro de 2026", inflow: "0.00", outflow: "0.00", net: "0.00" }],
      520,
      190,
    );
    expect(empty.months[0].inflow.height).toBe(0);
    expect(empty.months[0].outflow.height).toBe(0);
  });
});

describe("lineLayout", () => {
  it("gera um caminho por todos os pontos, da esquerda para a direita", () => {
    const layout = lineLayout(
      [
        { label: "a", labelName: "a", value: "10.00" },
        { label: "b", labelName: "b", value: "20.00" },
      ],
      200,
      100,
    );
    expect(layout.points[0].x).toBe(layout.plot.left);
    expect(layout.points[1].x).toBe(layout.plot.right);
    expect(layout.points[1].y).toBeLessThan(layout.points[0].y);
    expect(layout.path.startsWith("M")).toBe(true);
    expect(layout.path).toContain("L");
  });
});

describe("formatTick", () => {
  it("abrevia em pt-BR", () => {
    expect(formatTick(0)).toBe("0");
    expect(formatTick(8000)).toBe("8 mil");
  });
});
