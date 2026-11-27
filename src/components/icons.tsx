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

export const IconShoppingBag = (p: IconProps) => (
  <Icon {...p}>
    <path d="M5.5 8h13l-1 12h-11Z" />
    <path d="M9 10V7a3 3 0 0 1 6 0v3" />
  </Icon>
);

export const IconQuestion = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.6.3-1 .8-1 1.5v.4M12 16.5h.01" />
  </Icon>
);

export const IconCart = (p: IconProps) => (
  <Icon {...p}>
    <path d="M3 4h2.2l2.1 10.2a1.5 1.5 0 0 0 1.5 1.2h8.4a1.5 1.5 0 0 0 1.5-1.1L20.5 8H6.1" />
    <circle cx="9.5" cy="19.5" r="1.2" />
    <circle cx="17" cy="19.5" r="1.2" />
  </Icon>
);

export const IconFlower = (p: IconProps) => (
  <Icon {...p}>
    <path d="M12 20c-4.4 0-7.5-3-7.5-6.5 2.6 0 5.2 1 7.5 3.3 2.3-2.3 4.9-3.3 7.5-3.3C19.5 17 16.4 20 12 20Z" />
    <path d="M12 16.8c-2-1.8-2.8-4.2-2.8-6.3C9.2 7.7 12 4 12 4s2.8 3.7 2.8 6.5c0 2.1-.8 4.5-2.8 6.3Z" />
  </Icon>
);

export const IconReceipt = (p: IconProps) => (
  <Icon {...p}>
    <path d="M6 3.5h12v17l-2-1.3-2 1.3-2-1.3-2 1.3-2-1.3-2 1.3Z" />
    <path d="M9 8h6M9 11.5h6M9 15h3.5" />
  </Icon>
);

export const IconBriefcase = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="7.5" width="17" height="12" rx="1.5" />
    <path d="M9 7.5V6a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 6v1.5M3.5 12.5h17M11 12.5v1.5h2v-1.5" />
  </Icon>
);

export const IconStar = (p: IconProps) => (
  <Icon {...p}>
    <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.4l-4.8 2.5.9-5.4-3.9-3.8 5.4-.8Z" />
  </Icon>
);

export const IconGraduation = (p: IconProps) => (
  <Icon {...p}>
    <path d="M2.5 9.5 12 5l9.5 4.5L12 14Z" />
    <path d="M6.5 11.6V16c1.4 1.4 3.4 2.2 5.5 2.2s4.1-.8 5.5-2.2v-4.4M21.5 9.5V15" />
  </Icon>
);

export const IconPencil = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17Z" />
    <path d="m14.5 7.5 3 3" />
  </Icon>
);

export const IconSparkles = (p: IconProps) => (
  <Icon {...p}>
    <path d="M10 4.5 11.6 9 16 10.5 11.6 12 10 16.5 8.4 12 4 10.5 8.4 9Z" />
    <path d="M17.5 14.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8ZM17.5 3.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6Z" />
  </Icon>
);

export const IconLightbulb = (p: IconProps) => (
  <Icon {...p}>
    <path d="M9 17.5h6M10 20.5h4M12 3.5a5.5 5.5 0 0 0-3.3 9.9c.5.4.8 1 .8 1.6v.5h5v-.5c0-.6.3-1.2.8-1.6A5.5 5.5 0 0 0 12 3.5Z" />
  </Icon>
);

export const IconRefresh = (p: IconProps) => (
  <Icon {...p}>
    <path d="M19.5 12a7.5 7.5 0 0 1-13 5.1M4.5 12a7.5 7.5 0 0 1 13-5.1" />
    <path d="M17.5 3.5v3.6h-3.6M6.5 20.5v-3.6h3.6" />
  </Icon>
);

export const IconCalendar = (p: IconProps) => (
  <Icon {...p}>
    <rect x="3.5" y="5" width="17" height="15" rx="2" />
    <path d="M3.5 10h17M8 3.5v3M16 3.5v3" />
  </Icon>
);

export const IconTrendUp = (p: IconProps) => (
  <Icon {...p}>
    <path d="M4 17l5.5-5.5 3.5 3.5L20 7.5M15 7.5h5v5" />
  </Icon>
);

export const IconCoins = (p: IconProps) => (
  <Icon {...p}>
    <circle cx="9" cy="9" r="5.5" />
    <path d="M15.2 6.4A5.5 5.5 0 1 1 9.4 14.9M9 6.8v4.4M7.6 8.2c.4-.6 1-.9 1.5-.9s1.2.3 1.5.8" />
  </Icon>
);
