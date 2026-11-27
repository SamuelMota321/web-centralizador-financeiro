import type { CSSProperties } from "react";
import { IconBriefcase, IconCar, IconHome } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { type AssetIconKey, assetIconKey } from "@/lib/patrimony/asset-icon";

const ICONS: Record<AssetIconKey, typeof IconHome> = { home: IconHome, vehicle: IconCar, generic: IconBriefcase };

/**
 * Círculo com o ícone do bem, escolhido pelo tipo (texto livre). Neutro: a cor de categoria só
 * identifica categoria. Decorativo: o nome do bem sempre vem escrito ao lado.
 */
export function AssetBadge({ type }: { type: string | null | undefined }) {
  const Icon = ICONS[assetIconKey(type)];
  return (
    <span
      className={ui.iconBadge}
      data-size="regular"
      data-tone="tint"
      style={{ "--badge-color": "var(--cat-other)", color: "var(--body-text)" } as CSSProperties}
      aria-hidden
    >
      <Icon size={17} />
    </span>
  );
}
