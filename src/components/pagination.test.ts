import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Pagination } from "./ui";

const render = (anchor?: string) =>
  renderToStaticMarkup(createElement(Pagination, { page: 2, pages: 5, href: (page) => `/lista?pagina=${page}`, label: "Páginas", anchor }));

describe("Pagination", () => {
  it("com âncora, todos os links levam ao início da lista", () => {
    const html = render("minha-lista");
    expect(html).toContain('href="/lista?pagina=1#minha-lista"');
    expect(html).toContain('href="/lista?pagina=3#minha-lista"');
    expect(html).not.toMatch(/href="\/lista\?pagina=\d"/);
  });

  it("sem âncora, os links ficam como estão (a rolagem é mantida por scroll={false})", () => {
    const html = render();
    expect(html).toContain('href="/lista?pagina=3"');
    expect(html).not.toContain("#");
  });

  it("uma página só não mostra paginação", () => {
    expect(renderToStaticMarkup(createElement(Pagination, { page: 1, pages: 1, href: () => "/x", label: "p" }))).toBe("");
  });
});
