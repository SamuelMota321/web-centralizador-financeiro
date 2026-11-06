import { z } from "zod";
import { ACCOUNT_TYPES } from "@/lib/accounts/types";

// Validação de borda das agregações da Visão geral. Contrato ainda não publicado (ver
// types.ts): ajustar junto com os tipos quando as rotas saírem no OpenAPI.

const decimal = z.string().regex(/^-?(?:0|[1-9]\d*)\.\d{2}$/);
const nonNegativeDecimal = z.string().regex(/^(?:0|[1-9]\d*)\.\d{2}$/);
const month = z.string().regex(/^\d{4}-(?:0[1-9]|1[0-2])$/);
const timestamp = z.iso.datetime({ offset: true });

export const balancesSummarySchema = z.object({
  available: decimal,
  availableAccounts: z.number().int().nonnegative(),
  asOf: timestamp,
  includesStale: z.boolean(),
  accounts: z.array(
    z.object({
      accountId: z.uuid(),
      name: z.string().min(1),
      type: z.enum(ACCOUNT_TYPES),
      source: z.enum(["manual", "ofx", "pluggy"]),
      institutionName: z.string().nullable(),
      balance: decimal,
      currencyCode: z.literal("BRL"),
      asOf: timestamp,
      freshness: z.enum(["current", "stale", "unavailable"]),
    }),
  ),
  history: z.array(z.object({ month, available: decimal })),
});

export const recentMovementsSchema = z.array(
  z.object({
    transactionId: z.uuid(),
    date: z.iso.date(),
    description: z.string().nullable(),
    direction: z.enum(["inflow", "outflow", "transfer"]),
    amount: nonNegativeDecimal,
    accountName: z.string().min(1),
    categoryId: z.uuid().nullable(),
    categoryName: z.string().nullable(),
    toReview: z.boolean(),
  }),
);

export const flowSummarySchema = z.object({
  page: z.number().int().positive(),
  pages: z.number().int().positive(),
  months: z.array(
    z.object({
      month,
      inflow: nonNegativeDecimal,
      outflow: nonNegativeDecimal,
      net: decimal,
      partial: z.boolean(),
    }),
  ),
});

export const spendingSummarySchema = z.object({
  period: month,
  total: nonNegativeDecimal,
  toReview: z.object({ amount: nonNegativeDecimal, count: z.number().int().nonnegative() }),
  categories: z.array(
    z.object({
      categoryId: z.uuid(),
      name: z.string().min(1),
      archived: z.boolean(),
      amount: nonNegativeDecimal,
      count: z.number().int().nonnegative(),
    }),
  ),
});

export const spendingMovementsPageSchema = z.object({
  page: z.number().int().positive(),
  pages: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  items: z.array(
    z.object({
      transactionId: z.uuid(),
      date: z.iso.date(),
      description: z.string().nullable(),
      amount: nonNegativeDecimal,
      accountName: z.string().min(1),
      categoryId: z.uuid().nullable(),
      categoryName: z.string().nullable(),
      toReview: z.boolean(),
    }),
  ),
});

export const dailyAvailableSchema = z.object({
  points: z.array(z.object({ date: z.iso.date(), available: decimal })),
});

export const dailyFlowSchema = z.object({
  points: z.array(z.object({ date: z.iso.date(), amount: nonNegativeDecimal })),
});
