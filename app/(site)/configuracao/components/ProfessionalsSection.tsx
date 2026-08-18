"use client";
// ProfessionalsSection — Section 05 "Profissionais" (Feature C3). Every
// authenticated tenant member (owner OR staff) gets the full view: the
// selector for which professional Services/Availability edit below, that
// professional's specialty/about/context fields, the roster (completeness
// chips + per-row Calendar connect), and "Convidar profissional" — invites
// are no longer owner-gated client-side (the backend is the real authority,
// and is being relaxed to accept staff writes too). The self-bind prompt
// ("Você também atende pacientes?") stays owner-only: it exists to let the
// clinic OWNER become a treating professional too, which doesn't apply to
// staff who were already invited AS a professional. A staff member's own
// professional is preselected the first time the roster loads (see
// page.tsx's loadProfessionals), but nothing stops them from switching to a
// colleague afterwards.
//
// Google Calendar modes round (2026-08): the per-row Calendar action and the
// "Agenda" completeness chip now depend on the tenant's googleCalendarMode
// (see GoogleSection). In "shared_account" mode the row action creates a
// secondary calendar inside the CLINIC's Google account (idempotent POST)
// instead of starting a per-professional OAuth handoff — see
// handleCreateCalendar/ProfessionalRow below.

import { useCallback, useEffect, useState } from "react";
import { Avatar, Btn, Field, Icon, TextArea, TextInput } from "../../_shared/ui";
import type { IconName } from "../../_shared/ui";
import { Section } from "./Section";
import { InviteTeamMemberModal, type InviteKind } from "./InviteTeamMemberModal";
import {
  createSelfProfessional,
  getDoctorSecretaries,
  type DoctorProfessional,
  type DoctorSecretary,
  type Session,
} from "@/lib/manage-api";
import {
  createProfessionalCalendar,
  HubApiError,
  startProfessionalCalendarOauth,
  HUB_ERROR_CLINIC_CALENDAR_NOT_CONNECTED,
  HUB_ERROR_GOOGLE_RECONNECT_REQUIRED,
} from "@/lib/secretaria-hub";
import type { GoogleCalendarMode, ProfessionalProfile } from "../lib/types";

// A roster action failed (OAuth start, or shared-account calendar creation).
// `showGoogleCta` is set for the two structured calendar-creation errors
// (clinic not connected / needs reconnect) — both point the user at the same
// place, the GoogleSection card further down this same page.
type RosterActionError = { message: string; showGoogleCta: boolean };

type ProfessionalsSectionProps = {
  // null in demo/logged-out mode — every action below degrades to disabled
  // (with an explanatory title) rather than a broken/inert click, mirroring
  // GoogleSection's optional onConnect/onDisconnect pattern.
  session: Session | null;
  // Gates ONLY the self-bind prompt ("Você também atende pacientes?") — an
  // owner-specific action. Roster visibility and invite management are open
  // to any authenticated tenant member; see the header comment above.
  isOwner: boolean;
  roster: DoctorProfessional[] | null;
  rosterError: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  profile: ProfessionalProfile;
  onProfileChange: <K extends keyof ProfessionalProfile>(key: K, value: ProfessionalProfile[K]) => void;
  onRosterChanged: () => void;
  // Tenant-wide Google Calendar mode (see GoogleSection) — governs what the
  // row's Calendar action does and what the "Agenda" chip means.
  googleCalendarMode: GoogleCalendarMode;
  // gcal.connected from the parent page — whether the CLINIC has a Google
  // account connected. Only meaningful in "shared_account" mode, where the
  // row action is disabled until this is true.
  clinicCalendarConnected: boolean;
  // Keyed by professional id -> ProfessionalWire.google_calendar_id (hub
  // roster). null/absent = no dedicated calendar yet. Only meaningful in
  // "shared_account" mode.
  googleCalendarIdByProfessional: Record<string, string | null>;
  // True until the SELECTED professional's config has hydrated (see
  // lib/hydration.ts). Gates ONLY the three profile fields below — the roster
  // actions (invite, self-bind, calendar) each carry their own guards, and the
  // professional selector must stay live precisely so it can trigger the
  // hydration of the newly picked id.
  readOnly?: boolean;
};

export function ProfessionalsSection({
  session,
  isOwner,
  roster,
  rosterError,
  selectedId,
  onSelect,
  profile,
  onProfileChange,
  onRosterChanged,
  googleCalendarMode,
  clinicCalendarConnected,
  googleCalendarIdByProfessional,
  readOnly,
}: ProfessionalsSectionProps) {
  // null = closed; otherwise which flavour of invite the modal is showing.
  const [inviteKind, setInviteKind] = useState<InviteKind | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [creatingCalendarId, setCreatingCalendarId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<RosterActionError | null>(null);
  const [binding, setBinding] = useState(false);
  const [selfBindDismissed, setSelfBindDismissed] = useState(false);
  // Secretaries are fetched HERE rather than by the parent page (which owns the
  // professional roster): the list is purely local to brain-api — no secretaria
  // hub round-trip — so it does not need the page's `hubTokenReady` gate, and it
  // feeds none of the page's selected-professional state machine.
  const [secretaries, setSecretaries] = useState<DoctorSecretary[] | null>(null);

  const loadSecretaries = useCallback(() => {
    if (!session) return;
    getDoctorSecretaries(session)
      .then(setSecretaries)
      .catch((e) => {
        console.error("secretaria configuracao: failed to load secretaries", e);
        setSecretaries([]); // an empty list still renders the invite affordance
      });
  }, [session]);

  useEffect(loadSecretaries, [loadSecretaries]);

  // Scrolls to GoogleSection (Section 08, id="gcal") further down this same
  // page — the shared CTA target for both calendar-creation error codes.
  const scrollToGoogleSection = () => {
    document.getElementById("gcal")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Owner-with-no-professional detection: derived from the roster's linked
  // email (fresh immediately after self-bind) rather than session.professionalId
  // (which only updates on the NEXT token refresh/login).
  const ownerHasProfessional = (roster ?? []).some(
    (p) => p.linked_user_email?.toLowerCase() === session?.email.toLowerCase(),
  );
  // A secretary can never answer "sim, eu também atendo" — the backend refuses the
  // self-bind with 403 `secretary_cannot_be_professional`. Excluded explicitly so an
  // admin-created secretary that somehow carries is_owner never sees a dead button.
  const showSelfBindPrompt =
    isOwner && session?.role !== "secretary" && !ownerHasProfessional && !selfBindDismissed && !!roster;

  async function handleSelfBind() {
    if (!session) return;
    setBinding(true);
    try {
      await createSelfProfessional(session, {});
      onRosterChanged();
    } catch (e) {
      console.error("secretaria configuracao: failed to self-bind professional", e);
    } finally {
      setBinding(false);
    }
  }

  // per_professional mode: unchanged per-professional OAuth handoff.
  async function handleConnectCalendar(professionalId: string) {
    if (!session) return;
    setActionError(null);
    setConnectingId(professionalId);
    try {
      const url = await startProfessionalCalendarOauth(session, professionalId);
      window.location.assign(url);
      // Leave connectingId set — the browser is navigating away to Google.
    } catch (e) {
      console.error("secretaria configuracao: failed to start professional Calendar OAuth", e);
      setActionError({ message: "Não foi possível iniciar a conexão agora. Tente novamente.", showGoogleCta: false });
      setConnectingId(null);
    }
  }

  // shared_account mode: idempotent POST creates a dedicated calendar for
  // this professional inside the CLINIC's Google account. On the two
  // structured errors (clinic never connected / clinic token needs
  // reconnecting), surface the backend's own pt-BR message plus a CTA that
  // scrolls to GoogleSection — never a generic error for these two cases.
  async function handleCreateCalendar(professionalId: string) {
    if (!session) return;
    setActionError(null);
    setCreatingCalendarId(professionalId);
    try {
      await createProfessionalCalendar(session, professionalId);
      onRosterChanged(); // refetch roster + hub professionals -> google_calendar_id now set
    } catch (e) {
      console.error("secretaria configuracao: failed to create professional calendar", e);
      if (
        e instanceof HubApiError &&
        (e.code === HUB_ERROR_CLINIC_CALENDAR_NOT_CONNECTED || e.code === HUB_ERROR_GOOGLE_RECONNECT_REQUIRED)
      ) {
        setActionError({ message: e.message, showGoogleCta: true });
      } else {
        setActionError({ message: "Não foi possível criar a agenda agora. Tente novamente.", showGoogleCta: false });
      }
    } finally {
      setCreatingCalendarId(null);
    }
  }

  const selectedName = roster?.find((p) => p.id === selectedId)?.name ?? null;

  return (
    <Section
      id="prof"
      num="05"
      icon="users"
      title="Profissionais"
      desc="Cada profissional tem sua própria agenda, serviços e horários. Convide sua equipe e conecte a agenda de cada um."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {showSelfBindPrompt && (
          <div className="alert-line alert-line--amber" style={{ alignItems: "flex-start", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <span className="dot dot--amber" style={{ marginTop: 6 }} />
              <strong>Você também atende pacientes, ou só administra a clínica?</strong>
            </div>
            <div style={{ display: "flex", gap: 10, paddingLeft: 18 }}>
              <Btn variant="primary" size="sm" onClick={handleSelfBind} disabled={binding}>
                {binding ? "Um momento…" : "Sim, eu também atendo"}
              </Btn>
              <Btn variant="ghost" size="sm" onClick={() => setSelfBindDismissed(true)}>
                Não, só administro
              </Btn>
            </div>
          </div>
        )}

        {rosterError && (
          <p role="alert" style={{ fontSize: 13, color: "var(--danger, #c0392b)" }}>
            Não foi possível carregar a lista de profissionais agora.
          </p>
        )}

        {!roster && !rosterError && (
          <p style={{ fontSize: 13, color: "var(--ink-faint)" }}>Carregando profissionais…</p>
        )}

        {/* --- Professional selector chips (only when there's a real choice) --- */}
        {roster && roster.length > 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {roster.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 7,
                  padding: "7px 13px", borderRadius: 999,
                  fontSize: 13, fontWeight: 600,
                  color: p.id === selectedId ? "var(--brand-ink)" : "var(--ink-soft)",
                  background: p.id === selectedId ? "var(--brand-tint)" : "var(--surface-2)",
                  border: `1px solid ${p.id === selectedId ? "var(--brand)" : "var(--line)"}`,
                  cursor: "pointer",
                }}
              >
                <Avatar name={p.name} size={20} />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* --- Selected professional's profile fields --- */}
        {selectedId && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {selectedName && (
              <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-faint)", letterSpacing: ".02em" }}>
                EDITANDO: {selectedName.toUpperCase()}
              </span>
            )}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field
                label="Especialidade"
                tip="Ajuda o bot a entender o tipo de atendimento e a triar dúvidas comuns da especialidade."
              >
                <TextInput
                  value={profile.specialty}
                  onChange={(e) => onProfileChange("specialty", e.target.value)}
                  placeholder="Clínica geral, Cardiologia…"
                  disabled={readOnly}
                />
              </Field>
            </div>
            <Field
              label="Sobre o profissional (contexto para o bot)"
              tip="Esse texto ajuda a personalizar como a assistente fala sobre você. Se sua clínica tiver mais de um profissional, os pacientes também veem esse texto direto, assim que escolhem você na lista."
            >
              <TextArea
                value={profile.about}
                onChange={(e) => onProfileChange("about", e.target.value)}
                rows={3}
                placeholder="Ex.: Atende adultos e idosos há 12 anos, com foco em acompanhamento contínuo…"
                disabled={readOnly}
              />
            </Field>
            <Field
              label="Instruções específicas para esse profissional"
              tip="Regras adicionais que só valem para os pacientes desse profissional (ex.: preferências de horário, particularidades de atendimento)."
            >
              <TextArea
                value={profile.contextDoctorMessage}
                onChange={(e) => onProfileChange("contextDoctorMessage", e.target.value)}
                rows={2}
                placeholder="Opcional"
                disabled={readOnly}
              />
            </Field>
          </div>
        )}

        {/* --- Roster --- */}
        {roster && roster.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {actionError && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", margin: 0 }}>
                  {actionError.message}
                </p>
                {actionError.showGoogleCta && (
                  <Btn variant="outline" size="sm" onClick={scrollToGoogleSection}>
                    Ir para a conexão com o Google
                  </Btn>
                )}
              </div>
            )}
            {roster.map((p) => (
              <ProfessionalRow
                key={p.id}
                professional={p}
                selected={p.id === selectedId}
                onSelect={() => onSelect(p.id)}
                mode={googleCalendarMode}
                googleCalendarId={googleCalendarIdByProfessional[p.id] ?? null}
                clinicCalendarConnected={clinicCalendarConnected}
                onConnectCalendar={() => handleConnectCalendar(p.id)}
                onCreateCalendar={() => handleCreateCalendar(p.id)}
                connecting={connectingId === p.id}
                creatingCalendar={creatingCalendarId === p.id}
                canConnect={!!session}
              />
            ))}
          </div>
        )}

        {/* --- Secretaries (recepção) — no agenda, no clinical access --- */}
        {secretaries && secretaries.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-faint)", letterSpacing: ".02em" }}>
              SECRETÁRIAS (RECEPÇÃO)
            </span>
            {secretaries.map((s) => (
              <SecretaryRow key={s.user_id} secretary={s} />
            ))}
          </div>
        )}

        {/* Invite management is open to any authenticated tenant member —
            not owner-gated client-side (the backend is the real authority). */}
        {session && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignSelf: "flex-start" }}>
            <Btn variant="outline" icon="plus" onClick={() => setInviteKind("professional")}>
              Convidar profissional
            </Btn>
            <Btn variant="outline" icon="plus" onClick={() => setInviteKind("secretary")}>
              Convidar secretária
            </Btn>
          </div>
        )}
      </div>

      {session && inviteKind && (
        <InviteTeamMemberModal
          session={session}
          kind={inviteKind}
          open
          onClose={() => setInviteKind(null)}
          // A new professional changes the roster the parent owns; a new
          // secretary only changes this component's own list.
          onInvited={inviteKind === "secretary" ? loadSecretaries : onRosterChanged}
        />
      )}
    </Section>
  );
}

// SecretaryRow — one receptionist: name, email, and invite state. Deliberately
// leaner than ProfessionalRow: there is no calendar to connect, no services or
// hours to complete, and nothing to select (a secretary is never the subject of
// the Services/Availability editors above).
function SecretaryRow({ secretary }: { secretary: DoctorSecretary }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        padding: "13px 16px", borderRadius: 12,
        background: "var(--surface-2)", border: "1px solid var(--line)",
      }}
    >
      <Avatar name={secretary.name} size={34} />
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{secretary.name}</div>
        {secretary.invite_pending ? (
          <div style={{ fontSize: 11.5, color: "var(--st-pending-ink, #9a6b00)", marginTop: 4 }}>
            Convite enviado — aguardando aceite
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4 }}>{secretary.email}</div>
        )}
      </div>
      <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--ink-faint)" }}>
        Recepção — sem agenda própria
      </span>
    </div>
  );
}

// ProfessionalRow — one roster entry: name, completeness chips, invite/email
// status, and its own Calendar action — meaning depends on googleCalendarMode.
function ProfessionalRow({
  professional,
  selected,
  onSelect,
  mode,
  googleCalendarId,
  clinicCalendarConnected,
  onConnectCalendar,
  onCreateCalendar,
  connecting,
  creatingCalendar,
  canConnect,
}: {
  professional: DoctorProfessional;
  selected: boolean;
  onSelect: () => void;
  mode: GoogleCalendarMode;
  googleCalendarId: string | null;
  clinicCalendarConnected: boolean;
  onConnectCalendar: () => void;
  onCreateCalendar: () => void;
  connecting: boolean;
  creatingCalendar: boolean;
  canConnect: boolean;
}) {
  const sharedAccount = mode === "shared_account";
  // "Agenda" chip: per_professional keeps the existing has_calendar semantics
  // (own token OR clinic fallback); shared_account means a DEDICATED
  // secondary calendar exists — has_calendar would silently fall back to the
  // clinic's single calendar, which is not what this chip should promise here.
  const agendaOk = sharedAccount ? googleCalendarId != null : professional.has_calendar;

  return (
    <div
      onClick={onSelect}
      style={{
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap",
        padding: "13px 16px", borderRadius: 12,
        background: selected ? "var(--brand-tint)" : "var(--surface-2)",
        border: `1px solid ${selected ? "var(--brand)" : "var(--line)"}`,
        cursor: "pointer", transition: "all .14s var(--ease)",
      }}
    >
      <Avatar name={professional.name} size={34} />
      <div style={{ flex: 1, minWidth: 160 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{professional.name}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 4, flexWrap: "wrap" }}>
          <CompletenessChip label="Agenda" ok={agendaOk} />
          <CompletenessChip label="Serviços" ok={professional.has_services} />
          <CompletenessChip label="Horários" ok={professional.has_hours} />
        </div>
        {professional.invite_pending ? (
          <div style={{ fontSize: 11.5, color: "var(--st-pending-ink, #9a6b00)", marginTop: 4 }}>
            Convite enviado — aguardando aceite
          </div>
        ) : professional.linked_user_email ? (
          <div style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 4 }}>
            {professional.linked_user_email}
          </div>
        ) : (
          // No linked user, so no address anywhere: the email lives on the
          // brain-api user created by an invite, and this professional was
          // added without one. Said out loud because the consequence is
          // invisible otherwise — they silently never get the "nova consulta
          // marcada" email (secretarIA plugins/professional_notification.py).
          <div style={{ fontSize: 11.5, color: "var(--st-pending-ink, #9a6b00)", marginTop: 4 }}>
            Sem e-mail vinculado — não recebe aviso de nova consulta
          </div>
        )}
      </div>

      {sharedAccount ? (
        agendaOk ? (
          // Creation is idempotent — once google_calendar_id exists, show the
          // connected state instead of a "create again" button (there is
          // nothing left to do here).
          <span style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 13px", borderRadius: 999,
            fontSize: 12.5, fontWeight: 600,
            color: "var(--st-attend-ink, #1a7f4b)",
            background: "var(--st-attend-bg)", border: "1px solid var(--st-attend-bd)",
          }}>
            <Icon name="checkCircle" size={14} />
            Agenda criada
          </span>
        ) : (
          <Btn
            variant="outline"
            size="sm"
            icon="calendar"
            onClick={onCreateCalendar}
            disabled={creatingCalendar || !canConnect || !clinicCalendarConnected}
            title={
              !canConnect
                ? "Entre para criar a agenda"
                : !clinicCalendarConnected
                  ? "Conecte primeiro a conta do Google da clínica (mais abaixo, em Integração com o Google Calendar)"
                  : undefined
            }
          >
            {creatingCalendar ? "Criando…" : "Criar agenda do profissional"}
          </Btn>
        )
      ) : (
        <Btn
          variant="outline"
          size="sm"
          icon="calendar"
          // Also selects this row (via the card's own onClick, since this button
          // has no propagation guard) — harmless: connecting a professional's
          // calendar while also making them the selected one is sensible UX.
          onClick={onConnectCalendar}
          disabled={connecting || !canConnect}
          title={canConnect ? undefined : "Entre para conectar a agenda"}
        >
          {connecting ? "Conectando…" : professional.has_calendar ? "Reconectar agenda" : "Conectar Google Calendar"}
        </Btn>
      )}
    </div>
  );
}

// CompletenessChip — small ✓/✗ indicator reused for agenda/serviços/horários.
function CompletenessChip({ label, ok }: { label: string; ok: boolean }) {
  const icon: IconName = ok ? "checkCircle" : "xCircle";
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 4,
        fontSize: 11.5, fontWeight: 600,
        color: ok ? "var(--st-attend-ink, #1a7f4b)" : "var(--ink-faint)",
      }}
    >
      <Icon name={icon} size={13} />
      {label}
    </span>
  );
}
