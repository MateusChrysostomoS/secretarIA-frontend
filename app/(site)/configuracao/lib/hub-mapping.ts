// hub-mapping.ts — pure functions translating between secretarIA hub wire
// shapes (lib/secretaria-hub.ts, snake_case, English weekday keys) and this
// page's local state shapes (lib/types.ts, "seg".."dom" keys, minutes-from-
// midnight ranges). Kept separate from page.tsx so the conversion logic is
// unit-testable and the route entry stays composition-only.

import type {
  AddressWire,
  AppointmentTypeWire,
  ServiceWire,
  ProfessionalConfigUpdatePayload,
  ProfessionalWire,
  TenantConfigUpdatePayload,
  TenantConfigWire,
  TimeWindowWire,
} from "@/lib/secretaria-hub";
import {
  DEFAULT_PIX_DEPOSIT,
  type ClinicCtx,
  type ConfigInheritance,
  type DayConfig,
  type GcalState,
  type Messages,
  type PixDeposit,
  type PostConsult,
  type CatalogService,
  type ProfessionalProfile,
  type Service,
  type TimeRange,
} from "./types";

// Weekday key mapping: wire uses full English lowercase names, the local UI
// uses 3-letter Portuguese abbreviations (see the WD seed in page.tsx).
const WIRE_TO_LOCAL_DAY: Record<string, string> = {
  monday: "seg",
  tuesday: "ter",
  wednesday: "qua",
  thursday: "qui",
  friday: "sex",
  saturday: "sab",
  sunday: "dom",
};
const LOCAL_TO_WIRE_DAY: Record<string, string> = Object.fromEntries(
  Object.entries(WIRE_TO_LOCAL_DAY).map(([wire, local]) => [local, wire]),
);

// "HH:MM" -> minutes from midnight.
export function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

// minutes from midnight -> "HH:MM".
export function minutesToHhmm(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

// Applies the wire business_hours onto the existing days array (preserving
// each day's key/label/order), turning "HH:MM" windows into minute ranges and
// setting `on` based on whether the weekday has at least one window.
export function applyWireBusinessHours(
  wire: Record<string, TimeWindowWire[]>,
  currentDays: DayConfig[],
): DayConfig[] {
  return currentDays.map((day) => {
    const wireKey = LOCAL_TO_WIRE_DAY[day.key];
    const windows = wireKey ? wire[wireKey] : undefined;
    if (!windows) return day; // absent from the response — keep the demo default
    return {
      ...day,
      on: windows.length > 0,
      ranges: windows.map(
        (w): TimeRange => ({ start: hhmmToMinutes(w.start), end: hhmmToMinutes(w.end) }),
      ),
    };
  });
}

// Inverse of applyWireBusinessHours — builds the wire business_hours object
// from the local days state, ready to send in a professional config PUT body.
export function toWireBusinessHours(
  days: DayConfig[],
): Record<string, TimeWindowWire[]> {
  const out: Record<string, TimeWindowWire[]> = {};
  for (const day of days) {
    const wireKey = LOCAL_TO_WIRE_DAY[day.key];
    if (!wireKey || !day.on) continue; // closed days are simply absent
    out[wireKey] = day.ranges.map((r) => ({
      start: minutesToHhmm(r.start),
      end: minutesToHhmm(r.end),
    }));
  }
  return out;
}

// Wire appointment_types -> local Service[]. `requirements` is a string[] on
// the wire; hydrated ids are position-based (1-indexed) since they only need
// to be stable React keys, never sent back to the server.
export function applyWireAppointmentTypes(wire: AppointmentTypeWire[]): Service[] {
  return wire.map((t, i) => ({
    id: i + 1,
    serviceId: t.service_id ?? null,
    name: t.name,
    dur: t.duration_min,
    price: t.price ?? "",
    active: t.is_active,
    requirements: (t.requirements ?? []).map((text, j) => ({ id: j + 1, text })),
  }));
}

// Wire catalog rows -> local CatalogService[]. Sorted the way the clinic reads
// its own list; the backend already orders by (sort_order, name), so this only
// reshapes, never re-sorts — reordering here would make the picker jump around
// relative to what the clinic configured.
export function applyWireServices(wire: ServiceWire[]): CatalogService[] {
  return wire.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description ?? "",
    longDescription: s.long_description ?? "",
    requirements: (s.requirements ?? []).map((text, i) => ({ id: i + 1, text })),
    active: s.is_active,
    sortOrder: s.sort_order,
    professionalIds: s.professional_ids ?? [],
  }));
}

// Local Service[] -> wire appointment_types, for a config PUT body.
//
// `service_id` is the payload's most important field: it is the link to the
// clinic's canonical row, and without it the backend falls back to matching by
// name — which is the pre-catalog world this whole round exists to leave.
//
// The descriptive fields are sent as `null` DELIBERATELY for a linked entry:
// the catalog owns `description`/`long_description`/`requirements`, and
// re-sending a professional's stale copy is how they used to get blanked
// (secretarIA FIX_08). An UNLINKED entry still carries its own requirements,
// because for it there is no catalog row to read them from yet. Blank
// requirement rows (empty after trim) are dropped rather than sent as "".
export function toWireAppointmentTypes(services: Service[]): AppointmentTypeWire[] {
  return services.map((s, i) => ({
    name: s.name,
    service_id: s.serviceId,
    description: null,
    duration_min: s.dur,
    is_active: s.active,
    sort_order: i,
    price: s.price || null,
    long_description: null,
    requirements: s.serviceId
      ? []
      : s.requirements.map((r) => r.text.trim()).filter(Boolean),
  }));
}

// ---------------------------------------------------------------------------
// Address (Feature 1) — structured clinic address, tenant-level, REAL wire field.
// ---------------------------------------------------------------------------

type AddressFieldsOfCtx = Pick<
  ClinicCtx,
  "addressLine" | "addressComplement" | "neighborhood" | "city" | "state" | "postalCode"
>;

// Builds the wire address payload from the local address fields. Returns null
// when every field is blank, so an untouched address never sends an empty
// object that would overwrite a previously saved one with blanks.
export function toWireAddress(ctx: AddressFieldsOfCtx): AddressWire | null {
  const { addressLine, addressComplement, neighborhood, city, state, postalCode } = ctx;
  if (!addressLine && !addressComplement && !neighborhood && !city && !state && !postalCode) {
    return null;
  }
  return {
    line: addressLine || null,
    complement: addressComplement || null,
    neighborhood: neighborhood || null,
    city: city || null,
    state: state || null,
    postal_code: postalCode || null,
  };
}

// Wire address -> local address fields (blank strings for absent parts).
export function applyWireAddress(wire: AddressWire | null): AddressFieldsOfCtx {
  return {
    addressLine: wire?.line ?? "",
    addressComplement: wire?.complement ?? "",
    neighborhood: wire?.neighborhood ?? "",
    city: wire?.city ?? "",
    state: wire?.state ?? "",
    postalCode: wire?.postal_code ?? "",
  };
}

// ---------------------------------------------------------------------------
// Insurances (Feature 3) — comma-separated in the UI, string[] on the wire.
// ---------------------------------------------------------------------------

export function toWireInsurances(insurancesCsv: string): string[] | null {
  const items = insurancesCsv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : null;
}

export function applyWireInsurances(wire: string[] | null): string {
  return (wire ?? []).join(", ");
}

// ---------------------------------------------------------------------------
// Messages (new "Mensagens" section) — every field already existed on the
// wire; this is the first UI wiring them up.
// ---------------------------------------------------------------------------

export function applyWireMessages(cfg: TenantConfigWire): Messages {
  return {
    clinicDescription: cfg.clinic_description ?? "",
    returningGreetingMessage: cfg.returning_greeting_message ?? "",
    language: cfg.language || "pt-BR",
    // Read-only, server-derived. `?? ""` / `?? 0` rather than a local default
    // frame or a hardcoded cap: an older backend that does not send these
    // yields "no preview" and a disabled counter, which is honest, instead of
    // a preview and a limit that quietly disagree with the server.
    greetingPreviewTemplate: cfg.greeting_preview_template ?? "",
    clinicDescriptionMax: cfg.clinic_description_max ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Post-consult (new "Pós-consulta" section) — two NEW tenant-level wire
// fields, siblings of greeting_message; see PostConsult in lib/types.ts for
// why the two jobs (sent message vs. answer knowledge) are kept apart.
// ---------------------------------------------------------------------------

export function applyWirePostConsult(cfg: TenantConfigWire): PostConsult {
  return {
    postConsultMessage: cfg.post_consult_message ?? "",
    postConsultKnowledge: cfg.post_consult_knowledge ?? "",
  };
}

// ---------------------------------------------------------------------------
// Pix deposit policy (new "Sinal via Pix" section) — no-show reduction via a
// partial deposit charged through Asaas. asaas_connected is READ-ONLY on the
// wire (see TenantConfigWire) and is only ever hydrated here, never written
// back — see buildConfigUpdatePayload below, which omits it on purpose.
// ---------------------------------------------------------------------------

export function applyWirePixDeposit(cfg: TenantConfigWire): PixDeposit {
  return {
    enabled: cfg.pix_deposit_enabled ?? DEFAULT_PIX_DEPOSIT.enabled,
    depositPercent: cfg.pix_deposit_percent ?? DEFAULT_PIX_DEPOSIT.depositPercent,
    refundWindowHours: cfg.pix_refund_window_hours ?? DEFAULT_PIX_DEPOSIT.refundWindowHours,
    retentionPolicy: cfg.pix_retention_policy ?? DEFAULT_PIX_DEPOSIT.retentionPolicy,
    partialRefundPercent: cfg.pix_partial_refund_percent ?? DEFAULT_PIX_DEPOSIT.partialRefundPercent,
    rescheduleLimit: cfg.pix_reschedule_limit ?? DEFAULT_PIX_DEPOSIT.rescheduleLimit,
    asaasConnected: cfg.asaas_connected ?? DEFAULT_PIX_DEPOSIT.asaasConnected,
  };
}

// ---------------------------------------------------------------------------
// Google Calendar (Section 08) — `connected` is read-only; `mode` is
// writable via the mode selector and round-trips through the same
// tenant-level PUT as everything else (see buildConfigUpdatePayload below).
// ---------------------------------------------------------------------------

export function applyWireGcal(cfg: TenantConfigWire): GcalState {
  return {
    connected: cfg.calendar_connected,
    mode: cfg.google_calendar_mode,
  };
}

// ---------------------------------------------------------------------------
// Professional profile (specialty/about/context_doctor_message) — moved out
// of ClinicCtx and onto the per-professional config PUT.
// ---------------------------------------------------------------------------

export function applyWireProfessionalProfile(p: ProfessionalWire): ProfessionalProfile {
  return {
    specialty: p.specialty ?? "",
    about: p.about ?? "",
    contextDoctorMessage: p.context_doctor_message ?? "",
  };
}

// ---------------------------------------------------------------------------
// PUT payload builders
// ---------------------------------------------------------------------------

// Builds the PUT /tenants/me/config payload — TENANT-level fields only:
// Mensagens (greeting/persona/language), Pós-consulta (post_consult_message/
// post_consult_knowledge), Sinal via Pix (pix_deposit_*/pix_refund_*/
// pix_retention_policy/pix_reschedule_limit — asaas_connected excluded, it is
// READ-ONLY), address/insurances/collect_insurance (Feature 1/3), and
// appointment_duration_min, and business_hours — the CLINIC's own opening
// hours, which Section 07 now edits directly instead of only reading them back
// as the thing a professional inherits. `appointment_types` stays on the
// per-professional PUT below. `gap`/`lead` (Prefs) have no wire counterpart at
// all and are NOT sent — see the comment on Prefs in lib/types.ts.
export function buildConfigUpdatePayload(
  ctx: ClinicCtx,
  messages: Messages,
  postConsult: PostConsult,
  pixDeposit: PixDeposit,
  defaultDurationMin: number,
  gcalMode: GcalState["mode"],
  clinicDays: DayConfig[],
): TenantConfigUpdatePayload {
  return {
    appointment_duration_min: defaultDurationMin,
    business_hours: toWireBusinessHours(clinicDays),
    address: toWireAddress(ctx),
    insurances: toWireInsurances(ctx.insurances),
    collect_insurance: ctx.collectInsurance,
    clinic_description: messages.clinicDescription || null,
    returning_greeting_message: messages.returningGreetingMessage || null,
    language: messages.language,
    post_consult_message: postConsult.postConsultMessage || null,
    post_consult_knowledge: postConsult.postConsultKnowledge || null,
    pix_deposit_enabled: pixDeposit.enabled,
    pix_deposit_percent: pixDeposit.depositPercent,
    pix_refund_window_hours: pixDeposit.refundWindowHours,
    pix_retention_policy: pixDeposit.retentionPolicy,
    pix_partial_refund_percent: pixDeposit.partialRefundPercent,
    pix_reschedule_limit: pixDeposit.rescheduleLimit,
    google_calendar_mode: gcalMode,
  };
}

// Builds the PUT /tenants/me/professionals/{id}/config payload for the
// SELECTED professional: their hours, services, and profile fields (Feature
// C4/E — "their hours/services/specialty/about/context").
//
// `hoursSource` / `servicesSource` decide what the two config fields carry, and
// getting this wrong is what made a clinic's bot go quiet:
//
//   "inherit" -> null   the professional keeps NO config of their own; the
//                       clinic's applies. This screen used to have no way to
//                       express it, so every save — including one that only
//                       changed the greeting — sent `{}` and silently converted
//                       inheritance into an empty override.
//   "own"     -> values whatever is on screen, INCLUDING `{}` / `[]` when the
//                       user closed every day or removed every service. That is
//                       a real decision and the backend now honours it.
//   "unknown" -> values the backend did not tell us which state this is (it
//                       predates `*_inherited`). Sending the values preserves
//                       exactly the pre-flag behaviour; sending `null` would be
//                       asserting an inheritance we never verified.
export function buildProfessionalConfigPayload(
  days: DayConfig[],
  services: Service[],
  profile: ProfessionalProfile,
  hoursSource: ConfigInheritance,
  linked?: Map<number, string>,
): ProfessionalConfigUpdatePayload {
  return {
    business_hours: hoursSource === "inherit" ? null : toWireBusinessHours(days),
    // ALWAYS an array now, never `null`. `null` means "inherit the clinic's
    // legacy list", and Section 06 no longer offers that: the professional
    // explicitly picks which of the clinic's services they offer, so what they
    // picked is what gets written. An empty array is a real answer ("offers
    // nothing"), which is why the section says so out loud before a save.
    appointment_types: toWireAppointmentTypes(
      linked ? services.map((s) => applyLink(s, linked)) : services,
    ),
    specialty: profile.specialty || null,
    about: profile.about || null,
    context_doctor_message: profile.contextDoctorMessage || null,
  };
}

/** Stamps a just-published catalog id onto an entry that had none. */
function applyLink(service: Service, linked: Map<number, string>): Service {
  if (service.serviceId) return service;
  const id = linked.get(service.id);
  return id ? { ...service, serviceId: id } : service;
}
