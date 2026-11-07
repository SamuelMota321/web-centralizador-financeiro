import type { ReactNode, SVGProps } from "react";

// Icones proprios: traco de 1,75px, cantos arredondados, significado literal.
// Sempre acompanham um rotulo; por isso sao aria-hidden.

type IconProps = Omit<SVGProps<SVGSVGElement>, "children"> & { size?: number };

function Icon({ size = 18, children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...props}
    >
      {children}
    </svg>
  );
}

export const IconMovements = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 4v16M7 4 3.5 7.5M7 4l3.5 3.5M17 20V4m0 16-3.5-3.5M17 20l3.5-3.5" />
  </Icon>
);

export const IconAccounts = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2.5" />
    <path d="M3 10h18M7 15h4" />
  </Icon>
);

export const IconCategories = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 12.2V5.5a2 2 0 0 1 2-2h6.7a2 2 0 0 1 1.4.6l7.3 7.3a2 2 0 0 1 0 2.8l-6.7 6.7a2 2 0 0 1-2.8 0l-7.3-7.3a2 2 0 0 1-.6-1.4Z" />
    <circle cx="8.5" cy="8.5" r="1.4" />
  </Icon>
);

export const IconPlus = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 5v14M5 12h14" />
  </Icon>
);

export const IconClose = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 6 12 12M18 6 6 18" />
  </Icon>
);

export const IconSignOut = (p: IconProps) => (
  <Icon {...p}>
    <path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14M10 16l-4-4 4-4M6 12h10" />
  </Icon>
);

export const IconInflow = (p: IconProps) => (
  <Icon {...p}>
    <path d="M17 7 7 17M7 9v8h8" />
  </Icon>
);

export const IconOutflow = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 17 17 7M9 7h8v8" />
  </Icon>
);

export const IconTransfer = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />
  </Icon>
);

export const IconCheck = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m8.5 12.2 2.3 2.3 4.7-4.9" />
  </Icon>
);

export const IconInfo = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11v5M12 8h.01" />
  </Icon>
);

export const IconAlert = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10.3 4.3 2.8 17.2A2 2 0 0 0 4.5 20h15a2 2 0 0 0 1.7-2.8L13.7 4.3a2 2 0 0 0-3.4 0Z" />
    <path d="M12 9.5v4M12 16.5h.01" />
  </Icon>
);

export const IconChevronLeft = (p: IconProps) => (
  <Icon {...p}>
    <path d="m14.5 6-6 6 6 6" />
  </Icon>
);

export const IconChevronRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="m9.5 6 6 6-6 6" />
  </Icon>
);

export const IconRules = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 6h9M4 12h6M4 18h9" />
    <path d="m15.5 10.5 2.2 2.2 3.8-4.2" />
    <path d="M16 18h4" />
  </Icon>
);

export const IconMore = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 12h.01M12 12h.01M18 12h.01" strokeWidth={2.75} />
  </Icon>
);

export const IconChevronDown = (p: IconProps) => (
  <Icon {...p}>
    <path d="m6 9.5 6 6 6-6" />
  </Icon>
);

export const IconArchive = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="4.5" width="17" height="4.5" rx="1.5" />
    <path d="M5 9v8.5A2 2 0 0 0 7 19.5h10a2 2 0 0 0 2-2V9M10 13h4" />
  </Icon>
);

export const IconTrash = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4.5 7h15M9.5 7V5.5a1.5 1.5 0 0 1 1.5-1.5h2a1.5 1.5 0 0 1 1.5 1.5V7M6.5 7l.8 11.2A2 2 0 0 0 9.3 20h5.4a2 2 0 0 0 2-1.8L17.5 7" />
  </Icon>
);

export const IconPause = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M10 9.5v5M14 9.5v5" />
  </Icon>
);

export const IconPlay = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m10.2 9 4.8 3-4.8 3Z" />
  </Icon>
);

export const IconArrowRight = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Icon>
);

export const IconTag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 12.5V5a1 1 0 0 1 1-1h7.5l7.5 7.5-8.5 8.5Z" />
    <path d="M8.5 8.5h.01" strokeWidth={2.5} />
  </Icon>
);

/* ---------- Categorias (escolhidos pelo nome em lib/categories/category-icon.ts) ---------- */

export const IconHome = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1Z" />
  </Icon>
);

export const IconUtensils = (p: IconProps) => (
  <Icon {...p}>
    <path d="M7 3v6a2 2 0 0 0 4 0V3M9 3v18M17 21V3c-2.2 1.3-3 4-3 7v3h3" />
  </Icon>
);

export const IconCar = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 16v-4l2-5h10l2 5v4M4 16h16M6 16v2.5M18 16v2.5M3.5 11H5M19 11h1.5" />
    <circle cx="8.5" cy="13" r="0.8" />
    <circle cx="15.5" cy="13" r="0.8" />
  </Icon>
);

export const IconHeartPulse = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20s-7.5-4.5-7.5-10.2A4.2 4.2 0 0 1 12 7.3a4.2 4.2 0 0 1 7.5 2.5C19.5 15.5 12 20 12 20Z" />
    <path d="M7.5 12.5h2.2l1.3-2.2 2 4 1.3-1.8h2.2" />
  </Icon>
);

export const IconTicket = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3.5 7.5h17v3a1.8 1.8 0 0 0 0 3v3h-17v-3a1.8 1.8 0 0 0 0-3Z" />
    <path d="M14.5 7.5v1.5M14.5 11.25v1.5M14.5 15v1.5" />
  </Icon>
);

export const IconBook = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5 5.5A1.5 1.5 0 0 1 6.5 4H19v14H6.5A1.5 1.5 0 0 0 5 19.5Zm0 14A1.5 1.5 0 0 0 6.5 21H19" />
  </Icon>
);

export const IconShoppingBag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 8h13l-1 12h-11Z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </Icon>
);

export const IconBolt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M13 3 5 13.5h6L10 21l8-10.5h-6Z" />
  </Icon>
);

export const IconQuestion = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.5h.01" />
  </Icon>
);
