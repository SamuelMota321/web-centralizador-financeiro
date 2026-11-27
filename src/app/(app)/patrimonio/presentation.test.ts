import { describe, expect, it } from "vitest";
import { ASSET_UNAVAILABLE, assetLabel, assetMeta, collectionFromSlug, formatStamp, NO_ASSET, sectionHref, valuationAge } from "./presentation";

describe("presentation de bens e dívidas", () => {
  it("traduz o segmento da URL e recusa o desconhecido", () => {
    expect(collectionFromSlug("bens")).toBe("assets");
    expect(collectionFromSlug("passivos")).toBe("liabilities");
    expect(collectionFromSlug("assets")).toBeNull();
  });

  it("nomeia o bem do financiamento sem expor o UUID", () => {
    const assets = [{ id: "a", description: "Apartamento" }];
    expect(assetLabel("a", assets)).toBe("Apartamento");
    expect(assetLabel("b", assets)).toBe(ASSET_UNAVAILABLE);
    expect(assetLabel("a", null)).toBe(ASSET_UNAVAILABLE);
    expect(assetLabel(null, assets)).toBe(NO_ASSET);
  });

  it("monta a linha de metadados do bem", () => {
    expect(assetMeta({ type: "Imóvel", source: "Corretor", valuationDate: "2026-10-01" })).toBe(
      "Imóvel · fonte: Corretor · avaliado em 01/10/2026",
    );
  });

  it("formata a versão no horário de Brasília", () => {
    expect(formatStamp("2026-11-20T15:00:00.000Z")).toBe("20/11/2026 12:00");
  });

  it("pagina uma seção sem perder as outras", () => {
    expect(sectionHref({ assets: 2, financings: 1, liabilities: 3 }, "financings", 2)).toBe("/patrimonio?pb=2&pf=2&pp=3");
    expect(sectionHref({ assets: 2, financings: 1, liabilities: 1 }, "assets", 1)).toBe("/patrimonio");
  });
});

describe("valuationAge", () => {
  const today = "2025-11-27";

  it("hoje, dias, meses e anos (meses inteiros, pelo calendário)", () => {
    expect(valuationAge("2025-11-27", today)).toBe("hoje");
    expect(valuationAge("2025-11-26", today)).toBe("há 1 dia");
    expect(valuationAge("2025-11-10", today)).toBe("há 17 dias");
    expect(valuationAge("2025-10-27", today)).toBe("há 1 mês");
    expect(valuationAge("2024-06-15", today)).toBe("há 17 meses");
    expect(valuationAge("2024-11-27", today)).toBe("há 12 meses");
    expect(valuationAge("2024-01-10", today)).toBe("há 22 meses");
    expect(valuationAge("2023-11-27", today)).toBe("há 2 anos");
    expect(valuationAge("2023-01-10", today)).toBe("há 2 anos");
  });

  it("o dia do mês decide o mês incompleto", () => {
    expect(valuationAge("2025-10-28", today)).toBe("há 30 dias");
    expect(valuationAge("2024-11-28", today)).toBe("há 11 meses");
  });

  it("data futura não tem texto", () => {
    expect(valuationAge("2025-12-01", today)).toBeNull();
  });
});
