// hub-mapping.ts — pure functions translating secretarIA hub calendar events
// into this page's Appt shape (see _shared/data.ts), and computing the ISO
// week window to fetch/write. Kept separate from page.tsx so the conversion
// is unit-testable and the route entry stays composition-only.
//
// CalendarEventRead only carries {id, summary, start, end} — none of the
// richer fields (patient, phone, anamnese, structured type/status) exist on
// the wire yet, so a mapped APPOINTMENT event is necessarily a lower-fidelity
// item: it shows on the grid with its summary as the display name, a generic
// type, and an "agendado" status.
//
// Write status: CREATE (POST .../appointments), BLOCK (POST .../blocks) and
// CANCEL (POST .../appointments/{id}/cancel) are wired for real when
// hubTokenReady — see page.tsx's createAppt/createBlock/cancelAppt.
//
// CANCEL used to be disabled with the rest because CalendarEventRead carried
// only Google's event id, never the DB Appointment.id the write endpoints key
// on. The read model now also returns `appointment_id`, so the mapping below
// threads it onto Appt.appointmentId and the drawer enables the action for any
// slot that has one. It stays absent for an event that exists only in Google
// (typed straight into the calendar), and the drawer keeps the button disabled
// there with an honest hint rather than guessing an id.
//
// RESCHEDULE, EDIT and quick status-change remain disabled — they need more
// than an id (a new slot, a richer read model). TODO(hub-write) for those.
//
// Block classification: CalendarEventRead has no boolean/type field to tell a
// blocked slot apart from a real appointment, so the ONLY signal available is
// the event's own `summary` text. secretarIA's own backend already treats
// "Bloqueado" as the canonical tag for a blocked slot — BlockCreate.summary
// defaults to "Bloqueado" (secretarIA src/secretaria/schemas/calendar.py) and
// every block's Appointment row is stamped appointment_type="Bloqueado"
// server-side (src/secretaria/api/hub/calendar.py::create_block). The DEFAULT
// only applies when the client omits `summary`, though, and page.tsx's
// createBlock always sends one (the block's reason, e.g. "Almoço") — so
// formatBlockSummary below makes the write side explicit about the same
// "Bloqueado" tag (prefixed onto the reason) instead of relying on a default
// that would never actually fire. isBlockSummary/blockReasonFromSummary then
// recognise that exact tag on read, so a block round-trips: created via a
// real POST -> reappears from the events read, rendered with block styling
// instead of as a generic appointment.

import type { CalendarEventWire } from "@/lib/secretaria-hub";
import {
  GRID_DAY_COUNT,
  addDays,
  addMonths,
  fromDateKey,
  minutesFromMidnight,
  startOfMonth,
  startOfWeek,
  toDateKey,
} from "../../_shared/calendar-dates";
import type { Appt } from "../../_shared/data";

// The exact tag secretarIA's backend uses for a blocked slot (see the
// block-classification note above). Exported indirectly via
// formatBlockSummary so page.tsx never needs to know the separator format.
const BLOCK_SUMMARY_PREFIX = "Bloqueado";

// True when a fetched event's summary marks it as a block rather than a real
// appointment (bare tag, or tag + reason suffix — see formatBlockSummary).
function isBlockSummary(summary: string | null): boolean {
  if (!summary) return false;
  return summary === BLOCK_SUMMARY_PREFIX || summary.startsWith(BLOCK_SUMMARY_PREFIX);
}

// Recovers the human-readable reason from a block's summary (e.g.
// "Bloqueado: Almoço" -> "Almoço"). Falls back to STATUS_META's own
// "Bloqueio" label when the summary is the bare tag with no reason suffix
// (e.g. a block created directly on Google Calendar, or via the backend's
// own bare default).
function blockReasonFromSummary(summary: string): string {
  const rest = summary
    .slice(BLOCK_SUMMARY_PREFIX.length)
    .replace(/^[\s:\-—]+/, "")
    .trim();
  return rest || "Bloqueio";
}

// Formats a block's reason into the Google Calendar event summary that
// page.tsx's createBlock sends on POST .../calendar/blocks. Kept here (not
// duplicated in page.tsx) so the write side and isBlockSummary/
// blockReasonFromSummary above can never drift apart.
export function formatBlockSummary(reason: string): string {
  const trimmed = reason.trim();
  return trimmed ? `${BLOCK_SUMMARY_PREFIX}: ${trimmed}` : BLOCK_SUMMARY_PREFIX;
}

// Returns the ISO bounds [start 00:00, end 00:00) of the week beginning at
// `weekStart` (a Sunday — see calendar-dates.ts's startOfWeek), in the
// browser's local timezone. Date#toISOString converts to UTC on the wire; the
// hub API takes any parseable ISO datetime.
export function weekIsoRange(weekStart: Date): { startIso: string; endIso: string } {
  return {
    startIso: weekStart.toISOString(),
    endIso: addDays(weekStart, GRID_DAY_COUNT).toISOString(),
  };
}

// The week containing `now`. Kept as a named entry point because "the current
// real-world week" is what the screen opens on and what the "Hoje" button
// returns to; everything else navigates by passing an explicit weekStart.
export function currentWeekIsoRange(now: Date = new Date()): { startIso: string; endIso: string } {
  return weekIsoRange(startOfWeek(now));
}

// Returns the ISO bounds covering every cell the month grid for `anchor`
// draws — which starts before the 1st and ends after the last day, because the
// grid is padded out to whole Sunday-first weeks (see monthGrid).
//
// The month view fetches this WIDER range rather than reusing the week window.
// Once the grid shows real dates, an empty cell reads as a statement of fact
// ("nothing booked that day"); with only one week loaded, ~28 of ~35 cells
// would be making that claim without having asked.
export function monthIsoRange(anchor: Date): { startIso: string; endIso: string } {
  const gridStart = startOfWeek(startOfMonth(anchor));
  const monthEnd = addMonths(startOfMonth(anchor), 1);
  // Walk whole weeks until the month is covered — same rule monthGrid uses, so
  // the fetched range and the drawn range can't disagree.
  let gridEnd = gridStart;
  while (gridEnd < monthEnd) gridEnd = addDays(gridEnd, GRID_DAY_COUNT);
  return { startIso: gridStart.toISOString(), endIso: gridEnd.toISOString() };
}

// Converts a slot on an explicit calendar DAY (local "YYYY-MM-DD" key, plus
// start/duration in minutes from midnight) into the ISO start/end datetimes
// AppointmentCreatePayload/BlockCreatePayload take.
//
// Keying the write on the date the user actually picked — rather than on
// (week anchor + column index) — is what stops a create from silently landing
// in a different week than the one on screen. The old form did exactly that
// on a Sunday: "the Monday of this week" was six days back, so every option
// the picker offered wrote into the week that had already ended.
export function slotIsoRangeFromDateKey(
  dateKey: string,
  startMin: number,
  durMin: number,
): { startIso: string; endIso: string } {
  const slotStart = fromDateKey(dateKey);
  slotStart.setMinutes(slotStart.getMinutes() + startMin);
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + durMin);
  return { startIso: slotStart.toISOString(), endIso: slotEnd.toISOString() };
}

// Same conversion addressed by grid position: day index 0=Sunday..6=Saturday
// within the week beginning at `weekStart`.
export function slotToIsoRange(
  day: number,
  startMin: number,
  durMin: number,
  weekStart: Date = startOfWeek(new Date()),
): { startIso: string; endIso: string } {
  return slotIsoRangeFromDateKey(toDateKey(addDays(weekStart, day)), startMin, durMin);
}

// Maps one hub calendar event onto the Appt shape. Returns null only when the
// wire dates are unparseable — there is no longer a weekday the grid cannot
// represent.
//
// It used to drop every Sunday event (`if (jsDay === 0) return null`) because
// the grid had six columns. The event was fetched, received, and discarded in
// silence: a consultation or block sitting on Sunday in the connected Google
// Calendar simply did not exist as far as the screen was concerned. The grid
// now has seven columns, so Sunday maps like any other day.
export function mapHubEventToAppt(e: CalendarEventWire): Appt | null {
  const start = new Date(e.start);
  const end = new Date(e.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const day = start.getDay(); // 0=Sun..6=Sat — the grid column, directly
  const date = toDateKey(start);

  const startMin = minutesFromMidnight(start);
  const durMin = Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000));

  // A real block round-trips as a "bloqueio" item (see the module doc above)
  // instead of falling through to the generic appointment mapping below.
  if (isBlockSummary(e.summary)) {
    return {
      id: "hub-" + e.id,
      date,
      day,
      start: startMin,
      dur: durMin,
      status: "bloqueio",
      reason: blockReasonFromSummary(e.summary ?? ""),
      appointmentId: e.appointment_id ?? null,
    };
  }

  return {
    id: "hub-" + e.id,
    date,
    day,
    start: startMin,
    dur: durMin,
    patient: e.summary || "Evento sem título",
    type: "Google Calendar",
    status: "agendado",
    anamnese: "—",
    notes: "",
    appointmentId: e.appointment_id ?? null,
  };
}

// Maps a full list of hub events, dropping anything that can't be placed.
export function mapHubEventsToAppts(events: CalendarEventWire[]): Appt[] {
  const out: Appt[] = [];
  for (const e of events) {
    const mapped = mapHubEventToAppt(e);
    if (mapped) out.push(mapped);
  }
  return out;
}
