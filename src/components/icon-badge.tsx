import { CategoryIcon } from "./category-mark";
import ui from "./ui.module.css";

/**
 * Ícone da categoria num círculo tingido com a cor fixa dela. Decorativo: o nome da categoria
 * sempre aparece escrito ao lado. Sem cor (7ª categoria em diante), usa o neutro.
 */
export function IconBadge({ name, color, size = "regular" }: { name: string | null; color: string | null; size?: "regular" | "large" }) {
  return (
    <span
      className={ui.iconBadge}
      data-size={size}
      style={{ "--badge-color": color ?? "var(--cat-other)" } as React.CSSProperties}
      aria-hidden
    >
      <CategoryIcon name={name} color={color ?? "var(--cat-other)"} size={size === "large" ? 20 : 16} />
    </span>
  );
}
