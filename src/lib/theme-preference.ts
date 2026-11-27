export const THEME_KEY = "coinciente.theme";
export type ThemeChoice = "light" | "dark";

export function parseTheme(saved: string | null): ThemeChoice {
  return saved === "dark" ? "dark" : "light";
}

export function selectTheme(choice: ThemeChoice): boolean {
  let saved = true;
  try {
    window.localStorage.setItem(THEME_KEY, choice);
  } catch {
    saved = false;
  }
  document.documentElement.dataset.theme = choice;
  window.dispatchEvent(new Event("cfi-theme-change"));
  return saved;
}
