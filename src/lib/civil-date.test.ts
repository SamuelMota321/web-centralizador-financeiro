import { describe, expect, it } from "vitest";
import { formatCivilDate, isRealCivilDate, todayCivilDate } from "./civil-date";

describe("todayCivilDate", () => {
  it("usa o calendario local, sem conversao para UTC", () => {
    expect(todayCivilDate(new Date(2026, 8, 23, 23, 59))).toBe("2026-09-23");
    expect(todayCivilDate(new Date(2026, 0, 1, 0, 0))).toBe("2026-01-01");
  });
});

describe("isRealCivilDate", () => {
  it.each(["2026-09-23", "2024-02-29", "2026-12-31", "0001-01-01"])("aceita %s", (value) => {
    expect(isRealCivilDate(value)).toBe(true);
  });

  it.each(["2026-02-29", "2026-02-30", "2026-13-01", "2026-00-10", "2026-9-23", "23/09/2026", ""])(
    "recusa %j",
    (value) => {
      expect(isRealCivilDate(value)).toBe(false);
    },
  );
});

describe("formatCivilDate", () => {
  it("converte para DD/MM/AAAA", () => {
    expect(formatCivilDate("2026-09-23")).toBe("23/09/2026");
    expect(formatCivilDate("invalida")).toBe("invalida");
  });
});
