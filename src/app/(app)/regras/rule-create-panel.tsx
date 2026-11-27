"use client";

import { useSearchParams } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import { showToast } from "@/components/interactive";
import { PanelSection } from "@/components/panel";
import { Notice, PendingLabel, ui } from "@/components/ui";
import { createRuleAction, type RuleFormState } from "./actions";
import { ApplyRuleForm } from "./apply-rule-form";
import { RuleFields } from "./rule-fields";
import { EMPTY_RULE_VALUES, type NamedOption } from "./rule-logic";

interface Attempt {
  result: RuleFormState;
  /** Muda a cada resposta: remonta os campos a partir do resultado. */
  version: number;
}

export function RuleCreatePanel({
  categories,
  accounts,
  forceOpen,
}: {
  categories: NamedOption[];
  accounts: NamedOption[];
  /** Sem nenhuma regra o painel fica aberto: é a próxima ação óbvia. */
  forceOpen: boolean;
}) {
  const [attempt, formAction, pending] = useActionState<Attempt, FormData>(
    async (previous, formData) => ({
      result: await createRuleAction(previous.result, formData),
      version: previous.version + 1,
    }),
    { result: { status: "idle" }, version: 0 },
  );
  const { result } = attempt;
  const announced = useRef<Attempt | null>(null);
  // Termo vindo do simulador ("Criar regra 'descrição contém'"): preenche o valor da condição.
  const term = useSearchParams().get("termo")?.slice(0, 200) ?? "";

  useEffect(() => {
    if (result.status !== "success" || announced.current === attempt) return;
    announced.current = attempt;
    const search = new URLSearchParams(window.location.search);
    if (search.has("termo")) {
      search.delete("termo");
      window.history.replaceState(null, "", search.size ? `?${search.toString()}` : window.location.pathname);
    }
    showToast(
      "success",
      "Regra criada. Ela já vale para as próximas movimentações; aplique-a às já registradas abaixo.",
    );
  }, [attempt, result.status]);

  return (
    <PanelSection
      flag="nova"
      forceOpen={forceOpen}
      title="Nova regra"
      description="Uma condição por regra. Ela categoriza as próximas movimentações que combinarem."
      closeLabel="Fechar o painel de nova regra"
    >
      {result.status === "success" ? (
        <div className={`${ui.rowPanel} ${ui.reveal}`}>
          <p className={ui.panelDescription}>
            Quer aplicar esta regra às movimentações que você já registrou? Escolha os meses.
          </p>
          <ApplyRuleForm key={result.ruleId} ruleId={result.ruleId} />
        </div>
      ) : null}

      <form action={formAction} className={ui.form}>
        <RuleFields
          key={`${attempt.version}:${term}`}
          initial={"values" in result ? result.values : { ...EMPTY_RULE_VALUES, conditionValue: term }}
          fieldErrors={result.status === "invalid" ? result.fieldErrors : undefined}
          categories={categories}
          accounts={accounts}
        />

        {result.status === "error" ? (
          <Notice
            tone="error"
            className={ui.fullWidth}
            actions={
              result.reauth ? (
                <a className={ui.inlineLink} href="/auth/login?returnTo=/regras">
                  Entrar novamente
                </a>
              ) : undefined
            }
          >
            {result.message}
          </Notice>
        ) : null}

        <div className={ui.formFooter}>
          <button
            className={`${ui.button} ${ui.primary}`}
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            <PendingLabel pending={pending} idle="Criar regra" busy="Criando…" />
          </button>
        </div>
      </form>
    </PanelSection>
  );
}
