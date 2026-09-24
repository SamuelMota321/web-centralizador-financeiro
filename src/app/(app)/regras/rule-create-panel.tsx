"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { IconClose } from "@/components/icons";
import { Notice, ui } from "@/components/ui";
import { createRuleAction, type RuleFormState } from "./actions";
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
  closeHref,
}: {
  categories: NamedOption[];
  accounts: NamedOption[];
  closeHref: string;
}) {
  const id = useId();
  const [attempt, formAction, pending] = useActionState<Attempt, FormData>(
    async (previous, formData) => ({
      result: await createRuleAction(previous.result, formData),
      version: previous.version + 1,
    }),
    { result: { status: "idle" }, version: 0 },
  );
  const { result } = attempt;

  return (
    <section className={`${ui.panel} ${ui.reveal}`} aria-labelledby={`${id}-title`}>
      <div className={ui.panelHeader}>
        <div>
          <h2 className={ui.panelTitle} id={`${id}-title`}>
            Nova regra
          </h2>
          <p className={ui.panelDescription}>
            Uma condição por regra. Ela categoriza as próximas movimentações que combinarem.
          </p>
        </div>
        <Link
          className={`${ui.button} ${ui.ghost} ${ui.small}`}
          href={closeHref}
          scroll={false}
          aria-label="Fechar o painel de nova regra"
        >
          <IconClose size={16} />
        </Link>
      </div>

      <form action={formAction} className={ui.form}>
        <RuleFields
          key={attempt.version}
          initial={"values" in result ? result.values : EMPTY_RULE_VALUES}
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

        {result.status === "success" ? (
          <Notice tone="success" className={ui.fullWidth}>
            Regra criada. Ela vale para as próximas movimentações; as já registradas não mudam.
          </Notice>
        ) : null}

        <div className={ui.formFooter}>
          <button
            className={`${ui.button} ${ui.primary}`}
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Criando…" : "Criar regra"}
          </button>
        </div>
      </form>
    </section>
  );
}
