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
// Google Calendar modes: what a row shows depends on the tenant's
// googleCalendarMode (see GoogleSection), and the two modes now show DIFFERENT
// things rather than two flavours of the same button:
//
//   shared_account   — the clinic connects ONE Google account and saving the
//                      page creates a dedicated agenda for every professional
//                      inside it (page.tsx's ensureCalendars). There is nothing
//                      for a row to do, so the row carries no calendar action
//                      at all: the "Agenda" chip reports the result and the
//                      single connect lives in Section 08.
//   per_professional — each doctor connects their own account, so the row keeps
//                      the OAuth handoff. Once THEY have connected it, the
//                      button becomes a static "Conectado" state: there is
//                      nothing left to press, and offering "Reconectar" invited
//                      people to redo a working connection.
//
// "They have connected it" is `calendar_source === "professional"`, never
// `has_calendar` — the latter is equally true for a doctor merely covered by
// the clinic's fallback credential, and calling that "Conectado" would be a
// claim about an account they never linked.
//
// And every one of those flags only says a token is STORED. On 2026-09-12 a
// shared_account clinic whose token Google had revoked showed a healthy roster
// with nothing to press while no patient could book. The live status
// (GET /tenants/me/calendar/health) now reaches this section, and the whole
// per-row decision lives in lib/calendar-health.ts::professionalRowAgenda.

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
  startProfessionalCalendarOauth,
  type CalendarCredentialStatus,
  type ProfessionalCalendarSource,
} from "@/lib/secretaria-hub";
import { professionalRowAgenda, sharedAccountRosterNotice } from "../lib/calendar-health";
import type { GoogleCalendarMode, ProfessionalProfile } from "../lib/types";

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
  // Tenant-wide Google Calendar mode (see GoogleSection) — governs whether the
  // row carries a Calendar action at all, and what the "Agenda" chip means.
  googleCalendarMode: GoogleCalendarMode;
  // Keyed by professional id -> ProfessionalWire.google_calendar_id (hub
  // roster). null/absent = no dedicated calendar yet. Only meaningful in
  // "shared_account" mode, where it is what the "Agenda" chip reports.
  googleCalendarIdByProfessional: Record<string, string | null>;
  // Keyed by professional id -> whose Google credential covers them.
  // `undefined` = a backend that predates the field, i.e. "cannot tell" — the
  // row then falls back to the pre-existing has_calendar labels rather than
  // asserting a connection nobody confirmed.
  calendarSourceByProfessional: Record<string, ProfessionalCalendarSource | undefined>;
  // LIVE status of the clinic's own Google credential
  // (lib/calendar-health.ts::effectiveClinicStatus). The flags above only say a
  // token is STORED, and a token Google has revoked is still stored.
  // `undefined` = not checked / cannot tell, which keeps every row as it was.
  clinicCalendarStatus?: CalendarCredentialStatus;
  // Keyed by professional id -> LIVE status of THEIR OWN credential. Only the
  // ids the backend checked (per_professional mode, own token held); absent =
  // not checked, never "broken".
  ownCalendarStatusByProfessional: Record<string, CalendarCredentialStatus>;
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
  googleCalendarIdByProfessional,
  calendarSourceByProfessional,
  clinicCalendarStatus,
  ownCalendarStatusByProfessional,
  readOnly,
}: ProfessionalsSectionProps) {
  // null = closed; otherwise which flavour of invite the modal is showing.
  const [inviteKind, setInviteKind] = useState<InviteKind | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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

  // per_professional mode: the doctor's own OAuth handoff. The only calendar
  // action a row has left — shared_account creates every agenda on save
  // (page.tsx's ensureCalendars), so it needs no per-row button.
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
      setActionError("Não foi possível iniciar a conexão agora. Tente novamente.");
      setConnectingId(null);
    }
  }

  const selectedName = roster?.find((p) => p.id === selectedId)?.name ?? null;

  // shared_account: every agenda lives inside the clinic's Google account and
  // rows have no calendar action, so when THAT account is what blocks booking
  // the fix is named here, next to the doctors it blocks.
  const rosterNotice = sharedAccountRosterNotice({
    mode: googleCalendarMode,
    clinicStatus: clinicCalendarStatus,
  });
  const scrollToGoogleSection = () => {
    document.getElementById("gcal")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <Section
      id="prof"
      num="05"
      icon="users"
      title="Profissionais"
      desc={
        googleCalendarMode === "shared_account"
          ? "Cada profissional tem seus próprios serviços e horários, e uma agenda própria dentro da conta do Google da clínica. Convide sua equipe aqui."
          : "Cada profissional tem sua própria agenda, serviços e horários. Convide sua equipe e conecte a agenda de cada um."
      }
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
            {rosterNotice && (
              <div
                role={rosterNotice.tone === "error" ? "alert" : undefined}
                className={`alert-line ${rosterNotice.tone === "error" ? "alert-line--red" : "alert-line--amber"}`}
                style={{ alignItems: "flex-start", flexDirection: "column", gap: 8 }}
              >
                <span>{rosterNotice.message}</span>
                <Btn variant="outline" size="sm" icon="calendar" onClick={scrollToGoogleSection}>
                  Ir para o Google Calendar
                </Btn>
              </div>
            )}
            {actionError && (
              <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", margin: 0 }}>
                {actionError}
              </p>
            )}
            {roster.map((p) => (
              <ProfessionalRow
                key={p.id}
                professional={p}
                selected={p.id === selectedId}
                onSelect={() => onSelect(p.id)}
                mode={googleCalendarMode}
                googleCalendarId={googleCalendarIdByProfessional[p.id] ?? null}
                calendarSource={calendarSourceByProfessional[p.id]}
                clinicStatus={clinicCalendarStatus}
                ownStatus={ownCalendarStatusByProfessional[p.id]}
                onConnectCalendar={() => handleConnectCalendar(p.id)}
                connecting={connectingId === p.id}
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
// status, and — in per_professional mode only — its Calendar action.
function ProfessionalRow({
  professional,
  selected,
  onSelect,
  mode,
  googleCalendarId,
  calendarSource,
  clinicStatus,
  ownStatus,
  onConnectCalendar,
  connecting,
  canConnect,
}: {
  professional: DoctorProfessional;
  selected: boolean;
  onSelect: () => void;
  mode: GoogleCalendarMode;
  googleCalendarId: string | null;
  calendarSource: ProfessionalCalendarSource | undefined;
  clinicStatus: CalendarCredentialStatus | undefined;
  ownStatus: CalendarCredentialStatus | undefined;
  onConnectCalendar: () => void;
  connecting: boolean;
  canConnect: boolean;
}) {
  // Chip, explanation and action all come from ONE pure decision
  // (lib/calendar-health.ts), tested without a DOM. In short: shared_account is
  // green only while the clinic's account works AND this doctor's dedicated
  // agenda exists, and never has an action; per_professional shows "Conectado"
  // only for THIS doctor's own account (`calendar_source`, never `has_calendar`)
  // that Google has not refused.
  const agenda = professionalRowAgenda({
    mode,
    hasCalendar: professional.has_calendar,
    googleCalendarId,
    calendarSource,
    clinicStatus,
    ownStatus,
  });

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
          <CompletenessChip label="Agenda" ok={agenda.ok} />
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
          // added without one. Said out loud because the consequences are
          // invisible otherwise, and since FIX 34 there are TWO of them — both
          // secretarIA mails to a doctor resolve the address the same way, by
          // asking brain-api (services/brain_professionals.py), so a doctor
          // with no linked user silently gets neither: the "nova consulta
          // marcada" email (plugins/professional_notification.py) and the
          // config-gap alert (workers/tasks.py::
          // _handle_professional_config_incomplete). Name both, or the second
          // one is a surprise nobody can trace back to this row.
          <div style={{ fontSize: 11.5, color: "var(--st-pending-ink, #9a6b00)", marginTop: 4 }}>
            Sem e-mail vinculado — não recebe aviso de nova consulta nem de configuração pendente
          </div>
        )}
        {agenda.note && (
          <div
            style={{
              fontSize: 11.5, marginTop: 4,
              color:
                agenda.note.tone === "error"
                  ? "var(--st-miss-ink, #b42318)"
                  : "var(--st-pending-ink, #9a6b00)",
            }}
          >
            {agenda.note.message}
          </div>
        )}
      </div>

      {/* shared_account: no per-row action at all (agenda.action is "none").
          The clinic connects one account in Section 08 and saving creates every
          professional's agenda inside it, so a per-row button here was a
          second, confusable way to do a thing the row does not own. When that
          account is what blocks booking, the notice above the roster says so. */}
      {agenda.action.kind === "connected" && (
        // Nothing left to press: this doctor's own account is linked and Google
        // has not refused it. A "Reconectar agenda" button here read as an
        // outstanding task and invited people to redo a working connection.
        <span
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "7px 13px", borderRadius: 999,
            fontSize: 12.5, fontWeight: 600,
            color: "var(--st-attend-ink, #1a7f4b)",
            background: "var(--st-attend-bg)", border: "1px solid var(--st-attend-bd)",
          }}
        >
          <Icon name="checkCircle" size={14} />
          Conectado
        </span>
      )}
      {agenda.action.kind === "connect" && (
        <Btn
          variant="outline"
          size="sm"
          icon="calendar"
          // Also selects this row (via the card's own onClick, since this
          // button has no propagation guard) — harmless: connecting a
          // professional's calendar while also making them the selected one
          // is sensible UX.
          onClick={onConnectCalendar}
          disabled={connecting || !canConnect}
          title={canConnect ? undefined : "Entre para conectar a agenda"}
        >
          {connecting ? "Conectando…" : agenda.action.label}
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
