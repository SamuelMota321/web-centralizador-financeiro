import { describe, expect, it } from "vitest";
import { isOnboardingComplete, onboardingSteps } from "./getting-started";

describe("primeiros passos", () => {
  it("segue a ordem de dependência: conta, movimentação, categoria", () => {
    const steps = onboardingSteps({ hasAccount: false, hasMovement: false, hasCategory: false });
    expect(steps.map((step) => step.title)).toEqual([
      "Crie uma conta",
      "Registre uma movimentação",
      "Crie suas categorias",
    ]);
    expect(steps.every((step) => !step.done)).toBe(true);
  });

  it("marca cada passo pelo estado real dos dados", () => {
    const steps = onboardingSteps({ hasAccount: true, hasMovement: false, hasCategory: true });
    expect(steps.map((step) => step.done)).toEqual([true, false, true]);
  });

  it("só termina quando os três passos essenciais estão feitos", () => {
    expect(isOnboardingComplete({ hasAccount: true, hasMovement: true, hasCategory: false })).toBe(false);
    expect(isOnboardingComplete({ hasAccount: true, hasMovement: true, hasCategory: true })).toBe(true);
  });

  it("as ações apontam para as telas que abrem o painel de criação", () => {
    const [account, , category] = onboardingSteps({
      hasAccount: false,
      hasMovement: false,
      hasCategory: false,
    });
    expect(account.action?.href).toBe("/contas?nova=1");
    expect(category.action?.href).toBe("/categorias?nova=1");
  });
});
