"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

const loadFeatures = () => import("./motion-features").then((module) => module.default);

/**
 * Os recursos de animação (domAnimation) carregam depois da primeira pintura, fora do
 * pacote inicial de todas as páginas; até lá, `m.*` renderiza no estado final. Segue a
 * preferência de redução do sistema: com ela, o Motion desliga deslocamento e escala.
 * `strict` impede o uso de `motion.*`, que traria o pacote inteiro; use `m.*`.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
