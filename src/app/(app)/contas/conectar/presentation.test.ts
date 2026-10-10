import { describe, expect, it } from "vitest";
import { CONNECTION_STATUSES } from "@/lib/connections/types";
import { connectionView, ITEM_ID } from "@/lib/connections/fixtures";
import { connectionSchema } from "@/lib/connections/schema";
import {
  canCheckAgain,
  canDisconnect,
  consentSummary,
  formatTimestamp,
  needsReconnect,
  productLabel,
  statusView,
} from "./presentation";
import { itemIdFromSuccess } from "./widget-payload";

describe("statusView", () => {
  it("tem rótulo e explicação em texto para todo estado do contrato", () => {
    for (const status of CONNECTION_STATUSES) {
      const view = statusView(status);
      expect(view.label).not.toBe("");
      expect(view.explanation).not.toBe("");
    }
  });

  it("deixa explícita a disponibilidade parcial", () => {
    expect(statusView("partially_available")).toMatchObject({ label: "Parcialmente disponível", tone: "warning" });
    expect(statusView("partially_available").explanation).toMatch(/só parte dos dados/);
  });

  it("diz que a coleta parou nos estados finais", () => {
    expect(statusView("disconnected").explanation).toMatch(/coleta de novos dados parou/);
    expect(statusView("expired").explanation).toMatch(/nenhum dado novo/);
    expect(statusView("revoked").explanation).toMatch(/nenhum dado novo/);
  });
});

describe("ações disponíveis por estado", () => {
  it("só oferece verificar de novo enquanto a autorização está pendente", () => {
    expect(CONNECTION_STATUSES.filter(canCheckAgain)).toEqual(["pending_authorization"]);
  });

  it("não oferece remover uma conexão já desconectada", () => {
    expect(canDisconnect("disconnected")).toBe(false);
    expect(canDisconnect("connected")).toBe(true);
    expect(canDisconnect("expired")).toBe(true);
  });

  it("oferece conectar de novo quando a coleta parou", () => {
    expect(CONNECTION_STATUSES.filter(needsReconnect)).toEqual(["expired", "revoked", "disconnected"]);
  });
});

describe("consentSummary", () => {
  it("traduz os produtos conhecidos e mantém o código dos desconhecidos", () => {
    expect(productLabel("TRANSACTIONS")).toBe("Movimentações");
    expect(productLabel("NOVO_PRODUTO")).toBe("NOVO_PRODUTO");
  });

  it("resume o consentimento com datas no horário de Brasília", () => {
    const summary = consentSummary(connectionSchema.parse(connectionView()));
    expect(summary.products).toEqual(["Contas e saldos", "Movimentações"]);
    expect(summary.grantedAt).toBe(formatTimestamp("2026-10-09T12:00:00.000Z"));
    expect(formatTimestamp("2026-10-09T12:00:00.000Z")).toMatch(/09\/10\/2026.*09:00/);
  });

  it("aceita consentimento ainda vazio", () => {
    const pending = connectionSchema.parse(
      connectionView({
        status: "pending_authorization",
        consent: {
          id: null,
          status: null,
          products: [],
          openFinancePermissionsGranted: [],
          grantedAt: null,
          expiresAt: null,
          revokedAt: null,
        },
      }),
    );
    expect(consentSummary(pending)).toEqual({ products: [], permissionCount: 0, grantedAt: null, expiresAt: null });
  });
});

describe("itemIdFromSuccess", () => {
  it("lê só o id do item do payload do widget", () => {
    expect(itemIdFromSuccess({ item: { id: ITEM_ID, status: "UPDATED" } })).toBe(ITEM_ID);
  });

  it("devolve null para payload inesperado", () => {
    expect(itemIdFromSuccess(undefined)).toBeNull();
    expect(itemIdFromSuccess({ item: { id: "não-uuid" } })).toBeNull();
    expect(itemIdFromSuccess({})).toBeNull();
  });
});
