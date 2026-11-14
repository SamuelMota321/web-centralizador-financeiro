// Tokens de movimento de globals.css traduzidos para o Motion, que recebe segundos e
// curvas como array. A fonte é globals.css: um valor alterado lá precisa mudar aqui.

export const motionDuration = {
  feedback: 0.12,
  hover: 0.18,
  popover: 0.16,
  reveal: 0.24,
  settle: 0.32,
  intro: 0.6,
} as const;

export const motionEase = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
  drawer: [0.32, 0.72, 0, 1],
} as const satisfies Record<string, readonly [number, number, number, number]>;
