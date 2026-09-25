import { describe, expect, it } from "vitest";
import {
  formatCivilDate,
  formatLongCivilDate,
  isRealCivilDate,
  maskBrazilianDate,
  parseBrazilianDate,
  relativeCivilDay,
  todayCivilDate,
} from "./civil-date";

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

describe("parseBrazilianDate", () => {
  it.each([
    ["20/09/2026", "2026-09-20"],
    [" 01/01/2027 ", "2027-01-01"],
    ["29/02/2028", "2028-02-29"],
  ])("%j -> %s", (raw, expected) => {
    expect(parseBrazilianDate(raw)).toBe(expected);
  });

  it.each(["29/02/2026", "31/04/2026", "2026-09-20", "09/20/2026", "20/9/2026", ""])(
    "recusa %j",
    (raw) => {
      expect(parseBrazilianDate(raw)).toBeNull();
    },
  );
});

describe("maskBrazilianDate", () => {
  it.each([
    ["2", "2"],
    ["240", "24/0"],
    ["2409", "24/09"],
    ["24092026", "24/09/2026"],
    ["24/09/2026", "24/09/2026"],
    ["24-09-2026", "24/09/2026"],
    ["240920261", "24/09/2026"],
    ["ab24c09", "24/09"],
  ])("%j -> %j", (raw, expected) => {
    expect(maskBrazilianDate(raw)).toBe(expected);
  });
});

describe("formatLongCivilDate", () => {
  it("escreve o dia da semana e o mês por extenso, sem o ano de referência", () => {
    expect(formatLongCivilDate("2026-09-22", 2026)).toBe("terça-feira, 22 de setembro");
  });

  it("inclui o ano quando difere do ano de referência", () => {
    expect(formatLongCivilDate("2025-12-31", 2026)).toBe("quarta-feira, 31 de dezembro de 2025");
  });

  it("não troca o dia por causa de fuso horário", () => {
    expect(formatLongCivilDate("2026-01-01", 2026)).toBe("quinta-feira, 1 de janeiro");
  });

  it("devolve intacto o que não é data civil válida", () => {
    expect(formatLongCivilDate("2026-02-30", 2026)).toBe("2026-02-30");
    expect(formatLongCivilDate("ontem")).toBe("ontem");
  });
});

describe("relativeCivilDay", () => {
  it.each([
    ["2026-09-24", "2026-09-24", "Hoje"],
    ["2026-09-23", "2026-09-24", "Ontem"],
    ["2026-02-28", "2026-03-01", "Ontem"],
    ["2025-12-31", "2026-01-01", "Ontem"],
    ["2026-09-22", "2026-09-24", null],
    ["2026-09-25", "2026-09-24", null],
  ])("%s em relação a %s → %s", (value, today, expected) => {
    expect(relativeCivilDay(value, today)).toBe(expected);
  });

  it("ignora datas inválidas", () => {
    expect(relativeCivilDay("2026-13-01", "2026-09-24")).toBeNull();
  });
});
