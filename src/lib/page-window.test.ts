import { describe, expect, it } from "vitest";
import { pageWindow } from "./page-window";

describe("pageWindow", () => {
  it.each([
    [1, 1, [1]],
    [1, 2, [1, 2]],
    [2, 5, [1, 2, 3, 4, 5]],
    [1, 12, [1, 2, "gap", 12]],
    [6, 12, [1, "gap", 5, 6, 7, "gap", 12]],
    [12, 12, [1, "gap", 11, 12]],
    [4, 12, [1, 2, 3, 4, 5, "gap", 12]],
    [9, 12, [1, "gap", 8, 9, 10, 11, 12]],
  ] as const)("página %i de %i", (page, pages, expected) => {
    expect(pageWindow(page, pages)).toEqual(expected);
  });

  it("página fora do intervalo é tratada como a mais próxima", () => {
    expect(pageWindow(40, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pageWindow(0, 12)).toEqual([1, 2, "gap", 12]);
  });

  it("reticência nunca esconde uma página só", () => {
    for (let pages = 1; pages <= 15; pages += 1) {
      for (let page = 1; page <= pages; page += 1) {
        const slots = pageWindow(page, pages);
        slots.forEach((slot, index) => {
          if (slot !== "gap") return;
          const before = slots[index - 1] as number;
          const after = slots[index + 1] as number;
          expect(after - before).toBeGreaterThan(2);
        });
      }
    }
  });
});
