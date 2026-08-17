"use client";
// LoadStateNotice — the banner for the state HubNotice cannot describe: the
// hub token minted fine, the base URL is configured, and a configuration GET
// still failed (or is still in flight).
//
// This is the visible half of the fail-closed rule in lib/hydration.ts. When a
// source is `error`, the form below is held read-only and Save is refused, so
// the screen MUST say why — a silently blank, silently frozen form is exactly
// the "looks broken, might be lying" state this round exists to remove.
//
// It reports which scope failed and offers a retry that re-runs the load in
// place, with no full page reload. It never prints a status code, an id, or
// anything from the response body: the HTTP status goes to the sanitized
// `config_load_failed` event instead.

import type { CSSProperties } from "react";
import { Btn, Icon } from "../../_shared/ui";
import { hasLoadError, isHydrating, type HydrationState } from "../lib/hydration";

type LoadStateNoticeProps = {
  state: HydrationState;
  /** Re-runs the tenant + roster load. Read-only; safe to press repeatedly. */
  onRetry: () => void;
};

const baseStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 9,
  margin: "0 28px 16px",
  padding: "10px 14px",
  borderRadius: 11,
  fontSize: 13,
  lineHeight: 1.5,
};

// Same tokens as HubNotice's transient-warning look, so the two banners read
// as one visual language rather than two unrelated alarms.
const warnStyle: CSSProperties = {
  ...baseStyle,
  background: "var(--st-pending-bg, #fff6e5)",
  border: "1px solid var(--st-pending-bd, #f2d98a)",
  color: "var(--st-pending-ink, #9a6b00)",
};

const infoStyle: CSSProperties = {
  ...baseStyle,
  background: "var(--surface-2)",
  border: "1px solid var(--line)",
  color: "var(--ink-soft)",
};

/** Names the failed scope in the user's terms — never in wire terms. */
function failureMessage(state: HydrationState): string {
  const failed: string[] = [];
  if (state.tenant.phase === "error") failed.push("as configurações da clínica");
  if (state.roster.phase === "error") failed.push("a lista de profissionais");
  if (state.professional.phase === "error") failed.push("os dados do profissional selecionado");

  const what = failed.length > 0 ? failed.join(" e ") : "sua configuração";
  return (
    `Não foi possível carregar ${what}. ` +
    "Os campos ficam bloqueados até o carregamento funcionar, para não gravar nada por engano."
  );
}

export function LoadStateNotice({ state, onRetry }: LoadStateNoticeProps) {
  // Only an authenticated session has anything to load; a visitor is looking
  // at the labeled demo and HubNotice already says so.
  if (state.mode !== "authenticated") return null;

  if (hasLoadError(state)) {
    return (
      <div style={warnStyle} role="alert">
        <Icon name="ban" size={15} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>{failureMessage(state)}</span>
        <Btn variant="outline" size="sm" onClick={onRetry} style={{ flexShrink: 0 }}>
          Tentar novamente
        </Btn>
      </div>
    );
  }

  if (isHydrating(state)) {
    return (
      <div style={infoStyle} role="status" aria-live="polite">
        <Icon name="clock" size={15} style={{ flexShrink: 0 }} />
        <span>Carregando a configuração da sua clínica…</span>
      </div>
    );
  }

  return null;
}
