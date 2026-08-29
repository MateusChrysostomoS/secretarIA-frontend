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
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useRouter } from "next/navigation";
import { Icon, Btn } from "../_shared/ui";
import { HubNotice } from "../_shared/HubNotice";
import { ConfigGapBanner } from "../_components/ConfigGapBanner";
import { OnboardingBanner } from "../_components/OnboardingBanner";
import { PortalHeader } from "../_components/PortalHeader";
import { SecretariaWordmark } from "../_components/SecretariaWordmark";
import { canManageClinic } from "@/lib/portal-routes";
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
import { ServiceEditorModal, type ServiceDraft } from "./components/ServiceEditorModal";
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
  type CatalogService,
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
  applyWireServices,
  buildConfigUpdatePayload,
  buildProfessionalConfigPayload,
} from "./lib/hub-mapping";
import { catalogRows, alsoAffected, offerService, pendingLinks, unpublished } from "./lib/catalog";
import {
  DEMO_CATALOG,
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
  isHydrating,
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
  type CalendarEnsureResult,
  type PublishResult,
} from "./lib/save";
import {
  createProfessionalCalendars,
  createService,
  disconnectCalendar,
  getProfessionals,
  getServices,
  getTenantConfig,
  isLegacyBackend,
  startCalendarOauth,
  updateHubConfiguration,
  updateProfessionalConfig,
  updateService,
  updateTenantConfig,
  HubApiError,
  HUB_ERROR_SERVICE_ALREADY_EXISTS,
  type HubConfigurationUpdatePayload,
  type ProfessionalCalendarSource,
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
  if (!canManageClinic(session) && session.professionalId) return session.professionalId;
  return roster[0]?.id ?? null;
}

/**
 * What the success toast says. A save can fully succeed and STILL have left
 * work undone — a service that could not be published, a Google calendar that
 * could not be created — and both are things the clinic has to know about,
 * because the configuration they just saved is not doing what they think it is.
 * "Salvo" alone would be technically true and practically a lie.
 */
function saveMessage(
  servicesNotPublished: number,
  calendars: CalendarEnsureResult | null,
): string {
  const base = "Configuração salva — a secretarIA já está atualizada.";
  const notes: string[] = [];
  if (servicesNotPublished > 0) {
    notes.push(
      servicesNotPublished === 1
        ? "1 serviço não entrou no catálogo da clínica; tente salvar de novo."
        : `${servicesNotPublished} serviços não entraram no catálogo da clínica; tente salvar de novo.`,
    );
  }
  if (calendars && calendars.created > 0) {
    notes.push(
      calendars.created === 1
        ? "1 agenda criada na conta do Google da clínica."
        : `${calendars.created} agendas criadas na conta do Google da clínica.`,
    );
  }
  if (calendars && calendars.failed > 0) {
    notes.push(
      calendars.failed === 1
        ? "1 agenda não pôde ser criada; tente salvar de novo."
        : `${calendars.failed} agendas não puderam ser criadas; tente salvar de novo.`,
    );
  }
  // A whole-run refusal (the clinic must reconnect, or connect at all). The
  // mode IS saved and not one agenda exists under it, so staying quiet here
  // reproduces the exact bug the bulk run was built to end: "Conta única"
  // saved, nothing created, and a green toast claiming otherwise. The backend
  // already phrased the reason in pt-BR — repeat it rather than inventing a
  // second wording that could drift from it.
  if (calendars?.blockedMessage) {
    notes.push(calendars.blockedMessage);
  }
  return notes.length > 0 ? base + " " + notes.join(" ") : base;
}

/** A save with leftovers is not a clean success, and must not look like one. */
function successTone(result: {
  servicesNotPublished: number;
  calendars: CalendarEnsureResult | null;
}): "success" | "error" {
  return result.servicesNotPublished > 0 ||
    (result.calendars?.failed ?? 0) > 0 ||
    !!result.calendars?.blockedCode
    ? "error"
    : "success";
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

  // --- deep link: /configuracao?secao=<NavId> ---
  // Opens the page already scrolled to one section. /inicio's owner-only
  // "Convidar equipe" card uses ?secao=prof so the shortcut actually lands on the
  // invite UI instead of the top of an eight-section page.
  //
  // Read from window.location rather than useSearchParams(): under `output:
  // "export"` that hook forces a Suspense boundary around the whole screen, which
  // is a lot of surgery on this file for one optional query param. This component
  // is "use client" and the effect runs after mount, so there is no prerender to
  // bail out of.
  //
  // Fires at most once (the ref), so a later re-render never yanks the page back —
  // but WHEN it fires is the whole difference between working and silently landing
  // short. `scrollTo` clamps to `scrollHeight - clientHeight`, and every section
  // below `prof` is roster/professional-scoped: right after the tenant lands they
  // are still a "Carregando profissionais…" line, no services and a closed week. On
  // a tall viewport that clamp stops above the target, and nothing retries. So the
  // ref is claimed only once the target is genuinely reachable — or once nothing
  // else is coming, in which case scrolling as far as the page allows IS the answer.
  const deepLinkedRef = useRef(false);
  useEffect(() => {
    if (deepLinkedRef.current) return;
    const target = new URLSearchParams(window.location.search).get("secao");
    // Validated against NAV_IDS: an unknown value is ignored, never handed to
    // getElementById to match some unrelated element.
    if (!target || !(NAV_IDS as readonly string[]).includes(target)) {
      deepLinkedRef.current = true; // no deep link on this URL — nothing to retry
      return;
    }
    const el = document.getElementById(target);
    const sc = scrollRef.current;
    if (!el || !sc) return;
    const reachable = el.offsetTop - 16 <= sc.scrollHeight - sc.clientHeight;
    // `tenant.phase !== "idle"` keeps a session-less visitor out: hydrate() bails
    // before dispatching for them, so every scope stays idle and this stays inert.
    const settled = hydration.tenant.phase !== "idle" && !isHydrating(hydration);
    if (!reachable && !settled) return; // more content still landing — try again
    deepLinkedRef.current = true;
    jump(target);
  }, [hydration, jump]);

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

  // Code of the last whole-run calendar refusal, or null. Lives here rather
  // than inside GoogleSection because it is produced by the save (see save.ts's
  // ensureCalendars) and consumed by Section 08: without it the connected card
  // keeps saying "Conectado" over a token that can no longer create agendas,
  // which is true about the connection and false about what it can do.
  const [calendarBlockedCode, setCalendarBlockedCode] = useState<string | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [days, setDays] = useState<DayConfig[]>(closedWeek);
  // The CLINIC's own weekly schedule (tenants.business_hours). Tenant-level,
  // so it rides the tenant slices, not the professional ones — and it is what
  // an inheriting professional's grid displays.
  const [clinicDays, setClinicDays] = useState<DayConfig[]>(closedWeek);
  // Whether `days` / `services` above are this professional's OWN config or the
  // clinic's, inherited. Held as state because the VALUES cannot tell you:
  // an inheriting professional and one who closed every day both render a
  // closed week. Starts "unknown" — nothing has been read back yet.
  const [hoursSource, setHoursSource] = useState<ConfigInheritance>("unknown");
  // The clinic's canonical service catalog — the list Section 06 ticks from.
  // `null` = not read back yet, which is NOT the same as an empty catalog (a
  // real state for a clinic that has never opened this screen), so the section
  // can tell "loading" from "nothing here yet".
  const [catalog, setCatalog] = useState<CatalogService[] | null>(null);
  const [catalogError, setCatalogError] = useState(false);
  // The catalog row open in ServiceEditorModal. `{ service: null }` = creating.
  const [editingService, setEditingService] = useState<{ service: CatalogService | null } | null>(
    null,
  );
  const [savingService, setSavingService] = useState(false);
  const [serviceError, setServiceError] = useState<string | null>(null);
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
    setClinicDays(s.clinicDays);
  }, []);

  const applyProfessionalSlices = useCallback((s: ProfessionalSlices) => {
    setServices(s.services);
    setDays(s.days);
    setProfile(s.profile);
    setHoursSource(s.hoursSource);
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
    applyTenantSlices({
      ...emptyTenantSlices(),
      ctx: DEMO_CTX.forVisitor,
      clinicDays: demoWeek(),
    });
    applyProfessionalSlices({
      services: DEMO_SERVICES.forVisitor,
      days: demoWeek(),
      profile: DEMO_PROFILE.forVisitor,
      // The showcase shows a fully configured professional, so "own" is what a
      // visitor should see — not an inheritance story the demo cannot explain.
      hoursSource: "own",
    });
    setCatalog(DEMO_CATALOG.forVisitor);
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

  // --- catalog: the clinic's canonical service list -------------------------
  // Loaded on its own, and reloaded on its own, because it is CLINIC-scoped,
  // not professional-scoped: switching professional must not refetch it, and a
  // catalog failure must degrade Section 06 alone rather than taking the whole
  // screen read-only. Its own error state is what lets that section offer a
  // retry without a page reload.
  const loadCatalog = useCallback(() => {
    if (hydration.mode !== "authenticated" || !session || !hubTokenReady) return;
    setCatalogError(false);
    getServices(session)
      .then((rows) => {
        setCatalog(applyWireServices(rows));
      })
      .catch((e) => {
        console.error("secretaria configuracao: failed to load the service catalog", e);
        // NOT `[]`: an empty catalog invites "create the first service", and a
        // clinic whose catalog merely failed to load must never be told that.
        setCatalog(null);
        setCatalogError(true);
      });
  }, [hydration.mode, session, hubTokenReady]);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

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

    // The clinic's legacy list is passed so a professional who still INHERITS
    // services opens with what they actually offer ticked, instead of an empty
    // card that the next save would persist as "offers nothing".
    applyProfessionalSlices(
      professionalSlicesFromWire(wire, snapshot.tenant?.appointment_types ?? []),
    );
    dispatch({ type: "professional_loaded", id, rosterGeneration });
  }, [
    hydration.mode,
    hydration.professional.phase,
    hydration.roster.phase,
    hydration.selectedProfessionalId,
    snapshot.professionalsById,
    snapshot.tenant,
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

  // --- Taking over the schedule -------------------------------------------
  // A professional with no hours of their own follows the clinic's, live. That
  // is still a real state on the wire (`business_hours: null`), but it is no
  // longer a mode the user picks: Section 07 shows the clinic's week in their
  // grid and lets them edit it directly.
  //
  // Writing to the grid IS the act of taking over, so it flips the flag here,
  // once, in the same setter. Only from "inherit": "unknown" means the backend
  // never told us which state this is, and asserting "own" on its behalf would
  // be exactly the guess ConfigInheritance exists to refuse (see lib/types.ts).
  //
  // AvailabilitySection always passes a WHOLE week rather than a functional
  // update, precisely because `days` is empty while inheriting — an updater
  // relative to it would drop the other six days on the first edit.
  const setProfessionalDays: Dispatch<SetStateAction<DayConfig[]>> = useCallback((next) => {
    setHoursSource((prev) => (prev === "inherit" ? "own" : prev));
    setDays(next);
  }, []);

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
      // No clinic list passed on purpose: what came back from a SAVE is this
      // professional's own stored value by definition, and seeding from the
      // clinic here would repaint the form with services they just untucked.
      applyProfessionalSlices(professionalSlicesFromWire(wire));
      setSnapshot((prev) => ({
        ...prev,
        tenantId,
        professionalsById: { ...prev.professionalsById, [id]: wire },
      }));
    },
    [applyProfessionalSlices],
  );

  // Publishes the services this professional offers that the clinic's catalog
  // does not know yet — every entry written before the catalog existed, plus
  // anything a colleague's clinic added by hand. Giving them an id is what
  // turns "a string that says Limpeza" into "the clinic's Limpeza", and only
  // then can the backend find a replacement doctor for a cancelled consult.
  //
  // `force: true` is correct here and nowhere else: the near-duplicate check
  // exists to stop someone TYPING a second, near-identical service, and this
  // publishes a service the professional demonstrably already offers. An EXACT
  // duplicate is still impossible — the server answers 409 with the existing
  // row attached, and linking to that row is exactly the right outcome.
  //
  // Never throws: one save button covers eight sections, and a catalog hiccup
  // must not hold the other seven hostage. Whatever failed stays off-catalog
  // and is retried by the next save.
  const publishServices = useCallback(async (): Promise<PublishResult> => {
    const linked = new Map<number, string>();
    let failed = 0;
    // `catalog === null` is "the catalog did not load", not "the clinic has
    // none". Treating it as empty would make EVERY service look off-catalog
    // and publish the professional's whole list as brand-new clinic services.
    // Entries that already carry a service_id still save correctly.
    if (!session || catalog === null) return { linked, failed };

    const rows = catalogRows(catalog, services);

    // Free links first: entries the catalog already covers, matched by name,
    // that simply never had the id written down. No request needed — and
    // without this pass, only the FIRST doctor to save ever gets linked.
    for (const [localId, serviceId] of pendingLinks(rows)) {
      linked.set(localId, serviceId);
    }

    for (const pending of unpublished(rows)) {
      try {
        const created = await createService(
          session,
          { name: pending.name, requirements: pending.requirements.map((r) => r.text) },
          { force: true },
        );
        linked.set(pending.id, created.id);
      } catch (e) {
        const existing =
          e instanceof HubApiError && e.code === HUB_ERROR_SERVICE_ALREADY_EXISTS
            ? (e.detail?.service as { id?: string } | undefined)
            : undefined;
        if (existing?.id) {
          // The clinic already has this service under another spelling. That is
          // a successful link, not a failure — it is the duplicate-collapse the
          // catalog exists to perform.
          linked.set(pending.id, existing.id);
          continue;
        }
        failed += 1;
        console.error("secretaria configuracao: failed to publish a service", e);
      }
    }
    return { linked, failed };
  }, [session, catalog, services]);

  const saveDeps = () => ({
    state: hydration,
    putConfiguration: (body: HubConfigurationUpdatePayload) =>
      updateHubConfiguration(session!, body),
    putTenant: (patch: TenantConfigUpdatePayload) => updateTenantConfig(session!, patch),
    putProfessional: (id: string, patch: ProfessionalConfigUpdatePayload) =>
      updateProfessionalConfig(session!, id, patch),
    buildTenantPatch: () =>
      buildConfigUpdatePayload(
        ctx,
        messages,
        postConsult,
        pixDeposit,
        prefs.defaultDur,
        gcal.mode,
        clinicDays,
      ),
    buildProfessionalPatch: (linked?: Map<number, string>) =>
      buildProfessionalConfigPayload(days, services, profile, hoursSource, linked),
    publishServices,
    // "Conta única da clínica" is a decision about the whole clinic, so acting
    // on it is part of saving it: every active professional that has no
    // dedicated agenda gets one created inside the clinic's Google account.
    // Idempotent, so a save that changes nothing here costs one no-op call.
    shouldEnsureCalendars: gcal.mode === "shared_account",
    ensureCalendars: async () => {
      const result = await createProfessionalCalendars(session!);
      return { created: result.created, already: result.already, failed: result.failed };
    },
    // Only the two whole-clinic refusals carry a `code` (see secretaria-hub's
    // parseHubResponse). Everything else — a 503, a dropped connection — is a
    // transient outage the idempotent retry fixes, and stays silent.
    calendarRefusal: (error: unknown) =>
      error instanceof HubApiError && error.code
        ? { code: error.code, message: error.message }
        : null,
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
      // Newly published services changed who offers what, and the calendar run
      // changed google_calendar_id — both live in the catalog payload the
      // section reads, so re-read it rather than patching it locally.
      loadCatalog();
      // Cleared by any save whose calendar run was NOT refused — including one
      // that never ran, since leaving per_professional makes the reconnect
      // prompt moot. A successful run is the proof the clinic acted on it.
      setCalendarBlockedCode(result.calendars?.blockedCode ?? null);
      emitConfigEvent({ event: "configuration_saved", mode: result.mode, partial: false });
      flash(saveMessage(result.servicesNotPublished, result.calendars), successTone(result));
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

  // --- Catalog service create / edit ----------------------------------------
  // Writes straight through to the clinic catalog rather than waiting for the
  // page's Save: this row belongs to the CLINIC, not to the professional being
  // edited, and holding it hostage to an unrelated eight-section form would
  // mean a colleague cannot see the new service until someone saves everything
  // else too.
  //
  // The dialog has already made a rename or a retirement that reaches other
  // doctors an explicit, named confirmation — see ServiceEditorModal.
  const handleServiceSubmit = useCallback(
    async (draft: ServiceDraft) => {
      if (!session || !editingService) return;
      setSavingService(true);
      setServiceError(null);
      const existing = editingService.service;
      try {
        const payload = {
          name: draft.name,
          description: draft.description || null,
          long_description: draft.longDescription || null,
          requirements: draft.requirements,
          is_active: draft.active,
        };
        const saved = existing
          ? await updateService(session, existing.id, payload)
          : await createService(session, payload);
        setCatalog((prev) => {
          const rows = prev ?? [];
          const next = rows.some((row) => row.id === saved.id)
            ? rows.map((row) => (row.id === saved.id ? applyWireServices([saved])[0] : row))
            : [...rows, applyWireServices([saved])[0]];
          return next;
        });
        // A service the doctor just typed out is one they offer. Making them
        // then hunt for the row and tick it was busywork with a real cost:
        // people closed the dialog, saw the service listed, and left without
        // the box ticked — so the professional offered nothing new and the bot
        // never mentioned it.
        //
        // Only on CREATE, and only for a professional whose config has actually
        // hydrated: ticking into a not-yet-loaded (therefore empty) list would
        // build a payload that wipes whatever the hub holds for them — see
        // lib/hydration.ts. Editing an existing catalog row still changes
        // nothing about who offers it.
        if (!existing && professionalEditable) {
          const row = applyWireServices([saved])[0];
          setServices((prev) =>
            prev.some((svc) => svc.serviceId === row.id)
              ? prev
              : [...prev, offerService(row, prefs.defaultDur, Date.now())],
          );
        }
        setEditingService(null);
      } catch (e) {
        console.error("secretaria configuracao: failed to save the catalog service", e);
        setServiceError(
          e instanceof HubApiError
            ? e.message
            : "Não foi possível salvar o serviço agora. Tente novamente.",
        );
      } finally {
        setSavingService(false);
      }
    },
    [session, editingService, professionalEditable, prefs.defaultDur],
  );

  // --- Descartar: restores the last confirmed snapshot, with zero requests ---
  const currentSlices = useMemo(
    () => ({
      tenant: { ctx, messages, postConsult, pixDeposit, prefs, gcal, clinicDays },
      professional: hydration.selectedProfessionalId
        ? { services, days, profile, hoursSource }
        : null,
    }),
    [
      ctx,
      messages,
      postConsult,
      pixDeposit,
      prefs,
      gcal,
      clinicDays,
      services,
      days,
      profile,
      hoursSource,
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
        ? // Same clinic list hydration used, or Descartar would restore an
          // inheriting professional to an EMPTY services card — a state they
          // were never in, and one the next save would make real.
          professionalSlicesFromWire(
            baselineProfessionalWire,
            confirmed.tenant.appointment_types,
          )
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

  // --- Derived: professional id -> dedicated Google Calendar id, for the
  // "Agenda" completeness chip in shared_account mode. ---
  const googleCalendarIdByProfessional: Record<string, string | null> = Object.fromEntries(
    Object.entries(snapshot.professionalsById).map(([id, p]) => [id, p.google_calendar_id]),
  );

  // --- Derived: professional id -> WHOSE Google credential covers them.
  // `has_calendar` alone cannot answer that: it is equally true for a doctor
  // who connected their own account and for one merely riding the clinic's
  // fallback. Only the first of those may be shown as "Conectado" in
  // per_professional mode — see ProfessionalRow. `undefined` is a backend that
  // predates the field and is handled as "cannot tell", never as "none".
  const calendarSourceByProfessional: Record<string, ProfessionalCalendarSource | undefined> =
    Object.fromEntries(
      Object.entries(snapshot.professionalsById).map(([id, p]) => [id, p.calendar_source]),
    );

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    // .app-screen pins this root to the viewport instead of making it a
    // height:100vh box in normal flow — see app-shell.css (FIX 33). In flow the
    // document stays scrollable even though body{overflow:hidden} removes the
    // scrollbar, so one browser scroll-into-view (focusing a radio pill as the
    // layout collapses under it) parks the whole screen off-viewport, looking
    // blank and frozen, with no way to scroll back.
    <div className="app-screen">
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

      {/* FEAT 42 — the top-right "configure sua secretarIA" toast, same gate as
          /agenda. `fixHref` is null HERE and only here: this IS the screen the
          link points at, and a "Configurar" that reloads the page you are
          already on is a dead affordance. The notice still earns its place —
          it names WHICH professional is unbookable, which this screen does not
          say until you click through to that professional. */}
      <ConfigGapBanner
        session={session}
        enabled={hubCheckReady && !notEntitled}
        fixHref={null}
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
                isOwner={canManageClinic(session)}
                roster={roster}
                rosterError={hydration.roster.phase === "error"}
                selectedId={hydration.selectedProfessionalId}
                onSelect={selectProfessional}
                profile={profile}
                onProfileChange={setProfileK}
                onRosterChanged={reloadRoster}
                googleCalendarMode={gcal.mode}
                googleCalendarIdByProfessional={googleCalendarIdByProfessional}
                calendarSourceByProfessional={calendarSourceByProfessional}
                readOnly={!professionalEditable}
              />
              <ServicesSection
                services={services}
                setServices={setServices}
                catalog={catalog}
                catalogError={catalogError}
                onRetryCatalog={loadCatalog}
                professionalName={selectedProfessionalName}
                defaultDuration={prefs.defaultDur}
                roster={roster}
                selectedProfessionalId={hydration.selectedProfessionalId}
                onEditCatalogService={(service) => {
                  setServiceError(null);
                  setEditingService({ service });
                }}
                readOnly={!professionalEditable}
              />
              <AvailabilitySection
                days={days}
                setDays={setProfessionalDays}
                prefs={prefs}
                setPref={setPrefK}
                professionalName={selectedProfessionalName}
                clinicDays={clinicDays}
                setClinicDays={setClinicDays}
                inheritingHours={hoursSource === "inherit"}
                readOnly={!professionalEditable}
                tenantReadOnly={!tenantEditable}
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
                blockedCode={calendarBlockedCode}
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
        {/* Google Calendar status indicator. This reports the CLINIC's
            connection, which is the whole story only in "conta única". In
            "por profissional" each doctor connects their own (Section 05), so
            a clinic-wide "conecte o Google Calendar" here nagged about a
            connection that mode does not use. */}
        <div style={{
          display: "flex", alignItems: "center", gap: 9,
          fontSize: 13,
          color: gcal.connected ? "var(--st-attend-ink)" : "var(--ink-faint)",
        }}>
          <Icon name={gcal.connected ? "checkCircle" : "clock"} size={16} />
          {gcal.connected
            ? "Google Calendar conectado"
            : gcal.mode === "per_professional"
              ? "Cada profissional conecta a própria agenda em Profissionais"
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

      {/* Catalog service editor. Mounted at the screen root, not inside the
          section, so its overlay covers the sticky save bar too — a dialog you
          can click "Salvar configuração" behind is a dialog that is not modal. */}
      {editingService && (
        <ServiceEditorModal
          service={editingService.service}
          otherNames={(catalog ?? [])
            .filter((row) => row.id !== editingService.service?.id)
            .map((row) => row.name)}
          affected={alsoAffected(
            editingService.service,
            roster,
            hydration.selectedProfessionalId,
          )}
          onCancel={() => setEditingService(null)}
          onSubmit={handleServiceSubmit}
          error={serviceError}
          saving={savingService}
        />
      )}

      {/* auto-dismissing success toast */}
      <CToast toast={toast} />
    </div>
  );
}
