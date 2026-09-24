"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import { IconClose } from "@/components/icons";
import { errorProps, FieldError, Notice, ui } from "@/components/ui";
import { createCategoryAction, type CategoryFormState } from "./actions";

const INITIAL_STATE: CategoryFormState = { status: "idle" };

export function CategoryForm({ closeHref }: { closeHref: string }) {
  const [state, formAction, pending] = useActionState(createCategoryAction, INITIAL_STATE);
  const id = useId();
  const error = state.status === "invalid" ? state.message : undefined;

  return (
    <section className={`${ui.panel} ${ui.reveal}`} aria-labelledby={`${id}-title`}>
      <div className={ui.panelHeader}>
        <div>
          <h2 className={ui.panelTitle} id={`${id}-title`}>
            Nova categoria
          </h2>
          <p className={ui.panelDescription}>
            Categorias são pessoais: nenhuma vem pronta. Use nomes que façam sentido para você.
          </p>
        </div>
        <Link
          className={`${ui.button} ${ui.ghost} ${ui.small}`}
          href={closeHref}
          scroll={false}
          aria-label="Fechar o painel de nova categoria"
        >
          <IconClose size={16} />
        </Link>
      </div>

      <form action={formAction} className={ui.form}>
        <div className={`${ui.field} ${ui.fieldWide}`}>
          <label className={ui.label} htmlFor={`${id}-name`}>
            Nome
          </label>
          <input
            className={ui.input}
            id={`${id}-name`}
            name="name"
            maxLength={100}
            placeholder="Ex.: Alimentação"
            // O React reseta o formulário após o envio: erro devolve o que foi digitado.
            defaultValue={"name" in state ? state.name : ""}
            required
            {...errorProps(`${id}-name-error`, error)}
          />
          <FieldError id={`${id}-name-error`} message={error} />
        </div>

        {state.status === "error" ? (
          <Notice
            tone="error"
            className={ui.fullWidth}
            actions={
              state.reauth ? (
                <a className={ui.inlineLink} href="/auth/login?returnTo=/categorias">
                  Entrar novamente
                </a>
              ) : undefined
            }
          >
            {state.message}
          </Notice>
        ) : null}

        {state.status === "success" ? (
          <Notice tone="success" className={ui.fullWidth}>
            Categoria criada. Ela já pode ser atribuída às suas movimentações.
          </Notice>
        ) : null}

        <div className={ui.formFooter}>
          <button
            className={`${ui.button} ${ui.primary}`}
            type="submit"
            disabled={pending}
            aria-busy={pending}
          >
            {pending ? "Criando…" : "Criar categoria"}
          </button>
        </div>
      </form>
    </section>
  );
}
