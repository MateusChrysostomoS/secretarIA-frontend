"use client";
// CToggle — pill toggle switch component.
// Renders a 44×26px pill button that slides a white thumb left/right.
// Uses CSS transitions so the motion is smooth without JS animation.

type CToggleProps = {
  on: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
};

// Pill-style boolean toggle; calls onChange with the next boolean value.
export function CToggle({ on, onChange, disabled }: CToggleProps) {
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
