import { type ComponentProps, createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CategoryIcon, CategoryMark } from "./category-mark";

const mark = (props: ComponentProps<typeof CategoryMark>) => renderToStaticMarkup(createElement(CategoryMark, props));

describe("CategoryMark", () => {
  it("categoria leva a cor fixa e é decorativa", () => {
    const html = mark({ kind: "category", name: "Moradia", color: "var(--cat-1)" });
    expect(html).toContain('data-kind="category"');
    expect(html).toContain("--mark-color:var(--cat-1)");
    expect(html).toContain('aria-hidden="true"');
  });

  it("ícones diferentes para categorias diferentes", () => {
    const home = mark({ kind: "category", name: "Moradia" });
    const food = mark({ kind: "category", name: "Alimentação" });
    expect(home).not.toBe(food);
  });

  it("a revisar, transferência e entrada não usam a cor da categoria", () => {
    for (const kind of ["review", "transfer", "inflow"] as const) {
      const html = mark({ kind, color: "var(--cat-1)" });
      expect(html).toContain(`data-kind="${kind}"`);
      expect(html).not.toContain("--mark-color");
    }
  });

  it("versão compacta para as listas sob a rosca", () => {
    expect(mark({ kind: "category", name: "Lazer", size: "compact" })).toContain('data-size="compact"');
  });
});

describe("CategoryIcon", () => {
  it("só o ícone, na cor recebida", () => {
    const html = renderToStaticMarkup(createElement(CategoryIcon, { name: "Saúde", color: "var(--cat-4)" }));
    expect(html).toContain("color:var(--cat-4)");
    expect(html).toContain("<svg");
  });
});
