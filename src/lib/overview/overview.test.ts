import { afterEach, describe, expect, it, vi } from "vitest";
import { toCents } from "@/components/charts/model";
import { SAMPLE_BALANCES, SAMPLE_FLOW_MONTHS, SAMPLE_PERIODS, SAMPLE_SPENDING } from "./fixtures";
import { overviewPreviewEnabled } from "./flag";
import { balancesSummarySchema, flowSummarySchema, spendingSummarySchema } from "./schema";
import { FLOW_WINDOW, getFlow, parsePeriod } from "./source";

const sum = (values: string[]) => values.reduce((total, value) => total + toCents(value), BigInt(0));
const AVAILABLE_TYPES = new Set(["checking", "savings", "payment", "cash"]);

describe("dados de exemplo", () => {
  it.each(SAMPLE_PERIODS)("%s passa nos esquemas de borda", (period) => {
    expect(() => balancesSummarySchema.parse(SAMPLE_BALANCES[period])).not.toThrow();
    expect(() => spendingSummarySchema.parse(SAMPLE_SPENDING[period])).not.toThrow();
  });

  it("o fluxo passa no esquema", () => {
    expect(() => flowSummarySchema.parse({ months: SAMPLE_FLOW_MONTHS })).not.toThrow();
  });

  it.each(SAMPLE_PERIODS)("%s: Disponível soma só as contas disponíveis (D-03)", (period) => {
    const summary = SAMPLE_BALANCES[period];
    const available = summary.accounts.filter((account) => AVAILABLE_TYPES.has(account.type));
    expect(sum(available.map((account) => account.balance))).toBe(toCents(summary.available));
    expect(available).toHaveLength(summary.availableAccounts);
    expect(summary.includesStale).toBe(available.some((account) => account.freshness === "stale"));
  });

  it.each(SAMPLE_PERIODS)("%s: gastos fecham com as saídas do mês", (period) => {
    const spending = SAMPLE_SPENDING[period];
    const flow = SAMPLE_FLOW_MONTHS.find((month) => month.month === period);
    const parts = [...spending.categories.map((item) => item.amount), spending.toReview.amount];
    expect(sum(parts)).toBe(toCents(spending.total));
    expect(spending.total).toBe(flow?.outflow);
  });

  it("resultado de cada mês é entradas − saídas; só o último é parcial", () => {
    for (const month of SAMPLE_FLOW_MONTHS) {
      expect(toCents(month.inflow) - toCents(month.outflow)).toBe(toCents(month.net));
    }
    expect(SAMPLE_FLOW_MONTHS.filter((month) => month.partial).map((month) => month.month)).toEqual(["2026-10"]);
  });
});

describe("parsePeriod", () => {
  it("aceita um período disponível", () => {
    expect(parsePeriod("2026-09")).toBe("2026-09");
  });

  it("cai no mês corrente com valor ausente, desconhecido ou repetido", () => {
    expect(parsePeriod(undefined)).toBe("2026-10");
    expect(parsePeriod("2025-01")).toBe("2026-10");
    expect(parsePeriod(["2026-09", "2026-08"])).toBe("2026-10");
  });
});

describe("getFlow", () => {
  it("devolve seis meses terminando no período", async () => {
    const { months } = await getFlow("2026-08");
    expect(months).toHaveLength(FLOW_WINDOW);
    expect(months.at(0)?.month).toBe("2026-03");
    expect(months.at(-1)?.month).toBe("2026-08");
  });
});

describe("overviewPreviewEnabled", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("só liga com OVERVIEW_PREVIEW=true", () => {
    vi.stubEnv("OVERVIEW_PREVIEW", "");
    expect(overviewPreviewEnabled()).toBe(false);
    vi.stubEnv("OVERVIEW_PREVIEW", "1");
    expect(overviewPreviewEnabled()).toBe(false);
    vi.stubEnv("OVERVIEW_PREVIEW", "true");
    expect(overviewPreviewEnabled()).toBe(true);
  });
});
