import { describe, expect, it } from "vitest";
import {
  accountLabel,
  ACCOUNT_FALLBACK_LABEL,
  canCategorize,
  CATEGORY_FALLBACK_LABEL,
  categorizationLabel,
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
  it("considera ao menos uma pagina", () => {
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

  it("usa fallback neutro para conta ausente ou lista indisponivel", () => {
    expect(accountLabel(ACCOUNT_ID, [])).toBe(ACCOUNT_FALLBACK_LABEL);
    expect(accountLabel(ACCOUNT_ID, null)).toBe(ACCOUNT_FALLBACK_LABEL);
  });
});

describe("typeLabel e signedAmount", () => {
  it.each([
    [{ type: "income", transferSide: null }, "Receita", "+ R$ 1.234,56"],
    [{ type: "expense", transferSide: null }, "Despesa", "\u2212 R$ 1.234,56"],
    [{ type: "transfer", transferSide: "outgoing" }, "Transferencia entre contas — saida", "\u2212 R$ 1.234,56"],
    [{ type: "transfer", transferSide: "incoming" }, "Transferencia entre contas — entrada", "+ R$ 1.234,56"],
  ] as const)("%j", (transaction, label, amount) => {
    expect(typeLabel(transaction)).toBe(label);
    expect(signedAmount({ ...transaction, amount: "1234.56" }).text).toBe(amount);
  });

  it("nunca usa vocabulario de operacao bancaria", () => {
    const label = typeLabel({ type: "transfer", transferSide: "outgoing" }).toLowerCase();
    for (const word of ["enviar", "pix", "pagar", "bancaria"]) {
      expect(label).not.toContain(word);
    }
  });
});

describe("categorizationLabel", () => {
  const CATEGORY_ID = "7c6b5a49-3827-4165-9a8b-7c6d5e4f3a2b";
  const categories = [{ id: CATEGORY_ID, name: "Mercado", status: "active" as const }];

  it.each([
    ["unclassified", null, "Sem categoria"],
    ["categorized", "manual", "Mercado · definida por voce"],
    ["categorized", "rule", "Mercado · aplicada por regra"],
    ["uncertain", null, "Categoria incerta"],
    ["unrecognized", null, "Nao reconhecida"],
    ["not_applicable", null, "Nao se aplica"],
  ] as const)("%s/%s", (categorizationStatus, categorizationSource, expected) => {
    const categoryId = categorizationStatus === "categorized" ? CATEGORY_ID : null;
    expect(
      categorizationLabel({ categorizationStatus, categorizationSource, categoryId }, categories),
    ).toBe(expected);
  });

  it("mantem legivel a categoria arquivada", () => {
    expect(
      categorizationLabel(
        { categorizationStatus: "categorized", categorizationSource: "manual", categoryId: CATEGORY_ID },
        [{ id: CATEGORY_ID, name: "Mercado", status: "archived" }],
      ),
    ).toBe("Mercado (arquivada) · definida por voce");
  });

  it("usa fallback neutro quando a categoria nao e encontrada", () => {
    for (const list of [[], null]) {
      expect(
        categorizationLabel(
          { categorizationStatus: "categorized", categorizationSource: "rule", categoryId: CATEGORY_ID },
          list,
        ),
      ).toBe(`${CATEGORY_FALLBACK_LABEL} · aplicada por regra`);
    }
  });

  it("nunca declara precisao ou inteligencia", () => {
    const labels = (["unclassified", "uncertain", "unrecognized", "not_applicable"] as const).map(
      (categorizationStatus) =>
        categorizationLabel(
          { categorizationStatus, categorizationSource: null, categoryId: null },
          categories,
        ),
    );
    expect(labels.join(" ")).not.toMatch(/%|inteligen|precis/i);
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
