import { describe, expect, it } from "vitest";
import {
  categorizationTone,
  movementMark,
  accountLabel,
  ACCOUNT_FALLBACK_LABEL,
  canCategorize,
  parsePageParam,
  signedAmount,
  totalPages,
  typeLabel,
} from "./presentation";

const ACCOUNT_ID = "3f1c2b4e-8a6d-4c1e-9b2a-7d5e6f8a9b0c";

describe("parsePageParam", () => {
  it.each([
    ["1", 1],
    ["12", 12],
    [undefined, 1],
    ["0", 1],
    ["-2", 1],
    ["abc", 1],
    ["1.5", 1],
    ["01", 1],
    ["9999999", 1],
    [["2", "3"], 1],
  ])("%j -> %i", (value, expected) => {
    expect(parsePageParam(value)).toBe(expected);
  });
});

describe("totalPages", () => {
  it("considera ao menos uma página", () => {
    expect(totalPages(0, 20)).toBe(1);
    expect(totalPages(20, 20)).toBe(1);
    expect(totalPages(21, 20)).toBe(2);
  });
});

describe("accountLabel", () => {
  it("resolve o nome sem diferenciar caixa do UUID", () => {
    expect(accountLabel(ACCOUNT_ID.toUpperCase(), [{ id: ACCOUNT_ID, name: "Carteira" }])).toBe(
      "Carteira",
    );
  });

  it("usa fallback neutro para conta ausente ou lista indisponível", () => {
    expect(accountLabel(ACCOUNT_ID, [])).toBe(ACCOUNT_FALLBACK_LABEL);
    expect(accountLabel(ACCOUNT_ID, null)).toBe(ACCOUNT_FALLBACK_LABEL);
  });
});

describe("typeLabel e signedAmount", () => {
  it.each([
    [{ type: "income", transferSide: null }, "Receita", "+ R$ 1.234,56"],
    [{ type: "expense", transferSide: null }, "Despesa", "\u2212 R$ 1.234,56"],
    [{ type: "transfer", transferSide: "outgoing" }, "Transferência entre contas — saída", "\u2212 R$ 1.234,56"],
    [{ type: "transfer", transferSide: "incoming" }, "Transferência entre contas — entrada", "+ R$ 1.234,56"],
  ] as const)("%j", (transaction, label, amount) => {
    expect(typeLabel(transaction)).toBe(label);
    expect(signedAmount({ ...transaction, amount: "1234.56" }).text).toBe(amount);
  });

  it("nunca usa vocabulário de operação bancária", () => {
    const label = typeLabel({ type: "transfer", transferSide: "outgoing" }).toLowerCase();
    for (const word of ["enviar", "pix", "pagar", "bancaria", "bancária"]) {
      expect(label).not.toContain(word);
    }
  });
});

describe("canCategorize", () => {
  it.each([
    ["income", "posted", true],
    ["expense", "posted", true],
    ["transfer", "posted", false],
    ["expense", "voided", false],
  ] as const)("%s/%s -> %s", (type, status, expected) => {
    expect(canCategorize({ type, status })).toBe(expected);
  });
});

describe("categorizationTone e movementMark", () => {
  it.each([
    ["categorized", "positive"],
    ["uncertain", "warning"],
    ["unrecognized", "warning"],
    ["unclassified", "neutral"],
    ["not_applicable", "neutral"],
  ] as const)("%s -> %s", (categorizationStatus, tone) => {
    expect(categorizationTone({ categorizationStatus })).toBe(tone);
  });

  it("escolhe o quadrado: categoria, transferência, entrada sem categoria ou a revisar", () => {
    const categories = [{ id: "c1", name: "Moradia", status: "active" as const }];
    const base = { transferSide: null, categoryId: null, categorizationStatus: "unclassified" as const };
    expect(
      movementMark({ ...base, type: "expense", categoryId: "c1", categorizationStatus: "categorized" }, categories),
    ).toEqual({ kind: "category", name: "Moradia" });
    expect(movementMark({ ...base, type: "transfer", transferSide: "incoming", categorizationStatus: "not_applicable" }, categories)).toEqual({
      kind: "transfer",
      name: null,
    });
    expect(movementMark({ ...base, type: "income" }, categories)).toEqual({ kind: "inflow", name: null });
    expect(movementMark({ ...base, type: "expense" }, categories).kind).toBe("review");
    expect(
      movementMark({ ...base, type: "expense", categoryId: "c1", categorizationStatus: "uncertain" }, categories).kind,
    ).toBe("review");
    // Lista de categorias indisponível: continua categoria, com ícone genérico.
    expect(
      movementMark({ ...base, type: "expense", categoryId: "c1", categorizationStatus: "categorized" }, null),
    ).toEqual({ kind: "category", name: null });
  });
});
