import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import VisaoGeralPage from "./page";

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
  usePathname: () => "/visao-geral",
  useRouter: () => ({ push: () => {} }),
}));

const render = async (periodo?: string) =>
  renderToStaticMarkup(await VisaoGeralPage({ searchParams: Promise.resolve({ periodo }) }));

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
    // Fluxo e gastos com valores em texto.
    expect(html).toContain("R$ 3.637,70");
    expect(html).toContain("41,9%");
    expect(html).toContain("Revisar em Movimentações");
  });

  it("troca os números com o período e cai no mês corrente com período desconhecido", async () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    const september = await render("2026-09");
    expect(september).toContain("R$ 16.630,20");
    expect(september).toContain("Educação (arquivada)");
    expect(september).not.toContain("Inclui conta desatualizada");

    expect(await render("2020-01")).toContain("R$ 17.340,95");
  });
});
