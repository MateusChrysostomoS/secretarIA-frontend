"use client";
// ===== secretarIA — UI primitives =====
// Ported from _design-source/ui.jsx — ES module with explicit TypeScript types.
// All inline styles use var(--token) refs; no CSS imports needed here.

import { useState } from "react";
import type { CSSProperties, ReactNode, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { STATUS_META, firstLetter } from "./data";
import type { ApptStatus } from "./data";

// ---------------------------------------------------------------------------
// Icon paths (line icons, 24×24 viewBox)
// ---------------------------------------------------------------------------

const ICONS = {
  plus:         "M12 5v14M5 12h14",
  chevL:        "M15 18l-6-6 6-6",
  chevR:        "M9 18l6-6-6-6",
  chevD:        "M6 9l6 6 6-6",
  x:            "M18 6L6 18M6 6l12 12",
  moon:         "M21 12.8A9 9 0 1111.2 3a7 7 0 109.8 9.8z",
  sun:          "M12 3v2M12 19v2M5 5l1.5 1.5M17.5 17.5L19 19M3 12h2M19 12h2M5 19l1.5-1.5M17.5 6.5L19 5M12 8a4 4 0 100 8 4 4 0 000-8z",
  clock:        "M12 7v5l3 2M12 3a9 9 0 100 18 9 9 0 000-18z",
  phone:        "M5 4h3l1.5 4.5L7.5 10a12 12 0 005.5 5.5l1.5-2 4.5 1.5V18a2 2 0 01-2 2A15 15 0 015 6a2 2 0 012-2z",
  user:         "M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0",
  users:        "M9 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM2 20a7 7 0 0114 0M17 11a3.5 3.5 0 000-7M22 20a7 7 0 00-5-6.7",
  check:        "M5 12l5 5 9-11",
  checkCircle:  "M9 12l2 2 4-4M12 3a9 9 0 100 18 9 9 0 000-18z",
  xCircle:      "M15 9l-6 6M9 9l6 6M12 3a9 9 0 100 18 9 9 0 000-18z",
  calendar:     "M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z",
  ban:          "M5.6 5.6l12.8 12.8M12 3a9 9 0 100 18 9 9 0 000-18z",
  edit:         "M4 20h4L18.5 9.5a2 2 0 00-3-3L5 17v3zM13.5 6.5l3 3",
  swap:         "M7 4L3 8l4 4M3 8h13M17 20l4-4-4-4M21 16H8",
  send:         "M4 12l16-7-7 16-2-7-7-2z",
  whatsapp:     "M12 3a8.5 8.5 0 00-7.3 12.8L4 21l5.4-1.4A8.5 8.5 0 1012 3z",
  doc:          "M7 3h7l5 5v13H7zM14 3v5h5",
  note:         "M6 4h12v16l-3-2-3 2-3-2-3 2zM9 9h6M9 13h6",
  search:       "M11 4a7 7 0 105 12 7 7 0 00-5-12zM21 21l-4.5-4.5",
  bell:         "M12 4a5 5 0 00-5 5v3l-2 3h14l-2-3V9a5 5 0 00-5-5zM10 19a2 2 0 004 0",
  filter:       "M4 5h16l-6 8v6l-4-2v-4z",
  dot:          "M12 12m-1 0a1 1 0 102 0 1 1 0 10-2 0",
} as const;

/** Union of all valid icon name keys. */
export type IconName = keyof typeof ICONS;

// Re-export so data.ts can reference it without creating a circular dep —
// callers import IconName from here, not from data.ts.
export type { ApptStatus };

// ---------------------------------------------------------------------------
// Icon
// ---------------------------------------------------------------------------

/** Renders a single SVG line-icon from the ICONS map. */
export function Icon({
  name,
  size = 18,
  sw = 1.7,
  style,
}: {
  name: IconName;
  size?: number;
  sw?: number;
  style?: CSSProperties;
}) {
  // A few icons use filled rendering instead of stroke
  const filled = name === "whatsapp" || name === "send" || name === "dot";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0, ...style }}
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Btn
// ---------------------------------------------------------------------------

type BtnVariant = "primary" | "solidDark" | "outline" | "ghost" | "danger" | "wa";
type BtnSize    = "sm" | "md" | "lg";

/** Multi-variant button with hover state and optional leading/trailing icon. */
export function Btn({
  children,
  variant = "ghost",
  size = "md",
  icon,
  iconR,
  onClick,
  disabled,
  style,
  title,
}: {
  children?: ReactNode;
  variant?: BtnVariant;
  size?: BtnSize;
  icon?: IconName;
  iconR?: IconName;
  onClick?: () => void;
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
}) {
  const [hov, setHov] = useState(false);

  const pad  = size === "sm" ? "7px 12px" : size === "lg" ? "13px 22px" : "9px 16px";
  const fs   = size === "sm" ? 13 : size === "lg" ? 15.5 : 14;

  const base: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    padding: pad, fontSize: fs, fontWeight: 600, borderRadius: 999, letterSpacing: ".005em",
    transition: "all .18s var(--ease)", whiteSpace: "nowrap", lineHeight: 1,
    opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto",
    cursor: "pointer", border: "none",
  };

  const variantStyles: Record<BtnVariant, CSSProperties> = {
    primary:   { background: hov ? "var(--brand-strong)" : "var(--brand)", color: "#fff", boxShadow: "var(--shadow-sm)" },
    solidDark: { background: hov ? "#0c4a43" : "#0e564d", color: "#fff" },
    outline:   { background: hov ? "var(--surface-2)" : "var(--surface)", color: "var(--ink)", border: "1px solid var(--line-strong)" },
    ghost:     { background: hov ? "var(--surface-2)" : "transparent", color: "var(--ink-soft)" },
    danger:    { background: hov ? "var(--st-miss-bg)" : "transparent", color: "var(--st-miss-ink)", border: "1px solid var(--st-miss-bd)" },
    wa:        { background: hov ? "#1f9d57" : "#25a35f", color: "#fff", boxShadow: "var(--shadow-sm)" },
  };

  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ ...base, ...variantStyles[variant], ...style }}
    >
      {icon  && <Icon name={icon}  size={fs + 2} />}
      {children}
      {iconR && <Icon name={iconR} size={fs + 2} />}
    </button>
  );
}

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

/** Pill badge that renders the status label with its design-token color set. */
export function StatusBadge({
  status,
  size = "md",
}: {
  status: ApptStatus;
  size?: "sm" | "md";
}) {
  const meta = STATUS_META[status] ?? STATUS_META.agendado;
  const t    = meta.tone;
  const fs   = size === "sm" ? 11.5 : 12.5;

  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: size === "sm" ? "3px 9px" : "4px 11px",
      background: `var(--st-${t}-bg)`,
      color:      `var(--st-${t}-ink)`,
      border:     `1px solid var(--st-${t}-bd)`,
      borderRadius: 999, fontSize: fs, fontWeight: 600, lineHeight: 1, whiteSpace: "nowrap",
    }}>
      {/* dot indicator */}
      <span style={{ width: 6, height: 6, borderRadius: 99, background: `var(--st-${t}-ink)` }} />
      {meta.label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Segmented
// ---------------------------------------------------------------------------

/** Pill-shaped segmented control for switching between labelled options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = "md",
  disabled,
}: {
  options: { value: T; label: string; icon?: IconName }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  return (
    <div style={{
      display: "inline-flex", gap: 3, padding: 4,
      background: "var(--surface-2)", borderRadius: 999, border: "1px solid var(--line)",
      opacity: disabled ? 0.6 : 1,
    }}>
      {options.map(o => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            disabled={disabled}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: size === "sm" ? "6px 13px" : "8px 17px", borderRadius: 999,
              fontSize: size === "sm" ? 13 : 14, fontWeight: 600, lineHeight: 1,
              color:      active ? "#fff" : "var(--ink-soft)",
              background: active ? "var(--brand)" : "transparent",
              boxShadow:  active ? "var(--shadow-sm)" : "none",
              transition: "all .18s var(--ease)", cursor: disabled ? "not-allowed" : "pointer",
              border: "none",
            }}
          >
            {o.icon && <Icon name={o.icon} size={15} />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Avatar
// ---------------------------------------------------------------------------

/** Circular initial-letter avatar; color defaults to brand tint. */
export function Avatar({
  name,
  size = 34,
  color,
}: {
  name?: string;
  size?: number;
  color?: string;
}) {
  return (
    <span style={{
      width: size, height: size, borderRadius: 99, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
      background: color ?? "var(--brand-tint)",
      color:      color ? "#fff" : "var(--brand-ink)",
      fontWeight: 700, fontSize: size * 0.42, fontFamily: "var(--font-sans)",
      border: "1px solid var(--line)",
    }}>
      {firstLetter(name)}
    </span>
  );
}

// ---------------------------------------------------------------------------
// IconBtn
// ---------------------------------------------------------------------------

/** Small square icon-only button (38×38) — used for theme toggle, close, etc. */
export function IconBtn({
  icon,
  onClick,
  title,
  active,
}: {
  icon: IconName;
  onClick?: () => void;
  title?: string;
  active?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 38, height: 38, borderRadius: 12, cursor: "pointer",
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        background: active || hov ? "var(--surface-2)" : "var(--surface)",
        border: "1px solid var(--line-strong)",
        color: "var(--ink-soft)", transition: "all .18s var(--ease)",
      }}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}

// ---------------------------------------------------------------------------
// HelpTip
// ---------------------------------------------------------------------------

/** "?" button that reveals a tooltip on hover/click — used inside Field labels. */
export function HelpTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      style={{ position: "relative", display: "inline-flex" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label="Ajuda"
        style={{
          width: 17, height: 17, borderRadius: 99, flexShrink: 0, cursor: "pointer",
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, lineHeight: 1, fontFamily: "var(--font-sans)",
          background: open ? "var(--brand)"      : "var(--surface-2)",
          color:      open ? "#fff"               : "var(--ink-faint)",
          border:     `1px solid ${open ? "var(--brand)" : "var(--line-strong)"}`,
          transition: "all .15s var(--ease)",
        }}
      >?</button>

      {open && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)", width: 232, zIndex: 40,
          padding: "10px 12px", borderRadius: 11,
          background: "var(--ink)", color: "var(--page)",
          fontSize: 12.5, fontWeight: 500, lineHeight: 1.45,
          boxShadow: "var(--shadow-lg)", animation: "tipIn .15s var(--ease)",
          textAlign: "left", pointerEvents: "none",
        }}>
          {text}
          {/* arrow caret pointing down toward the trigger */}
          <span style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "6px solid transparent",
            borderRight: "6px solid transparent",
            borderTop: "6px solid var(--ink)",
          }} />
        </span>
      )}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------

/** Form field wrapper: label row (with optional HelpTip) + children + hint text. */
export function Field({
  label,
  children,
  hint,
  tip,
}: {
  label: ReactNode;
  children: ReactNode;
  hint?: string;
  tip?: string;
}) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{
        display: "flex", alignItems: "center", gap: 7,
        fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", letterSpacing: ".01em",
      }}>
        {label}
        {tip && <HelpTip text={tip} />}
      </span>
      {children}
      {hint && (
        <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>{hint}</span>
      )}
    </label>
  );
}

// ---------------------------------------------------------------------------
// Shared input style — exported so consuming components (e.g. Select in modals)
// can compose it without re-declaring.
// ---------------------------------------------------------------------------

export const inputStyle: CSSProperties = {
  width: "100%", padding: "11px 13px", borderRadius: 10, fontSize: 14.5,
  background: "var(--surface-inset)", border: "1px solid var(--line-strong)",
  color: "var(--ink)", outline: "none", transition: "border-color .15s",
};

// ---------------------------------------------------------------------------
// TextInput
// ---------------------------------------------------------------------------

/** Single-line text input that highlights its border on focus. */
export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const [foc, setFoc] = useState(false);
  return (
    <input
      {...props}
      onFocus={e => { setFoc(true);  props.onFocus?.(e); }}
      onBlur={e  => { setFoc(false); props.onBlur?.(e);  }}
      style={{
        ...inputStyle,
        borderColor: foc ? "var(--brand)" : "var(--line-strong)",
        ...props.style,
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// TextArea
// ---------------------------------------------------------------------------

/** Multi-line textarea — same focus ring behaviour as TextInput. */
export function TextArea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const [foc, setFoc] = useState(false);
  return (
    <textarea
      {...props}
      // .scroll class activates the custom thin scrollbar from product-tokens.css
      className={["scroll", props.className].filter(Boolean).join(" ")}
      onFocus={e => { setFoc(true);  props.onFocus?.(e); }}
      onBlur={e  => { setFoc(false); props.onBlur?.(e);  }}
      style={{
        ...inputStyle,
        resize: "vertical", lineHeight: 1.55,
        borderColor: foc ? "var(--brand)" : "var(--line-strong)",
        ...props.style,
      }}
    />
  );
}
