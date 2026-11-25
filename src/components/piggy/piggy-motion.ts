// Física do giro do porquinho, pura e testável. Ângulos em radianos, tempo em segundos.

export interface SpinState {
  /** Giro acumulado no eixo vertical (livre, 360°). */
  yaw: number;
  /** Inclinação para frente/trás, limitada para o porquinho nunca virar de cabeça para baixo. */
  pitch: number;
  /** Velocidade angular do giro em rad/s, usada na inércia depois de soltar. */
  velocity: number;
}

export const DRAG_YAW_PER_PX = 0.012;
export const DRAG_PITCH_PER_PX = 0.006;
export const PITCH_LIMIT = 0.45;
/** Fração da velocidade que sobra a cada segundo: desacelera até parar em ~1,5 s. */
export const FRICTION_PER_SECOND = 0.04;
export const MIN_VELOCITY = 0.02;
/** Inclinação máxima seguindo o cursor, em radianos (~8°). */
export const TILT_LIMIT = 0.14;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Arrasto de `dx`, `dy` pixels em `dt` segundos: gira e mede a velocidade para a inércia. */
export function applyDrag(state: SpinState, dx: number, dy: number, dt: number): SpinState {
  const deltaYaw = dx * DRAG_YAW_PER_PX;
  const instant = dt > 0 ? deltaYaw / dt : 0;
  return {
    yaw: state.yaw + deltaYaw,
    pitch: clamp(state.pitch + dy * DRAG_PITCH_PER_PX, -PITCH_LIMIT, PITCH_LIMIT),
    // Média com a anterior: um último movimento trêmulo não dispara um giro exagerado.
    velocity: clamp(state.velocity * 0.5 + instant * 0.5, -25, 25),
  };
}

/** Um passo da inércia depois de soltar; a inclinação volta devagar ao centro. */
export function stepInertia(state: SpinState, dt: number): SpinState {
  const decay = Math.pow(FRICTION_PER_SECOND, dt);
  const velocity = Math.abs(state.velocity * decay) < MIN_VELOCITY ? 0 : state.velocity * decay;
  return {
    yaw: state.yaw + state.velocity * dt,
    pitch: state.pitch * Math.pow(0.2, dt),
    velocity,
  };
}

export function isResting(state: SpinState): boolean {
  return state.velocity === 0 && Math.abs(state.pitch) < 0.002;
}

/** Inclinação alvo seguindo o cursor: posição normalizada de -1 a 1 em cada eixo. */
export function tiltTarget(nx: number, ny: number): { x: number; y: number } {
  return { x: clamp(ny, -1, 1) * TILT_LIMIT * 0.6, y: clamp(nx, -1, 1) * TILT_LIMIT };
}

/** Aproxima `current` de `target` de forma exponencial, independente da taxa de quadros. */
export function approach(current: number, target: number, dt: number, perSecond = 0.002): number {
  return target + (current - target) * Math.pow(perSecond, dt);
}
