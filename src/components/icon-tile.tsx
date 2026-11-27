import type { ButtonHTMLAttributes, ReactNode } from "react";
import { IconBadge } from "./icon-badge";
import ui from "./ui.module.css";

export type TileState = "on" | "missing" | "off";

/**
 * Um item da fileira de sugeridas: círculo da categoria, nome e um detalhe curto. O estado
 * aparece no círculo (cheio, tracejado ou apagado), num selo no canto e no texto do detalhe,
 * nunca só na cor. Com `onClick` vira botão; sem, é só leitura.
 */
export function IconTile({
  name,
  color,
  label,
  detail,
  state = "on",
  mark,
  ...button
}: {
  name: string;
  color: string | null;
  label: string;
  detail?: ReactNode;
  state?: TileState;
  /** Selo no canto do círculo (✓, +). */
  mark?: ReactNode;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "color">) {
  const content = (
    <>
      <IconBadge name={name} color={state === "missing" ? null : color} size="large" />
      {mark ? (
        <span className={ui.tileMark} aria-hidden>
          {mark}
        </span>
      ) : null}
      <span className={ui.tileLabel}>{label}</span>
      {detail ? <span className={ui.tileDetail}>{detail}</span> : null}
    </>
  );
  if (!button.onClick) {
    return (
      <div className={ui.tile} data-state={state}>
        {content}
      </div>
    );
  }
  return (
    <button type="button" className={ui.tile} data-state={state} {...button}>
      {content}
    </button>
  );
}
