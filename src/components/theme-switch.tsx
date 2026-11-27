"use client";

import { Menu } from "@base-ui/react/menu";
import { useEffect, useState } from "react";
import { parseTheme, selectTheme, THEME_KEY, type ThemeChoice } from "@/lib/theme-preference";
import { ui } from "./ui";

export function ThemeSwitch({ menu = false }: { menu?: boolean }) {
  const [choice, setChoice] = useState<ThemeChoice>("light");

  useEffect(() => {
    const sync = () => setChoice(parseTheme(document.documentElement.dataset.theme ?? null));
    const onStorage = (event: StorageEvent) => {
      if (event.key !== THEME_KEY && event.key !== null) return;
      document.documentElement.dataset.theme = parseTheme(event.newValue);
      sync();
    };
    sync();
    window.addEventListener("cfi-theme-change", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("cfi-theme-change", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function toggle() {
    if (!selectTheme(choice === "dark" ? "light" : "dark")) {
      window.alert("O tema mudou nesta sessão, mas não foi possível salvar a escolha neste dispositivo.");
    }
  }

  const label = `Tema: ${choice === "dark" ? "Escuro" : "Claro"}`;
  if (menu) {
    return <Menu.Item className={ui.menuItem} onClick={toggle}>{label}</Menu.Item>;
  }
  return (
    <button type="button" className="theme-toggle" onClick={toggle} aria-label={`${label}. Ativar tema ${choice === "dark" ? "claro" : "escuro"}`}>
      {label}
    </button>
  );
}
