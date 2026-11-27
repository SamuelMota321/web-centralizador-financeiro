"use client";

import { useActionState, useId, useState } from "react";
import { Notice, PendingLabel, ui } from "@/components/ui";
import { type ApplyRuleState, applyRuleAction } from "./actions";
import { APPLY_MAX_MONTHS, defaultApplyMonths } from "./rule-logic";

const IDLE: ApplyRuleState = { status: "idle" };

/**
 * Aplica uma regra às movimentações já registradas, nos meses escolhidos. Só mexe no que está sem
 * classificação: categoria que a pessoa ou outra regra já definiu nunca é trocada.
 */
export function ApplyRuleForm({ ruleId, onClose }: { ruleId: string; onClose?: () => void }) {
  const id = useId();
  const [defaults] = useState(() => defaultApplyMonths());
  const [state, action, pending] = useActionState(applyRuleAction.bind(null, ruleId), IDLE);
  const fromMonth = "fromMonth" in state ? state.fromMonth : defaults.from;
  const toMonth = "toMonth" in state ? state.toMonth : defaults.to;

  return (
    <form action={action} className={ui.form}>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-from`}>
          Do mês
        </label>
        <input className={ui.input} id={`${id}-from`} name="fromMonth" type="month" defaultValue={fromMonth} required />
      </div>
      <div className={ui.field}>
        <label className={ui.label} htmlFor={`${id}-to`}>
          Até o mês
        </label>
        <input className={ui.input} id={`${id}-to`} name="toMonth" type="month" defaultValue={toMonth} required />
      </div>
      <p className={`${ui.help} ${ui.fullWidth}`}>
        Só as movimentações sem classificação desses meses entram (até {APPLY_MAX_MONTHS} meses por vez). As que já têm
        categoria não mudam.
      </p>

      {state.status === "done" ? (
        <Notice tone={state.categorized > 0 ? "success" : "info"} className={ui.fullWidth}>
          {state.message}
        </Notice>
      ) : null}
      {state.status === "invalid" ? (
        <Notice tone="error" className={ui.fullWidth}>
          {state.message}
        </Notice>
      ) : null}
      {state.status === "error" ? (
        <Notice
          tone="error"
          className={ui.fullWidth}
          actions={
            state.reauth ? (
              <a className={ui.inlineLink} href="/auth/login?returnTo=/regras">
                Entrar novamente
              </a>
            ) : undefined
          }
        >
          {state.message}
        </Notice>
      ) : null}

      <div className={ui.formFooter}>
        <button className={`${ui.button} ${ui.primary}`} type="submit" disabled={pending} aria-busy={pending}>
          <PendingLabel pending={pending} idle="Aplicar às movimentações" busy="Aplicando…" />
        </button>
        {onClose ? (
          <button className={ui.linkButton} type="button" onClick={onClose} disabled={pending}>
            {state.status === "done" ? "Fechar" : "Agora não"}
          </button>
        ) : null}
      </div>
    </form>
  );
}
