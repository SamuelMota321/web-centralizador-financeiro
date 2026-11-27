/** Ilustração decorativa da faixa de regras: uma lista sendo marcada sozinha. Usa as cores do tema. */
export function RulesIllustration() {
  return (
    <svg width="96" height="80" viewBox="0 0 96 80" fill="none" aria-hidden focusable="false">
      <rect x="18" y="8" width="50" height="62" rx="6" transform="rotate(-6 43 39)" fill="var(--surface-sunken)" stroke="var(--line-strong)" />
      <rect x="24" y="10" width="50" height="62" rx="6" fill="var(--surface)" stroke="var(--line-strong)" />
      <rect x="38" y="6" width="22" height="8" rx="3" fill="var(--surface-soft)" stroke="var(--line-strong)" />
      <path d="M33 26h22M33 35h28M33 44h18M33 53h24" stroke="var(--line-strong)" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="70" cy="58" r="15" fill="var(--primary)" />
      <path d="m63.5 58 4.5 4.5 8.5-9" stroke="var(--on-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 22l3 1.5M10 32h4M84 20l-3 2M86 30h-4" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
