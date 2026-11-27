import { describe, expect, it } from "vitest";
import type { Transaction } from "@/lib/transactions/types";
import { filterRules, parseRuleParams, rulesHref, sortRules, statusCounts, termSuggestions, uncategorizedDescriptions } from "./presentation";

describe("parâmetros", () => {
  it("lê status e busca; valor desconhecido volta a 'todas'", () => {
    expect(parseRuleParams({ status: "ativas", busca: " uber ", ordem: "recentes", removidas: "1" })).toEqual({
      status: "ativas",
      search: "uber",
      sort: "recentes",
      showRemoved: true,
    });
    expect(parseRuleParams({ status: "constructor", ordem: "toString" })).toEqual({ status: "todas", search: "", sort: "aplicacao", showRemoved: false });
  });

  it("monta a URL omitindo o padrão", () => {
    const base = parseRuleParams({});
    expect(rulesHref(base)).toBe("/regras");
    expect(rulesHref(base, { status: "inativas", search: "ifood", sort: "categoria" })).toBe("/regras?status=inativas&busca=ifood&ordem=categoria");
  });
});

describe("contagens e filtro", () => {
  const rule = (status: "active" | "inactive" | "removed", conditionValue: string, categoryId = "c1") => ({
    status,
    conditionValue,
    categoryId,
    conditionField: "description" as const,
  });
  const rules = [rule("active", "uber"), rule("inactive", "ifood", "c2"), rule("removed", "uber")];
  const names = (id: string) => (id === "c2" ? "Alimentação" : "Transporte");

  it("conta por status", () => {
    expect(statusCounts(rules)).toEqual({ active: 1, inactive: 1, removed: 1 });
  });

  it("removidas nunca entram; filtra por status", () => {
    expect(filterRules(rules, { ...parseRuleParams({}) }, names, null)).toHaveLength(2);
    expect(filterRules(rules, { ...parseRuleParams({}), status: "inativas" }, names, null).map((r) => r.conditionValue)).toEqual(["ifood"]);
  });

  it("busca sem acento no valor e no nome da categoria", () => {
    expect(filterRules(rules, { ...parseRuleParams({}), search: "alimentacao" }, names, null).map((r) => r.conditionValue)).toEqual(["ifood"]);
    expect(filterRules(rules, { ...parseRuleParams({}), search: "UBER" }, names, null)).toHaveLength(1);
  });
});

describe("sortRules", () => {
  const rules = [
    { id: "1", categoryId: "t", createdAt: "2026-01-01" },
    { id: "2", categoryId: "a", createdAt: "2026-03-01" },
    { id: "3", categoryId: "t", createdAt: "2026-02-01" },
  ];
  const names = (id: string) => (id === "a" ? "Alimentação" : "Transporte");

  it("aplicação mantém a ordem do backend; recentes pela criação; categoria pelo nome", () => {
    expect(sortRules(rules, "aplicacao", names).map((r) => r.id)).toEqual(["1", "2", "3"]);
    expect(sortRules(rules, "recentes", names).map((r) => r.id)).toEqual(["2", "3", "1"]);
    expect(sortRules(rules, "categoria", names).map((r) => r.id)).toEqual(["2", "1", "3"]);
  });
});

describe("atalhos do simulador", () => {
  let sequence = 0;
  const tx = (overrides: Partial<Transaction>): Transaction => {
    sequence += 1;
    return {
      id: `00000000-0000-4000-8000-${String(sequence).padStart(12, "0")}`,
      accountId: "a",
      type: "expense",
      amount: "10.00",
      occurredOn: "2026-11-20",
      description: "x",
      status: "posted",
      transferId: null,
      transferSide: null,
      categoryId: null,
      categorizationStatus: "unclassified",
      categorizationSource: null,
      createdAt: "2026-11-20T12:00:00.000Z",
      updatedAt: "2026-11-20T12:00:00.000Z",
      ...overrides,
    };
  };

  it("descrições sem categoria, sem repetir, sem transferências, estornos ou já categorizadas", () => {
    const items = [
      tx({ description: "UBER *TRIP  123" }),
      tx({ description: "uber *trip 123" }),
      tx({ description: "Drogasil", categorizationStatus: "categorized", categoryId: "c" }),
      tx({ description: "Pix enviado", type: "transfer", categorizationStatus: "not_applicable" }),
      tx({ description: "Estornado", status: "voided" }),
      tx({ description: "   " }),
      tx({ description: "Padaria Pão Quente", categorizationStatus: "uncertain" }),
    ];
    expect(uncategorizedDescriptions(items)).toEqual(["UBER *TRIP 123", "Padaria Pão Quente"]);
  });

  it("palavras para 'contém': três letras ou mais, minúsculas, sem palavras de ligação", () => {
    expect(termSuggestions("PIX COMPRA Drogaria São Paulo 1234 drogaria")).toEqual(["drogaria", "são", "paulo"]);
    expect(termSuggestions("12 34")).toEqual([]);
  });
});
