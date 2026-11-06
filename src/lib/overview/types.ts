// Agregações da Visão geral (HU-010) na forma que o Developer 2 pediu ao Developer 1
// (planejamento S5, seção 5). O backend ainda não publicou estas rotas: nomes e campos são
// provisórios e devem ser reconferidos no OpenAPI antes de ligar a tela na API.
// Totais chegam calculados pelo servidor; o cliente só formata (RNF-013).

import type { AccountType } from "@/lib/accounts/types";

/** Frescor do saldo: prazo de "desatualizado" é a definição D-08, ainda aberta. */
export type Freshness = "current" | "stale" | "unavailable";

/** De onde vem o saldo da conta. */
export type BalanceSource = "manual" | "ofx" | "pluggy";

export interface AccountBalance {
  accountId: string;
  name: string;
  type: AccountType;
  source: BalanceSource;
  institutionName: string | null;
  /** Saldo atual (D-01), string decimal com duas casas, assinada. */
  balance: string;
  currencyCode: "BRL";
  /** Momento a que o saldo se refere (ISO 8601 com fuso). */
  asOf: string;
  freshness: Freshness;
}

export interface BalancesSummary {
  /** Soma dos saldos das contas que contam como disponíveis (D-03). */
  available: string;
  /** Quantas contas entram em `available`. */
  availableAccounts: number;
  /** Referência mais antiga entre as contas somadas (D-07). */
  asOf: string;
  /** Alguma conta somada está desatualizada. */
  includesStale: boolean;
  accounts: AccountBalance[];
}

export interface FlowMonth {
  /** AAAA-MM. */
  month: string;
  /** Só `income` `posted`, sem transferências (D-02, D-04). */
  inflow: string;
  /** Só `expense` `posted`, sem transferências. */
  outflow: string;
  /** inflow − outflow. */
  net: string;
  /** Mês corrente, ainda em andamento (D-05). */
  partial: boolean;
}

export interface FlowSummary {
  /** Do mais antigo ao mais recente; o último é o período escolhido. */
  months: FlowMonth[];
}

export interface SpendingCategory {
  categoryId: string;
  name: string;
  archived: boolean;
  amount: string;
  count: number;
}

export interface SpendingSummary {
  /** AAAA-MM. */
  period: string;
  /** Total de saídas do período, base dos percentuais (D-12). */
  total: string;
  /** Soma de `unclassified`, `uncertain` e `unrecognized` (D-06). */
  toReview: { amount: string; count: number };
  categories: SpendingCategory[];
}
