// ===== secretarIA — calendar grid constants, status metadata, time helpers =====
// Ported from _design-source/data.jsx — plain ES module, no browser globals.
//
// The weekly/monthly grid labels below (WEEK_DAYS, MONTH_LABEL, PERIOD_LABEL —
// plus MonthView's hardcoded June-2026 grid in calendar.tsx) still describe a
// fixed reference week (Mon 01/06 – Sat 06/06 2026) inherited from the ported
// design. Real hub events are mapped onto these fixed day columns by
// day-of-week only (see agenda/lib/hub-mapping.ts) — the header/month-grid
// dates do not track which real calendar week is actually being fetched. This
// is a known scaffold limitation, not something the agenda mock-purge round
// (2026-07-22) fixes — see that round's notes for follow-up.
//
// The fabricated SEED_APPTS/SEED_BLOCKS appointment rows that used to live in
// this file were deleted in that same round: the agenda page now only ever
// renders real secretarIA hub data or an honest empty/error state, never
// fabricated appointments.

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
};

/** One column in the weekly calendar header. */
export type WeekDay = {
  key: string;
  label: string;
  date: number;
  full: string;
  today?: boolean;
};

/** Design-token tone identifiers for status colors. */
export type StatusTone = "pending" | "confirm" | "attend" | "miss" | "block";

// ---------------------------------------------------------------------------
// Calendar grid constants
// ---------------------------------------------------------------------------

export const WEEK_DAYS: WeekDay[] = [
  { key: "seg", label: "Seg", date: 1, full: "Segunda" },
  { key: "ter", label: "Ter", date: 2, full: "Terça", today: true },
  { key: "qua", label: "Qua", date: 3, full: "Quarta" },
  { key: "qui", label: "Qui", date: 4, full: "Quinta" },
  { key: "sex", label: "Sex", date: 5, full: "Sexta" },
  { key: "sab", label: "Sáb", date: 6, full: "Sábado" },
];

export const MONTH_LABEL = "Junho de 2026";
export const PERIOD_LABEL = "1 – 6 de junho";

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

/** "Terça, 02/06" style label for a calendar day column. */
export const dayFull = (i: number): string =>
  WEEK_DAYS[i]
    ? WEEK_DAYS[i].full + ", " + String(WEEK_DAYS[i].date).padStart(2, "0") + "/06"
    : "";

/** First word of a name — used in headers, modals, and chat previews. */
export const firstName = (n?: string): string => (n || "").trim().split(" ")[0];
