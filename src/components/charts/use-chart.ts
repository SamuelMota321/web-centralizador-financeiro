import { useReducedMotion, type Transition } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { motionDuration, motionEase } from "@/lib/motion";

/**
 * Largura real do contêiner, para o SVG desenhar em pixels de tela (texto do eixo sem
 * escalar). É null até a primeira medição: o SVG só monta com a largura certa, senão as
 * barras deslizariam de uma largura suposta para a real. O contêiner reserva a altura.
 */
export function useChartWidth<T extends Element>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/**
 * Transição de posição e altura quando os dados mudam (troca de período). São atributos
 * SVG, que o `reducedMotion` do Motion não cobre (ele só desliga transform): com a
 * preferência de redução, a mudança é imediata.
 */
export function useGeometryTransition(): Transition {
  const reduce = useReducedMotion();
  return reduce
    ? { duration: 0 }
    : { duration: motionDuration.reveal, ease: motionEase.out };
}

/**
 * Entrada única das barras a partir da linha de base (página inicial, `--motion-intro`),
 * em sequência curta depois que o painel assenta. Com movimento reduzido, aparecem prontas.
 */
export function useIntroTransition(): (index: number) => Transition {
  const reduce = useReducedMotion();
  return (index) =>
    reduce
      ? { duration: 0 }
      : { duration: motionDuration.intro, ease: motionEase.out, delay: 0.2 + index * 0.05 };
}

/** Destaque ligado entre gráfico e tabela; só cursor de mouse, não toque. */
export function useLinkedHighlight() {
  const [active, setActive] = useState<number | null>(null);

  const bind = (index: number) => ({
    onPointerEnter: (event: PointerEvent) => {
      if (event.pointerType === "mouse") setActive(index);
    },
    onPointerLeave: () => setActive(null),
  });

  return { active, bind };
}
