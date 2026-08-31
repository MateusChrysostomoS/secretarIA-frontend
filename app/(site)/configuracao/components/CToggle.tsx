"use client";
// CToggle — pill toggle switch component.
// Renders a 44×26px pill button that slides a white thumb left/right.
// Uses CSS transitions so the motion is smooth without JS animation.
//
// The thumb is a decorative <span>, so this <button role="switch"> has no
// text of its own to be named from. A wrapping <label> is not a fix either:
// it does name the button, but with the label's ENTIRE text content (title
// plus description run together), which is what a screen reader then reads
// out. Hence `label` is required, not optional — every call site must say,
// in a few words, what this switch turns on.

type CToggleProps = {
  on: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  /** Accessible name. Required: the thumb is decorative, so without this the
      switch has no name at all (or an unusably long one from a wrapping label). */
  label: string;
};

// Pill-style boolean toggle; calls onChange with the next boolean value.
export function CToggle({ on, onChange, disabled, label }: CToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      disabled={disabled}
      style={{
        width: 44,
        height: 26,
        borderRadius: 99,
        padding: 3,
        flexShrink: 0,
        transition: "background .2s var(--ease)",
        background: on ? "var(--brand)" : "var(--line-strong)",
        display: "flex",
        justifyContent: on ? "flex-end" : "flex-start",
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
      aria-checked={on}
      role="switch"
      aria-label={label}
    >
      {/* white thumb — slides via justify-content on parent */}
      <span style={{
        width: 20,
        height: 20,
        borderRadius: 99,
        background: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,.25)",
        transition: "all .2s var(--ease)",
      }} />
    </button>
  );
}
