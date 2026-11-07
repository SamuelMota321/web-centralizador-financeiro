import type { ComponentType } from "react";
import { type CategoryIconKey, categoryIconKey } from "@/lib/categories/category-icon";
import styles from "./category-mark.module.css";
import {
  IconBolt,
  IconBook,
  IconCar,
  IconHeartPulse,
  IconHome,
  IconInflow,
  IconOutflow,
  IconQuestion,
  IconShoppingBag,
  IconTag,
  IconTicket,
  IconTransfer,
  IconUtensils,
} from "./icons";

const CATEGORY_ICONS: Record<CategoryIconKey, ComponentType<{ size?: number }>> = {
  home: IconHome,
  food: IconUtensils,
  transport: IconCar,
  health: IconHeartPulse,
  leisure: IconTicket,
  education: IconBook,
  shopping: IconShoppingBag,
  bills: IconBolt,
  income: IconInflow,
  generic: IconTag,
};

/** Só o ícone da categoria, na cor recebida (listas compactas, como a da rosca). */
export function CategoryIcon({ name, color, size = 16 }: { name: string | null; color?: string; size?: number }) {
  const Icon = CATEGORY_ICONS[categoryIconKey(name)];
  return (
    <span className={styles.icon} style={color ? { color } : undefined} aria-hidden>
      <Icon size={size} />
    </span>
  );
}

export type CategoryMarkKind = "category" | "review" | "transfer" | "inflow" | "outflow";

/**
 * Quadrado que identifica a linha: o ícone da categoria na cor fixa dela; "a revisar"
 * hachurado com interrogação; transferência e lançamento sem categoria com o ícone de
 * direção, em neutro. Decorativo: o nome da categoria está sempre escrito na linha.
 */
export function CategoryMark({
  kind,
  name = null,
  color,
  size = "regular",
}: {
  kind: CategoryMarkKind;
  /** Nome da categoria: escolhe o ícone (kind "category"). */
  name?: string | null;
  /** Cor fixa da categoria (var(--cat-N)). */
  color?: string | null;
  size?: "regular" | "compact";
}) {
  const Icon =
    kind === "category"
      ? CATEGORY_ICONS[categoryIconKey(name)]
      : kind === "review"
        ? IconQuestion
        : kind === "transfer"
          ? IconTransfer
          : kind === "inflow"
            ? IconInflow
            : IconOutflow;

  return (
    <span
      className={styles.mark}
      data-kind={kind}
      data-size={size}
      style={kind === "category" && color ? ({ "--mark-color": color } as React.CSSProperties) : undefined}
      aria-hidden
    >
      <Icon size={size === "compact" ? 14 : 16} />
    </span>
  );
}
