import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SAMPLE_ALLOCATION, SAMPLE_BALANCE, SAMPLE_FLOW, SAMPLE_SPENDING } from "./fixtures";
import { LineChart } from "./line-chart";
import { PairedBarsChart } from "./paired-bars";
import { RankedBars } from "./ranked-bars";
import { ShareBar } from "./share-bar";

// Os valores precisam sair no HTML do servidor, em texto: é a leitura acessível de cada
// gráfico e o que aparece antes de qualquer JavaScript.

describe("gráficos renderizados no servidor", () => {
  it("barras pareadas trazem a tabela com o mês parcial marcado e o SVG fora da leitura", () => {
    const html = renderToStaticMarkup(
      createElement(PairedBarsChart, { caption: "Entradas e saídas por mês", data: SAMPLE_FLOW }),
    );
    expect(html).toContain("<caption");
    expect(html).toContain("outubro de 2026");
    expect(html).toContain("parcial");
    expect(html).toContain("R$ 7.100,00");
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html.match(/<rect/g)?.length).toBe(SAMPLE_FLOW.length * 3);
  });

  it("linha traz um ponto e uma linha de tabela por data", () => {
    const html = renderToStaticMarkup(
      createElement(LineChart, { caption: "Saldo", points: SAMPLE_BALANCE, valueLabel: "Saldo" }),
    );
    expect(html.match(/<circle/g)?.length).toBe(SAMPLE_BALANCE.length);
    expect(html).toContain("R$ 28.237,70");
  });

  it("barras ordenadas mostram valor e percentual em texto, com A revisar no fim", () => {
    const html = renderToStaticMarkup(createElement(RankedBars, { caption: "Gastos", ...SAMPLE_SPENDING }));
    expect(html).toContain("R$ 1.450,00");
    expect(html).toContain("41,9%");
    expect(html.indexOf("Moradia")).toBeLessThan(html.indexOf("A revisar"));
  });

  it("barra 100% lista cada classe com valor e parte", () => {
    const html = renderToStaticMarkup(createElement(ShareBar, { caption: "Alocação", ...SAMPLE_ALLOCATION }));
    expect(html).toContain("Não classificado");
    expect(html).toContain("53,3%");
    expect(html).toContain("3,6%");
  });
});
