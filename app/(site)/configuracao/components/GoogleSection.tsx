"use client";
// GoogleSection — Section 08 "Integração com o Google Calendar".
// Shows the tenant-wide mode selector (per_professional vs. shared_account),
// then an OAuth connect card when disconnected, and a connected state card
// when gcal.connected is true.
// When `onConnect`/`onDisconnect` are provided (hubTokenReady in the parent page),
// they drive the real secretarIA hub OAuth handoff. When either is
// undefined, the corresponding action is genuinely unavailable — the button
// renders disabled with an explanatory hint, never a fabricated result.
//
// `connected` is the only field mirroring TenantConfigWire.calendar_connected.
// There is no account email, named-calendar list, or two-way-sync
// preference on the wire today, so none of that is rendered or editable
// here — inventing values for them would be exactly the kind of fake data
// on an authenticated surface this pass removes.
//
// Google Calendar modes: `mode` (google_calendar_mode) is a tenant-wide,
// non-destructive choice of HOW professionals get a Google Calendar. Read/write
// follows the exact same batched-save path as every other field on this page
// (see page.tsx's handleSave/buildConfigUpdatePayload) — the selector only
// updates local state; `onModeChange` is a plain setter, not its own save
// action.
//
// The mode also decides whether the CLINIC-level connect below is offered at
// all. In "per_professional" every doctor connects their own account in
// Section 05, so a second "Conectar com Google" here answered a question
// nobody in that mode is asking, and reading it as the thing to do left
// clinics with a tenant credential they never wanted. It is therefore hidden
// while that mode is selected — EXCEPT when a connection already exists, which
// is real state a clinic must still be able to see and undo.

import { useState } from "react";
import { Icon, Btn } from "../../_shared/ui";
import { RadioPillGroup } from "../../_components/RadioPillGroup";
import { Section } from "./Section";
import { GoogleGlyph } from "./GoogleGlyph";
import type { GcalState, GoogleCalendarMode } from "../lib/types";

type GoogleSectionProps = {
  // Read-only display state — `connected` is owned and updated by the parent
  // page (hydration on load, onDisconnect on success). `mode` is writable
  // (see onModeChange) but ALSO parent-owned state, same as every other form
  // field on this page — GoogleSection never mutates it directly.
  gcal: GcalState;
  // Real hub handoff (see lib/secretaria-hub.ts). undefined => genuinely
  // unavailable right now (not logged in, or the hub isn't reachable) — the
  // connect button renders disabled instead of simulating a result.
  onConnect?: () => Promise<void>;
  onDisconnect?: () => Promise<void>;
  // Shown next to the disabled connect button when onConnect is undefined,
  // so the parent can explain WHY (not logged in vs. hub temporarily
  // unreachable) instead of one generic message.
  connectHint?: string;
  // Local setter for gcal.mode — batched into the main "Salvar configuração"
  // PUT like every other field, not an immediate save (mirrors ToggleRow's
  // `set` pattern used by ContextSection/PixSection).
  onModeChange: (mode: GoogleCalendarMode) => void;
  // True when the secretarIA hub is unreachable right now — disables the
  // selector, same convention as every other section on this page.
  readOnly?: boolean;
};

// Section 08 — Google Calendar OAuth connect/disconnect + real connected status.
export function GoogleSection({
  gcal,
  onConnect,
  onDisconnect,
  connectHint = "Conecte-se após entrar na sua conta para ativar a integração.",
  onModeChange,
  readOnly,
}: GoogleSectionProps) {
  // Whether each doctor brings their own Google account (see the header note).
  const perProfessional = gcal.mode === "per_professional";

  // Scrolls to ProfessionalsSection (Section 05, id="prof") on this same page —
  // where the per-doctor connect actually lives.
  const scrollToProfessionals = () => {
    document.getElementById("prof")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Local loading state for the connect flow
  const [connecting, setConnecting] = useState(false);
  // Inline error shown when the real hub OAuth handoff fails
  const [oauthError, setOauthError] = useState<string | null>(null);

  const connect = async () => {
    if (!onConnect) return; // no real handoff available — button is disabled instead
    setOauthError(null);
    setConnecting(true);
    try {
      // On success this navigates the browser away to Google's consent
      // screen — the pending state below only matters on failure.
      await onConnect();
    } catch (e) {
      console.error("secretaria hub: failed to start Google OAuth", e);
      setOauthError("Não foi possível iniciar a conexão com o Google agora. Tente novamente.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = async () => {
    if (!onDisconnect) return; // connected card only renders with real data — see below
    setOauthError(null);
    try {
      await onDisconnect();
    } catch (e) {
      console.error("secretaria hub: failed to disconnect Google Calendar", e);
      setOauthError("Não foi possível desconectar agora. Tente novamente.");
    }
  };

  return (
    <Section
      id="gcal"
      num="08"
      icon="calendar"
      title="Integração com o Google Calendar"
      desc="Autorize o acesso para a secretarIA criar, mover e cancelar eventos na sua agenda do Google em tempo real — sem choque de horários."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* --- mode selector: how professionals get a Google Calendar ---
            Full-width radio cards (the /cadastro wizard's .radio-pill--block
            pattern), NOT a small pill inside a decorative box: this is a choice
            between two options, so each option must itself be the click target
            and carry its own explanation. Replaces the old Segmented control,
            whose surrounding rounded panel looked like the control but wasn't.
            Selection logic is untouched — still a local setter batched into the
            page's single "Salvar configuração" PUT. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--ink)" }}>
            Como as agendas do Google funcionam nesta clínica
          </span>
          <RadioPillGroup<GoogleCalendarMode>
            name="gcal_mode"
            value={gcal.mode}
            onChange={onModeChange}
            disabled={readOnly}
            options={[
              {
                value: "per_professional",
                label: "Por profissional",
                hint: "Cada profissional conecta a própria conta do Google e usa sua agenda pessoal para os atendimentos. É o comportamento padrão — nada muda se você não mexer aqui.",
              },
              {
                value: "shared_account",
                label: "Conta única da clínica",
                hint: "Só a clínica conecta uma conta do Google (abaixo) e a secretarIA cria automaticamente uma agenda própria para cada profissional dentro dela — cada uma com seu checkbox na lista lateral do Google Calendar.",
              },
            ]}
          />
          {/* Consequence that only matters once shared_account is picked, so it
              stays out of the option card and appears on selection. */}
          {gcal.mode === "shared_account" && (
            <p style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5, margin: 0 }}>
              Use uma conta institucional da clínica, não o Gmail pessoal de um funcionário: ela passa a ser dona das agendas de todos os profissionais.
            </p>
          )}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 7, fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.45 }}>
            <Icon name="checkCircle" size={13} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>Trocar de modo agora não desconecta nada — só muda o fluxo de conexão oferecido daqui pra frente.</span>
          </div>
        </div>

      {perProfessional && !gcal.connected ? (
        // --- per_professional, nothing connected: there is nothing to do HERE.
        // Point at the place that owns the action instead of offering a
        // clinic-wide connect that this mode never uses. ---
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 10,
          padding: "14px 16px", borderRadius: 12,
          background: "var(--surface-2)", border: "1px solid var(--line)",
          fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5,
        }}>
          <Icon name="user" size={16} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            Neste modo, cada profissional conecta a própria conta do Google — o botão fica na
            linha de cada um, em <b>Profissionais</b>. A clínica não precisa conectar nada aqui.{" "}
            <button
              type="button"
              onClick={scrollToProfessionals}
              style={{
                background: "none", border: "none", padding: 0,
                font: "inherit", fontWeight: 600, color: "var(--brand)",
                cursor: "pointer", textDecoration: "underline",
              }}
            >
              Ir para Profissionais
            </button>
          </span>
        </div>
      ) : !gcal.connected ? (
        // --- disconnected state ---
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* connect card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 16,
            padding: 20, borderRadius: 14,
            background: "var(--surface-2)", border: "1px solid var(--line)",
          }}>
            <span style={{
              width: 46, height: 46, borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--line-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <GoogleGlyph />
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
                Conta do Google não conectada
              </div>
              <div style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 2 }}>
                Conecte para sincronizar a agenda de atendimentos.
              </div>
              {/* shared_account mode: reinforce the institutional-account
                  recommendation right where the connect action happens. */}
              {gcal.mode === "shared_account" && (
                <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 6 }}>
                  Conecte a conta institucional da clínica — os profissionais ganham agendas próprias automaticamente.
                </div>
              )}
              {/* real "can't connect right now" state — never a fabricated success */}
              {!onConnect && (
                <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 6 }}>
                  {connectHint}
                </div>
              )}
            </div>
            <Btn
              variant="solidDark"
              icon="calendar"
              onClick={connect}
              disabled={connecting || !onConnect}
            >
              {connecting ? "Autorizando…" : "Conectar com Google"}
            </Btn>
          </div>

          {/* inline error — only surfaces when the real hub OAuth handoff fails */}
          {oauthError && (
            <p role="alert" style={{ fontSize: 12.5, color: "var(--st-miss-ink, #c0392b)", margin: 0 }}>
              {oauthError}
            </p>
          )}

          {/* OAuth privacy notice */}
          <div style={{
            display: "flex", alignItems: "flex-start", gap: 9,
            fontSize: 12.5, color: "var(--ink-faint)", lineHeight: 1.5,
          }}>
            <Icon name="ban" size={15} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              Usamos OAuth 2.0 do Google. A secretarIA recebe apenas permissão de leitura e escrita
              na agenda escolhida — nada além disso. Você pode revogar quando quiser.
            </span>
          </div>
        </div>
      ) : (
        // --- connected state — only `connected` is real, so only `connected` is shown ---
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          {/* connected account card */}
          <div style={{
            display: "flex", alignItems: "center", gap: 14,
            padding: 18, borderRadius: 14,
            background: "var(--st-attend-bg)", border: "1px solid var(--st-attend-bd)",
          }}>
            <span style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--surface)", border: "1px solid var(--line-strong)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <GoogleGlyph />
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--st-attend-ink)" }}>
                  Conectado
                </span>
                <Icon name="checkCircle" size={16} style={{ color: "var(--st-attend-ink)" }} />
              </div>
              {/* Kept visible in per_professional too: the connection is real
                  state. Said out loud, because in this mode it is only a
                  fallback for doctors who have not linked their own account. */}
              {perProfessional && (
                <div style={{ fontSize: 12.5, color: "var(--ink-soft)", marginTop: 3 }}>
                  Serve de reserva para quem ainda não conectou a própria conta.
                </div>
              )}
            </div>
            <Btn variant="outline" size="sm" onClick={disconnect} disabled={!onDisconnect}>
              Desconectar
            </Btn>
          </div>

          {/* inline error — only surfaces when the real hub disconnect fails */}
          {oauthError && (
            <p role="alert" style={{ fontSize: 12.5, color: "var(--st-miss-ink, #c0392b)", margin: 0 }}>
              {oauthError}
            </p>
          )}
        </div>
      )}
      </div>
    </Section>
  );
}
