import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { allocationView } from "@/lib/investments/fixtures";
import { allocationSchema } from "@/lib/investments/schema";
import { Composition } from "./composition";
import { selectedCurrency } from "./presentation";

const render = (overrides: Record<string, unknown> = {}, requested: string | null = null) => {
  const allocation = allocationSchema.parse(allocationView(overrides));
  return renderToStaticMarkup(
    createElement(Composition, {
      allocation,
      selected: selectedCurrency(allocation, requested),
      currencyHref: (code: string) => `/investimentos?moeda=${code}`,
    }),
  );
};

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
    expect(html).toContain("base R$ 1.500,00");
  });

  it("a largura da barra vem dos valores exatos, não do percentual arredondado", () => {
    expect(render()).toContain("flex-basis:66.66%");
  });

  it("a barra tem texto equivalente e a legenda escreve classe, percentual e valor (a cor não basta)", () => {
    const html = render();
    expect(html).toContain('role="img"');
    expect(html).toContain("Renda fixa 66,7%");
    expect(html).toContain("R$ 1.000,00");
  });

  it("não usa animação nem transição nas barras", () => {
    expect(render()).not.toMatch(/transition|animation/i);
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

  it("uma moeda por vez: a outra não aparece misturada, e o seletor oferece as duas", () => {
    const base = allocationView().currencies as Record<string, unknown>[];
    const currencies = [base[0], { ...base[0], currencyCode: "USD", denominatorAmount: "10.00" }];
    const brl = render({ currencies });
    expect(brl).toContain("base R$ 1.500,00");
    expect(brl).not.toContain("base USD");
    expect(brl).toContain("moeda=USD");
    expect(brl).toContain("moeda=BRL");
    const usd = render({ currencies }, "USD");
    expect(usd).toContain("base USD 10,00");
    expect(usd).not.toContain("base R$");
  });

  it("com uma moeda só, não há seletor", () => {
    expect(render()).not.toContain("moeda=");
  });
});
