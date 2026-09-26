"use client";

import { AlertDialog } from "@base-ui/react/alert-dialog";
import { Menu } from "@base-ui/react/menu";
import { useSearchParams } from "next/navigation";
import { Fragment, type ReactNode, useCallback, useEffect } from "react";
import { toast, Toaster } from "sonner";
import { IconAlert, IconCheck, IconInfo, IconMore } from "./icons";
import { type NoticeTone, PendingLabel, ui } from "./ui";

/* ---------- Estado ligado à URL, sem ida ao servidor ---------- */

/**
 * Sinalizador na URL (`?nova=1`, `?registrar=1`) alternado no cliente. O link direto
 * continua funcionando, mas abrir e fechar não refaz a página: o Next sincroniza
 * `history.replaceState` com `useSearchParams`.
 */
export function useUrlFlag(name: string): [boolean, (open: boolean) => void] {
  const params = useSearchParams();
  const open = params.get(name) === "1";
  const setOpen = useCallback(
    (next: boolean) => {
      const search = new URLSearchParams(window.location.search);
      if (next) search.set(name, "1");
      else search.delete(name);
      const query = search.toString();
      window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    },
    [name],
  );
  return [open, setOpen];
}

/* ---------- Avisos transitórios ---------- */

const TOAST_BY_TONE = {
  success: toast.success,
  info: toast.info,
  warning: toast.warning,
  error: toast.error,
} as const;

export function showToast(tone: NoticeTone, message: ReactNode, id?: string) {
  TOAST_BY_TONE[tone](message, id ? { id } : undefined);
}

/**
 * Converte o `?aviso=` de um redirecionamento em toast e limpa a URL. A lista de
 * textos continua fechada no servidor: aqui chega só o aviso já resolvido.
 */
export function UrlNoticeToast({ notice }: { notice: { tone: NoticeTone; text: string } | null }) {
  const key = useSearchParams().get("aviso");

  useEffect(() => {
    if (!key || !notice) return;
    // O id evita toast duplicado quando o efeito roda duas vezes no modo estrito.
    showToast(notice.tone, notice.text, `aviso-${key}`);
    const search = new URLSearchParams(window.location.search);
    search.delete("aviso");
    const query = search.toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
  }, [key, notice]);

  return null;
}

/**
 * Área dos toasts. Entram e saem pela mesma borda (Sonner); no celular ficam acima
 * da barra de abas. Visual com os tokens do produto, não o padrão da biblioteca.
 */
export function AppToaster() {
  return (
    <Toaster
      position="bottom-right"
      duration={5000}
      gap={10}
      offset={24}
      mobileOffset={{ bottom: "calc(76px + env(safe-area-inset-bottom))", left: 12, right: 12 }}
      containerAriaLabel="Avisos"
      icons={{
        success: <IconCheck className={ui.toastIcon} size={18} />,
        info: <IconInfo className={ui.toastIcon} size={18} />,
        warning: <IconAlert className={ui.toastIcon} size={18} />,
        error: <IconAlert className={ui.toastIcon} size={18} />,
      }}
      toastOptions={{ unstyled: true, classNames: { toast: ui.toast } }}
    />
  );
}

/* ---------- Controle segmentado ---------- */

export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  return (
    <div
      className={ui.segmented}
      role="group"
      aria-label={label}
      style={{ "--segments": options.length, "--index": index } as React.CSSProperties}
    >
      {/* O indicador desliza entre as opções: mostra de onde para onde a escolha mudou. */}
      <span className={ui.segmentIndicator} aria-hidden />
      {options.map((option) => (
        <button
          key={option.value}
          className={ui.segment}
          type="button"
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ---------- Menu de ações da linha ---------- */

export interface ActionMenuItem {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "danger";
  disabled?: boolean;
}

/** "Mais ações": ações secundárias e destrutivas saem da linha e ganham teclado completo. */
export function ActionMenu({
  label,
  items,
  disabled,
}: {
  /** Nome acessível do gatilho, com o item a que se refere. */
  label: string;
  items: ActionMenuItem[];
  disabled?: boolean;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        className={`${ui.button} ${ui.ghost} ${ui.iconButton}`}
        aria-label={label}
        disabled={disabled}
      >
        <IconMore size={18} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner className={ui.menuPositioner} sideOffset={6} align="end">
          <Menu.Popup className={ui.menuPopup}>
            {items.map((item, index) => (
              <Fragment key={item.label}>
                {item.tone === "danger" && index > 0 ? (
                  <Menu.Separator className={ui.menuSeparator} />
                ) : null}
                <Menu.Item
                  className={`${ui.menuItem} ${item.tone === "danger" ? ui.menuItemDanger : ""}`}
                  onClick={item.onSelect}
                  disabled={item.disabled}
                >
                  {item.icon}
                  {item.label}
                </Menu.Item>
              </Fragment>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

/* ---------- Confirmação de ação destrutiva ---------- */

/**
 * Diálogo com foco protegido para ações definitivas. O formulário chama a Server
 * Action; o foco começa em "Cancelar", a opção segura, e o diálogo não fecha
 * enquanto o envio está em andamento.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  pendingLabel,
  action,
  pending,
  error,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  pendingLabel: string;
  action: (formData: FormData) => void;
  pending: boolean;
  /** Falha do envio, exibida dentro do diálogo para o usuário decidir de novo. */
  error?: ReactNode;
}) {
  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next && pending) return;
        onOpenChange(next);
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className={ui.dialogBackdrop} />
        <AlertDialog.Popup className={ui.dialogPopup}>
          <AlertDialog.Title className={ui.dialogTitle}>{title}</AlertDialog.Title>
          <AlertDialog.Description className={ui.dialogDescription} render={<div />}>
            {description}
          </AlertDialog.Description>
          {error}
          <form action={action} className={ui.dialogActions}>
            <AlertDialog.Close className={`${ui.button} ${ui.secondary}`} disabled={pending}>
              Cancelar
            </AlertDialog.Close>
            <button
              className={`${ui.button} ${ui.danger}`}
              type="submit"
              disabled={pending}
              aria-busy={pending}
            >
              <PendingLabel pending={pending} idle={confirmLabel} busy={pendingLabel} />
            </button>
          </form>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
