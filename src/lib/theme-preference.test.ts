import { afterEach, describe, expect, it, vi } from "vitest";
import { parseTheme, selectTheme, THEME_KEY } from "./theme-preference";

afterEach(() => vi.unstubAllGlobals());

describe("preferência de tema", () => {
  it.each([
    [null, "light"],
    ["system", "light"],
    ["light", "light"],
    ["dark", "dark"],
  ] as const)("interpreta %s como %s", (saved, expected) => {
    expect(parseTheme(saved)).toBe(expected);
  });

  it("troca nos dois sentidos e salva a última escolha", () => {
    const store = new Map<string, string>();
    const setItem = vi.fn((key: string, value: string) => { store.set(key, value); });
    const dispatchEvent = vi.fn();
    const documentElement = { dataset: { theme: "light" } };
    vi.stubGlobal("window", { localStorage: { setItem }, dispatchEvent });
    vi.stubGlobal("document", { documentElement });

    expect(selectTheme("dark")).toBe(true);
    expect(selectTheme("light")).toBe(true);
    expect(store.get(THEME_KEY)).toBe("light");
    expect(documentElement.dataset.theme).toBe("light");
    expect(dispatchEvent).toHaveBeenCalledTimes(2);
  });

  it("mantém a troca na sessão se o navegador bloquear a gravação", () => {
    vi.stubGlobal("window", {
      localStorage: { setItem: () => { throw new Error("storage"); } },
      dispatchEvent: vi.fn(),
    });
    const documentElement = { dataset: { theme: "light" } };
    vi.stubGlobal("document", { documentElement });

    expect(selectTheme("dark")).toBe(false);
    expect(documentElement.dataset.theme).toBe("dark");
  });
});
