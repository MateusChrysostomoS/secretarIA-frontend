"use client";
// Configuração page — the full-viewport secretarIA chatbot configuration screen.
// Composition + wiring only: the rules live in lib/hydration.ts (what may be
// edited and saved), lib/snapshot.ts (what "the last authoritative state" is)
// and lib/save.ts (the guarded write path).
//
// FAIL-CLOSED HYDRATION (FIX 07)
// ------------------------------
// The old version enabled this screen on a proxy — a hub token minted and a
// base URL configured — and seeded every field with sales-demo values as a
// "pre-hydration placeholder". A tenant whose GET /tenants/me/config returned
// 500 therefore sat in front of an editable form full of demo greeting, demo
// Pix policy, demo hours and demo services, and Save would PUT all of it over
// their real configuration.
//
// Now: an authenticated session starts EMPTY and READ-ONLY, and each source
// (tenant / roster / selected professional) carries its own explicit
// idle→loading→loaded|error phase. Editing unlocks per scope only after that
// scope's GET actually succeeded; Save is refused — with zero PUTs — for any
// other combination. Failure shows an error with a retry, and never falls back
// to demo data. Switching professional invalidates the professional scope
// until that exact id has hydrated, and a late response for a previous
// selection is dropped instead of repainting the current one.
//
// The demo showcase still exists, but only for a SESSION-LESS visitor, and
// only through lib/demo-seed.ts's `.forVisitor` unwrap.

import "../product-tokens.css";
import "../app-shell.css";

import { useState, useEffect, useRef, useCallback, useReducer, useMemo } from "react";
import type { MutableRefObject } from "react";
import { useRouter } from "next/navigation";
import { Icon, Btn } from "../_shared/ui";
import { HubNotice } from "../_shared/HubNotice";
import { OnboardingBanner } from "../_components/OnboardingBanner";
import { PortalHeader } from "../_components/PortalHeader";
import { SecretariaWordmark } from "../_components/SecretariaWordmark";
import { signOut } from "@/lib/sign-out";
import { useSecretariaHub } from "../_shared/useSecretariaHub";

import { SideNav } from "./components/SideNav";
import { CToast } from "./components/CToast";
import { LoadStateNotice } from "./components/LoadStateNotice";
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
  EMPTY_CLINIC_CTX,
  EMPTY_GCAL,
  EMPTY_MESSAGES,
  EMPTY_POST_CONSULT,
  EMPTY_PREFS,
  EMPTY_PROFESSIONAL_PROFILE,
  closedWeek,
  type ClinicCtx,
  type ConfigInheritance,
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
  applyWireAppointmentTypes,
  applyWireBusinessHours,
  buildConfigUpdatePayload,
  buildProfessionalConfigPayload,
} from "./lib/hub-mapping";
import {
  DEMO_CTX,
  DEMO_PROFESSIONAL_ID,
  DEMO_PROFILE,
  DEMO_ROSTER,
  DEMO_SERVICES,
  demoWeek,
} from "./lib/demo-seed";
import {
  INITIAL_HYDRATION_STATE,
  buildLoadFailedEvent,
  canEditProfessionalFields,
  canEditTenantFields,
  emitConfigEvent,
  hydrationReducer,
  saveBlockedReason,
  statusOf,
} from "./lib/hydration";
import {
  EMPTY_SNAPSHOT,
  dirtySections,
  emptyProfessionalSlices,
  emptyTenantSlices,
  professionalSlicesFromWire,
  snapshotForTenant,
  tenantSlicesFromWire,
  type AuthoritativeSnapshot,
  type ProfessionalSlices,
  type TenantSlices,
} from "./lib/snapshot";
import {
  PARTIAL_SAVE_MESSAGE,
  SAVE_BLOCKED_MESSAGE,
  performSave,
  retryProfessionalOnly,
} from "./lib/save";
import {
  disconnectCalendar,
  getProfessionals,
  getTenantConfig,
  isLegacyBackend,
  startCalendarOauth,
  updateHubConfiguration,
  updateProfessionalConfig,
  updateTenantConfig,
  type HubConfigurationUpdatePayload,
  type ProfessionalConfigUpdatePayload,
  type ProfessionalWire,
  type TenantConfigUpdatePayload,
  type TenantConfigWire,
} from "@/lib/secretaria-hub";
import { getDoctorProfessionals, type DoctorProfessional, type Session } from "@/lib/manage-api";

// SideNav section ids — used for scrollspy
const NAV_IDS = ["ctx", "msg", "pos", "pix", "prof", "srv", "disp", "gcal"] as const;
type NavId = (typeof NAV_IDS)[number];

/**
 * Which professional to select once a roster lands. Keeps a still-valid
 * current selection (a staff member who switched to a colleague shouldn't snap
 * back on every refresh), otherwise defaults a non-owner to their own
 * professional, otherwise takes the first row so single-professional tenants
 * need no click at all.
 */
function pickProfessional(
  roster: DoctorProfessional[],
  session: Session,
  current: string | null,
): string | null {
  if (current && roster.some((p) => p.id === current)) return current;
  // is_owner is the new claim; role === "tenant_owner" is the legacy fallback.
  const isOwner = session.isOwner || session.role === "tenant_owner";
  if (!isOwner && session.professionalId) return session.professionalId;
  return roster[0]?.id ?? null;
}

// ---------------------------------------------------------------------------
// ConfiguracaoPage — default export
// ---------------------------------------------------------------------------

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

  const flash = useCallback((message: string, kind: "success" | "error" = "success") => {
    setToast({ message, kind });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    // Auto-dismiss after 3 s, matching the source behaviour
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  // --- secretarIA hub: token mint + entitlement check ---
  // `hubTokenReady` proves a token was minted and a base URL is configured. It
  // does NOT prove any hub GET succeeded — that is what the hydration state
  // below is for, and conflating the two is the bug this screen used to have.
  const {
    session,
    ready: hubCheckReady,
    notEntitled,
    unavailable: hubUnavailable,
    hubTokenReady,
    retry: retryHub,
  } = useSecretariaHub();

  // --- hydration state machine (lib/hydration.ts) ---
  const [hydration, dispatch] = useReducer(hydrationReducer, INITIAL_HYDRATION_STATE);

  // Cycle counters live in refs because async callbacks need the value that
  // was current when THEY were issued, not whatever a later render holds.
  const generationRef = useRef(0);
  const rosterGenerationRef = useRef(0);
  const attemptsRef = useRef({ tenant: 0, roster: 0, professional: 0 });
  // Mirrors hydration.selectedProfessionalId for the same reason.
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = hydration.selectedProfessionalId;

  // --- form state — EMPTY until something real is read back ---
  const [ctx, setCtx] = useState<ClinicCtx>(EMPTY_CLINIC_CTX);
  const setCtxK = <K extends keyof ClinicCtx>(key: K, value: ClinicCtx[K]) =>
    setCtx((prev) => ({ ...prev, [key]: value }));

  const [messages, setMessages] = useState<Messages>(EMPTY_MESSAGES);
  const setMessagesK = <K extends keyof Messages>(key: K, value: Messages[K]) =>
    setMessages((prev) => ({ ...prev, [key]: value }));

  const [postConsult, setPostConsult] = useState<PostConsult>(EMPTY_POST_CONSULT);
  const setPostConsultK = <K extends keyof PostConsult>(key: K, value: PostConsult[K]) =>
    setPostConsult((prev) => ({ ...prev, [key]: value }));

  const [pixDeposit, setPixDeposit] = useState<PixDeposit>(DEFAULT_PIX_DEPOSIT);
  const setPixDepositK = <K extends keyof PixDeposit>(key: K, value: PixDeposit[K]) =>
    setPixDeposit((prev) => ({ ...prev, [key]: value }));

  const [prefs, setPrefs] = useState<Prefs>(EMPTY_PREFS);
  const setPrefK = (key: keyof Prefs, value: number) =>
    setPrefs((prev) => ({ ...prev, [key]: value }));

  const [gcal, setGcal] = useState<GcalState>(EMPTY_GCAL);
  const setGcalMode = (mode: GcalState["mode"]) => setGcal((prev) => ({ ...prev, mode }));

  const [services, setServices] = useState<Service[]>([]);
  const [days, setDays] = useState<DayConfig[]>(closedWeek);
  // Whether `days` / `services` above are this professional's OWN config or the
  // clinic's, inherited. Held as state because the VALUES cannot tell you:
  // an inheriting professional and one who closed every day both render a
  // closed week. Starts "unknown" — nothing has been read back yet.
  const [hoursSource, setHoursSource] = useState<ConfigInheritance>("unknown");
  const [servicesSource, setServicesSource] = useState<ConfigInheritance>("unknown");
  const [profile, setProfile] = useState<ProfessionalProfile>(EMPTY_PROFESSIONAL_PROFILE);
  const setProfileK = <K extends keyof ProfessionalProfile>(key: K, value: ProfessionalProfile[K]) =>
    setProfile((prev) => ({ ...prev, [key]: value }));

  const [roster, setRoster] = useState<DoctorProfessional[] | null>(null);

  // The last state the SERVER confirmed, per tenant. Written only from a 2xx
  // (GET on hydration, or the body a PUT echoed back) — never from local form
  // state and never from a demo seed. Descartar restores from here.
  const [snapshot, setSnapshot] = useState<AuthoritativeSnapshot>(EMPTY_SNAPSHOT);
  const snapshotRef = useRef(snapshot);
  snapshotRef.current = snapshot;

  const [saving, setSaving] = useState(false);
  // A ref, not the state above, is what actually blocks a double click: two
  // clicks in the same tick both read the pre-update `saving === false`, but
  // only the first gets past a ref that is set synchronously.
  const savingRef = useRef(false);

  // Set only after a LEGACY half-save (tenant committed, professional not) —
  // impossible against a backend with the transactional endpoint. While set,
  // Save retries just the professional: the tenant is already persisted and
  // has been adopted from the server's response, so re-sending it would be
  // pure noise on a screen the user is trying to reconcile.
  const [professionalPending, setProfessionalPending] = useState<string | null>(null);

  // --- applying whole slices ---
  const applyTenantSlices = useCallback((s: TenantSlices) => {
    setCtx(s.ctx);
    setMessages(s.messages);
    setPostConsult(s.postConsult);
    setPixDeposit(s.pixDeposit);
    setPrefs(s.prefs);
    setGcal(s.gcal);
  }, []);

  const applyProfessionalSlices = useCallback((s: ProfessionalSlices) => {
    setServices(s.services);
    setDays(s.days);
    setProfile(s.profile);
    setHoursSource(s.hoursSource);
    setServicesSource(s.servicesSource);
  }, []);

  // --- session resolution: the only place `mode` is decided ---
  useEffect(() => {
    if (!hubCheckReady) return;
    dispatch({ type: "session_resolved", mode: session ? "authenticated" : "visitor" });
  }, [hubCheckReady, session]);

  // A snapshot must never outlive the session that produced it.
  useEffect(() => {
    const tenantId = session?.tenantId ?? null;
    setSnapshot((prev) => (prev.tenantId && prev.tenantId !== tenantId ? EMPTY_SNAPSHOT : prev));
  }, [session]);

  // --- visitor showcase: the ONE place demo values may be applied ---
  useEffect(() => {
    if (hydration.mode !== "visitor") return;
    applyTenantSlices({ ...emptyTenantSlices(), ctx: DEMO_CTX.forVisitor });
    applyProfessionalSlices({
      services: DEMO_SERVICES.forVisitor,
      days: demoWeek(),
      profile: DEMO_PROFILE.forVisitor,
      // The showcase shows a fully configured professional, so "own" is what a
      // visitor should see — not an inheritance story the demo cannot explain.
      hoursSource: "own",
      servicesSource: "own",
    });
    setRoster(DEMO_ROSTER.forVisitor);
    dispatch({ type: "professional_selected", id: DEMO_PROFESSIONAL_ID });
  }, [hydration.mode, applyTenantSlices, applyProfessionalSlices]);

  // --- selection: clears the professional form BEFORE the new one hydrates ---
  const selectProfessional = useCallback(
    (id: string | null) => {
      if (id === selectedRef.current) return;
      // Wiping first is what guarantees professional B never briefly shows
      // (or, worse, saves) professional A's hours and services.
      applyProfessionalSlices(emptyProfessionalSlices());
      dispatch({ type: "professional_selected", id });
    },
    [applyProfessionalSlices],
  );

  // --- authenticated hydration ---
  // One full cycle: tenant config + roster (brain-api rows and hub configs
  // together, because a selection is only usable when both are present).
  const hydrate = useCallback(() => {
    if (hydration.mode !== "authenticated" || !session || !hubTokenReady) return;

    const generation = ++generationRef.current;
    const rosterGeneration = ++rosterGenerationRef.current;
    const tenantAttempt = ++attemptsRef.current.tenant;
    const rosterAttempt = ++attemptsRef.current.roster;
    dispatch({ type: "hydration_started", generation, rosterGeneration });

    const tenantId = session.tenantId;

    getTenantConfig(session)
      .then((cfg) => {
        if (generationRef.current !== generation) return; // superseded
        applyTenantSlices(tenantSlicesFromWire(cfg));
        setSnapshot((prev) => ({
          tenantId,
          tenant: cfg,
          professionalsById: prev.tenantId === tenantId ? prev.professionalsById : {},
        }));
        dispatch({ type: "load_succeeded", scope: "tenant", generation });
      })
      .catch((e) => {
        if (generationRef.current !== generation) return;
        // Fail closed. Fall back to the last CONFIRMED snapshot for this same
        // tenant when there is one, otherwise to an honest empty form — never
        // to the demo seed, and never leaving unsaved local edits on a screen
        // the user can no longer trust.
        const confirmedNow = snapshotForTenant(snapshotRef.current, tenantId);
        applyTenantSlices(
          confirmedNow.tenant ? tenantSlicesFromWire(confirmedNow.tenant) : emptyTenantSlices(),
        );
        dispatch({ type: "load_failed", scope: "tenant", generation, status: statusOf(e) });
        emitConfigEvent(buildLoadFailedEvent("tenant", e, tenantAttempt));
      });

    Promise.all([getDoctorProfessionals(session), getProfessionals(session)])
      .then(([rows, configs]) => {
        if (rosterGenerationRef.current !== rosterGeneration) return; // superseded
        const byId: Record<string, ProfessionalWire> = Object.fromEntries(
          configs.map((p) => [p.id, p]),
        );
        setRoster(rows);
        setSnapshot((prev) => ({
          tenantId,
          tenant: prev.tenantId === tenantId ? prev.tenant : null,
          professionalsById: byId,
        }));
        dispatch({ type: "load_succeeded", scope: "roster", generation: rosterGeneration });
        selectProfessional(pickProfessional(rows, session, selectedRef.current));
      })
      .catch((e) => {
        if (rosterGenerationRef.current !== rosterGeneration) return;
        setRoster(null);
        applyProfessionalSlices(emptyProfessionalSlices());
        dispatch({
          type: "load_failed",
          scope: "roster",
          generation: rosterGeneration,
          status: statusOf(e),
        });
        emitConfigEvent(buildLoadFailedEvent("roster", e, rosterAttempt));
      });
  }, [
    hydration.mode,
    session,
    hubTokenReady,
    applyTenantSlices,
    applyProfessionalSlices,
    selectProfessional,
  ]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // --- roster-only refresh (invite created, self-bind, calendar connect) ---
  // Deliberately does NOT re-read the tenant config: doing so would overwrite
  // whatever the user has typed but not yet saved.
  const reloadRoster = useCallback(() => {
    if (hydration.mode !== "authenticated" || !session || !hubTokenReady) return;

    const rosterGeneration = ++rosterGenerationRef.current;
    const rosterAttempt = ++attemptsRef.current.roster;
    dispatch({ type: "roster_reload_started", rosterGeneration });

    const tenantId = session.tenantId;

    Promise.all([getDoctorProfessionals(session), getProfessionals(session)])
      .then(([rows, configs]) => {
        if (rosterGenerationRef.current !== rosterGeneration) return;
        const byId: Record<string, ProfessionalWire> = Object.fromEntries(
          configs.map((p) => [p.id, p]),
        );
        setRoster(rows);
        setSnapshot((prev) => ({ ...prev, tenantId, professionalsById: byId }));
        dispatch({ type: "load_succeeded", scope: "roster", generation: rosterGeneration });
        // Only re-picks when the current selection vanished from the roster;
        // an unchanged, already-hydrated selection keeps its unsaved edits.
        selectProfessional(pickProfessional(rows, session, selectedRef.current));
      })
      .catch((e) => {
        if (rosterGenerationRef.current !== rosterGeneration) return;
        dispatch({
          type: "load_failed",
          scope: "roster",
          generation: rosterGeneration,
          status: statusOf(e),
        });
        emitConfigEvent(buildLoadFailedEvent("roster", e, rosterAttempt));
      });
  }, [hydration.mode, session, hubTokenReady, selectProfessional]);

  // --- per-professional hydration ---
  // Runs only while the professional scope is `loading` (i.e. right after a
  // selection change), so a roster refresh never clobbers unsaved edits on an
  // already-hydrated professional.
  useEffect(() => {
    if (hydration.mode !== "authenticated") return;
    if (hydration.professional.phase !== "loading") return;
    if (hydration.roster.phase !== "loaded") return;

    const id = hydration.selectedProfessionalId;
    if (!id) return;

    const rosterGeneration = rosterGenerationRef.current;
    const wire = snapshot.professionalsById[id];

    if (!wire) {
      // In the roster but absent from the hub's config list — treat as a
      // failed professional load rather than opening a blank form that would
      // overwrite whatever the hub actually holds.
      applyProfessionalSlices(emptyProfessionalSlices());
      dispatch({ type: "professional_failed", id, rosterGeneration, status: null });
      emitConfigEvent(
        buildLoadFailedEvent("professional", null, ++attemptsRef.current.professional),
      );
      return;
    }

    applyProfessionalSlices(professionalSlicesFromWire(wire));
    dispatch({ type: "professional_loaded", id, rosterGeneration });
  }, [
    hydration.mode,
    hydration.professional.phase,
    hydration.roster.phase,
    hydration.selectedProfessionalId,
    snapshot.professionalsById,
    applyProfessionalSlices,
  ]);

  // --- derived gates ---
  const tenantEditable = canEditTenantFields(hydration);
  const professionalEditable = canEditProfessionalFields(hydration);
  const saveBlocked = saveBlockedReason(hydration);
  const confirmed = snapshotForTenant(snapshot, session?.tenantId ?? null);
  // Descartar needs an authoritative baseline of its own — a demo seed is
  // never one, which is why visitors get a disabled button.
  const canDiscard = hydration.mode === "authenticated" && confirmed.tenant !== null && !saving;

  // --- What "Herdar da clínica" actually resolves to ------------------------
  // The clinic's own hours/services, from the tenant config this page already
  // holds — no extra request. Rendered read-only while a professional inherits,
  // so "herdando" shows WHAT is being inherited instead of an empty week that
  // looks indistinguishable from "closed all week".
  const inheritedDays = useMemo(
    () =>
      confirmed.tenant
        ? applyWireBusinessHours(confirmed.tenant.business_hours, closedWeek())
        : closedWeek(),
    [confirmed.tenant],
  );
  const inheritedServices = useMemo(
    () => (confirmed.tenant ? applyWireAppointmentTypes(confirmed.tenant.appointment_types) : []),
    [confirmed.tenant],
  );

  // Switching to "own" is the explicit act of creating an override, and it
  // seeds the form from what was being inherited: the doctor edits the schedule
  // patients see today rather than starting from a blank week they never chose.
  // Switching back to "inherit" leaves the local values alone — they are simply
  // not sent (the payload carries `null`), so a mis-click costs nothing.
  const chooseHoursSource = useCallback(
    (next: "inherit" | "own") => {
      if (next === "own") setDays(inheritedDays.map((d) => ({ ...d, ranges: [...d.ranges] })));
      setHoursSource(next);
    },
    [inheritedDays],
  );

  const chooseServicesSource = useCallback(
    (next: "inherit" | "own") => {
      if (next === "own") setServices(inheritedServices.map((s) => ({ ...s })));
      setServicesSource(next);
    },
    [inheritedServices],
  );

  // --- Save: guarded by lib/save.ts, which refuses without any PUT ---
  // Adopts what the backend actually persisted as the new form state AND the
  // new authoritative snapshot, so a later Descartar returns here.
  const adoptTenantResult = useCallback(
    (tenantId: string, wire: TenantConfigWire) => {
      applyTenantSlices(tenantSlicesFromWire(wire));
      setSnapshot((prev) => ({ ...prev, tenantId, tenant: wire }));
    },
    [applyTenantSlices],
  );

  const adoptProfessionalResult = useCallback(
    (tenantId: string, id: string, wire: ProfessionalWire) => {
      applyProfessionalSlices(professionalSlicesFromWire(wire));
      setSnapshot((prev) => ({
        ...prev,
        tenantId,
        professionalsById: { ...prev.professionalsById, [id]: wire },
      }));
    },
    [applyProfessionalSlices],
  );

  const saveDeps = () => ({
    state: hydration,
    putConfiguration: (body: HubConfigurationUpdatePayload) =>
      updateHubConfiguration(session!, body),
    putTenant: (patch: TenantConfigUpdatePayload) => updateTenantConfig(session!, patch),
    putProfessional: (id: string, patch: ProfessionalConfigUpdatePayload) =>
      updateProfessionalConfig(session!, id, patch),
    buildTenantPatch: () =>
      buildConfigUpdatePayload(ctx, messages, postConsult, pixDeposit, prefs.defaultDur, gcal.mode),
    buildProfessionalPatch: () =>
      buildProfessionalConfigPayload(days, services, profile, hoursSource, servicesSource),
    isLegacyBackend,
  });

  const handleSave = async () => {
    // Ref first: `saving` state has not re-rendered yet on a fast double click.
    if (savingRef.current) return;
    if (!session) {
      emitConfigEvent({ event: "config_save_blocked", reason: "no_session" });
      flash(SAVE_BLOCKED_MESSAGE.no_session, "error");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    const tenantId = session.tenantId;
    try {
      // Reconciling a legacy half-save: only the professional is outstanding.
      if (professionalPending) {
        const wire = await retryProfessionalOnly(saveDeps(), professionalPending);
        adoptProfessionalResult(tenantId, professionalPending, wire);
        setProfessionalPending(null);
        reloadRoster();
        emitConfigEvent({ event: "configuration_saved", mode: "legacy", partial: false });
        flash("Configuração salva — a secretarIA já está atualizada.");
        return;
      }

      const result = await performSave(saveDeps());

      if (result.status === "blocked") {
        emitConfigEvent({ event: "config_save_blocked", reason: result.reason });
        flash(SAVE_BLOCKED_MESSAGE[result.reason], "error");
        return;
      }

      if (result.status === "partial") {
        // Only reachable against a pre-aggregate backend. The tenant IS live,
        // so adopt it — anything else would leave the form claiming unsaved
        // changes that are in fact already in effect on WhatsApp.
        adoptTenantResult(tenantId, result.tenant);
        setProfessionalPending(result.professionalId);
        emitConfigEvent({
          event: "configuration_save_failed",
          mode: "legacy",
          status: statusOf(result.cause),
          scope: "professional",
        });
        emitConfigEvent({ event: "configuration_saved", mode: "legacy", partial: true });
        console.error("secretaria hub: professional half of the save failed", result.cause);
        flash(PARTIAL_SAVE_MESSAGE, "error");
        return;
      }

      adoptTenantResult(tenantId, result.tenant);
      if (result.professional) {
        adoptProfessionalResult(tenantId, result.professional.id, result.professional.wire);
        reloadRoster(); // refresh completeness chips (has_hours/has_services)
      }
      emitConfigEvent({ event: "configuration_saved", mode: result.mode, partial: false });
      flash("Configuração salva — a secretarIA já está atualizada.");
    } catch (e) {
      // Nothing was written: the transactional endpoint rolled back, or the
      // tenant PUT itself failed on the legacy path.
      emitConfigEvent({
        event: "configuration_save_failed",
        mode: "atomic",
        status: statusOf(e),
        scope: "both",
      });
      console.error("secretaria hub: failed to save configuration", e);
      flash("Não foi possível salvar agora. Nada foi alterado. Tente novamente.", "error");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  // --- Descartar: restores the last confirmed snapshot, with zero requests ---
  const currentSlices = useMemo(
    () => ({
      tenant: { ctx, messages, postConsult, pixDeposit, prefs, gcal },
      professional: hydration.selectedProfessionalId
        ? { services, days, profile, hoursSource, servicesSource }
        : null,
    }),
    [
      ctx,
      messages,
      postConsult,
      pixDeposit,
      prefs,
      gcal,
      services,
      days,
      profile,
      hoursSource,
      servicesSource,
      hydration.selectedProfessionalId,
    ],
  );

  const handleDiscard = () => {
    if (!canDiscard || !confirmed.tenant) return;

    const selectedId = hydration.selectedProfessionalId;
    const baselineProfessionalWire = selectedId
      ? confirmed.professionalsById[selectedId]
      : undefined;
    const baseline = {
      tenant: tenantSlicesFromWire(confirmed.tenant),
      professional: baselineProfessionalWire
        ? professionalSlicesFromWire(baselineProfessionalWire)
        : null,
    };

    const sections = dirtySections(currentSlices, baseline);

    applyTenantSlices(baseline.tenant);
    if (baseline.professional) applyProfessionalSlices(baseline.professional);

    emitConfigEvent({ event: "config_discarded", sections });
    flash(
      sections.length > 0
        ? "Alterações descartadas — a tela voltou ao que está salvo."
        : "Nada para descartar: a tela já está igual ao que está salvo.",
    );
  };

  // --- Google Calendar: real OAuth handoff only once the tenant hydrated ---
  const handleGoogleConnect =
    tenantEditable && session
      ? async () => {
          const url = await startCalendarOauth(session);
          window.location.assign(url);
        }
      : undefined;

  const handleGoogleDisconnect =
    tenantEditable && session
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
      ? roster.find((p) => p.id === hydration.selectedProfessionalId)?.name
      : undefined;

  // --- Derived: professional id -> dedicated Google Calendar id, for
  // ProfessionalsSection's shared_account-mode chip/button. ---
  const googleCalendarIdByProfessional: Record<string, string | null> = Object.fromEntries(
    Object.entries(snapshot.professionalsById).map(([id, p]) => [id, p.google_calendar_id]),
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
        userLabel={session?.email || (tenantEditable ? ctx.clinicName : "Brain")}
        onLogout={() => signOut((path) => router.push(path))}
        product="secretaria"
        // The screen below is a height:100vh flex column with its own internal
        // scroll area, so the header is already pinned without `position: sticky`.
        sticky={false}
      />

      {/* not-logged-in / not-entitled / unavailable / not-configured notice —
          hidden once the hub token path is active */}
      <HubNotice
        session={session}
        notEntitled={notEntitled}
        ready={hubCheckReady}
        unavailable={hubUnavailable}
        onRetry={retryHub}
        // This screen shows a logged-in tenant NOTHING it hasn't read back —
        // so the entitlement banner must not promise demo data here.
        demoForVisitorsOnly
      />

      {/* the hub answered, but a configuration GET didn't — honest error +
          retry, with the form held read-only meanwhile */}
      <LoadStateNotice state={hydration} onRetry={hydrate} />

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

            {/* Eight config sections. `readOnly` is driven by the hydration
                phase of the scope each section belongs to, NOT by role: every
                authenticated tenant member (owner or staff) gets full
                read/write access once the data is actually there. */}
            <div style={{ display: "flex", flexDirection: "column", gap: 34 }}>
              <ContextSection v={ctx} set={setCtxK} readOnly={!tenantEditable} />
              <MessagesSection v={messages} set={setMessagesK} readOnly={!tenantEditable} />
              <PostConsultSection v={postConsult} set={setPostConsultK} readOnly={!tenantEditable} />
              <PixSection v={pixDeposit} set={setPixDepositK} readOnly={!tenantEditable} />
              <ProfessionalsSection
                session={session}
                // is_owner is the new claim; role === "tenant_owner" is the
                // legacy fallback during the transition.
                isOwner={Boolean(session && (session.isOwner || session.role === "tenant_owner"))}
                roster={roster}
                rosterError={hydration.roster.phase === "error"}
                selectedId={hydration.selectedProfessionalId}
                onSelect={selectProfessional}
                profile={profile}
                onProfileChange={setProfileK}
                onRosterChanged={reloadRoster}
                googleCalendarMode={gcal.mode}
                clinicCalendarConnected={gcal.connected}
                googleCalendarIdByProfessional={googleCalendarIdByProfessional}
                readOnly={!professionalEditable}
              />
              <ServicesSection
                services={services}
                setServices={setServices}
                professionalName={selectedProfessionalName}
                source={servicesSource}
                onSourceChange={chooseServicesSource}
                inheritedServices={inheritedServices}
                readOnly={!professionalEditable}
              />
              <AvailabilitySection
                days={days}
                setDays={setDays}
                prefs={prefs}
                setPref={setPrefK}
                professionalName={selectedProfessionalName}
                source={hoursSource}
                onSourceChange={chooseHoursSource}
                inheritedDays={inheritedDays}
                readOnly={!professionalEditable}
                durationReadOnly={!tenantEditable}
              />
              <GoogleSection
                gcal={gcal}
                onConnect={handleGoogleConnect}
                onDisconnect={handleGoogleDisconnect}
                connectHint={
                  !session
                    ? "Conecte-se após entrar na sua conta para ativar a integração."
                    : "Isso ficará disponível assim que a configuração da sua clínica terminar de carregar."
                }
                onModeChange={setGcalMode}
                readOnly={!tenantEditable}
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

        <Btn
          variant="ghost"
          onClick={handleDiscard}
          disabled={!canDiscard}
          title={
            canDiscard
              ? "Volta a tela para a última configuração salva"
              : "Disponível assim que sua configuração salva for carregada"
          }
        >
          Descartar
        </Btn>
        <Btn
          variant="primary"
          icon="check"
          onClick={handleSave}
          disabled={saveBlocked !== null || saving}
          title={saveBlocked ? SAVE_BLOCKED_MESSAGE[saveBlocked] : undefined}
        >
          {saving
            ? "Salvando…"
            : professionalPending
              ? "Salvar dados do profissional"
              : "Salvar configuração"}
        </Btn>
      </div>

      {/* auto-dismissing success toast */}
      <CToast toast={toast} />
    </div>
  );
}
