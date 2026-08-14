"use client";

// PauseToggles — owner-only kill switches for the retry-nudge and
// config-reminder email crons (Feature 2, POST /doctor/onboarding/pause).
// `true` = paused. Each toggle saves independently and reports back through
// onChanged() so the page can refetch the authoritative state.

import { useState } from "react";
import { pauseOnboarding, type Session } from "@/lib/manage-api";

type PauseTogglesProps = {
  session: Session;
  retryPaused: boolean;
  configReminderPaused: boolean;
  onChanged: () => void;
};

export function PauseToggles({
  session,
  retryPaused,
  configReminderPaused,
  onChanged,
}: PauseTogglesProps) {
  const [saving, setSaving] = useState<"retries" | "config_reminders" | null>(null);

  async function toggle(key: "retries" | "config_reminders", next: boolean) {
    setSaving(key);
    try {
      await pauseOnboarding(session, { [key]: next });
      onChanged();
    } catch (e) {
      console.error("secretaria onboarding: failed to update pause toggle", e);
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="sub-block">
      <h2 className="sub-block-title">Lembretes por email</h2>
      <div className="onb-toggle-row">
        <span style={{ fontSize: 13.5, color: "var(--ink)" }}>
          Pausar lembretes de tentativa de conexão
        </span>
        <Switch
          on={retryPaused}
          disabled={saving === "retries"}
          onToggle={(next) => toggle("retries", next)}
        />
      </div>
      <div className="onb-toggle-row">
        <span style={{ fontSize: 13.5, color: "var(--ink)" }}>
          Pausar lembretes de configuração pendente
        </span>
        <Switch
          on={configReminderPaused}
          disabled={saving === "config_reminders"}
          onToggle={(next) => toggle("config_reminders", next)}
        />
      </div>
    </div>
  );
}

// Switch — small pill toggle local to this page (mirrors secretarIA's CToggle
// visually without reaching across route groups for a 15-line component).
function Switch({
  on,
  disabled,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  onToggle: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={() => onToggle(!on)}
      className={"onb-switch" + (on ? " on" : "")}
    >
      <span className="onb-switch-thumb" />
    </button>
  );
}
