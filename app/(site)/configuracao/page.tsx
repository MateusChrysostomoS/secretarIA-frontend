"use client";
// Configuração page — the full-viewport secretarIA chatbot configuration screen.
// Owns all form state (ctx, messages, postConsult, pixDeposit, professionals,
// services, days, prefs, gcal) and the scrollspy logic. Composed of SideNav +
// eight Section components; a sticky save bar sits at the bottom. Theme is
// initialised from the existing [data-theme] attribute after mount to avoid
// an SSR hydration mismatch.
//
// Onboarding & Multi-Professional pass: added Mensagens + Profissionais
// sections; Services/Availability now edit the SELECTED professional instead
// of a single tenant-wide list; Context dropped specialty/about (now
// per-professional) and gained real address/insurances/collect_insurance.
// Every authenticated tenant member (owner or not) gets full read/write
// access — a non-owner session's own professional is just preselected in
// ProfessionalsSection (see loadProfessionals), it isn't locked read-only.
//
// Demo-data honesty: the initial state below seeds sales-demo values (used
// ONLY as a pre-hydration placeholder / logged-out showcase). Once a session
// exists, that placeholder is either replaced by real hydrated data
// (hubReady) or explicitly cleared to an honest empty state (hub
// unreachable/not configured) — see the `hubUnreachable` effect below. It is
// never left showing fake data to a logged-in tenant.

import "../product-tokens.css";
import "../app-shell.css";

import { useState, useEffect, useRef, useCallback } from "react";
import type { MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { Icon, Btn } from "../_shared/ui";
import { HubNotice } from "../_shared/HubNotice";
import { OnboardingBanner } from "../_components/OnboardingBanner";
import { PortalHeader } from "../_components/PortalHeader";
import { SecretariaWordmark } from "../_components/SecretariaWordmark";
import { signOut } from "@/lib/sign-out";
import { useSecretariaHub } from "../_shared/useSecretariaHub";
import { CLINIC } from "../_shared/data";

import { SideNav } from "./components/SideNav";
import { CToast } from "./components/CToast";
import { ContextSection } from "./components/ContextSection";
import { MessagesSection } from "./components/MessagesSection";
import { PostConsultSection } from "./components/PostConsultSection";
import { PixSection } from "./components/PixSection";
import { ProfessionalsSection } from "./components/ProfessionalsSection";
import { ServicesSection } from "./components/ServicesSection";
import { AvailabilitySection } from "./components/AvailabilitySection";
import { GoogleSection } from "./components/GoogleSection";

import {
  DEFAULT_PIX_DEPOSIT,
  EMPTY_PROFESSIONAL_PROFILE,
  type ClinicCtx,
  type DayConfig,
  type GcalState,
  type Messages,
  type PixDeposit,
  type PostConsult,
  type Prefs,
  type ProfessionalProfile,
  type Service,
} from "./lib/types";
import {
  applyWireAddress,
  applyWireAppointmentTypes,
  applyWireBusinessHours,
  applyWireGcal,
  applyWireInsurances,
  applyWireMessages,
  applyWirePixDeposit,
  applyWirePostConsult,
  applyWireProfessionalProfile,
  buildConfigUpdatePayload,
  buildProfessionalConfigPayload,
} from "./lib/hub-mapping";
import {
  disconnectCalendar,
  getProfessionals,
  getTenantConfig,
  startCalendarOauth,
  updateProfessionalConfig,
  updateTenantConfig,
  type ProfessionalWire,
  type TenantConfigWire,
} from "@/lib/secretaria-hub";
import { getDoctorProfessionals, type DoctorProfessional } from "@/lib/manage-api";

// ---------------------------------------------------------------------------
// Weekday seed — used to initialise/reset the days state
// ---------------------------------------------------------------------------

// [key, label] pairs in ISO week order (Mon → Sun)
const WD: [string, string][] = [
  ["seg", "Segunda"],
  ["ter", "Terça"],
  ["qua", "Quarta"],
  ["qui", "Quinta"],
  ["sex", "Sexta"],
  ["sab", "Sábado"],
  ["dom", "Domingo"],
];

// A fully-closed week — the base every professional's hydration starts from,
// so switching between professionals never leaks one professional's ranges
// onto another's blank days (see the per-professional hydration effect below).
function closedWeek(): DayConfig[] {
  return WD.map(([key, label]) => ({ key, label, on: false, ranges: [] }));
}

// Rich demo seed — used only for the logged-out/not-entitled showcase and as
// the pre-hydration placeholder, so the page never looks empty before data loads.
function demoWeek(): DayConfig[] {
  return WD.map(([key, label], i) => ({
    key,
    label,
    on: i < 5, // Mon–Fri open by default
    ranges:
      i < 5
        ? [{ start: 8 * 60, end: 12 * 60 }, { start: 14 * 60, end: 18 * 60 }]
        : [{ start: 9 * 60, end: 12 * 60 }],
  }));
}

// Single demo roster row shown before real professionals load (keeps the new
// Profissionais section from looking stuck-loading in demo/logged-out mode).
const DEMO_PROFESSIONAL_ID = "demo";
const DEMO_ROSTER: DoctorProfessional[] = [
  {
    id: DEMO_PROFESSIONAL_ID,
    name: CLINIC.name,
    is_active: true,
    has_calendar: false,
    has_hours: true,
    has_services: true,
    complete: false,
    linked_user_email: null,
    invite_pending: false,
  },
];

// SideNav section ids — used for scrollspy
const NAV_IDS = ["ctx", "msg", "pos", "pix", "prof", "srv", "disp", "gcal"] as const;
type NavId = (typeof NAV_IDS)[number];

// ---------------------------------------------------------------------------
// ConfiguracaoPage — default export
// ---------------------------------------------------------------------------

/**
 * ConfiguracaoPage — the full-viewport secretarIA Configuração screen.
 * Port of ConfigApp from _design-source/config.jsx.
 */
export default function ConfiguracaoPage() {
  const router = useRouter();

  // --- scrollspy & jump ---
  const scrollRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState<NavId>("ctx");

  // Smooth-scrolls the scroll container to the target section element
  const jump = useCallback((id: string) => {
    const el = document.getElementById(id);
    const sc = (scrollRef as MutableRefObject<HTMLDivElement | null>).current;
    if (el && sc) sc.scrollTo({ top: el.offsetTop - 16, behavior: "smooth" });
  }, []);

  // Determines which section is in view by comparing offsetTop to scrollTop + 120
  const onScroll = useCallback(() => {
    const sc = scrollRef.current;
    if (!sc) return;
    const pos = sc.scrollTop + 120;
    let cur: NavId = NAV_IDS[0];
    for (const id of NAV_IDS) {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= pos) cur = id;
    }
    setActive(cur);
  }, []);

  // --- toast ---
  // `kind` drives CToast's visual style — "error" must never look like a
  // success (see handleSave: no fake success states).
  const [toast, setToast] = useState<{ message: string; kind: "success" | "error" } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = (message: string, kind: "success" | "error" = "success") => {
    setToast({ message, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    // Auto-dismiss after 3 s, matching the source behaviour
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  };

  // --- Section 01: clinic context ---
  // clinicName is hub-backed (read-only hydrate from TenantConfigRead; never
  // sent on save). address/insurances/collectInsurance are REAL wire fields.
  // phone stays demo-only — secretarIA still has no clinic-phone wire field.
  const [ctx, setCtx] = useState<ClinicCtx>({
    clinicName: "Consultório Dr. Aurélio Lima",
    addressLine: "",
    addressComplement: "",
    neighborhood: "",
    city: "",
    state: "",
    postalCode: "",
    phone: "+55 11 3000-0000",
    insurances: "Unimed, Bradesco Saúde, SulAmérica",
    collectInsurance: true,
  });
  // Generic setter — preserves each key's value type (string or boolean).
  const setCtxK = <K extends keyof ClinicCtx>(key: K, value: ClinicCtx[K]) =>
    setCtx(prev => ({ ...prev, [key]: value }));

  // --- Section 02: messages (greeting/persona copy) — REAL wire fields, first UI ---
  const [messages, setMessages] = useState<Messages>({
    greetingMessage: "",
    returningGreetingMessage: "",
    language: "pt-BR",
  });
  const setMessagesK = <K extends keyof Messages>(key: K, value: Messages[K]) =>
    setMessages(prev => ({ ...prev, [key]: value }));

  // --- Section 03: post-consult (message sent + knowledge used to answer
  // questions) — REAL wire fields (post_consult_message/post_consult_knowledge),
  // first UI ---
  const [postConsult, setPostConsult] = useState<PostConsult>({
    postConsultMessage: "",
    postConsultKnowledge: "",
  });
  const setPostConsultK = <K extends keyof PostConsult>(key: K, value: PostConsult[K]) =>
    setPostConsult(prev => ({ ...prev, [key]: value }));

  // --- Section 04: Sinal via Pix (deposit policy) — REAL wire fields
  // (pix_deposit_*/pix_refund_window_hours/pix_retention_policy/
  // pix_partial_refund_percent/pix_reschedule_limit); asaasConnected hydrates
  // from asaas_connected but is READ-ONLY and never sent back on save ---
  const [pixDeposit, setPixDeposit] = useState<PixDeposit>(DEFAULT_PIX_DEPOSIT);
  const setPixDepositK = <K extends keyof PixDeposit>(key: K, value: PixDeposit[K]) =>
    setPixDeposit(prev => ({ ...prev, [key]: value }));

  // --- Section 05: professionals ---
  // `roster` (brain-api GET /doctor/professionals) drives the list UI
  // (completeness/invite state); `hubProfessionalsById` (secretarIA hub GET
  // /tenants/me/professionals) supplies the editable fields used to hydrate
  // services/days/profile for whichever professional is selected.
  const [roster, setRoster] = useState<DoctorProfessional[] | null>(DEMO_ROSTER);
  const [rosterError, setRosterError] = useState(false);
  const [hubProfessionalsById, setHubProfessionalsById] = useState<Record<string, ProfessionalWire>>({});
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string | null>(DEMO_PROFESSIONAL_ID);
  const [profile, setProfile] = useState<ProfessionalProfile>({
    specialty: "Clínica geral",
    about: "",
    contextDoctorMessage: "",
  });
  const setProfileK = <K extends keyof ProfessionalProfile>(key: K, value: ProfessionalProfile[K]) =>
    setProfile(prev => ({ ...prev, [key]: value }));

  // --- Section 06: services (appointment types) — now per-professional ---
  // Each type carries an active flag and its pre-visit requirements (Feature 2).
  const [services, setServices] = useState<Service[]>([
    {
      id: 1, name: "Primeira consulta", dur: 60, price: "R$ 450", active: true,
      requirements: [
        { id: 11, text: "Trazer documento com foto e carteirinha do convênio" },
        { id: 12, text: "Chegar 15 minutos antes para o cadastro" },
      ],
    },
    {
      id: 2, name: "Retorno", dur: 30, price: "", active: true,
      requirements: [
        { id: 21, text: "Trazer exames solicitados na consulta anterior" },
      ],
    },
    { id: 3, name: "Teleconsulta", dur: 40, price: "R$ 350", active: true, requirements: [] },
  ]);

  // --- Section 07: availability — now per-professional ---
  const [days, setDays] = useState<DayConfig[]>(demoWeek());

  // defaultDur round-trips (appointment_duration_min) and stays TENANT-level.
  // gap/lead are demo-only: TenantConfigUpdate has no inter-appointment-gap or
  // minimum-lead-time field.
  const [prefs, setPrefs] = useState<Prefs>({ defaultDur: 50, gap: 10, lead: 2 });
  const setPrefK = (key: keyof Prefs, value: number) =>
    setPrefs(prev => ({ ...prev, [key]: value }));

  // --- secretarIA hub: entitlement-gated real data path ---
  const {
    session,
    ready: hubCheckReady,
    notEntitled,
    unavailable: hubUnavailable,
    hubReady,
    retry: retryHub,
  } = useSecretariaHub();

  // True once we KNOW real data can't load for this LOGGED-IN tenant right
  // now — either the hub is transiently unreachable (every mint retry
  // failed) or this environment has no hub base URL configured at all.
  // Reaching `hubCheckReady` with a session, no entitlement refusal, and
  // still no hubReady can only mean one of those two things — see HubNotice
  // for the identical derivation. Drives both the warning banner (via
  // HubNotice's own props) and the "never show demo data" effect below.
  const hubUnreachable = hubCheckReady && !!session && !notEntitled && !hubReady;

  // Applies a TenantConfigWire onto every tenant-level piece of local state
  // (ctx/messages/postConsult/pixDeposit/prefs.defaultDur/gcal.connected) via
  // the same applyWire* mappers used everywhere else. Shared by the initial
  // hydration effect below AND handleSave, so a successful save reflects
  // exactly what the backend actually persisted — never what the form
  // happened to hold locally a moment before the request was sent.
  const applyTenantConfig = useCallback((cfg: TenantConfigWire) => {
    setCtx((prev) => ({
      ...prev,
      clinicName: cfg.clinic_name || prev.clinicName,
      ...applyWireAddress(cfg.address),
      insurances: cfg.insurances ? applyWireInsurances(cfg.insurances) : prev.insurances,
      collectInsurance: cfg.collect_insurance,
    }));
    setMessages(applyWireMessages(cfg));
    setPostConsult(applyWirePostConsult(cfg));
    setPixDeposit(applyWirePixDeposit(cfg));
    setPrefs((prev) => ({
      ...prev,
      defaultDur: cfg.appointment_duration_min || prev.defaultDur,
    }));
    setGcal(applyWireGcal(cfg));
  }, []);

  // Hydrate tenant-level fields from the real tenant config once the hub is
  // usable. business_hours/appointment_types are NOT read here — they're
  // professional-scoped now (see the hydration effect below).
  useEffect(() => {
    if (!hubReady || !session) return;
    getTenantConfig(session)
      .then(applyTenantConfig)
      .catch((e) => {
        // Real config failed to load — keep whatever's on screen (the demo
        // seed, or the honest-empty state from the hubUnreachable effect);
        // this mirrors the agenda page's fallback rule.
        console.error("secretaria hub: failed to load tenant config", e);
      });
  }, [hubReady, session, applyTenantConfig]);

  // Loads the professionals roster (brain-api) + editable configs (hub).
  // Re-run after any mutation (invite created, self-bind, calendar connect)
  // via the components' onRosterChanged/onChanged callbacks.
  const loadProfessionals = useCallback(() => {
    if (!hubReady || !session) return;
    getDoctorProfessionals(session)
      .then((list) => {
        setRoster(list);
        setRosterError(false);
        setSelectedProfessionalId((prev) => {
          // Keep whatever's already validly selected — including a staff
          // member who switched to a colleague — rather than snapping back
          // every reload. Only DEFAULT a staff member to their own
          // professional the first time (no prior selection).
          if (prev && list.some((p) => p.id === prev)) return prev;
          // Non-owner member with a professional bound to them defaults to it.
          // is_owner is the new claim; role === "tenant_owner" is the legacy
          // fallback during the transition.
          if (!(session.isOwner || session.role === "tenant_owner") && session.professionalId) {
            return session.professionalId;
          }
          return list[0]?.id ?? null; // single-professional tenants auto-select
        });
      })
      .catch((e) => {
        console.error("secretaria hub: failed to load professionals roster", e);
        setRosterError(true);
      });
    getProfessionals(session)
      .then((list) => {
        setHubProfessionalsById(Object.fromEntries(list.map((p) => [p.id, p])));
      })
      .catch((e) => {
        console.error("secretaria hub: failed to load professional configs", e);
      });
  }, [hubReady, session]);

  useEffect(() => {
    loadProfessionals();
  }, [loadProfessionals]);

  // Hydrates services/days/profile from whichever professional is currently
  // selected. Always starts from a closed week + empty services (never from
  // the previously-selected professional's local state), so switching
  // professionals can never leak one professional's schedule onto another's.
  useEffect(() => {
    if (!selectedProfessionalId) return;
    const p = hubProfessionalsById[selectedProfessionalId];
    if (!p) return; // demo id, or hub list hasn't loaded yet — keep current (demo) values
    setServices(
      p.appointment_types.length > 0 ? applyWireAppointmentTypes(p.appointment_types) : [],
    );
    setDays(applyWireBusinessHours(p.business_hours, closedWeek()));
    setProfile(applyWireProfessionalProfile(p));
  }, [selectedProfessionalId, hubProfessionalsById]);

  // --- Section 08: Google Calendar (tenant-level; unchanged single-professional path) ---
  // `connected` round-trips read-only (TenantConfigRead.calendar_connected).
  // `mode` (google_calendar_mode) is writable via the mode selector — see
  // GcalState in lib/types.ts.
  const [gcal, setGcal] = useState<GcalState>({ connected: false, mode: "per_professional" });
  const setGcalMode = (mode: GcalState["mode"]) =>
    setGcal((prev) => ({ ...prev, mode }));

  // --- Demo-data honesty: once we know real data can't load for a
  // LOGGED-IN tenant (hub unreachable or not configured in this
  // environment), drop every sales-demo seed value so nothing fake is ever
  // presented as real — sections render their empty/disabled real state
  // instead, under HubNotice's warning banner. Self-heals the moment
  // hubReady flips true: the hydration effects above overwrite this with
  // the actual saved config. Logged-out visitors are UNAFFECTED — the
  // labeled demo showcase (HubNotice's "você está vendo dados de
  // demonstração") is untouched.
  useEffect(() => {
    if (!hubUnreachable) return;
    setCtx({
      clinicName: "",
      addressLine: "",
      addressComplement: "",
      neighborhood: "",
      city: "",
      state: "",
      postalCode: "",
      phone: "",
      insurances: "",
      collectInsurance: false,
    });
    setMessages({ greetingMessage: "", returningGreetingMessage: "", language: "pt-BR" });
    setPostConsult({ postConsultMessage: "", postConsultKnowledge: "" });
    setPixDeposit(DEFAULT_PIX_DEPOSIT);
    setRoster(null);
    setRosterError(true); // reuses ProfessionalsSection's existing "couldn't load" message
    setHubProfessionalsById({});
    setSelectedProfessionalId(null);
    setProfile(EMPTY_PROFESSIONAL_PROFILE);
    setServices([]);
    setDays(closedWeek());
    setGcal({ connected: false, mode: "per_professional" });
  }, [hubUnreachable]);

  // --- Save: writes to the real hub config, or refuses honestly ---
  // Two PUTs when a professional is selected: tenant-level (Mensagens +
  // Pós-consulta + Sinal via Pix + address/insurances/collect_insurance/
  // appointment_duration_min) and professional-level (hours/services/
  // specialty/about/context). gap/lead have no wire counterpart and stay
  // silently local-only, same as before. NEVER shows the success toast
  // without a real 2xx from the tenant-level PUT.
  const handleSave = async () => {
    if (!session) {
      flash("Entre na sua conta para salvar a configuração.", "error");
      return;
    }
    if (!hubReady) {
      flash(
        "Não foi possível salvar: sua clínica não está conectada no momento. Tente novamente em instantes.",
        "error",
      );
      return;
    }
    try {
      const savedCfg = await updateTenantConfig(
        session,
        buildConfigUpdatePayload(ctx, messages, postConsult, pixDeposit, prefs.defaultDur, gcal.mode),
      );
      // Reflect exactly what the backend persisted — same mappers the
      // hydration effect uses — rather than trusting the local form state.
      applyTenantConfig(savedCfg);
      if (selectedProfessionalId && selectedProfessionalId !== DEMO_PROFESSIONAL_ID) {
        const saved = await updateProfessionalConfig(
          session,
          selectedProfessionalId,
          buildProfessionalConfigPayload(days, services, profile),
        );
        setHubProfessionalsById((prev) => ({ ...prev, [selectedProfessionalId]: saved }));
        loadProfessionals(); // refresh roster completeness chips (has_hours/has_services)
      }
      flash("Configuração salva — a secretarIA já está atualizada.");
    } catch (e) {
      console.error("secretaria hub: failed to save tenant config", e);
      flash("Não foi possível salvar agora. Tente novamente.", "error");
    }
  };

  // --- Google Calendar: real OAuth handoff when hubReady, else undefined
  // (GoogleSection renders a disabled, honestly-labeled "not connected" state). ---
  const handleGoogleConnect =
    hubReady && session
      ? async () => {
          const url = await startCalendarOauth(session);
          window.location.assign(url);
        }
      : undefined;

  const handleGoogleDisconnect =
    hubReady && session
      ? async () => {
          await disconnectCalendar(session);
          // Disconnecting only clears `connected` — `mode` is an independent
          // tenant preference that survives a disconnect (see GoogleSection's
          // "trocar de modo não desconecta nada" copy — the converse holds
          // too: disconnecting doesn't quietly reset the mode choice).
          setGcal((prev) => ({ ...prev, connected: false }));
        }
      : undefined;

  // --- Derived: professional name shown alongside Services/Availability once
  // there's more than one to disambiguate (single-professional tenants "look
  // unchanged" per spec). ---
  const selectedProfessionalName =
    roster && roster.length > 1
      ? roster.find((p) => p.id === selectedProfessionalId)?.name
      : undefined;

  // --- Derived: professional id -> dedicated Google Calendar id, for
  // ProfessionalsSection's shared_account-mode chip/button (see
  // ProfessionalRow). Narrowed from hubProfessionalsById (the full
  // ProfessionalWire per id) so ProfessionalsSection's prop surface only
  // carries what it actually renders. ---
  const googleCalendarIdByProfessional: Record<string, string | null> = Object.fromEntries(
    Object.entries(hubProfessionalsById).map(([id, p]) => [id, p.google_calendar_id]),
  );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div style={{
      height: "100vh",
      display: "flex", flexDirection: "column",
      background: "var(--page)",
    }}>
      {/* The admin "Modo médico" impersonation switch lives in the Brain
          portal header, not here — this app has no admin surface. */}
      <PortalHeader
        portalLabel="Clínica"
        userLabel={
          session?.email ||
          (hubReady ? ctx.clinicName : "Brain")
        }
        onLogout={() => signOut((path) => router.push(path))}
        product="secretaria"
        // The screen below is a height:100vh flex column with its own internal
        // scroll area, so the header is already pinned without `position: sticky`.
        sticky={false}
      />

      {/* demo-mode / not-entitled / unavailable / not-configured notice —
          hidden once the real hub is active */}
      <HubNotice
        session={session}
        notEntitled={notEntitled}
        ready={hubCheckReady}
        unavailable={hubUnavailable}
        onRetry={retryHub}
      />

      {/* WhatsApp activation status — hidden once onboarding_state === 'ativo' */}
      <OnboardingBanner session={session} />

      {/* scrollable content area — scrollspy fires on this element */}
      <div
        ref={scrollRef}
        className="scroll"
        onScroll={onScroll}
        style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
      >
        <div style={{
          maxWidth: 1080, margin: "0 auto",
          padding: "30px 28px 130px",
          display: "flex", gap: 36,
        }}>
          {/* left: sticky section nav */}
          <SideNav active={active} onJump={jump} />

          {/* right: page heading + sections */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* page heading */}
            <div style={{ marginBottom: 26 }}>
              <h1 style={{
                fontSize: 30, fontWeight: 600,
                fontFamily: "var(--font-serif)", color: "var(--ink)",
                lineHeight: 1.1, letterSpacing: "-.01em", margin: 0,
              }}>
                Configurações <SecretariaWordmark />
              </h1>
              <p style={{
                fontSize: 15, color: "var(--ink-soft)",
                marginTop: 7, maxWidth: 620, lineHeight: 1.5,
              }}>
                Tudo que o chatbot do WhatsApp precisa saber para atender seus pacientes como uma
                secretária de verdade. Passe o mouse nos{" "}
                <b style={{ color: "var(--ink)" }}>?</b>{" "}
                para entender cada campo.
              </p>
            </div>

            {/* eight config sections stacked vertically. readOnly is now
                driven by hub reachability, NOT role — every authenticated
                tenant member (owner or staff) gets full read/write access;
                see hubUnreachable above and the Task 6 access-widening pass. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
              <ContextSection v={ctx} set={setCtxK} readOnly={hubUnreachable} />
              <MessagesSection v={messages} set={setMessagesK} readOnly={hubUnreachable} />
              <PostConsultSection v={postConsult} set={setPostConsultK} readOnly={hubUnreachable} />
              <PixSection v={pixDeposit} set={setPixDepositK} readOnly={hubUnreachable} />
              <ProfessionalsSection
                session={session}
                // is_owner is the new claim; role === "tenant_owner" is the
                // legacy fallback during the transition.
                isOwner={Boolean(session && (session.isOwner || session.role === "tenant_owner"))}
                roster={roster}
                rosterError={rosterError}
                selectedId={selectedProfessionalId}
                onSelect={setSelectedProfessionalId}
                profile={profile}
                onProfileChange={setProfileK}
                onRosterChanged={loadProfessionals}
                googleCalendarMode={gcal.mode}
                clinicCalendarConnected={gcal.connected}
                googleCalendarIdByProfessional={googleCalendarIdByProfessional}
              />
              <ServicesSection
                services={services}
                setServices={setServices}
                professionalName={selectedProfessionalName}
              />
              <AvailabilitySection
                days={days}
                setDays={setDays}
                prefs={prefs}
                setPref={setPrefK}
                professionalName={selectedProfessionalName}
              />
              <GoogleSection
                gcal={gcal}
                onConnect={handleGoogleConnect}
                onDisconnect={handleGoogleDisconnect}
                connectHint={
                  !session
                    ? "Conecte-se após entrar na sua conta para ativar a integração."
                    : "Isso ficará disponível assim que a conexão com sua clínica for restabelecida."
                }
                onModeChange={setGcalMode}
                readOnly={hubUnreachable}
              />
            </div>
          </div>
        </div>
      </div>

      {/* sticky save bar — fixed at viewport bottom */}
      <div style={{
        position: "sticky", bottom: 0, flexShrink: 0,
        display: "flex", alignItems: "center", gap: 14,
        padding: "14px 28px",
        background: "var(--page-grad)",
        borderTop: "1px solid var(--line-strong)",
        zIndex: 20,
      }}>
        {/* Google Calendar status indicator */}
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          fontSize: 13,
          color: gcal.connected ? "var(--st-attend-ink)" : "var(--ink-faint)",
        }}>
          <Icon name={gcal.connected ? "checkCircle" : "clock"} size={16} />
          {gcal.connected
            ? "Google Calendar conectado"
            : "Conecte o Google Calendar para ativar a sincronização"}
        </div>

        <div style={{ flex: 1 }} />

        <Btn variant="ghost" onClick={() => flash("Alterações descartadas.")}>
          Descartar
        </Btn>
        <Btn variant="primary" icon="check" onClick={handleSave}>
          Salvar configuração
        </Btn>
      </div>

      {/* auto-dismissing success toast */}
      <CToast toast={toast} />
    </div>
  );
}
