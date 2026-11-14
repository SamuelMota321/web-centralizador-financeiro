import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SAMPLE_SPENDING } from "@/lib/overview/fixtures";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import VisaoGeralPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/visao-geral",
  useRouter: () => ({ push: () => {} }),
}));

const render = async (periodo?: string, extra: Record<string, string> = {}) =>
  renderToStaticMarkup(await VisaoGeralPage({ searchParams: Promise.resolve({ periodo, ...extra }) }));

describe("Visão geral", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("não existe sem a flag da prévia", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "");
    await expect(render()).rejects.toThrow("NOT_FOUND");
  });

  it("avisa que são dados de exemplo e mostra os blocos 1 a 5", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const html = await render();
    expect(html).toContain("Prévia com dados de exemplo");
    expect(html).toContain("Outubro de 2026 · parcial");
    // Faixa: Disponível com a conta desatualizada sinalizada.
    expect(html).toContain("R$ 17.340,95");
    expect(html).toContain("Inclui conta desatualizada");
    // Saldos, com cartões em grupo próprio.
    expect(html).toContain("Cartões · fora do Disponível");
    expect(html).toContain("-R$ 1.240,30");
    // Variação sobre o mês anterior; mês em andamento sem comparação.
    expect(html).toContain("↑ 4,3% vs. setembro");
    expect(html).toContain("Mês em andamento: sem comparação");
    // Rosca com cor fixa e valores em texto; fluxo com a tabela.
    expect(html).toContain("stroke:var(--cat-1)");
    expect(html).toContain("41,9%");
    expect(html).toContain("R$ 3.637,70");
    // Últimas movimentações e "Pede sua atenção" com a ação de cada fato.
    expect(html).toContain("Mercado do bairro");
    expect(html).toContain("Categorizar");
    expect(html).toContain("Importar extrato OFX");
  });

  it("troca os números com o período e cai no mês corrente com período desconhecido", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const september = await render("2026-09");
    expect(september).toContain("R$ 16.630,20");
    expect(september).toContain("Educação (arquivada)");
    expect(september).not.toContain("Inclui conta desatualizada");

    expect(await render("2020-01")).toContain("R$ 17.340,95");
  });

  it("lista as saídas do mês sob a rosca, seis por página, e cada categoria vira filtro", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const html = await render();
    const moradia = SAMPLE_SPENDING["2026-10"].categories[0].categoryId;
    expect(html).toContain("Saídas de outubro de 2026");
    expect(html).toContain("1–6 de 34");
    expect(html).toContain(`href="/visao-geral?periodo=2026-10&amp;categoria=${moradia}"`);
    expect(html).toContain('aria-label="Páginas das saídas"');
  });

  it("com categoria na URL, filtra, marca a escolhida e oferece mostrar todas", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const moradia = SAMPLE_SPENDING["2026-10"].categories[0].categoryId;
    const html = await render("2026-10", { categoria: moradia });
    expect(html).toContain("Saídas de Moradia em outubro de 2026");
    expect(html).toContain("1–2 de 2");
    expect(html).toContain('aria-current="true"');
    expect(html).toContain("Mostrar todas");
    // Clicar de novo na escolhida tira o filtro.
    expect(html).toContain('href="/visao-geral?periodo=2026-10"');
  });

  it("fluxo pagina de sete em sete meses, com título e o mês mais novo no topo da tabela", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const latest = await render();
    expect(latest).toContain("Valores de abril a outubro de 2026");
    expect(latest).toContain("7 meses");
    expect(latest).toMatch(/class="[^"]*_flowPagination_[^"]*"><nav[^>]*aria-label="Páginas dos meses/);
    expect(latest.indexOf("outubro de 2026<span")).toBeLessThan(latest.indexOf("abril de 2026</th>"));
    const older = await render("2026-10", { meses: "2" });
    expect(older).toContain("Valores de março a setembro de 2026");
    // A faixa continua no mês do período, não no fim da página antiga.
    expect(older).toContain("R$ 7.100,00");
  });

  it("saídas e valores por mês começam fechados e abrem juntos com filtro na URL", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const closed = await render();
    expect(closed).toContain("Ver saídas");
    expect(closed).toContain("Ver valores por mês");
    expect(closed.match(/<details[^>]* open=""/g)).toBeNull();

    const moradia = SAMPLE_SPENDING["2026-10"].categories[0].categoryId;
    const filtered = await render("2026-10", { categoria: moradia });
    expect(filtered.match(/<details[^>]* open=""/g)).toHaveLength(2);
  });

  it("saídas em linhas compactas e gráfico de fluxo mais alto", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const html = await render();
    expect(html).toMatch(/class="[^"]*_recent_[^"]* [^"]*_compact_/);
    // A altura de 52px da linha compacta está no CSS; aqui só a marca de que o modo vale.
    expect(html).toContain("height:240px");
  });

  it("paginação das saídas fica fora do Ver saídas, visível com a lista recolhida", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const html = await render();
    const details = html.indexOf("Ver saídas");
    const detailsEnd = html.indexOf("</details>", details);
    const pagination = html.indexOf('aria-label="Páginas das saídas"');
    expect(pagination).toBeGreaterThan(detailsEnd);
    expect(html).toMatch(/class="[^"]*_paginationSlot_[^"]*"><nav[^>]*aria-label="Páginas das saídas"/);
  });

  it("com uma página só, o lugar da paginação continua reservado", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const moradia = SAMPLE_SPENDING["2026-10"].categories[0].categoryId;
    const html = await render("2026-10", { categoria: moradia });
    expect(html).not.toContain('aria-label="Páginas das saídas"');
    expect(html).toMatch(/<div class="[^"]*_paginationSlot_[^"]*"><\/div>/);
  });

  it("linhas das saídas levam a ordem para a entrada em sequência", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const html = await render();
    expect(html).toContain('style="--i:0"');
    expect(html).toContain('style="--i:5"');
  });

  it("os três números abrem os próprios últimos 30 dias; sem parâmetro, nenhum painel", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const closed = await render();
    expect(closed).not.toContain("Evolução do Disponível");
    expect(closed.match(/aria-expanded="false"/g)?.length).toBeGreaterThanOrEqual(3);
    for (const id of ["disponivel", "entradas", "saidas"]) {
      expect(closed).toContain(`aria-controls="painel-${id}"`);
    }
    expect(closed).toContain("Ver últimos 30 dias<span class=\"visually-hidden\"> de Entradas</span>");
    expect(closed).not.toContain("nos últimos 30 dias");

    const inflow = await render("2026-10", { painel: "entradas" });
    expect(inflow).toContain('id="painel-entradas"');
    expect(inflow).toContain("Entradas nos últimos 30 dias");
    expect(inflow).toContain("06/09 a 05/10 · Dados de exemplo");
    expect(inflow).toContain('aria-expanded="true"');
    expect(inflow).not.toContain("Saídas nos últimos 30 dias");

    expect(await render("2026-10", { painel: "outro" })).not.toContain("nos últimos 30 dias");
  });

  it("minigráficos dos três números se redesenham (pathLength) e ficam acima da área clicável", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const html = await render();
    expect(html.match(/_sparkWrap_/g)?.length).toBe(3);
    expect(html.match(/pathLength="1"/g)?.length).toBe(3);
  });

  it("o espaço do marcador existe nos três números com ou sem aviso, então a faixa não muda de altura", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const october = await render("2026-10");
    const september = await render("2026-09");
    expect(october).toContain("Inclui conta desatualizada");
    expect(september).not.toContain("Inclui conta desatualizada");
    expect(october.match(/_figureMarker_/g)?.length).toBe(3);
    expect(september.match(/_figureMarker_/g)?.length).toBe(3);
  });

  it("variação e metadados da faixa ficam em uma linha (a altura não depende do texto)", () => {
    const css = readFileSync(join(__dirname, "visao-geral.module.css"), "utf8");
    expect(css).toMatch(/\.figureBody > \.change,\s*\.figureBody > \.meta \{[^}]*white-space: nowrap;/);
    expect(css).toMatch(/\.figureBody \{[^}]*flex: 1;/);
  });
});
