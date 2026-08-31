"use client";
// ===== secretarIA — Agenda page (route entry) =====
// Ported from _design-source/app.jsx.
// This is the App shell: owns all state (theme, view, selection, modal,
// toast) and the CRUD / status handlers that are still wireable.
// Sub-components (Toolbar, Toast) live here; the calendar views, drawer, and
// modals are imported from sibling files.
//
// De-demo note (agenda mock-purge round, 2026-07-22): this page used to seed
// `appts`/`blocks` from _shared/data.ts's SEED_APPTS/SEED_BLOCKS (27 + 7
// fabricated rows) and silently fall back to them whenever a real hub fetch
// failed. Both are gone. This page now only ever renders real secretarIA hub
// data, or an honest empty/error state — never a fabricated appointment, and
// never a "success" toast for a mutation that didn't actually happen.

// CSS tokens required by this screen — must be first imports
import "../product-tokens.css";
import "../app-shell.css";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";

import { useRouter } from "next/navigation";

import { ConfigGapBanner } from "../_components/ConfigGapBanner";
import { PortalHeader } from "../_components/PortalHeader";
import { signOut } from "@/lib/sign-out";
import {
  Icon,
  Btn,
  Segmented,
  IconBtn,
} from "../_shared/ui";
import type { IconName } from "../_shared/ui";
import type { Appt } from "../_shared/data";
import {
  GRID_DAY_COUNT,
  addDays,
  addMonths,
  dayLabelFromKey,
  fromDateKey,
  isSameDay,
  minutesFromMidnight,
  monthGrid,
  monthLabel,
  startOfDay,
  startOfWeek,
  toDateKey,
  weekDays,
  weekPeriodLabel,
} from "../_shared/calendar-dates";

import { WeekView, DayView, MonthView } from "./calendar";
import { Drawer }                        from "./drawer";
import { NewApptModal, BlockModal, CancelModal } from "./modals";

import { HubNotice } from "../_shared/HubNotice";
import { useSecretariaHub } from "../_shared/useSecretariaHub";
import {
  listCalendarEvents,
  createAppointment,
  createBlock as createHubBlock,
  cancelAppointment,
  getCancelPreview,
  HubApiError,
} from "@/lib/secretaria-hub";
import type { CancelPreviewWire } from "@/lib/secretaria-hub";
import { getMe } from "@/lib/manage-api";
import {
  weekIsoRange,
  monthIsoRange,
  slotIsoRangeFromDateKey,
  mapHubEventsToAppts,
  formatBlockSummary,
} from "./lib/hub-mapping";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

type ViewMode = "semana" | "dia" | "mes";

// "edit" / "resched" / "cancel" are intentionally absent — see createAppt/
// createBlock below and drawer.tsx: those actions have no wireable hub
// endpoint yet, so their entry points are disabled rather than opening a
// modal that could only ever fake-mutate local state.
type ModalState =
  | { type: "new" }
  | { type: "block" }
  // Reachable since the read model started returning the local
  // Appointment.id — the drawer only offers the action for a slot that has
  // one (see drawer.tsx's canCancel).
  | { type: "cancel"; appt: Appt; preview: CancelPreviewWire | null }
  | null;

type ToastState = { msg: string; icon?: IconName } | null;

// ---------------------------------------------------------------------------
// Toast — transient notification bar at the bottom of the screen
// ---------------------------------------------------------------------------

/**
 * Floating toast notification displayed after user actions (create, edit, cancel…).
 * Animated in via the product-tokens `popIn` keyframe.
 * Returns null when no toast is active.
 */
function Toast({ toast }: { toast: ToastState }) {
  if (!toast) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 80,
        animation: "popIn .25s var(--ease)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "13px 20px",
          borderRadius: 14,
          background: "#0e564d",
          color: "#eafff4",
          boxShadow: "var(--shadow-lg)",
          fontSize: 14,
          fontWeight: 500,
          maxWidth: 460,
        }}
      >
        {/* icon bubble */}
        <span
          style={{
            width: 26,
            height: 26,
            borderRadius: 99,
            background: "rgba(255,255,255,.16)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon name={toast.icon ?? "check"} size={15} />
        </span>
        {toast.msg}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar — view switcher, navigation, and primary action buttons
// ---------------------------------------------------------------------------

/**
 * Top bar below the Header.
 * Contains: prev/next chevrons, "Hoje" button, current period label,
 * view segmented control, "Bloquear" and "Nova consulta" action buttons.
 */
function Toolbar({
  view,
  setView,
  onNew,
  onBlock,
  onPrev,
  onNext,
  onToday,
  periodLabel,
  sub,
  disabled,
}: {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  onNew: () => void;
  onBlock: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  // Both labels are computed by the page from the anchor date and passed in —
  // they used to be built here from MONTH_LABEL/PERIOD_LABEL/dayFull plus a
  // third, independently hardcoded "Junho de 2026" literal, none of which had
  // any connection to the week actually being fetched. Empty before the anchor
  // is set on mount, which keeps the prerendered HTML and the first client
  // render identical.
  periodLabel: string;
  sub: string;
  // True whenever the real hub isn't usable (no session, not entitled,
  // unavailable, or hub not configured in this environment) — creating here
  // would only be able to fake-mutate local state, so both action buttons
  // stay disabled instead of opening a modal that could never really submit.
  disabled: boolean;
}) {
  const disabledHint = disabled
    ? "Disponível quando a agenda real estiver conectada."
    : undefined;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        padding: "14px 26px",
        borderBottom: "1px solid var(--line)",
        flexShrink: 0,
        flexWrap: "wrap",
        rowGap: 12,
      }}
    >
      {/* left cluster: navigation + period label */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Period navigation. These two were rendered with no onClick at all —
            a visible control that taught the secretary the agenda simply does
            not navigate. They now step by the unit the active view shows. */}
        <div style={{ display: "flex", gap: 4 }}>
          <IconBtn
            icon="chevL"
            title={view === "mes" ? "Mês anterior" : view === "dia" ? "Dia anterior" : "Semana anterior"}
            onClick={onPrev}
          />
          <IconBtn
            icon="chevR"
            title={view === "mes" ? "Próximo mês" : view === "dia" ? "Próximo dia" : "Próxima semana"}
            onClick={onNext}
          />
        </div>
        <Btn
          variant="outline"
          size="sm"
          onClick={onToday}
          style={{ borderRadius: 11 }}
        >
          Hoje
        </Btn>
        <div>
          <div
            style={{
              fontSize: 19,
              fontWeight: 600,
              fontFamily: "var(--font-serif)",
              color: "var(--ink)",
              lineHeight: 1.15,
            }}
          >
            {periodLabel}
          </div>
          {sub && (
            <div
              style={{ fontSize: 12, color: "var(--ink-faint)", marginTop: -1 }}
            >
              {sub}
            </div>
          )}
        </div>
      </div>

      {/* flexible spacer */}
      <div style={{ flex: 1 }} />

      {/* right cluster: view toggle + action buttons */}
      <Segmented<ViewMode>
        value={view}
        onChange={setView}
        size="sm"
        options={[
          { value: "dia",    label: "Dia" },
          { value: "semana", label: "Semana" },
          { value: "mes",    label: "Mês" },
        ]}
      />
      <Btn
        variant="outline"
        size="sm"
        icon="ban"
        onClick={onBlock}
        disabled={disabled}
        title={disabledHint}
        style={{ borderRadius: 11 }}
      >
        Bloquear
      </Btn>
      <Btn
        variant="primary"
        size="sm"
        icon="plus"
        onClick={onNew}
        disabled={disabled}
        title={disabledHint}
        style={{ borderRadius: 11 }}
      >
        Nova consulta
      </Btn>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AgendaPage — route entry / App shell
// ---------------------------------------------------------------------------

/**
 * secretarIA Agenda screen.
 * Owns: calendar view, selection, modal, and toast state. The chrome (brand,
 * theme toggle, account, Sair) is the shared PortalHeader, reused as-is from
 * brain-frontend so it renders the same chrome as the rest of the Brain
 * product family.
 */
export default function AgendaPage() {
  const router = useRouter();

  // --- Calendar state ---
  const [view, setView]     = useState<ViewMode>("semana");

  // The anchor: the day the screen is focused on. Every date on this route —
  // the column headers, the period label, the month grid, the day picker in
  // both modals, the WhatsApp confirmation text, and the ISO window sent to
  // the hub — is derived from this one value, so they cannot disagree.
  //
  // It starts null and is filled in on mount rather than initialised with
  // `new Date()`. This route is a static export (next.config.mjs sets
  // `output: "export"`), so its HTML is generated at BUILD time: reading the
  // clock during render would bake the deploy date into out/agenda/index.html
  // and then contradict it on the client — the same bug that is being fixed
  // here, just with a fresher wrong date, plus a hydration mismatch.
  const [anchor, setAnchor] = useState<Date | null>(null);
  // Real "today", kept separately from the anchor so navigating away from this
  // week doesn't move the today highlight.
  const [today, setToday] = useState<Date | null>(null);
  // Minutes since midnight, for the red "now" rule. Was a frozen 11:22.
  const [nowMin, setNowMin] = useState(0);

  useEffect(() => {
    const now = new Date();
    setToday(startOfDay(now));
    setAnchor(startOfDay(now));
    setNowMin(minutesFromMidnight(now));
    // Keep the rule moving, and roll the today highlight over at midnight for
    // a tab left open — a clinic's agenda screen commonly is.
    const timer = setInterval(() => {
      const n = new Date();
      setNowMin(minutesFromMidnight(n));
      setToday((prev) => (prev && isSameDay(prev, n) ? prev : startOfDay(n)));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);
  // Permanently-empty fallback for `items` below (no setter — nothing writes
  // to it). The demo-seed rows and the local-only "fabricate a row" create
  // paths are gone; this route only ever shows REAL hub data or nothing.
  const [appts] = useState<Appt[]>([]);
  const [selected, setSelected] = useState<Appt | null>(null);
  const [modal, setModal]   = useState<ModalState>(null);
  const [toast, setToast]   = useState<ToastState>(null);

  // Ref used to hold the auto-dismiss timer for the toast
  const toastRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // --- secretarIA hub: entitlement-gated real data path ---
  const { session, ready: hubCheckReady, notEntitled, unavailable, hubTokenReady, retry } = useSecretariaHub();
  // Real events for the current week, once a hub fetch has succeeded. null
  // means "no real fetch has succeeded yet" — the grid then falls back to
  // `appts`, which is always empty (see above): no session, no entitlement,
  // an unreachable hub, and a still-pending fetch all render the SAME honest
  // empty grid, never fabricated rows.
  const [hubAppts, setHubAppts] = useState<Appt[] | null>(null);
  const [hubFetchFailed, setHubFetchFailed] = useState(false);

  // Real clinic name (item 9 of the mock-purge round) — fetched once via
  // GET /auth/me when a session exists, same source Header.tsx uses for its
  // own de-demo identity. Stays "" while logged out or before the fetch
  // settles; NewApptModal's message preview falls back to generic phrasing
  // rather than ever showing a hardcoded demo clinic name.
  const [clinicName, setClinicName] = useState("");
  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getMe(session)
      .then((data) => {
        if (!cancelled) setClinicName(data.tenant?.clinic_name ?? "");
      })
      .catch(() => {
        // Expired/invalid session — HubNotice already surfaces a notice; the
        // message preview just keeps the generic fallback phrasing.
      });
    return () => {
      cancelled = true;
    };
  }, [session]);

  // --- Everything below is derived from the anchor ---

  const weekStart = useMemo(() => (anchor ? startOfWeek(anchor) : null), [anchor]);
  const anchorKey = useMemo(() => (anchor ? toDateKey(anchor) : ""), [anchor]);

  // The seven real columns of the week on screen.
  const days = useMemo(
    () => (weekStart && today ? weekDays(weekStart, today) : []),
    [weekStart, today],
  );
  const monthCells = useMemo(
    () => (anchor && today ? monthGrid(anchor, today) : []),
    [anchor, today],
  );
  const anchorDay = useMemo(
    () => days.find((d) => d.iso === anchorKey),
    [days, anchorKey],
  );

  // The window to fetch, following whatever the active view actually shows.
  // The month view asks for its whole grid rather than reusing the week
  // window: now that its cells carry real dates, an empty cell is read as
  // "nothing booked that day", and with one week loaded most cells would be
  // making that claim without the hub ever having been asked.
  const range = useMemo(() => {
    if (!anchor) return null;
    return view === "mes" ? monthIsoRange(anchor) : weekIsoRange(startOfWeek(anchor));
  }, [anchor, view]);

  const periodLabel = !anchor
    ? ""
    : view === "dia"
      ? dayLabelFromKey(anchorKey)
      : view === "mes"
        ? monthLabel(anchor)
        : weekStart
          ? weekPeriodLabel(weekStart)
          : "";
  // Carries the year, which the week/day label alone doesn't.
  const sub = !anchor || view === "mes" ? "" : monthLabel(anchor);

  // Refetches the real calendar events for the visible range. Shared by the
  // load effect below AND by createAppt/createBlock after a successful hub
  // write, so the grid always reflects what secretarIA's Calendar actually
  // holds instead of a fabricated local row. Also wired to the "Tentar
  // novamente" retry button on the fetch-failure banner below.
  const reloadRange = useCallback(() => {
    if (!session || !range) return Promise.resolve();
    const { startIso, endIso } = range;
    return listCalendarEvents(session, startIso, endIso)
      .then((events) => {
        setHubAppts(mapHubEventsToAppts(events));
        setHubFetchFailed(false);
      })
      .catch((e) => {
        console.error("secretaria hub: failed to load calendar events", e);
        setHubAppts(null);
        setHubFetchFailed(true);
      });
  }, [session, range]);

  // Load real calendar events when the hub becomes usable, and again whenever
  // the visible range moves (navigating weeks/months, or switching view).
  // RESCHEDULE/EDIT/status-change stay disabled everywhere — see the
  // TODO(hub-write) note in hub-mapping.ts and drawer.tsx (blocked on
  // secretarIA exposing a richer read model, not a frontend gap).
  useEffect(() => {
    if (!hubTokenReady || !session) return;
    reloadRange();
  }, [hubTokenReady, session, reloadRange]);

  // --- Navigation ---

  /** Steps the anchor by the unit the active view displays. */
  const step = useCallback(
    (dir: 1 | -1) => {
      setAnchor((prev) => {
        if (!prev) return prev;
        if (view === "mes") return addMonths(prev, dir);
        if (view === "dia") return addDays(prev, dir);
        return addDays(prev, dir * GRID_DAY_COUNT);
      });
    },
    [view],
  );

  // ---------------------------------------------------------------------------
  // flash — shows a toast then auto-dismisses after 3.4 s
  // ---------------------------------------------------------------------------

  const flash = useCallback((msg: string, icon?: IconName) => {
    setToast({ msg, icon });
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(() => setToast(null), 3400);
  }, []);

  // Combined list used by all three calendar views. `appts` is permanently
  // empty (see above), so this is real hub data when a fetch has succeeded,
  // or an honest empty grid otherwise. Blocks no longer need a separate local
  // array — hub-mapping.ts classifies real "Bloqueado" events inline, so they
  // arrive already mixed into `hubAppts`.
  const items = useMemo(() => hubAppts ?? appts, [hubAppts, appts]);

  // Keep the drawer in sync when the underlying appointment is mutated
  const liveSelected = selected
    ? items.find((i) => i.id === selected.id) ?? null
    : null;

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  /**
   * Cancel a real consultation through the hub.
   *
   * Only reachable for a slot carrying a local `appointmentId` (the drawer
   * gates on it), because the endpoint keys on that id and the Google event
   * deletion it performs is irreversible — cancelling the wrong consultation
   * is not something a refetch can undo.
   *
   * `justification` is the doctor's reason, NOT the message body: secretarIA
   * renders the standard "O médico X desmarcou a sua consulta!" text and only
   * appends the quoted justification when there is one. An empty string is a
   * valid, supported cancellation — the patient is notified either way — so it
   * is sent as null rather than being treated as a missing field.
   */
  /**
   * Open the cancel modal, having first asked what notifying would cost.
   *
   * The preview is fetched HERE rather than inside the modal so the modal
   * stays a pure render of state it is handed. A failed lookup opens the modal
   * with `null` — cancelling must not be blocked by a read that is only there
   * to price the notification, and the modal says outright that it could not
   * check rather than implying the notice is free.
   */
  const openCancel = async (appt: Appt) => {
    if (!hubTokenReady || !session || !appt.appointmentId) {
      flash("A agenda real não está disponível agora.", "xCircle");
      return;
    }
    let preview: CancelPreviewWire | null = null;
    try {
      preview = await getCancelPreview(session, appt.appointmentId);
    } catch (e) {
      console.error("secretaria hub: failed to read cancel preview", e);
    }
    setModal({ type: "cancel", appt, preview });
  };

  const cancelAppt = async (
    appt: Appt,
    justification: string,
    notifyOutsideWindow: boolean,
  ) => {
    if (!hubTokenReady || !session || !appt.appointmentId) {
      // Defensive only — the drawer disables the trigger in each of these cases.
      flash("A agenda real não está disponível agora.", "xCircle");
      return;
    }
    try {
      await cancelAppointment(session, appt.appointmentId, {
        confirm: true,
        justification: justification || null,
        notify_outside_window: notifyOutsideWindow,
      });
      setModal(null);
      setSelected(null);
      await reloadRange();
      // Only claim the patient was told when a notice could actually go out:
      // outside the 24h window with the paid send declined, nothing is sent,
      // and saying otherwise would be a lie the doctor acts on.
      const notified = modal?.type === "cancel"
        ? (modal.preview?.inside_window ?? true) || notifyOutsideWindow
        : true;
      flash(
        notified
          ? "Consulta cancelada. O paciente foi avisado."
          : "Consulta cancelada. O paciente NÃO foi avisado.",
        notified ? "check" : "xCircle",
      );
    } catch (e) {
      console.error("secretaria hub: failed to cancel appointment", e);
      const notice =
        e instanceof HubApiError && e.status === 409
          ? "Esta consulta já estava cancelada."
          : "Não foi possível cancelar. Tente novamente.";
      flash(notice, "xCircle");
      // Keep the modal open on failure — never show a cancelled row that isn't.
    }
  };

  /**
   * Persist a newly created appointment. Only reachable when hubTokenReady (the
   * Toolbar's "Nova consulta" trigger is disabled otherwise — see below), so
   * this always creates a REAL Google Calendar event via
   * POST /tenants/me/calendar/appointments and refetches the week instead of
   * fabricating a local row. The hub endpoint does not send a WhatsApp
   * message, so the success flash never claims one was sent.
   */
  const createAppt = async (data: Omit<Appt, "id">, _message: string | null) => {
    if (!hubTokenReady || !session) {
      // Defensive only — the trigger that opens this modal is disabled
      // whenever hubTokenReady is false, so this should be unreachable.
      flash("A agenda real não está disponível agora.", "xCircle");
      return;
    }
    const { startIso, endIso } = slotIsoRangeFromDateKey(data.date, data.start, data.dur);
    const summary = [data.type, data.patient].filter(Boolean).join(" — ") || "Consulta";
    try {
      await createAppointment(session, {
        start: startIso,
        end: endIso,
        summary,
        description: data.notes || undefined,
        phone: data.phone || null,
      });
      setModal(null);
      await reloadRange();
      flash("Consulta criada na agenda.", "check");
    } catch (e) {
      console.error("secretaria hub: failed to create appointment", e);
      const notice =
        e instanceof HubApiError && e.status === 422
          ? "Conecte o Google Calendar nas Configurações secretarIA para criar consultas reais."
          : "Não foi possível criar na agenda real. Tente novamente.";
      flash(notice, "xCircle");
      // Keep the modal open on failure — do not fake a local success row.
    }
  };

  /**
   * Add a new time block to the calendar. Only reachable when hubTokenReady (the
   * Toolbar's "Bloquear" trigger is disabled otherwise — see below), so this
   * always blocks the slot for real via POST /tenants/me/calendar/blocks and
   * refetches the week. The summary is tagged with the "Bloqueado" prefix
   * hub-mapping.ts's isBlockSummary recognises, so the block round-trips as a
   * real bloqueio item instead of a generic appointment on the next fetch.
   */
  const createBlock = async (data: {
    date: string;
    start: number;
    dur: number;
    reason: string;
  }) => {
    if (!hubTokenReady || !session) {
      // Defensive only — the trigger that opens this modal is disabled
      // whenever hubTokenReady is false, so this should be unreachable.
      flash("A agenda real não está disponível agora.", "xCircle");
      return;
    }
    const { startIso, endIso } = slotIsoRangeFromDateKey(data.date, data.start, data.dur);
    try {
      await createHubBlock(session, {
        start: startIso,
        end: endIso,
        summary: formatBlockSummary(data.reason),
      });
      setModal(null);
      await reloadRange();
      flash(`Horário bloqueado: ${data.reason}.`, "ban");
    } catch (e) {
      console.error("secretaria hub: failed to create block", e);
      const notice =
        e instanceof HubApiError && e.status === 422
          ? "Conecte o Google Calendar nas Configurações secretarIA para bloquear horários reais."
          : "Não foi possível bloquear na agenda real. Tente novamente.";
      flash(notice, "xCircle");
      // Keep the modal open on failure — do not fake a local success row.
    }
  };

  /**
   * Navigate to DayView for a specific date.
   *
   * Takes a date key rather than a column index, so a click on any month cell
   * — not just the six the old hardcoded grid gave an index to — moves the
   * anchor to that actual day.
   */
  const goDay = (dateKey: string) => {
    setAnchor(fromDateKey(dateKey));
    setView("dia");
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    // .app-screen pins this root to the viewport instead of making it a
    // height:100vh box in normal flow — see app-shell.css (FIX 33). Same
    // exposure as Configuração: in flow the document stays scrollable behind
    // body{overflow:hidden}, so a single browser scroll-into-view can park the
    // screen off-viewport with no way to scroll back.
    <div className="app-screen">
      {/* The admin "Modo médico" impersonation switch lives in the Brain
          portal header, not here — this app has no admin surface. */}
      <PortalHeader
        portalLabel="Clínica"
        userLabel={session?.email || clinicName || "Brain"}
        // Only with a session: this screen doubles as a demo showcase for a
        // visitor who never signed in, and "Sair" is an account affordance with
        // no account behind it. Absent handler = no button (see PortalHeader).
        onLogout={session ? () => signOut((path) => router.push(path)) : undefined}
        product="secretaria"
        // The screen below is a height:100vh flex column with its own internal
        // scroll area, so the header is already pinned without `position: sticky`.
        sticky={false}
      />

      <main
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        {/* These three banners live INSIDE <main>, not beside it: as siblings
            of <main> they were page content in no landmark at all, which is
            the single `region` violation axe reported on this screen. */}
        {/* FEAT 42 — the top-right "configure sua secretarIA" toast. This screen
            also serves a session-less demo visitor, and the banner renders nothing
            without a session, so no gate is needed for that. `enabled` waits for
            the entitlement check to SETTLE and refuses a 403 tenant: a demo
            showcase must never nag a visitor about a product they do not have. */}
        <ConfigGapBanner
          session={session}
          enabled={hubCheckReady && !notEntitled}
          fixHref="/configuracao?secao=prof"
        />

        {/* no session / not entitled / hub unavailable / hub not configured */}
        <HubNotice
          session={session}
          notEntitled={notEntitled}
          ready={hubCheckReady}
          unavailable={unavailable}
          onRetry={retry}
        />

        {/* honest error state when hubTokenReady but the events fetch itself failed —
            distinct from HubNotice's `unavailable` (token mint never succeeded) */}
        {hubFetchFailed && (
          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              margin: "0 26px 12px",
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--st-pending-bg, #fff6e5)",
              border: "1px solid var(--st-pending-bd, #f2d98a)",
              color: "var(--st-pending-ink, #9a6b00)",
              fontSize: 12.5,
            }}
          >
            <Icon name="clock" size={15} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Não foi possível carregar a agenda.</span>
            <Btn
              variant="outline"
              size="sm"
              onClick={() => { void reloadRange(); }}
              style={{ flexShrink: 0 }}
            >
              Tentar novamente
            </Btn>
          </div>
        )}

        <Toolbar
          view={view}
          setView={setView}
          periodLabel={periodLabel}
          sub={sub}
          onNew={() => setModal({ type: "new" })}
          onBlock={() => setModal({ type: "block" })}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
          onToday={() => {
            setAnchor(today ?? startOfDay(new Date()));
            // From month view, jump back to week instead of staying in month
            if (view === "mes") setView("semana");
          }}
          disabled={!hubTokenReady}
        />

        {/* The grid renders once the anchor exists (set on mount — see the
            state block). Until then this is deliberately empty so the
            prerendered HTML and the first client render match. */}
        {anchor && view === "semana" && (
          <WeekView
            days={days}
            items={items}
            onSelect={setSelected}
            onDayClick={goDay}
            nowMin={nowMin}
          />
        )}
        {anchor && view === "dia" && anchorDay && (
          <DayView
            day={anchorDay}
            items={items}
            onSelect={setSelected}
            nowMin={nowMin}
          />
        )}
        {anchor && view === "mes" && (
          <MonthView cells={monthCells} items={items} onDayClick={goDay} />
        )}
      </main>

      {/* Detail drawer — shows only when an item is selected. Read-only:
          every item shown here comes from the hub, and the hub only supports
          create so far — see drawer.tsx. */}
      {liveSelected && (
        <Drawer
          appt={liveSelected}
          onClose={() => setSelected(null)}
          onCancel={openCancel}
        />
      )}

      {/* Modals — one rendered at a time based on modal.type. Edit and
          Reschedule are still unreachable (their drawer triggers stay
          disabled); Cancel is wired — see drawer.tsx. */}
      {modal?.type === "new" && (
        <NewApptModal
          days={days}
          presetDate={view === "dia" ? anchorKey : undefined}
          onClose={() => setModal(null)}
          onCreate={createAppt}
          clinicName={clinicName}
        />
      )}
      {modal?.type === "block" && (
        <BlockModal
          days={days}
          presetDate={view === "dia" ? anchorKey : undefined}
          onClose={() => setModal(null)}
          onCreate={createBlock}
        />
      )}
      {modal?.type === "cancel" && (
        <CancelModal
          appt={modal.appt}
          preview={modal.preview}
          onClose={() => setModal(null)}
          onConfirm={cancelAppt}
        />
      )}

      <Toast toast={toast} />
    </div>
  );
}
