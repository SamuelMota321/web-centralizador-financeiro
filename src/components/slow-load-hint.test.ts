import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SLOW_LOAD_MS, SlowLoadHint } from "./slow-load-hint";

describe("SlowLoadHint", () => {
  it("não aparece de início (só depois de SLOW_LOAD_MS, no navegador)", () => {
    expect(renderToStaticMarkup(createElement(SlowLoadHint))).toBe("");
    expect(SLOW_LOAD_MS).toBeGreaterThanOrEqual(5000);
  });
});
