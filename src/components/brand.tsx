import styles from "./brand.module.css";

/**
 * Simbolo Coinciente (style guide 2.0): dois "C" concentricos e o ponto do usuario.
 * `animated` toca uma vez a consolidacao (arcos se desenham, o ponto assenta); so para
 * conclusoes raras, nunca em acoes do dia a dia.
 */
export function BrandSymbol({
  size = 28,
  title,
  animated = false,
}: {
  size?: number;
  title?: string;
  animated?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      className={animated ? styles.consolidate : undefined}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
    >
      <path
        d="M48.5 14.5A24 24 0 1 0 48.5 49.5"
        stroke="#3DC795"
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={animated ? 1 : undefined}
        className={animated ? styles.outer : undefined}
      />
      <path
        d="M42 22.5A14.5 14.5 0 1 0 42 41.5"
        stroke="#3DC795"
        strokeWidth="6"
        strokeLinecap="round"
        pathLength={animated ? 1 : undefined}
        className={animated ? styles.inner : undefined}
      />
      <circle cx="43" cy="32" r="4" fill="#3DC795" className={animated ? styles.dot : undefined} />
    </svg>
  );
}

/** Assinatura: simbolo + "Coin" + "ciente" em destaque, como no guia. */
export function BrandLockup({ className }: { className?: string }) {
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <BrandSymbol size={28} />
      <span style={{ fontWeight: 800, letterSpacing: "-0.03em", fontSize: "1.0625rem" }}>
        Coin<span style={{ color: "var(--brand-accent, var(--primary))" }}>ciente</span>
      </span>
    </span>
  );
}
