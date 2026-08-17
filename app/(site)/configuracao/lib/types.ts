// types.ts — domain types for the Configuração page.
// All state shapes are declared here to keep components clean and
// allow TypeScript to catch mismatches across the prop chain.

// ---------------------------------------------------------------------------
// Section 01 — Clinic context
// ---------------------------------------------------------------------------

export type ClinicCtx = {
  // READ-ONLY on this screen. Hydrated from TenantConfigRead.clinic_name and
  // never part of any PUT body — the clinic's identity is owned by the Brain
  // portal's registration, not by this form. ContextSection renders it as
  // static text stating that provenance, so nobody edits a field whose
  // changes would be silently dropped.
  clinicName: string;
  // Structured clinic address — CADASTRAL DATA ONLY. It round-trips through
  // TenantConfigWire.address and persists on tenants.address, but nothing in
  // secretarIA's conversation path reads it today: the only address the agent
  // ever speaks is Unit.address (a different table, surfaced by the
  // multi_unit plugin's list_units tool). The UI must not promise that the
  // bot answers "onde fica?" from these fields until a real consumer exists.
  addressLine: string;       // street + number, e.g. "Av. Paulista, 1000"
  addressComplement: string; // suite/floor, e.g. "Sala 302" (optional)
  neighborhood: string;      // bairro
  city: string;
  state: string;             // UF, e.g. "SP"
  postalCode: string;        // CEP
  // Accepted health-insurance plan names, comma-separated in the UI. REAL —
  // wired to TenantConfigWire.insurances (string[] on the wire).
  insurances: string;
  // When on, SecretarIA asks the patient whether they have a convênio (health
  // plan) during booking and which one — patient PII, minimized per LGPD.
  // REAL — wired to TenantConfigWire.collect_insurance.
  collectInsurance: boolean;
};

// NOTE: there is deliberately no `phone` here anymore. The old field was a
// demo-only string with no wire counterpart and no consumer: whatever the
// clinic typed into "WhatsApp de atendimento" was never sent anywhere. The
// real connected number is owned by the WhatsApp activation flow (see
// OnboardingBanner), so the form points there instead of pretending to own it.

// The honest starting point for an AUTHENTICATED session: nothing on screen
// until the tenant GET actually succeeds. Never a demo seed — see
// lib/demo-seed.ts for why the two live in separate modules.
export const EMPTY_CLINIC_CTX: ClinicCtx = {
  clinicName: "",
  addressLine: "",
  addressComplement: "",
  neighborhood: "",
  city: "",
  state: "",
  postalCode: "",
  insurances: "",
  collectInsurance: false,
};

// ---------------------------------------------------------------------------
// Section 02 — Messages (greeting/persona copy the bot uses)
// ---------------------------------------------------------------------------

// greetingMessage/returningGreetingMessage/language are real fields on
// secretarIA's wire (TenantConfigWire) — this section is the first UI for
// them, not a new backend surface. There is no `greetingButtons` here
// (2026-08 round): the WhatsApp first-contact buttons are now a FIXED
// product-level set, no longer clinic-editable or part of the wire — see
// FIXED_GREETING_BUTTONS in MessagesSection.tsx, which renders them as
// local, read-only display copy.
export type Messages = {
  greetingMessage: string;
  returningGreetingMessage: string;
  language: string;
};

export const EMPTY_MESSAGES: Messages = {
  greetingMessage: "",
  returningGreetingMessage: "",
  language: "pt-BR",
};

// ---------------------------------------------------------------------------
// Section 03 — Post-consult (message sent + knowledge used to answer questions)
// ---------------------------------------------------------------------------

// Two NEW tenant-level wire fields, siblings of greeting_message
// (see Messages above) — kept as their own type because the two jobs are easy
// to conflate:
export type PostConsult = {
  // A ready-made message the secretary SENDS to the patient right after their
  // consult, as written — not improvised by the AI.
  postConsultMessage: string;
  // Reference knowledge the AI CONSULTS to answer the patient's questions
  // after the consult (recovery care, return-visit timing, how exam results
  // are delivered) — never sent verbatim.
  postConsultKnowledge: string;
};

export const EMPTY_POST_CONSULT: PostConsult = {
  postConsultMessage: "",
  postConsultKnowledge: "",
};

// ---------------------------------------------------------------------------
// Section 04 — Sinal via Pix (deposit policy to reduce no-shows)
// ---------------------------------------------------------------------------

// Deposit-via-Pix policy — charges a partial deposit when the appointment is
// booked, via Asaas (the Brain-managed PSP). The backend only actually
// charges while the "Sinal via Pix" add-on is active on the plan, but every
// field below stays editable regardless, so the clinic can prepare the policy
// ahead of activating the add-on.
export type PixDeposit = {
  enabled: boolean;
  depositPercent: number;       // 1-100, % of the service price charged as deposit
  refundWindowHours: number;    // >=0, hours before the appointment for a full refund
  retentionPolicy: "total" | "partial";
  partialRefundPercent: number; // 1-100, used only when retentionPolicy === "partial"
  rescheduleLimit: number;      // >=0, reschedules allowed before the deposit is forfeited
  // Whether the tenant has a live Asaas connection — READ-ONLY, derived by
  // the backend. There is no key input anywhere in this form by design: the
  // PSP credential is provisioned by the Brain team during onboarding and
  // never passes through the doctor-facing UI. Never sent back on save.
  asaasConnected: boolean;
};

// Defaults mirror the backend's TenantConfigWire defaults (schemas/config.py)
// — used both to seed page.tsx's initial state and as the hydration fallback
// in hub-mapping.ts's applyWirePixDeposit.
export const DEFAULT_PIX_DEPOSIT: PixDeposit = {
  enabled: false,
  depositPercent: 30,
  refundWindowHours: 24,
  retentionPolicy: "total",
  partialRefundPercent: 50,
  rescheduleLimit: 2,
  asaasConnected: false,
};

// ---------------------------------------------------------------------------
// Section 05 — Professionals
// ---------------------------------------------------------------------------

// The selected professional's own profile fields — REMOVED from ClinicCtx
// (clinic-level specialty/about) in favor of per-professional (contract §10:
// secretaria `professionals` gained specialty/about/context_doctor_message).
export type ProfessionalProfile = {
  specialty: string;
  about: string;
  contextDoctorMessage: string;
};

export const EMPTY_PROFESSIONAL_PROFILE: ProfessionalProfile = {
  specialty: "",
  about: "",
  contextDoctorMessage: "",
};

// ---------------------------------------------------------------------------
// Section 06 — Services (appointment types) — now edited per-professional
// ---------------------------------------------------------------------------

// A single pre-visit instruction for an appointment type — e.g. fasting,
// prior exams, or documents the patient must bring. Maps to a row of the
// backend appointment_type_requirements table.
export type Requirement = {
  id: number;
  text: string;
};

export type Service = {
  id: number;
  name: string;
  dur: number;    // duration in minutes
  price: string;  // free-text, e.g. "R$ 450" or ""
  active: boolean; // when false, SecretarIA won't offer this appointment type
  // Pre-visit requirements SecretarIA surfaces when this type is being booked.
  requirements: Requirement[];
};

// ---------------------------------------------------------------------------
// Section 07 — Availability — now edited per-professional
// ---------------------------------------------------------------------------

export type TimeRange = {
  start: number; // minutes from midnight
  end: number;   // minutes from midnight
};

export type DayConfig = {
  key: string;    // "seg" | "ter" | …
  label: string;  // "Segunda" | "Terça" | …
  on: boolean;    // whether this day is active
  ranges: TimeRange[];
};

// [key, label] pairs in ISO week order (Mon → Sun).
export const WEEKDAYS: [string, string][] = [
  ["seg", "Segunda"],
  ["ter", "Terça"],
  ["qua", "Quarta"],
  ["qui", "Quinta"],
  ["sex", "Sexta"],
  ["sab", "Sábado"],
  ["dom", "Domingo"],
];

// A fully-closed week — the canonical empty value for DayConfig[] and the
// base every professional's hydration starts from, so switching between
// professionals never leaks one professional's ranges onto another's blank
// days. Returns a fresh array each call: callers mutate their own copy.
export function closedWeek(): DayConfig[] {
  return WEEKDAYS.map(([key, label]) => ({ key, label, on: false, ranges: [] }));
}

// Scheduling preferences that this screen can actually persist. Exactly one
// field survives: `defaultDur` (TenantConfigUpdate.appointment_duration_min).
//
// The former `gap` (intervalo entre consultas) and `lead` (antecedência
// mínima) were removed rather than left on screen: TenantConfigUpdate has no
// counterpart for either, buildConfigUpdatePayload never sent them, and no
// scheduling code reads them — so every clinic that picked "10 min" or "2h
// antes" was configuring nothing. Re-introducing them is a separate,
// end-to-end scope (schema + column + slot resolver + tests), not a control
// re-enabled on the form.
export type Prefs = {
  defaultDur: number; // minutes — TENANT-level (appointment_duration_min)
};

// Mirrors the backend default for appointment_duration_min. Used as the
// authenticated pre-hydration value; overwritten by the real GET.
export const EMPTY_PREFS: Prefs = { defaultDur: 50 };

// ---------------------------------------------------------------------------
// Section 08 — Google Calendar (tenant-level; unchanged single-professional path)
// ---------------------------------------------------------------------------

// `connected` mirrors TenantConfigWire.calendar_connected (read-only). There
// is no account email, no named-calendar list, and no two-way-sync
// preference on the wire today — GoogleSection intentionally shows nothing
// for those instead of inventing values (see GoogleSection's connected-state
// rendering).
//
// `mode` mirrors TenantConfigWire.google_calendar_mode — WRITABLE via the
// mode selector in GoogleSection, batched into the same tenant-level PUT as
// every other field on this page (see page.tsx's handleSave). Declared as its
// own local union (mirroring the wire's GoogleCalendarMode) rather than
// imported, matching how e.g. PixDeposit.retentionPolicy mirrors
// TenantConfigWire.pix_retention_policy elsewhere in this file.
export type GoogleCalendarMode = "per_professional" | "shared_account";

export type GcalState = {
  connected: boolean;
  mode: GoogleCalendarMode;
};

export const EMPTY_GCAL: GcalState = { connected: false, mode: "per_professional" };
