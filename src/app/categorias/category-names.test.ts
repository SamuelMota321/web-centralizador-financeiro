import { describe, expect, it } from "vitest";
import { categoryNameSchema } from "@/lib/categories/schema";
import { hasNameConflict } from "./category-names";

const categories = [
  { id: "a", name: "Mercado" },
  { id: "b", name: "Transporte" },
];

describe("hasNameConflict", () => {
  it("detecta nome identico, inclusive de categoria arquivada", () => {
    expect(hasNameConflict("Mercado", categories)).toBe(true);
  });

  it("diferencia maiusculas, como o indice do banco", () => {
    expect(hasNameConflict("mercado", categories)).toBe(false);
  });

  it("ignora a propria categoria ao renomear", () => {
    expect(hasNameConflict("Mercado", categories, "a")).toBe(false);
    expect(hasNameConflict("Transporte", categories, "a")).toBe(true);
  });
});

describe("categoryNameSchema (borda da tela)", () => {
  it("normaliza espacos e aceita acentos", () => {
    expect(categoryNameSchema.parse("  Alimentação   fora ")).toBe("Alimentação fora");
  });

  it.each(["", "    "])("recusa nome vazio %j", (name) => {
    expect(categoryNameSchema.safeParse(name).success).toBe(false);
  });

  it("aceita 100 caracteres e recusa 101", () => {
    expect(categoryNameSchema.safeParse("a".repeat(100)).success).toBe(true);
    expect(categoryNameSchema.safeParse("a".repeat(101)).success).toBe(false);
  });
});
