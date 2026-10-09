import { describe, expect, it } from "vitest";
import { previewItem, previewRun, resultRun } from "@/lib/ingestions/fixtures";
import { importRunSchema } from "@/lib/ingestions/schema";
import { IMPORT_RUN_STATUSES } from "@/lib/ingestions/types";
import {
  countLabel,
  itemAmount,
  itemSituation,
  previewSummary,
  resultSummary,
  stepForStatus,
} from "./presentation";

describe("stepForStatus", () => {
  it("leva cada estado do contrato a um passo da tela", () => {
    const steps = Object.fromEntries(IMPORT_RUN_STATUSES.map((status) => [status, stepForStatus(status)]));
    expect(steps).toEqual({
      preview_ready: "preview",
      queued: "processing",
      processing: "processing",
      expired: "expired",
      completed: "result",
      completed_with_errors: "result",
      failed: "result",
    });
  });
});

describe("previewSummary", () => {
  it("conta novas, já registradas e linhas sem FITID, com o período", () => {
    const run = importRunSchema.parse(
      previewRun({
        items: [
          previewItem({ occurredOn: "2026-09-20" }),
          previewItem({ ordinal: 2, occurredOn: "2026-08-02", isDuplicate: true }),
          previewItem({ ordinal: 3, occurredOn: "2026-09-30", warnings: ["external_id_missing"] }),
        ],
      }),
    );
    expect(previewSummary(run.items)).toEqual({
      total: 3,
      fresh: 2,
      duplicates: 1,
      withoutBankId: 1,
      period: { from: "2026-08-02", to: "2026-09-30" },
    });
  });

  it("arquivo sem linhas não tem período nem novas", () => {
    expect(previewSummary([])).toEqual({ total: 0, fresh: 0, duplicates: 0, withoutBankId: 0, period: null });
  });
});

describe("itemSituation e itemAmount", () => {
  it("rotula a situação em texto, para não depender da cor", () => {
    expect(itemSituation({ status: "previewed", isDuplicate: false }).label).toBe("Nova");
    expect(itemSituation({ status: "previewed", isDuplicate: true }).label).toBe("Já registrada — será ignorada");
    expect(itemSituation({ status: "imported", isDuplicate: false }).label).toBe("Importada");
    expect(itemSituation({ status: "ignored_duplicate", isDuplicate: true }).label).toBe("Já registrada — ignorada");
    expect(itemSituation({ status: "failed", isDuplicate: false }).label).toBe("Não importada");
  });

  it("valor com sinal pela direção, sem converter para número", () => {
    expect(itemAmount({ type: "income", amount: "1500.00" })).toEqual({ text: "+ R$ 1.500,00", direction: "in" });
    expect(itemAmount({ type: "expense", amount: "42.50" })).toEqual({ text: "− R$ 42,50", direction: "out" });
  });
});

describe("resultSummary", () => {
  it("resultado parcial avisa as ignoradas e as com erro", () => {
    expect(resultSummary(importRunSchema.parse(resultRun()))).toEqual({
      tone: "warning",
      text: "1 movimentação importada, 1 ignorada por já estar registrada, 1 com erro.",
    });
  });

  it("resultado completo é sucesso; falha diz que não foi concluída", () => {
    const counts = { importedItems: 2, ignoredItems: 0, failedItems: 0 };
    expect(resultSummary({ status: "completed", ...counts })).toEqual({
      tone: "success",
      text: "2 movimentações importadas.",
    });
    expect(resultSummary({ status: "failed", ...counts, importedItems: 0 }).tone).toBe("error");
  });

  it("countLabel concorda o plural", () => {
    expect(countLabel(1, "linha", "linhas")).toBe("1 linha");
    expect(countLabel(0, "linha", "linhas")).toBe("0 linhas");
  });
});
