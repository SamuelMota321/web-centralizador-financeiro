import { describe, expect, it } from "vitest";
import { syncRunSchema } from "@/lib/sync-runs/schema";
import { syncRunView } from "@/lib/sync-runs/fixtures";
import { SYNC_RUN_STATUSES } from "@/lib/sync-runs/types";
import {
  canRequestSync,
  NO_ACTIVE_RUN,
  nextPollDelay,
  POLL_INTERVAL_MS,
  reasonText,
  reconciledText,
  shouldPoll,
  syncView,
} from "./sync-presentation";

const run = (overrides: Record<string, unknown> = {}) => syncRunSchema.parse(syncRunView(overrides));

describe("estados da sincronização", () => {
  it("cada estado do contrato tem rótulo e explicação", () => {
    for (const status of SYNC_RUN_STATUSES) {
      const view = syncView(run({ status }));
      expect(view.label.length).toBeGreaterThan(0);
      expect(view.explanation.length).toBeGreaterThan(0);
    }
  });

  it("sem execução, mostra o estado de interface 'Sem execução ativa'", () => {
    expect(syncView(null)).toBe(NO_ACTIVE_RUN);
  });

  it("action_required e failed explicam o caminho de recuperação", () => {
    expect(syncView(run({ status: "action_required" })).explanation).toMatch(/Autorize de novo/);
    expect(syncView(run({ status: "failed" })).explanation).toMatch(/continuam visíveis/);
  });
});

describe("consulta periódica", () => {
  it("só queued e running continuam consultando", () => {
    expect(SYNC_RUN_STATUSES.filter(shouldPoll)).toEqual(["queued", "running"]);
  });

  it("consulta a cada 10 s em primeiro plano e nunca em segundo plano", () => {
    expect(POLL_INTERVAL_MS).toBe(10_000);
    expect(nextPollDelay(run({ status: "running" }), true)).toBe(10_000);
    expect(nextPollDelay(run({ status: "running" }), false)).toBeNull();
  });

  it("para em action_required e nos estados finais", () => {
    for (const status of ["action_required", "succeeded", "partial", "failed"]) {
      expect(nextPollDelay(run({ status }), true)).toBeNull();
    }
    expect(nextPollDelay(null, true)).toBeNull();
  });

  it("só permite pedir outra sincronização fora do andamento", () => {
    expect(canRequestSync(null)).toBe(true);
    expect(canRequestSync(run({ status: "queued" }))).toBe(false);
    expect(canRequestSync(run({ status: "action_required" }))).toBe(true);
  });
});

describe("textos", () => {
  it("descreve os motivos sem valores", () => {
    expect(reasonText({ dataType: "investments", code: "unavailable" })).toBe("Investimentos: indisponíveis na fonte");
    expect(reasonText({ dataType: "transactions", code: "ambiguous_identity" })).toMatch(/incerta/);
  });

  it("última reconciliação com referência da fonte, ou ausência declarada", () => {
    expect(reconciledText(null)).toBe("Nenhuma sincronização reconciliada ainda.");
    const done = run({ status: "partial", completedAt: "2026-11-22T15:00:00.000Z", referenceDate: null });
    expect(reconciledText(done)).toMatch(/referência da fonte não informada \(parcial\)\.$/);
  });
});
