// Datas civis (AAAA-MM-DD) sem fuso: nunca derivar de toISOString(), que usa UTC e
// pode trocar o dia perto da meia-noite.

const ISO_CIVIL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function pad(value: number, length = 2): string {
  return String(value).padStart(length, "0");
}

/** Data de hoje no calendario local do usuario. */
export function todayCivilDate(now: Date = new Date()): string {
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** true somente para datas que existem no calendario (recusa 2026-02-30). */
export function isRealCivilDate(value: string): boolean {
  const match = ISO_CIVIL_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(2000, month - 1, day));
  date.setUTCFullYear(year);
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** "2026-09-20" -> "20/09/2026". Valores fora do formato voltam intactos. */
export function formatCivilDate(value: string): string {
  const match = ISO_CIVIL_DATE.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

/**
 * "20/09/2026" -> "2026-09-20". Os campos de data do web são texto DD/MM/AAAA: o seletor
 * nativo segue o idioma do navegador (MM/DD/AAAA em inglês) e não o da página.
 * Retorna null para formato inválido ou data inexistente.
 */
export function parseBrazilianDate(raw: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim());
  if (!match) return null;
  const value = `${match[3]}-${match[2]}-${match[1]}`;
  return isRealCivilDate(value) ? value : null;
}

/** Máscara de digitação: mantém só dígitos (até 8) e insere as barras de DD/MM/AAAA. */
export function maskBrazilianDate(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function civilToUtc(value: string): Date | null {
  const match = ISO_CIVIL_DATE.exec(value);
  if (!match || !isRealCivilDate(value)) return null;
  const date = new Date(Date.UTC(2000, Number(match[2]) - 1, Number(match[3])));
  date.setUTCFullYear(Number(match[1]));
  return date;
}

// UTC nos dois lados: a data civil é formatada como está, sem conversão de fuso.
const LONG_DATE = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const LONG_DATE_WITH_YEAR = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/**
 * "2026-09-22" -> "terça-feira, 22 de setembro". O ano só aparece quando difere do
 * ano de referência. Valores fora do formato voltam intactos.
 */
export function formatLongCivilDate(value: string, referenceYear?: number): string {
  const date = civilToUtc(value);
  if (!date) return value;
  const format =
    referenceYear === undefined || date.getUTCFullYear() === referenceYear
      ? LONG_DATE
      : LONG_DATE_WITH_YEAR;
  return format.format(date);
}

/** "Hoje" ou "Ontem" em relação a `today` (AAAA-MM-DD); null para as demais datas. */
export function relativeCivilDay(value: string, today: string): "Hoje" | "Ontem" | null {
  const date = civilToUtc(value);
  const reference = civilToUtc(today);
  if (!date || !reference) return null;
  const days = Math.round((reference.getTime() - date.getTime()) / 86_400_000);
  if (days === 0) return "Hoje";
  if (days === 1) return "Ontem";
  return null;
}
