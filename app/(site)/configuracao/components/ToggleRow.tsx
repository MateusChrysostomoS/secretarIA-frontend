"use client";
// ToggleRow — a labelled boolean toggle sitting on a bordered surface row.
// Used for on/off clinic preferences (e.g. convênio collection, two-way sync).
// Wrapping the CToggle in a <label> makes the whole row clickable and gives
// the switch its accessible name from the title/description text.

import { CToggle } from "./CToggle";

type ToggleRowProps = {
  on: boolean;
  onChange: (value: boolean) => void;
  title: string;
  desc?: string;
  disabled?: boolean;
};

// Renders a toggle + title/description block inside a tappable label row.
export function ToggleRow({ on, onChange, title, desc, disabled }: ToggleRowProps) {
  return (
    <label style={{
      display: "flex", alignItems: "center", gap: 12,
      padding: "12px 14px", borderRadius: 12,
      background: "var(--surface-2)", border: "1px solid var(--line)",
      cursor: disabled ? "not-allowed" : "pointer",
    }}>
      <CToggle on={on} onChange={onChange} disabled={disabled} />
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
          {title}
        </div>
        {desc && (
          <div style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: 2, lineHeight: 1.45 }}>
            {desc}
          </div>
        )}
      </div>
    </label>
  );
}
