import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RetryButton } from "./retry-button";

describe("RetryButton", () => {
  it("começa habilitado, com o texto 'Tentar de novo'", () => {
    const html = renderToStaticMarkup(createElement(RetryButton, { error: new Error("x"), retry: () => undefined }));
    expect(html).toContain("Tentar de novo");
    expect(html).not.toContain("disabled");
    expect(html).toContain('aria-busy="false"');
  });
});

/** Todas as telas de erro do app, achadas pelo nome do arquivo. */
function errorScreens(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return errorScreens(path);
    return name === "error.tsx" ? [path] : [];
  });
}

describe("telas de erro", () => {
  const screens = errorScreens(join(process.cwd(), "src/app/(app)"));

  it("existem as 9 telas esperadas", () => {
    expect(screens).toHaveLength(9);
  });

  it("todas usam retry() pelo RetryButton e nenhuma volta ao reset(), que não busca os dados de novo", () => {
    for (const file of screens) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("<RetryButton error={error} retry={retry} />");
      expect(source, file).toContain("retry: () => void");
      expect(source, file).not.toMatch(/\breset\b/);
    }
  });
});
