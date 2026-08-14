// secretaria-hub — typed client for secretarIA's doctor-hub API. Base URL is
// env-driven (NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL); no hardcoded domain.
// Mirrors lib/manage-api.ts's style, but auth works differently: every call
// here needs a short-lived, purpose-scoped "hub token" minted by brain-api
// (see getSecretariaHubToken in lib/manage-api.ts), NOT the brain-api user JWT.
// The hub token is kept in module memory only (never sessionStorage/localStorage)
// and re-minted on demand — it is intentionally not refreshable.
//
// Endpoints consumed here (see secretarIA src/secretaria/api/hub/*.py):
//   GET  /tenants/me/config                                   -> getTenantConfig
//   PUT  /tenants/me/config                                   -> updateTenantConfig
//   GET  /tenants/me/calendar/events?start=&end=               -> listCalendarEvents
//   POST /tenants/me/calendar/appointments                     -> createAppointment
//   POST /tenants/me/calendar/appointments/{id}/cancel         -> cancelAppointment
//   POST /tenants/me/calendar/appointments/{id}/reschedule     -> rescheduleAppointment
//   POST /tenants/me/calendar/blocks                           -> createBlock
//   GET  /tenants/me/calendar/oauth/start                      -> startCalendarOauth
//   POST /tenants/me/calendar/disconnect                       -> disconnectCalendar
//   POST /tenants/me/professionals/{id}/calendar                -> createProfessionalCalendar

import {
  getSecretariaHubToken,
  ManageApiError,
  type Session,
} from "./manage-api";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// Base URL for secretarIA's hub API. Empty in dev unless configured — callers
// should check hubConfigured() before attempting a call. Trailing slashes are
// stripped so `SECRETARIA_HUB_BASE + "/tenants/me/config"` never doubles a "/".
export const SECRETARIA_HUB_BASE = (
  process.env.NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL ?? ""
).replace(/\/+$/, "");

// Whether a hub base URL is configured at all. Pages use this (combined with
// entitlement) to decide whether the real data path is available.
export function hubConfigured(): boolean {
  return SECRETARIA_HUB_BASE.length > 0;
}

// ---------------------------------------------------------------------------
// Token management — module-memory cache + single-flight mint
// ---------------------------------------------------------------------------

// Refuse to hand out a token with less than this much life left; the caller
// would likely lose the race with the request round-trip otherwise.
const TOKEN_SAFETY_MARGIN_MS = 30_000;

type CachedToken = { token: string; expiresAt: number };

// Keyed by the OWNING session's identity (tenantId + brain-api access token),
// never just "the last one minted". Login is a client-side route push (no
// full page reload — app/(SignOut)/login/page.tsx), so a single browser tab
// can hold hub tokens for more than one account/tenant within the same
// 60-minute HUB_TOKEN_EXPIRE_MINUTES window (e.g. testing an old clinic, then
// logging into a new one). A single unkeyed cache would silently keep serving
// the FIRST tenant's token to every later session — every hub GET/PUT would
// read/write the wrong clinic's config with no error surfaced anywhere.
const tokenCache = new Map<string, CachedToken>();
const mintsInFlight = new Map<string, Promise<string>>();

function sessionKey(session: Session): string {
  return `${session.tenantId}:${session.token}`;
}

async function mintHubToken(session: Session, key: string): Promise<string> {
  const { hubToken, expiresIn } = await getSecretariaHubToken(session);
  tokenCache.set(key, { token: hubToken, expiresAt: Date.now() + expiresIn * 1000 });
  return hubToken;
}

// Returns a live hub token, minting a fresh one via brain-api when this
// session's cache entry is empty or about to expire. Concurrent callers for
// the SAME session share one in-flight mint. Throws ManageApiError (notably
// 403 `secretaria_not_entitled`) when brain-api refuses to mint.
export async function getHubToken(session: Session): Promise<string> {
  const key = sessionKey(session);
  const cached = tokenCache.get(key);
  if (cached && cached.expiresAt - Date.now() > TOKEN_SAFETY_MARGIN_MS) {
    return cached.token;
  }
  let inFlight = mintsInFlight.get(key);
  if (!inFlight) {
    inFlight = mintHubToken(session, key).finally(() => {
      mintsInFlight.delete(key);
    });
    mintsInFlight.set(key, inFlight);
  }
  return inFlight;
}

// Drop this session's cached token so the next getHubToken() call mints
// fresh. Used by hubFetch's 401 retry path.
function invalidateHubToken(session: Session): void {
  tokenCache.delete(sessionKey(session));
}

// ---------------------------------------------------------------------------
// Low-level fetch
// ---------------------------------------------------------------------------

// Error carrying the HTTP status, same shape as ManageApiError. `.message` is
// FastAPI's `detail` — normally a plain string, but a few endpoints (the
// per-professional calendar creation errors below) send a structured
// `{code, message}` object instead so callers can branch without parsing
// prose. `.code` is only ever set for those; every other hub error keeps
// working exactly as before (`.message` a plain string, `.code` undefined).
export class HubApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.name = "HubApiError";
    this.status = status;
    this.code = code;
  }
}

// Known structured error codes from POST .../professionals/{id}/calendar
// (see createProfessionalCalendar below) — exported so callers can branch
// on HubApiError.code without hardcoding the string twice.
export const HUB_ERROR_CLINIC_CALENDAR_NOT_CONNECTED = "clinic_calendar_not_connected";
export const HUB_ERROR_GOOGLE_RECONNECT_REQUIRED = "google_reconnect_required";

async function rawHubFetch(
  path: string,
  token: string,
  opts: RequestInit = {},
): Promise<Response> {
  return fetch(SECRETARIA_HUB_BASE + path, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
      ...(opts.headers || {}),
    },
  });
}

async function parseHubResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const rawDetail: unknown = body?.detail;
    let message: string;
    let code: string | undefined;
    if (typeof rawDetail === "string") {
      // The common shape — every hub error except the two below.
      message = rawDetail;
    } else if (
      rawDetail &&
      typeof rawDetail === "object" &&
      typeof (rawDetail as { message?: unknown }).message === "string"
    ) {
      // Structured {code, message} shape (calendar creation 422/409).
      message = (rawDetail as { message: string }).message;
      const rawCode = (rawDetail as { code?: unknown }).code;
      code = typeof rawCode === "string" ? rawCode : undefined;
    } else {
      message = res.statusText;
    }
    throw new HubApiError(res.status, message, code);
  }
  // 204 (e.g. disconnect on some deployments) has no body.
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// hubFetch — mints/reuses the hub token and calls the hub API. On a 401 it
// invalidates the cached token, mints ONCE fresh, and retries ONCE; a second
// 401 (or any other non-2xx, e.g. a 403 entitlement refusal) throws. Never loops.
export async function hubFetch<T>(
  session: Session,
  path: string,
  opts: RequestInit = {},
): Promise<T> {
  const token = await getHubToken(session);
  const res = await rawHubFetch(path, token, opts);
  if (res.status === 401) {
    invalidateHubToken(session);
    const fresh = await getHubToken(session);
    const retryRes = await rawHubFetch(path, fresh, opts);
    return parseHubResponse<T>(retryRes);
  }
  return parseHubResponse<T>(res);
}

// Re-export so callers can branch on the token-mint error without importing
// manage-api directly just for this.
export { ManageApiError };

// ---------------------------------------------------------------------------
// Wire types — mirror secretarIA's pydantic schemas (snake_case on the wire)
// ---------------------------------------------------------------------------

export type TimeWindowWire = { start: string; end: string }; // "HH:MM"

// Google Calendar integration mode (Onboarding & Multi-Professional follow-up).
// "per_professional" (default): each professional may connect their own Google
// account — unchanged single-professional-era behavior. "shared_account": the
// clinic connects ONE Google account and every professional gets a secondary
// calendar CREATED by the backend inside that account (see
// createProfessionalCalendar below). Switching modes is non-destructive on the
// backend — it only changes which flow is offered going forward.
export type GoogleCalendarMode = "per_professional" | "shared_account";

export type AppointmentTypeWire = {
  name: string;
  description: string | null;
  duration_min: number;
  is_active: boolean;
  sort_order: number;
  price: string | null;
  long_description: string | null;
  // Pre-visit instructions shown to the patient when booking this type (e.g.
  // fasting, documents to bring). Same shape on read and write.
  requirements: string[];
};

// Structured clinic address (Onboarding & Multi-Professional contract §10).
// Every field optional — the clinic may fill in only what it knows.
export type AddressWire = {
  line?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
};

// GET/PUT /tenants/me/config response (schemas/config.py::TenantConfigRead).
//
// `greeting_buttons` REMOVED (2026-08 round): the WhatsApp first-contact
// buttons are no longer clinic-editable text. secretarIA now ships a FIXED
// product-level set — [Agendar] [Gerenciar consulta] [Outro] since the
// trio-gerenciar round — routed server-side (Agendar/Gerenciar
// deterministically; Outro is the explicit LLM hand-off). GET no longer
// returns the field at all, and PUT silently ignores it if a caller still
// sends it (never persisted). See FIXED_GREETING_BUTTONS in
// configuracao/components/MessagesSection.tsx for the local, read-only
// display of this fixed set.
export type TenantConfigWire = {
  clinic_name: string;
  greeting_message: string | null; // capped at 1024 chars server-side
  returning_greeting_message: string | null; // capped at 1024 chars server-side
  // Ready-made message the secretary sends/uses right after a patient's
  // consult (send automation comes later; today it is stored + surfaced).
  post_consult_message: string | null;
  // Reference knowledge the AI consults to ANSWER patient questions after a
  // consult (recovery care, when to book the return visit, how exam results
  // are delivered) — not sent verbatim.
  post_consult_knowledge: string | null;
  language: string;
  timezone: string;
  google_calendar_id: string;
  appointment_duration_min: number;
  business_hours: Record<string, TimeWindowWire[]>;
  appointment_types: AppointmentTypeWire[];
  initial_flows: Record<string, unknown>;
  is_active: boolean;
  // True when a Google Calendar refresh token is stored for this tenant.
  calendar_connected: boolean;
  // Which Google Calendar integration flow this tenant uses — see
  // GoogleCalendarMode above. Defaults to "per_professional" server-side.
  google_calendar_mode: GoogleCalendarMode;
  // Structured clinic address (Feature 1) — null when never filled in.
  address: AddressWire | null;
  // Accepted health-insurance plan names (Feature 3).
  insurances: string[] | null;
  // When true, secretarIA asks the patient about their convênio during booking.
  collect_insurance: boolean;
  // Pix deposit policy ("Sinal via Pix" section) — charges a partial deposit
  // via Asaas when the appointment is booked. The backend only actually
  // charges while the add-on is active on the plan; these fields stay
  // readable/writable regardless, so the policy can be prepared in advance.
  pix_deposit_enabled: boolean;
  pix_deposit_percent: number;
  pix_refund_window_hours: number;
  pix_retention_policy: "total" | "partial";
  pix_partial_refund_percent: number;
  pix_reschedule_limit: number;
  // Whether the tenant has a live Asaas (PSP) connection — READ-ONLY, derived
  // by the backend. The Asaas API key itself is provisioned by the Brain team
  // during onboarding and is never exposed to or editable from this form.
  asaas_connected: boolean;
};

// PUT /tenants/me/config body (schemas/config.py::TenantConfigUpdate) — every
// field optional, partial update (backend applies exclude_unset semantics).
export type TenantConfigUpdatePayload = Partial<{
  greeting_message: string | null;
  returning_greeting_message: string | null;
  post_consult_message: string | null;
  post_consult_knowledge: string | null;
  language: string;
  timezone: string;
  google_calendar_id: string;
  appointment_duration_min: number;
  business_hours: Record<string, TimeWindowWire[]>;
  appointment_types: AppointmentTypeWire[];
  initial_flows: Record<string, unknown>;
  is_active: boolean;
  address: AddressWire | null;
  insurances: string[] | null;
  collect_insurance: boolean;
  pix_deposit_enabled: boolean;
  pix_deposit_percent: number;
  pix_refund_window_hours: number;
  pix_retention_policy: "total" | "partial";
  pix_partial_refund_percent: number;
  pix_reschedule_limit: number;
  google_calendar_mode: GoogleCalendarMode;
  // asaas_connected is READ-ONLY (TenantConfigWire only) — intentionally
  // absent here; it can never be part of a PUT body.
}>;

// GET /tenants/me/calendar/events item (schemas/calendar.py::CalendarEventRead).
export type CalendarEventWire = {
  id: string;
  summary: string | null;
  start: string;
  end: string;
};

// AppointmentStatus enum values (models/appointment.py::AppointmentStatus).
export type AppointmentStatusWire =
  | "scheduled"
  | "cancelled"
  | "rescheduled"
  | "confirmed"
  | "attended"
  | "no_show";

// AppointmentRead response shared by create/cancel/reschedule/block.
export type AppointmentWire = {
  id: string;
  tenant_id: string;
  patient_id: string | null;
  conversation_id?: string | null;
  google_event_id: string;
  google_event_link?: string | null;
  appointment_type?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  phone: string | null;
  status: AppointmentStatusWire;
  created_at: string;
  updated_at: string;
};

export type AppointmentCreatePayload = {
  start: string; // ISO datetime
  end: string; // ISO datetime
  summary: string;
  description?: string;
  phone?: string | null;
  patient_id?: string | null;
};

export type BlockCreatePayload = {
  start: string;
  end: string;
  summary?: string;
  description?: string;
};

export type AppointmentCancelPayload = {
  confirm: boolean;
  custom_message?: string | null;
};

export type AppointmentReschedulePayload = {
  new_start: string;
  new_end: string;
  custom_message?: string | null;
};

// ---------------------------------------------------------------------------
// Typed wrappers
// ---------------------------------------------------------------------------

// GET /tenants/me/config — current tenant config (never includes secrets).
export function getTenantConfig(session: Session): Promise<TenantConfigWire> {
  return hubFetch<TenantConfigWire>(session, "/tenants/me/config");
}

// PUT /tenants/me/config — partial update; only provided fields are applied.
export function updateTenantConfig(
  session: Session,
  patch: TenantConfigUpdatePayload,
): Promise<TenantConfigWire> {
  return hubFetch<TenantConfigWire>(session, "/tenants/me/config", {
    method: "PUT",
    body: JSON.stringify(patch),
  });
}

// GET /tenants/me/calendar/events?start=&end= — agenda read model for a window.
export function listCalendarEvents(
  session: Session,
  startIso: string,
  endIso: string,
): Promise<CalendarEventWire[]> {
  const qs = `?start=${encodeURIComponent(startIso)}&end=${encodeURIComponent(endIso)}`;
  return hubFetch<CalendarEventWire[]>(session, "/tenants/me/calendar/events" + qs);
}

// POST /tenants/me/calendar/appointments — create a consultation.
export function createAppointment(
  session: Session,
  payload: AppointmentCreatePayload,
): Promise<AppointmentWire> {
  return hubFetch<AppointmentWire>(session, "/tenants/me/calendar/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// POST /tenants/me/calendar/blocks — block a slot, no patient notification.
export function createBlock(
  session: Session,
  payload: BlockCreatePayload,
): Promise<AppointmentWire> {
  return hubFetch<AppointmentWire>(session, "/tenants/me/calendar/blocks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// POST /tenants/me/calendar/appointments/{id}/cancel
export function cancelAppointment(
  session: Session,
  appointmentId: string,
  payload: AppointmentCancelPayload,
): Promise<AppointmentWire> {
  return hubFetch<AppointmentWire>(
    session,
    `/tenants/me/calendar/appointments/${appointmentId}/cancel`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

// POST /tenants/me/calendar/appointments/{id}/reschedule
export function rescheduleAppointment(
  session: Session,
  appointmentId: string,
  payload: AppointmentReschedulePayload,
): Promise<AppointmentWire> {
  return hubFetch<AppointmentWire>(
    session,
    `/tenants/me/calendar/appointments/${appointmentId}/reschedule`,
    { method: "POST", body: JSON.stringify(payload) },
  );
}

// GET /tenants/me/calendar/oauth/start — Google consent URL. The caller does
// a full-page redirect to it (window.location.assign), it does not fetch it.
export async function startCalendarOauth(session: Session): Promise<string> {
  const data = await hubFetch<{ authorization_url: string }>(
    session,
    "/tenants/me/calendar/oauth/start",
  );
  return data.authorization_url;
}

// POST /tenants/me/calendar/disconnect — forgets the Calendar refresh token
// and forces the tenant offline (is_active=False) on the backend.
export function disconnectCalendar(
  session: Session,
): Promise<{ status: string; is_active: boolean }> {
  return hubFetch<{ status: string; is_active: boolean }>(
    session,
    "/tenants/me/calendar/disconnect",
    { method: "POST" },
  );
}

// ---------------------------------------------------------------------------
// Professionals (Onboarding & Multi-Professional contract §10) — per-professional
// config/calendar, consumed by the Configuração page's "Profissionais" section
// and the per-professional Services/Availability/Google forms (Feature C3/C4).
// ---------------------------------------------------------------------------

// GET /tenants/me/professionals item — mirrors what the hub round-trips for
// PUT .../config, plus its own calendar-connected flag. Completeness booleans
// mirror the internal config-status shape (contract §4.3); kept optional here
// since the hub list endpoint's exact completeness fields aren't in the
// contract's wire-shape detail — code defensively against their absence.
export type ProfessionalWire = {
  id: string;
  name: string;
  is_active: boolean;
  specialty: string | null;
  about: string | null;
  context_doctor_message: string | null;
  business_hours: Record<string, TimeWindowWire[]>;
  appointment_types: AppointmentTypeWire[];
  google_calendar_id: string | null;
  calendar_connected: boolean;
  has_calendar?: boolean;
  has_hours?: boolean;
  has_services?: boolean;
  complete?: boolean;
};

// GET /tenants/me/professionals — list with per-professional completeness/
// calendar status, used to populate the Profissionais section and the
// professional selector chip row above Services/Availability.
export function getProfessionals(session: Session): Promise<ProfessionalWire[]> {
  return hubFetch<ProfessionalWire[]>(session, "/tenants/me/professionals");
}

// PUT /tenants/me/professionals/{id}/config body — every field optional,
// partial update (mirrors TenantConfigUpdatePayload's exclude_unset semantics).
export type ProfessionalConfigUpdatePayload = Partial<{
  business_hours: Record<string, TimeWindowWire[]>;
  appointment_types: AppointmentTypeWire[];
  specialty: string | null;
  about: string | null;
  context_doctor_message: string | null;
  google_calendar_id: string | null;
}>;

// PUT /tenants/me/professionals/{id}/config — saves one professional's hours,
// services, specialty/about/context, and calendar id. Professional-scoped
// requests are validated server-side to belong to the caller's tenant.
export function updateProfessionalConfig(
  session: Session,
  professionalId: string,
  patch: ProfessionalConfigUpdatePayload,
): Promise<ProfessionalWire> {
  return hubFetch<ProfessionalWire>(
    session,
    `/tenants/me/professionals/${professionalId}/config`,
    { method: "PUT", body: JSON.stringify(patch) },
  );
}

// GET /tenants/me/professionals/{id}/calendar/oauth/start — Google consent URL
// scoped to one professional (the OAuth `state` signs tenant_id AND
// professional_id so the callback routes the refresh token to
// professional_credentials instead of the tenant-level row).
export async function startProfessionalCalendarOauth(
  session: Session,
  professionalId: string,
): Promise<string> {
  const data = await hubFetch<{ authorization_url: string }>(
    session,
    `/tenants/me/professionals/${professionalId}/calendar/oauth/start`,
  );
  return data.authorization_url;
}

// POST /tenants/me/professionals/{id}/calendar/disconnect — forgets that
// professional's Calendar refresh token only (tenant-level connection, if any,
// is untouched).
export function disconnectProfessionalCalendar(
  session: Session,
  professionalId: string,
): Promise<{ status: string }> {
  return hubFetch<{ status: string }>(
    session,
    `/tenants/me/professionals/${professionalId}/calendar/disconnect`,
    { method: "POST" },
  );
}

// POST /tenants/me/professionals/{id}/calendar — "shared_account" mode only.
// Creates (idempotently — 200 either way, `created` tells the two cases apart)
// a secondary Google Calendar for this professional INSIDE the clinic's own
// connected Google account; the backend always uses the clinic's credentials
// for this call, never the professional's own. No body.
export type CreateProfessionalCalendarResult = {
  professional_id: string;
  google_calendar_id: string;
  created: boolean;
};

// Throws HubApiError with `.code`:
//   422 HUB_ERROR_CLINIC_CALENDAR_NOT_CONNECTED — the clinic hasn't connected
//     Google yet (point the caller at GoogleSection's connect flow).
//   409 HUB_ERROR_GOOGLE_RECONNECT_REQUIRED — the clinic's stored token
//     predates the calendar-creation scope (point the caller at "Reconectar").
// Callers should branch on `.code`, not `.message` — the message is
// display-ready pt-BR copy from the backend, but the code is what's stable.
export function createProfessionalCalendar(
  session: Session,
  professionalId: string,
): Promise<CreateProfessionalCalendarResult> {
  return hubFetch<CreateProfessionalCalendarResult>(
    session,
    `/tenants/me/professionals/${professionalId}/calendar`,
    { method: "POST" },
  );
}
