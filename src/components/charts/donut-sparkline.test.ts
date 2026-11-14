import { describe, expect, it } from "vitest";
import { CATEGORY_OTHER, categoryColors, colorOf } from "./category-colors";
import {
  DONUT_GAP,
  DONUT_OTHER_ID,
  donutArcs,
  donutItems,
  fromCents,
  sparkline,
  sumValues,
  type DonutItem,
} from "./model";

const item = (id: string, value: string, review = false): DonutItem => ({
  id,
  label: id,
  value,
  color: `var(--${id})`,
  review,
});

describe("fromCents e sumValues", () => {
  it("volta para a string do contrato", () => {
    expect(fromCents(BigInt(-1050))).toBe("-10.50");
    expect(fromCents(BigInt(5))).toBe("0.05");
    expect(sumValues(["0.10", "0.20"])).toBe("0.30");
  });
});

describe("categoryColors", () => {
  const ids = ["a", "b", "c", "d", "e", "f", "g"];

  it("dá a cor pela ordem estável e neutra da sétima em diante", () => {
    const colors = categoryColors(ids);
    expect(colors.get("a")).toBe("var(--cat-1)");
    expect(colors.get("f")).toBe("var(--cat-6)");
    expect(colors.get("g")).toBe(CATEGORY_OTHER);
  });

  it("mantém a cor quando o ranking do mês muda", () => {
    const colors = categoryColors(ids);
    const october = ["c", "a"].map((id) => colorOf(colors, id));
    const september = ["a", "c"].map((id) => colorOf(colors, id));
    expect(october.reverse()).toEqual(september);
  });

  it("categoria desconhecida fica neutra", () => {
    expect(colorOf(categoryColors(ids), "nova")).toBe(CATEGORY_OTHER);
  });
});

describe("donutItems", () => {
  it("ordena do maior para o menor e deixa A revisar no fim", () => {
    const result = donutItems([item("r", "50.00", true), item("a", "10.00"), item("b", "30.00")], "neutra");
    expect(result.map((i) => i.id)).toEqual(["b", "a", "r"]);
  });

  it("junta o excedente em Outras para não passar de seis fatias", () => {
    const many = ["a", "b", "c", "d", "e", "f", "g", "h"].map((id, index) => item(id, `${80 - index * 10}.00`));
    const result = donutItems([...many, item("r", "5.00", true)], "neutra");
    expect(result).toHaveLength(7);
    const other = result.find((i) => i.id === DONUT_OTHER_ID);
    expect(other).toEqual(expect.objectContaining({ label: "Outras (3)", value: "60.00", color: "neutra" }));
    expect(result.at(-1)?.id).toBe("r");
  });
});

describe("donutArcs", () => {
  it("as fatias cobrem o contorno, com o espaço entre elas", () => {
    const items = [item("a", "75.00"), item("b", "25.00")];
    const arcs = donutArcs(items, "100.00", 400);
    expect(arcs[0]).toEqual({ id: "a", length: 300 - DONUT_GAP, start: 0 });
    expect(arcs[1]).toEqual({ id: "b", length: 100 - DONUT_GAP, start: 300 });
  });

  it("uma fatia só fecha o anel, e total zero não desenha nada", () => {
    expect(donutArcs([item("a", "10.00")], "10.00", 100)[0].length).toBe(100);
    expect(donutArcs([item("a", "0.00")], "0.00", 100)[0].length).toBe(0);
  });
});

describe("sparkline", () => {
  it("vai do menor ao maior valor dentro da altura", () => {
    const line = sparkline(["10.00", "20.00", "30.00"], 120, 40);
    expect(line.solid).toBe("M0 36L60 20L120 4");
    expect(line.partial).toBeNull();
    expect(line.last).toEqual({ x: 120, y: 4 });
    expect(line.points).toEqual([
      { x: 0, y: 36 },
      { x: 60, y: 20 },
      { x: 120, y: 4 },
    ]);
  });

  it("separa o último trecho quando o mês está em andamento", () => {
    const line = sparkline(["30.00", "20.00", "10.00"], 120, 40, true);
    expect(line.solid).toBe("M0 4L60 20");
    expect(line.partial).toBe("M60 20L120 36");
  });

  it("série constante fica no meio", () => {
    expect(sparkline(["5.00", "5.00"], 100, 40).solid).toBe("M0 20L100 20");
  });
});
