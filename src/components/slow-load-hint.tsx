"use client";

import { useEffect, useState } from "react";
import { Notice } from "./ui";

/** Quanto esperar antes de avisar: acima disso, "carregando" já parece travado. */
export const SLOW_LOAD_MS = 6000;

/**
 * Aviso que só aparece se o carregamento demorar. No plano gratuito do Render o backend hiberna e
 * acordar leva até 1 minuto; sem isto, o esqueleto parece travado.
 */
export function SlowLoadHint() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), SLOW_LOAD_MS);
    return () => clearTimeout(timer);
  }, []);
  if (!slow) return null;
  return (
    <Notice tone="info">
      Ainda carregando. O servidor pode estar acordando depois de um tempo parado, o que leva até 1 minuto. Não
      precisa recarregar a página.
    </Notice>
  );
}
