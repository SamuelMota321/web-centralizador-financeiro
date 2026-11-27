import { CategoryIcon } from "./category-mark";
import ui from "./ui.module.css";

/**
 * Ícone da categoria num círculo com a cor fixa dela: "solid" (círculo cheio, ícone claro),
 * como nas listas e fileiras de Categorias e Regras, ou "tint" (círculo tingido, ícone na cor).
 * Decorativo: o nome da categoria sempre aparece escrito ao lado. Sem cor (13ª em diante), neutro.
 */
export function IconBadge({
  name,
  color,
  size = "regular",
  tone = "solid",
}: {
  name: string | null;
  color: string | null;
  size?: "small" | "regular" | "large";
  tone?: "solid" | "tint";
}) {
  const badgeColor = color ?? "var(--cat-other)";
  return (
    <span
      className={ui.iconBadge}
      data-size={size}
      data-tone={tone}
      style={{ "--badge-color": badgeColor } as React.CSSProperties}
      aria-hidden
    >
      <CategoryIcon
        name={name}
        color={tone === "solid" ? "var(--on-category)" : badgeColor}
        size={size === "large" ? 22 : size === "small" ? 14 : 17}
      />
    </span>
  );
}
