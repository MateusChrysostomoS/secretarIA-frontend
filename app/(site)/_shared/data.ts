// ===== secretarIA — appointment types, status metadata, time helpers =====
// Ported from _design-source/data.jsx — plain ES module, no browser globals.
//
// The weekly/monthly grid labels that used to live here (WEEK_DAYS,
// MONTH_LABEL, PERIOD_LABEL, dayFull — plus MonthView's hardcoded June-2026
// grid in calendar.tsx) described a fixed reference week, Mon 01/06 – Sat
// 06/06 2026, inherited from the ported design. They were the screen's second
// clock: the hub fetch always asked for the REAL current week, so the labels
// contradicted the data they sat on top of, and `dayFull()` fed that invented
// date into the WhatsApp confirmation sent to the patient.
//
// All of it now derives from one anchor Date in _shared/calendar-dates.ts —
// see that module's header for the rule and the local-time reasoning.
//
// The fabricated SEED_APPTS/SEED_BLOCKS appointment rows that used to live in
// this file were deleted in the agenda mock-purge round (2026-07-22): the
// agenda page now only ever renders real secretarIA hub data or an honest
// empty/error state, never fabricated appointments.

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type ApptStatus =
  | "agendado"
  | "confirmou"
  | "compareceu"
  | "faltou"
  | "cancelado"
  | "bloqueio";

export type Anamnese = "recebida" | "pendente" | "—";

/** A single appointment or block slot on the calendar. */
export type Appt = {
  id: string;
  /**
   * The slot's REAL local date, "YYYY-MM-DD".
   *
   * `day` below is only a column position, so on its own it cannot tell two
   * different weeks apart — an event from another week would land in the
   * visible grid with nothing to contradict it, and the drawer would label it
   * with whatever date that column happened to be showing. Every view filters
   * on this field; `day` just decides which column to paint it in.
   */
  date: string;
  /** Column index in the week grid: 0=Sunday .. 6=Saturday. Derived from `date`. */
  day: number;
  start: number;   // minutes from midnight
  dur: number;     // duration in minutes
  patient?: string;
  phone?: string;
  type?: string;
  status: ApptStatus;
  anamnese?: Anamnese;
  notes?: string;
  reason?: string; // used by bloqueio blocks
  /**
   * Local `Appointment.id` from secretarIA, when this slot has one.
   *
   * `id` above is a display key ("hub-<google event id>") and is NOT accepted
   * by the hub's write endpoints, which key on this. `null`/absent means the
   * slot exists only in Google Calendar (typed straight into the calendar, or
   * a demo row), so the write actions must stay disabled for it rather than
   * guess an id — cancelling deletes the Google event irreversibly.
   */
  appointmentId?: string | null;
};

/** Design-token tone identifiers for status colors. */
export type StatusTone = "pending" | "confirm" | "attend" | "miss" | "block";

// ---------------------------------------------------------------------------
// Calendar grid constants
//
// The day/month LABELS that used to sit here now come from
// _shared/calendar-dates.ts, derived from the same anchor that builds the
// fetch window. What stays here is the part of the grid that genuinely does
// not depend on which week is on screen: the visible hour band and its scale.
// ---------------------------------------------------------------------------

export const HOUR_START = 7;   // 07:00
export const HOUR_END = 20;    // 20:00
export const SLOT_H = 58;      // px height of 1 hour row

export const APPT_TYPES = [
  "Primeira consulta",
  "Retorno",
  "Consulta",
  "Avaliação",
  "Teleconsulta",
  "Procedimento",
];
export const DURATIONS = [30, 40, 50, 60];

// ---------------------------------------------------------------------------
// Status metadata — maps every status to label + tone
// ---------------------------------------------------------------------------

export const STATUS_META: Record<ApptStatus, { label: string; short: string; tone: StatusTone }> = {
  agendado:   { label: "Agendado",   short: "Agendado",   tone: "pending" },
  confirmou:  { label: "Confirmou",  short: "Confirmou",  tone: "confirm" },
  compareceu: { label: "Compareceu", short: "Compareceu", tone: "attend"  },
  faltou:     { label: "Faltou",     short: "Faltou",     tone: "miss"    },
  cancelado:  { label: "Cancelado",  short: "Cancelado",  tone: "block"   },
  bloqueio:   { label: "Bloqueio",   short: "Bloqueio",   tone: "block"   },
};

// ---------------------------------------------------------------------------
// Clinic / user identity
// ---------------------------------------------------------------------------

export const CURRENT_USER = { name: "Camila Soares", role: "Secretária" };
export const CLINIC = { name: "Consultório Dr. Aurélio Lima", specialty: "Clínica geral" };

// ---------------------------------------------------------------------------
// Time helpers
// ---------------------------------------------------------------------------

/** Formats minutes-from-midnight as "HH:MM". */
export const fmtTime = (min: number): string => {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
};

/** Returns a "HH:MM–HH:MM" range string for an appointment. */
export const fmtRange = (start: number, dur: number): string =>
  fmtTime(start) + "–" + fmtTime(start + dur);

/** First character of a name, uppercased — used for Avatar initials. */
export const firstLetter = (name?: string): string =>
  (name || "?").trim().charAt(0).toUpperCase();

// `dayFull(i)` used to live here, turning a column index into "Terça, 02/06"
// by appending a hardcoded "/06". It is replaced by
// calendar-dates.ts's `dayLabelFromKey(iso)`, which formats the slot's real
// date — the one now carried on `Appt.date`.

/** First word of a name — used in headers, modals, and chat previews. */
export const firstName = (n?: string): string => (n || "").trim().split(" ")[0];
