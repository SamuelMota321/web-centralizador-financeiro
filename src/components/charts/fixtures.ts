// Dados fictícios dos gráficos, os mesmos números do mockup "Visão geral" do Style Guide 2.0.
// Usados nos testes e em prévias com dados de demonstração; nunca em telas com dados reais.

import type { LinePoint, MonthFlow } from "./model";

export const SAMPLE_FLOW: readonly MonthFlow[] = [
  { month: "mai", monthName: "maio de 2026", inflow: "6900.00", outflow: "5210.00", net: "1690.00" },
  { month: "jun", monthName: "junho de 2026", inflow: "6800.00", outflow: "4980.00", net: "1820.00" },
  { month: "jul", monthName: "julho de 2026", inflow: "7050.00", outflow: "6120.00", net: "930.00" },
  { month: "ago", monthName: "agosto de 2026", inflow: "6800.00", outflow: "5430.00", net: "1370.00" },
  { month: "set", monthName: "setembro de 2026", inflow: "6950.00", outflow: "4870.00", net: "2080.00" },
  {
    month: "out",
    monthName: "outubro de 2026",
    inflow: "7100.00",
    outflow: "3462.30",
    net: "3637.70",
    partial: true,
  },
];

export const SAMPLE_SPENDING = {
  total: "3462.30",
  items: [
    { id: "moradia", label: "Moradia", value: "1450.00" },
    { id: "alimentacao", label: "Alimentação", value: "980.40" },
    { id: "transporte", label: "Transporte", value: "412.50" },
    { id: "saude", label: "Saúde", value: "268.00" },
    { id: "lazer", label: "Lazer", value: "190.00" },
    { id: "a-revisar", label: "A revisar", value: "161.40", review: true },
  ],
} as const;

export const SAMPLE_ALLOCATION = {
  total: "22500.00",
  items: [
    { id: "renda-fixa", label: "Renda fixa", value: "12000.00" },
    { id: "acoes", label: "Ações", value: "6500.00" },
    { id: "fundos", label: "Fundos", value: "3200.00" },
    { id: "nao-classificado", label: "Não classificado", value: "800.00", unclassified: true },
  ],
} as const;

export const SAMPLE_BALANCE: readonly LinePoint[] = [
  { label: "mai", labelName: "31/05/2026", value: "18400.00" },
  { label: "jun", labelName: "30/06/2026", value: "20220.00" },
  { label: "jul", labelName: "31/07/2026", value: "21150.00" },
  { label: "ago", labelName: "31/08/2026", value: "22520.00" },
  { label: "set", labelName: "30/09/2026", value: "24600.00" },
  { label: "out", labelName: "05/10/2026", value: "28237.70" },
];
