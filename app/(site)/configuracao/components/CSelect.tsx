"use client";
// CSelect — styled native <select> with chevron icon overlay.
// Wraps the inputStyle baseline and highlights the border on focus,
// matching the TextInput focus-ring behaviour used elsewhere in this form.

import { useState } from "react";
import type { CSSProperties, ReactNode, ChangeEvent } from "react";
import { Icon, inputStyle } from "../../_shared/ui";

type CSelectProps = {
  value: string | number;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  style?: CSSProperties;
  disabled?: boolean;
};

// Wraps a native select with the shared inputStyle and a chevron indicator.
export function CSelect({ value, onChange, children, style, disabled }: CSelectProps) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={disabled}
        style={{
          ...inputStyle,
          appearance: "none",
          paddingRight: 34,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.6 : 1,
          borderColor: focused ? "var(--brand)" : "var(--line-strong)",
          ...style,
        }}
      >
        {children}
      </select>
      {/* chevron overlay — pointer-events:none so it doesn't block the select */}
      <span style={{
        position: "absolute",
        right: 12,
        top: "50%",
        transform: "translateY(-50%)",
        pointerEvents: "none",
        color: "var(--ink-faint)",
      }}>
        <Icon name="chevD" size={16} />
      </span>
    </div>
  );
}
