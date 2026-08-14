"use client";

// RadioPillGroup — a stacked group of full-width radio options. Renders real
// <input type="radio"> elements (keyboard + screen reader friendly) styled as
// `.radio-pill--block` cards, so the WHOLE card is the click target rather than
// a small control sitting inside a decorative box.
//
// Shared across (site) routes — promoted out of cadastro/_components on
// 2026-08-02 when the Google Calendar mode selector became the second caller:
//   - /cadastro wizard intake questions (Q1 whatsapp usage, Q3 prior API,
//     Q4 Facebook Page)
//   - /configuracao Section 08, Google Calendar mode
// Both live under app/(site), whose layout imports brand-ds.css — that is where
// the .radio-pill/.radio-pill--block styles come from.

type RadioOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

type RadioPillGroupProps<T extends string> = {
  name: string;
  options: RadioOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  // Read-only rendering: inputs are really disabled (not just dimmed), so the
  // selection is still announced and readable but cannot be changed. Used by
  // the config page's `readOnly` state when the secretarIA hub is unreachable.
  disabled?: boolean;
};

export function RadioPillGroup<T extends string>({
  name,
  options,
  value,
  onChange,
  disabled,
}: RadioPillGroupProps<T>) {
  return (
    <div className="radio-row" style={{ flexDirection: "column" }} role="radiogroup">
      {options.map((opt) => {
        const checked = value === opt.value;
        return (
          <label
            key={opt.value}
            className={
              "radio-pill radio-pill--block" +
              (checked ? " on" : "") +
              (disabled ? " is-disabled" : "")
            }
          >
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={checked}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
            />
            <span className="radio-pill-check" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 12l5 5 9-11" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <span className="radio-pill-text">
              <span>{opt.label}</span>
              {opt.hint && <span className="radio-pill-hint">{opt.hint}</span>}
            </span>
          </label>
        );
      })}
    </div>
  );
}
