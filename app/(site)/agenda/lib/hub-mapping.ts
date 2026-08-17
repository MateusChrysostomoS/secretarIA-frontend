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
// Write status: CREATE (POST .../appointments) and BLOCK (POST .../blocks)
// are wired for real when hubTokenReady — see page.tsx's createAppt/createBlock,
// which use slotToIsoRange below to turn the modal's day/start/dur into the
// same real-world week currentWeekIsoRange anchors the read on.
// CANCEL, RESCHEDULE, EDIT, and quick status-change stay disabled (no local
// fake-mutate fallback): GET .../calendar/events (CalendarEventRead) carries
// only the Google event id, never the DB Appointment.id that
// POST .../appointments/{id}/cancel|reschedule require, and no hub endpoint
// maps google_event_id -> Appointment.id. TODO(hub-write): wire these once
// the read model exposes that id — see agenda/drawer.tsx.
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

// The demo grid has 6 columns, Monday(0)..Saturday(5) — Sunday has no column.
const GRID_DAY_COUNT = 6;

// Returns the Date (local time) for Monday 00:00 of the week containing `now`.
// Shared anchor for currentWeekIsoRange (read) and slotToIsoRange (write) so
// a slot picked in the grid lands in the same week the grid is showing.
function mondayOfWeek(now: Date): Date {
  const day = now.getDay(); // 0=Sun..6=Sat
  // Distance back to Monday: Sunday (0) is 6 days after the prior Monday.
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - diffToMonday);
  return monday;
}

// Returns the ISO bounds [monday 00:00, next monday 00:00) of the current
// real-world week, in the browser's local timezone (Date#toISOString below
// converts to UTC on the wire — the hub API takes any parseable ISO datetime).
export function currentWeekIsoRange(now: Date = new Date()): { startIso: string; endIso: string } {
  const monday = mondayOfWeek(now);
  const nextMonday = new Date(monday);
  nextMonday.setDate(monday.getDate() + 7);
  return { startIso: monday.toISOString(), endIso: nextMonday.toISOString() };
}

// Converts a grid slot (day index 0=Monday..5=Saturday, start/dur in minutes
// from midnight — the shape NewApptModal/BlockModal hand back) into ISO
// start/end datetimes for AppointmentCreatePayload/BlockCreatePayload,
// anchored to the SAME Monday currentWeekIsoRange uses for the read fetch.
export function slotToIsoRange(
  day: number,
  startMin: number,
  durMin: number,
  now: Date = new Date(),
): { startIso: string; endIso: string } {
  const monday = mondayOfWeek(now);
  const slotStart = new Date(monday);
  slotStart.setDate(monday.getDate() + day);
  slotStart.setMinutes(slotStart.getMinutes() + startMin);
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + durMin);
  return { startIso: slotStart.toISOString(), endIso: slotEnd.toISOString() };
}

// Maps one hub calendar event onto the Appt shape. Returns null for Sunday
// events (no grid column to place them in).
function mapHubEventToAppt(e: CalendarEventWire): Appt | null {
  const start = new Date(e.start);
  const end = new Date(e.end);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;

  const jsDay = start.getDay(); // 0=Sun..6=Sat
  if (jsDay === 0 || jsDay - 1 >= GRID_DAY_COUNT) return null;
  const day = jsDay - 1; // Monday=0 .. Saturday=5

  const startMin = start.getHours() * 60 + start.getMinutes();
  const durMin = Math.max(5, Math.round((end.getTime() - start.getTime()) / 60000));

  // A real block round-trips as a "bloqueio" item (see the module doc above)
  // instead of falling through to the generic appointment mapping below.
  if (isBlockSummary(e.summary)) {
    return {
      id: "hub-" + e.id,
      day,
      start: startMin,
      dur: durMin,
      status: "bloqueio",
      reason: blockReasonFromSummary(e.summary ?? ""),
    };
  }

  return {
    id: "hub-" + e.id,
    day,
    start: startMin,
    dur: durMin,
    patient: e.summary || "Evento sem título",
    type: "Google Calendar",
    status: "agendado",
    anamnese: "—",
    notes: "",
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
