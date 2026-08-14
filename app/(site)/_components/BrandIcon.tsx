// BrandIcon — renders an inline SVG icon from the Brain design-system sprite map.
// Keeps icons co-located with components (no external sprite file needed in the static export).

// Every key present in brand-site.js ICON object.
export type IconName =
  | "check"
  | "checkCircle"
  | "x"
  | "plus"
  | "arrowR"
  | "arrowDown"
  | "moon"
  | "sun"
  | "menu"
  | "calendar"
  | "clock"
  | "chat"
  | "whatsapp"
  | "user"
  | "users"
  | "shield"
  | "lock"
  | "server"
  | "edit"
  | "swap"
  | "ban"
  | "send"
  | "note"
  | "doc"
  | "sliders"
  | "sparkle"
  | "phone"
  | "bell"
  | "heart"
  | "trash"
  | "brain";

// Path data copied verbatim from brand-site.js ICON map.
const PATHS: Record<IconName, string> = {
  check: "M5 12l5 5 9-11",
  checkCircle: "M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z",
  x: "M18 6L6 18M6 6l12 12",
  plus: "M12 5v14M5 12h14",
  arrowR: "M5 12h14M13 6l6 6-6 6",
  arrowDown: "M12 5v14M6 13l6 6 6-6",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 109.8 9.8z",
  sun: "M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5L19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5L19 5M12 8a4 4 0 100 8 4 4 0 000-8z",
  menu: "M4 7h16M4 12h16M4 17h16",
  calendar:
    "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  clock: "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
  chat: "M21 12a8 8 0 01-11.6 7.1L4 21l1.9-5.4A8 8 0 1121 12z",
  // whatsapp, send, sparkle are "filled" — stroke stays in path but fill overrides stroke via FILLED set
  whatsapp:
    "M12 3a8.5 8.5 0 00-7.3 12.8L4 21l5.4-1.4A8.5 8.5 0 1012 3z",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0",
  users:
    "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M17 11a3.5 3.5 0 000-7M22 20a7 7 0 00-5-6.7",
  shield: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
  lock: "M6 10V8a6 6 0 0112 0v2M5 10h14a1 1 0 011 1v9a1 1 0 01-1 1H5a1 1 0 01-1-1v-9a1 1 0 011-1z",
  server: "M4 5h16v6H4zM4 13h16v6H4zM8 8h.01M8 16h.01",
  edit: "M4 20h4L18.5 9.5a2 2 0 00-3-3L5 17v3zM13.5 6.5l3 3",
  swap: "M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8",
  ban: "M5.6 5.6l12.8 12.8M12 3a9 9 0 100 18 9 9 0 000-18z",
  send: "M4 12l16-7-7 16-2-7-7-2z",
  note: "M6 4h12v16l-3-2-3 2-3-2-3 2zM9 9h6M9 13h6",
  doc: "M7 3h7l5 5v13H7zM14 3v5h5",
  sliders:
    "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
  sparkle:
    "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z",
  phone:
    "M5 4h3l1.5 4.5L7.5 10a12 12 0 005.5 5.5l1.5-2 4.5 1.5V18a2 2 0 01-2 2A15 15 0 015 6a2 2 0 012-2z",
  bell: "M12 4a5 5 0 00-5 5v3l-2 3h14l-2-3V9a5 5 0 00-5-5zM10 19a2 2 0 004 0",
  heart:
    "M12 20s-7-4.4-9.2-8.6C1.1 8 2.5 5 5.5 5c1.8 0 3.1 1.1 3.9 2.2C10.4 6.1 11.7 5 13.5 5c3 0 4.4 3 2.7 6.4C18 15.6 12 20 12 20z",
  trash:
    "M4 7h16M10 11v6M14 11v6M9 7V5a1 1 0 011-1h4a1 1 0 011 1v2M6 7l1 13a1 1 0 001 1h8a1 1 0 001-1l1-13",
  brain:
    "M9 4a2.5 2.5 0 00-2.5 2.5A2.5 2.5 0 005 9a2.5 2.5 0 00.5 4 2.5 2.5 0 002 3.5 2 2 0 002 2V4zM15 4a2.5 2.5 0 012.5 2.5A2.5 2.5 0 0119 9a2.5 2.5 0 01-.5 4 2.5 2.5 0 01-2 3.5 2 2 0 01-2 2V4z",
};

// Icons that use fill="currentColor" instead of stroke (from brand-site.js FILLED set).
const FILLED = new Set<IconName>(["whatsapp", "send", "sparkle"]);

// Fallback box for containers with no `<container> svg{width;height}` rule in brand-ds.css.
// Emitted as presentation attributes, which any CSS rule outranks, so the ~124 call sites
// that size their icons in CSS keep winning — this only stops an unsized SVG from
// stretching to fill its flex/grid parent.
const DEFAULT_SIZE = 24;

type BrandIconProps = {
  name: IconName;
  className?: string;
  /** Explicit width/height. Omit to let CSS size the icon (the usual case). */
  size?: number;
};

// Pure server component — no interactivity, no hydration cost.
export function BrandIcon({ name, className, size }: BrandIconProps) {
  const filled = FILLED.has(name);
  const box = size ?? DEFAULT_SIZE;

  return (
    <svg
      viewBox="0 0 24 24"
      width={box}
      height={box}
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
