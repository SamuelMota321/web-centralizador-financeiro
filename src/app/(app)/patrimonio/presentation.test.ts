import { describe, expect, it } from "vitest";
import { ASSET_UNAVAILABLE, assetLabel, assetMeta, collectionFromSlug, formatStamp, NO_ASSET, sectionHref } from "./presentation";

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
