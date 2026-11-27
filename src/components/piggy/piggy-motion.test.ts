import { describe, expect, it } from "vitest";
import { applyDrag, approach, isResting, PITCH_LIMIT, stepInertia, TILT_LIMIT, tiltTarget } from "./piggy-motion";

const still = { yaw: 0, pitch: 0, velocity: 0 };

describe("giro do porquinho", () => {
  it("arrastar para a direita gira no sentido positivo e gera velocidade", () => {
    const next = applyDrag(still, 50, 0, 0.016);
    expect(next.yaw).toBeGreaterThan(0);
    expect(next.velocity).toBeGreaterThan(0);
  });

  it("a inclinação nunca passa do limite, nem com arrasto grande", () => {
    expect(applyDrag(still, 0, 10_000, 0.016).pitch).toBe(PITCH_LIMIT);
    expect(applyDrag(still, 0, -10_000, 0.016).pitch).toBe(-PITCH_LIMIT);
  });

  it("depois de soltar, a inércia continua girando e desacelera até parar", () => {
    let state = { yaw: 0, pitch: 0.3, velocity: 8 };
    const first = stepInertia(state, 0.016);
    expect(first.yaw).toBeGreaterThan(0);
    expect(Math.abs(first.velocity)).toBeLessThan(8);
    for (let i = 0; i < 400; i += 1) state = stepInertia(state, 0.016);
    expect(state.velocity).toBe(0);
    expect(isResting(state)).toBe(true);
  });

  it("a desaceleração não depende da taxa de quadros", () => {
    let fast = { yaw: 0, pitch: 0, velocity: 6 };
    let slow = { ...fast };
    for (let i = 0; i < 60; i += 1) fast = stepInertia(fast, 1 / 120);
    for (let i = 0; i < 30; i += 1) slow = stepInertia(slow, 1 / 60);
    expect(fast.velocity).toBeCloseTo(slow.velocity, 5);
  });

  it("o cursor inclina só alguns graus", () => {
    expect(tiltTarget(1, 0).y).toBe(TILT_LIMIT);
    expect(tiltTarget(5, 5).y).toBe(TILT_LIMIT);
    expect(Math.abs(tiltTarget(0, 1).x)).toBeLessThan(TILT_LIMIT);
  });

  it("approach chega perto do alvo sem ultrapassar", () => {
    const value = approach(0, 1, 0.5);
    expect(value).toBeGreaterThan(0.9);
    expect(value).toBeLessThanOrEqual(1);
  });
});
