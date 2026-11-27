import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { investmentsPreviewPage } from "@/lib/investments/preview";
import { Summary } from "./summary";

const NOW = new Date("2025-11-27T15:00:00.000Z");
const html = renderToStaticMarkup(createElement(Summary, { portfolio: investmentsPreviewPage(NOW).portfolio, now: NOW }));

describe("Summary (dados de exemplo, duas moedas, uma conexão parcial e uma indisponível)", () => {
  it("sem total seguro, explica o motivo permitido pelo contrato em vez de inventar um número", () => {
    expect(html).toContain("Sem total");
    expect(html).toContain("A carteira tem mais de uma moeda e o app não converte entre elas");
  });

  it("mostra cada moeda com o seu total, sem somar", () => {
    expect(html).toContain("R$ 1.950,00");
    expect(html).toContain("USD 1.500,00");
    expect(html).toContain("Moedas diferentes não são somadas nem convertidas");
  });

  it("disponibilidade por conexão, com contagem e percentual escritos", () => {
    expect(html).toContain("2 de 4 conexões completas");
    expect(html).toContain("Completas");
    expect(html).toContain("2 · 50%");
    expect(html).toContain("Indisponíveis");
    expect(html).toContain("1 · 25%");
    expect(html).toContain('role="img"');
  });

  it("última atualização com a data e a idade", () => {
    expect(html).toContain("25/11/2025");
    expect(html).toContain("há 2 dias");
  });
});
