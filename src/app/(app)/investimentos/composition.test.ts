import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { allocationView } from "@/lib/investments/fixtures";
import { allocationSchema } from "@/lib/investments/schema";
import { Composition } from "./composition";

const render = (overrides: Record<string, unknown> = {}) =>
  renderToStaticMarkup(createElement(Composition, { allocation: allocationSchema.parse(allocationView(overrides)) }));

describe("Composition", () => {
  it("mostra 'Não classificado' e 'Instituição não informada' quando existem", () => {
    const html = render();
    expect(html).toContain("Não classificado");
    expect(html).toContain("Instituição não informada");
  });

  it("escreve o percentual do backend e a base da moeda, sem converter", () => {
    const html = render();
    expect(html).toContain("66,7%");
    expect(html).toContain("33,3%");
    expect(html).toContain("Em BRL");
    expect(html).toContain("R$ 1.500,00");
  });

  it("a largura da barra vem dos valores exatos, não do percentual arredondado", () => {
    expect(render()).toContain("width:66.66%");
  });

  it("não usa animação nem transição nas barras", () => {
    const html = render();
    expect(html).not.toMatch(/transition|animation/i);
  });

  it("declara cobertura e exclusões quando parcial", () => {
    const html = render({
      availability: "partial",
      knownPositionCount: 3,
      includedPositionCount: 2,
      excludedKnownPositionCount: 1,
      excludedByReason: { incomplete_or_stale: 1, non_active: 0, non_positive_balance: 0, unknown_currency: 0 },
    });
    expect(html).toContain("A composição é parcial");
    expect(html).toContain("2 de 3 posições conhecidas entram no cálculo");
    expect(html).toContain("1 por coleta incompleta ou dados desatualizados");
  });

  it("sem base positiva, diz que não há composição e não desenha tabelas", () => {
    const html = render({ availability: "unavailable", currencies: [], includedPositionCount: 0 });
    expect(html).toContain("Não há base para calcular a composição");
    expect(html).not.toContain("<table");
  });

  it("cada moeda tem a sua base: nada é somado entre moedas", () => {
    const base = allocationView().currencies as Record<string, unknown>[];
    const html = render({ currencies: [base[0], { ...base[0], currencyCode: "USD", denominatorAmount: "10.00" }] });
    expect(html).toContain("Em BRL");
    expect(html).toContain("Em USD");
  });
});
