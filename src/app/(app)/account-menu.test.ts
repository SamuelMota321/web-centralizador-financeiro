import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

const { initials } = await import("./account-menu");

describe("initials", () => {
  it.each([
    ["Marina Duarte", "MD"],
    ["marina", "M"],
    ["Ana Beatriz Costa", "AB"],
    ["pessoa.teste@exemplo.com", "PT"],
    ["   ", "?"],
  ])("%j → %s", (identity, expected) => {
    expect(initials(identity)).toBe(expected);
  });
});
