import { afterEach, describe, expect, it, vi } from "vitest";
import { toCents } from "@/components/charts/model";
import {
  SAMPLE_BALANCES,
  SAMPLE_CATEGORY_ORDER,
  SAMPLE_FLOW_MONTHS,
  SAMPLE_PERIODS,
  SAMPLE_RECENT,
  SAMPLE_SPENDING,
  SAMPLE_SPENDING_MOVEMENTS,
} from "./fixtures";
import { overviewPreviewEnabled } from "./flag";
import {
  balancesSummarySchema,
  flowSummarySchema,
  recentMovementsSchema,
  spendingMovementsPageSchema,
  spendingSummarySchema,
} from "./schema";
import {
  FLOW_WINDOW,
  getFlow,
  getSpendingMovements,
  MOVEMENTS_PAGE_SIZE,
  parseCategory,
  parsePage,
  parsePeriod,
  REVIEW_FILTER,
} from "./source";

const sum = (values: string[]) => values.reduce((total, value) => total + toCents(value), BigInt(0));
const AVAILABLE_TYPES = new Set(["checking", "savings", "payment", "cash"]);

describe("dados de exemplo", () => {
  it.each(SAMPLE_PERIODS)("%s passa nos esquemas de borda", (period) => {
    expect(() => balancesSummarySchema.parse(SAMPLE_BALANCES[period])).not.toThrow();
    expect(() => spendingSummarySchema.parse(SAMPLE_SPENDING[period])).not.toThrow();
  });

  it("o fluxo passa no esquema", () => {
    expect(() => flowSummarySchema.parse({ months: SAMPLE_FLOW_MONTHS, page: 1, pages: 2 })).not.toThrow();
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

  it.each(SAMPLE_PERIODS)("%s: o histórico termina no próprio período e no Disponível", (period) => {
    const summary = SAMPLE_BALANCES[period];
    expect(summary.history.at(-1)).toEqual({ month: period, available: summary.available });
  });

  it("últimas movimentações passam no esquema e só citam categorias conhecidas", () => {
    expect(() => recentMovementsSchema.parse(SAMPLE_RECENT)).not.toThrow();
    for (const movement of SAMPLE_RECENT) {
      if (movement.categoryId) expect(SAMPLE_CATEGORY_ORDER).toContain(movement.categoryId);
    }
  });

  it("toda categoria com gasto tem lugar na ordem de cores", () => {
    for (const period of SAMPLE_PERIODS) {
      for (const category of SAMPLE_SPENDING[period].categories) {
        expect(SAMPLE_CATEGORY_ORDER).toContain(category.categoryId);
      }
    }
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
  it("pagina de sete em sete meses, a primeira terminando no período", async () => {
    const first = await getFlow("2026-10");
    expect(first.months.map((month) => month.month)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
      "2026-10",
    ]);
    expect(first).toEqual(expect.objectContaining({ page: 1, pages: 2 }));
    expect(first.months).toHaveLength(FLOW_WINDOW);

    const second = await getFlow("2026-10", 2);
    // A última página volta até completar sete meses, em vez de mostrar um só.
    expect(second.months.map((month) => month.month)).toEqual([
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
      "2026-07",
      "2026-08",
      "2026-09",
    ]);
  });

  it("com menos meses que a janela, mostra o que houver numa página só", async () => {
    const august = await getFlow("2026-08");
    expect(august.months).toHaveLength(6);
    expect(august).toEqual(expect.objectContaining({ page: 1, pages: 1 }));
  });

  it("página além do fim volta para a última", async () => {
    expect((await getFlow("2026-10", 9)).page).toBe(2);
  });
});

describe("saídas sob a rosca", () => {
  it.each(SAMPLE_PERIODS)("%s: cada categoria soma o valor e a quantidade da rosca", (period) => {
    const movements = SAMPLE_SPENDING_MOVEMENTS[period];
    const spending = SAMPLE_SPENDING[period];
    for (const category of spending.categories) {
      const own = movements.filter((item) => item.categoryId === category.categoryId);
      expect(own).toHaveLength(category.count);
      expect(sum(own.map((item) => item.amount))).toBe(toCents(category.amount));
    }
    const review = movements.filter((item) => item.toReview);
    expect(review).toHaveLength(spending.toReview.count);
    expect(sum(review.map((item) => item.amount))).toBe(toCents(spending.toReview.amount));
    // Nenhuma saída depois do último dia do período (outubro vai até 05/10).
    if (period === "2026-10") expect(movements.every((item) => item.date <= "2026-10-05")).toBe(true);
  });

  it("pagina de seis em seis, mais recentes primeiro, e passa no esquema", async () => {
    const page = await getSpendingMovements("2026-10", { category: null, page: 1 });
    expect(page.items).toHaveLength(MOVEMENTS_PAGE_SIZE);
    expect(page.total).toBe(34);
    expect(page.pages).toBe(6);
    expect(page.items[0].date >= page.items[5].date).toBe(true);
    expect(() => spendingMovementsPageSchema.parse(page)).not.toThrow();
  });

  it("filtra por categoria e por A revisar", async () => {
    const moradia = SAMPLE_SPENDING["2026-10"].categories[0];
    const housing = await getSpendingMovements("2026-10", { category: moradia.categoryId, page: 1 });
    expect(housing.total).toBe(2);
    expect(housing.items.every((item) => item.categoryId === moradia.categoryId)).toBe(true);

    const review = await getSpendingMovements("2026-10", { category: REVIEW_FILTER, page: 1 });
    expect(review.items.every((item) => item.toReview)).toBe(true);
    expect(review.total).toBe(4);
  });
});

describe("parsePage e parseCategory", () => {
  it("aceita só inteiros positivos", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage(undefined)).toBe(1);
  });

  it("ignora categoria fora do período", () => {
    const october = SAMPLE_SPENDING["2026-10"];
    expect(parseCategory(october.categories[1].categoryId, october)).toBe(october.categories[1].categoryId);
    expect(parseCategory(REVIEW_FILTER, october)).toBe(REVIEW_FILTER);
    // Educação só tem gasto em setembro.
    const education = SAMPLE_SPENDING["2026-09"].categories.find((category) => category.name === "Educação");
    expect(parseCategory(education?.categoryId, october)).toBeNull();
    expect(parseCategory("qualquer", october)).toBeNull();
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
