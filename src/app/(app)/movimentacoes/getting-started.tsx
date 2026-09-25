import Link from "next/link";
import { IconArrowRight, IconCheck } from "@/components/icons";
import { ui } from "@/components/ui";
import styles from "./movimentacoes.module.css";

export interface OnboardingState {
  hasAccount: boolean;
  hasMovement: boolean;
  hasCategory: boolean;
}

export interface OnboardingStep {
  title: string;
  text: string;
  done: boolean;
  /** Ação do passo; só o passo atual a exibe como botão. */
  action?: { href: string; label: string };
}

/** Passos na ordem em que cada um depende do anterior; regras ficam como sugestão final. */
export function onboardingSteps(state: OnboardingState): OnboardingStep[] {
  return [
    {
      title: "Crie uma conta",
      text: "Corrente, poupança, cartão ou dinheiro. Toda movimentação pertence a uma conta.",
      done: state.hasAccount,
      action: { href: "/contas?nova=1", label: "Criar conta" },
    },
    {
      title: "Registre uma movimentação",
      text: "Receitas, despesas e transferências entre suas contas, pelo painel desta página.",
      done: state.hasMovement,
    },
    {
      title: "Crie suas categorias",
      text: "Nenhuma vem pronta: use nomes que façam sentido para você.",
      done: state.hasCategory,
      action: { href: "/categorias?nova=1", label: "Criar categoria" },
    },
  ];
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return state.hasAccount && state.hasMovement && state.hasCategory;
}

/**
 * Primeiros passos: aparece só enquanto falta algum passo essencial e mostra qual é o
 * próximo. Some sozinho quando tudo foi feito.
 */
export function GettingStarted({ state }: { state: OnboardingState }) {
  const steps = onboardingSteps(state);
  const current = steps.findIndex((step) => !step.done);
  const doneCount = steps.filter((step) => step.done).length;

  return (
    <section className={styles.onboarding} aria-labelledby="primeiros-passos">
      <div className={styles.onboardingHead}>
        <h2 className={ui.panelTitle} id="primeiros-passos">
          Primeiros passos
        </h2>
        <p className={styles.onboardingProgress}>
          {doneCount} de {steps.length} concluídos
        </p>
      </div>

      <ol className={styles.steps}>
        {steps.map((step, index) => (
          <li
            key={step.title}
            className={styles.step}
            data-state={step.done ? "done" : index === current ? "current" : "next"}
          >
            <span className={styles.stepMarker} aria-hidden>
              {step.done ? <IconCheck size={18} /> : index + 1}
            </span>
            <div className={styles.stepBody}>
              <h3 className={styles.stepTitle}>
                {step.title}
                <span className="visually-hidden">
                  {step.done ? " (concluído)" : index === current ? " (próximo passo)" : ""}
                </span>
              </h3>
              <p className={styles.stepText}>{step.text}</p>
              {index === current && step.action ? (
                <Link className={`${ui.button} ${ui.primary} ${ui.small}`} href={step.action.href}>
                  {step.action.label}
                  <IconArrowRight size={16} />
                </Link>
              ) : null}
            </div>
          </li>
        ))}
      </ol>

      <p className={styles.onboardingHint}>
        Depois, crie <Link className={ui.inlineLink} href="/regras">regras pessoais</Link> para
        categorizar automaticamente as próximas movimentações.
      </p>
    </section>
  );
}
