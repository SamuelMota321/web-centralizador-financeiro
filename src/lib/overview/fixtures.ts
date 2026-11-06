import type { AccountBalance, BalancesSummary, FlowMonth, SpendingSummary } from "./types";

// Dados de exemplo da prévia da Visão geral, enquanto as rotas de agregação não existem.
// Seguem as recomendações D-01 a D-08 do Developer 2 (cartão fora do Disponível,
// transferências fora do fluxo, mês corrente parcial). Nunca são os números do usuário:
// a tela avisa isso no topo. Os totais fecham entre si; os testes conferem.

const id = (n: number) => `0e5a1c2d-7b3f-4c8a-9d1e-${String(n).padStart(12, "0")}`;
const categoryId = (n: number) => `5c9b7e10-2a4d-4f6b-8c3e-${String(n).padStart(12, "0")}`;

/** Períodos disponíveis na prévia, do mais recente ao mais antigo. */
export const SAMPLE_PERIODS = ["2026-10", "2026-09", "2026-08"] as const;

function accounts(
  asOf: string,
  balances: [string, string, string, string, string],
  stale?: { asOf: string },
): AccountBalance[] {
  const [main, reserve, cash, digital, card] = balances;
  const base = { currencyCode: "BRL" as const, asOf, freshness: "current" as const };
  return [
    { ...base, accountId: id(1), name: "Conta do dia a dia", type: "checking", source: "pluggy", institutionName: "Banco Exemplo", balance: main },
    { ...base, accountId: id(2), name: "Reserva", type: "savings", source: "manual", institutionName: "Banco Exemplo", balance: reserve },
    { ...base, accountId: id(3), name: "Carteira", type: "cash", source: "manual", institutionName: null, balance: cash },
    {
      ...base,
      accountId: id(4),
      name: "Conta digital",
      type: "payment",
      source: "ofx",
      institutionName: "Fintech Exemplo",
      balance: digital,
      ...(stale ? { asOf: stale.asOf, freshness: "stale" as const } : {}),
    },
    { ...base, accountId: id(5), name: "Cartão do dia a dia", type: "credit_card", source: "pluggy", institutionName: "Banco Exemplo", balance: card },
  ];
}

export const SAMPLE_BALANCES: Record<(typeof SAMPLE_PERIODS)[number], BalancesSummary> = {
  "2026-10": {
    available: "17340.95",
    availableAccounts: 4,
    asOf: "2026-10-01T18:40:00-03:00",
    includesStale: true,
    accounts: accounts("2026-10-05T09:12:00-03:00", ["4210.55", "12000.00", "180.00", "950.40", "-1240.30"], {
      asOf: "2026-10-01T18:40:00-03:00",
    }),
  },
  "2026-09": {
    available: "16630.20",
    availableAccounts: 4,
    asOf: "2026-09-30T23:59:00-03:00",
    includesStale: false,
    accounts: accounts("2026-09-30T23:59:00-03:00", ["3890.20", "11500.00", "220.00", "1020.00", "-980.10"]),
  },
  "2026-08": {
    available: "15431.10",
    availableAccounts: 4,
    asOf: "2026-08-31T23:59:00-03:00",
    includesStale: false,
    accounts: accounts("2026-08-31T23:59:00-03:00", ["3410.75", "11000.00", "150.00", "870.35", "-1105.60"]),
  },
};

/** Março a outubro de 2026; outubro é o mês corrente da prévia. */
export const SAMPLE_FLOW_MONTHS: readonly FlowMonth[] = [
  { month: "2026-03", inflow: "6750.00", outflow: "5020.00", net: "1730.00", partial: false },
  { month: "2026-04", inflow: "6800.00", outflow: "5480.00", net: "1320.00", partial: false },
  { month: "2026-05", inflow: "6900.00", outflow: "5210.00", net: "1690.00", partial: false },
  { month: "2026-06", inflow: "6800.00", outflow: "4980.00", net: "1820.00", partial: false },
  { month: "2026-07", inflow: "7050.00", outflow: "6120.00", net: "930.00", partial: false },
  { month: "2026-08", inflow: "6800.00", outflow: "5430.00", net: "1370.00", partial: false },
  { month: "2026-09", inflow: "6950.00", outflow: "4870.00", net: "2080.00", partial: false },
  { month: "2026-10", inflow: "7100.00", outflow: "3462.30", net: "3637.70", partial: true },
];

const category = (n: number, name: string, amount: string, count: number, archived = false) => ({
  categoryId: categoryId(n),
  name,
  archived,
  amount,
  count,
});

export const SAMPLE_SPENDING: Record<(typeof SAMPLE_PERIODS)[number], SpendingSummary> = {
  "2026-10": {
    period: "2026-10",
    total: "3462.30",
    toReview: { amount: "161.40", count: 4 },
    categories: [
      category(1, "Moradia", "1450.00", 2),
      category(2, "Alimentação", "980.40", 14),
      category(3, "Transporte", "412.50", 9),
      category(4, "Saúde", "268.00", 2),
      category(5, "Lazer", "190.00", 3),
    ],
  },
  "2026-09": {
    period: "2026-09",
    total: "4870.00",
    toReview: { amount: "97.40", count: 3 },
    categories: [
      category(1, "Moradia", "1450.00", 2),
      category(2, "Alimentação", "1310.60", 21),
      category(3, "Transporte", "640.00", 12),
      category(4, "Saúde", "520.00", 3),
      category(5, "Lazer", "702.00", 6),
      category(6, "Educação", "150.00", 1, true),
    ],
  },
  "2026-08": {
    period: "2026-08",
    total: "5430.00",
    toReview: { amount: "236.00", count: 5 },
    categories: [
      category(1, "Moradia", "1450.00", 2),
      category(2, "Alimentação", "1205.30", 19),
      category(3, "Transporte", "588.20", 11),
      category(4, "Saúde", "1340.00", 4),
      category(5, "Lazer", "610.50", 5),
    ],
  },
};
