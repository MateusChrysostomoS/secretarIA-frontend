// Unit tests for the hub -> Appt conversion and the ISO fetch/write windows.
//
// The module doc at the top of hub-mapping.ts says it was "kept separate from
// page.tsx so the conversion is unit-testable". It never got the test, and the
// two defects that cost the most — Sunday events being silently dropped, and a
// Sunday `now` anchoring every write into the week that had already ended —
// both live in exactly these pure functions.
//
// Anchors are fixed. ISO assertions are made by parsing the string back and
// comparing local parts, so they hold in any timezone.

import { describe, it, expect } from "vitest";
import type { CalendarEventWire } from "@/lib/secretaria-hub";
import {
  currentWeekIsoRange,
  formatBlockSummary,
  mapHubEventToAppt,
  mapHubEventsToAppts,
  monthIsoRange,
  slotIsoRangeFromDateKey,
  slotToIsoRange,
  weekIsoRange,
} from "../hub-mapping";
import { toDateKey } from "../../../_shared/calendar-dates";

// Sunday 30 August 2026, 22:55 — the exact moment the bug was reproduced.
const SUNDAY_NIGHT = new Date(2026, 7, 30, 22, 55);
const SUNDAY = new Date(2026, 7, 30);

/** Builds a wire event from local date parts, so no UTC maths leaks in. */
function wireEvent(
  start: Date,
  minutes: number,
  over: Partial<CalendarEventWire> = {},
): CalendarEventWire {
  const end = new Date(start.getTime() + minutes * 60000);
  return {
    id: "ev-1",
    summary: "Maria Silva",
    start: start.toISOString(),
    end: end.toISOString(),
    appointment_id: "appt-1",
    ...over,
  };
}

/** Local Y-M-D-h-m of an ISO string, for timezone-independent assertions. */
function localParts(iso: string) {
  const d = new Date(iso);
  return {
    key: toDateKey(d),
    hours: d.getHours(),
    minutes: d.getMinutes(),
  };
}

describe("currentWeekIsoRange", () => {
  it("starts on the Sunday of the week containing `now`", () => {
    const { startIso, endIso } = currentWeekIsoRange(SUNDAY_NIGHT);
    expect(localParts(startIso).key).toBe("2026-08-30");
    expect(localParts(endIso).key).toBe("2026-09-06");
  });

  it("does not return the week that already ended when `now` is a Sunday", () => {
    // The regression: the old Monday-first anchor returned Mon 24/08 -> Mon
    // 31/08 here, so on a Sunday the screen fetched last week's events and
    // presented them as the current agenda.
    const { startIso } = currentWeekIsoRange(SUNDAY_NIGHT);
    expect(localParts(startIso).key).not.toBe("2026-08-24");
    expect(new Date(startIso).getTime()).toBeLessThanOrEqual(SUNDAY_NIGHT.getTime());
  });

  it("gives the same window for every day of one week", () => {
    const keys = [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const day = new Date(2026, 7, 30 + i, 13, 0);
      return localParts(currentWeekIsoRange(day).startIso).key;
    });
    expect(new Set(keys)).toEqual(new Set(["2026-08-30"]));
  });

  it("spans exactly seven days", () => {
    const { startIso, endIso } = currentWeekIsoRange(SUNDAY_NIGHT);
    const spanDays = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 86400000;
    expect(spanDays).toBe(7);
  });

  it("includes both edge days of the week — Sunday and Saturday", () => {
    // The window always did include Sunday; the day was fetched and then
    // discarded downstream by the mapping, which is why widening the window
    // was never the fix. Anchored on a Wednesday, the week runs Sun 30/08
    // (first column) through Sat 05/09 (last), and both must be inside.
    const { startIso, endIso } = currentWeekIsoRange(new Date(2026, 8, 2));
    const start = new Date(startIso).getTime();
    const end = new Date(endIso).getTime();
    for (const edge of [new Date(2026, 7, 30, 12, 0), new Date(2026, 8, 5, 12, 0)]) {
      expect(start).toBeLessThan(edge.getTime());
      expect(end).toBeGreaterThan(edge.getTime());
    }
    // The following Sunday belongs to the NEXT week, not this one.
    expect(end).toBeLessThanOrEqual(new Date(2026, 8, 6, 0, 0).getTime());
  });
});

describe("weekIsoRange / monthIsoRange", () => {
  it("weekIsoRange runs from the given week start", () => {
    const { startIso, endIso } = weekIsoRange(SUNDAY);
    expect(localParts(startIso).key).toBe("2026-08-30");
    expect(localParts(endIso).key).toBe("2026-09-06");
  });

  it("monthIsoRange covers the padded month grid, not just the 1st–31st", () => {
    // August 2026 begins on a Saturday, so the drawn grid starts on 26 July.
    const { startIso, endIso } = monthIsoRange(SUNDAY);
    expect(localParts(startIso).key).toBe("2026-07-26");
    expect(new Date(endIso).getTime()).toBeGreaterThan(new Date(2026, 8, 1).getTime());
    const spanDays = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 86400000;
    expect(spanDays % 7).toBe(0);
  });

  it("monthIsoRange is wider than the week window it replaces in month view", () => {
    const week = weekIsoRange(SUNDAY);
    const month = monthIsoRange(SUNDAY);
    const width = (r: { startIso: string; endIso: string }) =>
      new Date(r.endIso).getTime() - new Date(r.startIso).getTime();
    expect(width(month)).toBeGreaterThan(width(week));
  });
});

describe("slotIsoRangeFromDateKey", () => {
  it("anchors the write on the picked date", () => {
    const { startIso, endIso } = slotIsoRangeFromDateKey("2026-09-02", 9 * 60, 50);
    expect(localParts(startIso)).toEqual({ key: "2026-09-02", hours: 9, minutes: 0 });
    expect(localParts(endIso)).toEqual({ key: "2026-09-02", hours: 9, minutes: 50 });
  });

  it("rolls past midnight when the duration crosses the day", () => {
    const { endIso } = slotIsoRangeFromDateKey("2026-09-02", 23 * 60 + 30, 60);
    expect(localParts(endIso).key).toBe("2026-09-03");
  });
});

describe("slotToIsoRange", () => {
  it("addresses the columns of the given week, Sunday first", () => {
    expect(localParts(slotToIsoRange(0, 9 * 60, 50, SUNDAY).startIso).key).toBe("2026-08-30");
    expect(localParts(slotToIsoRange(6, 9 * 60, 50, SUNDAY).startIso).key).toBe("2026-09-05");
  });

  it("agrees with the date-key form", () => {
    expect(slotToIsoRange(3, 14 * 60, 30, SUNDAY)).toEqual(
      slotIsoRangeFromDateKey("2026-09-02", 14 * 60, 30),
    );
  });

  it("never writes into the past when the week starts today (Sunday)", () => {
    // The measured production defect: on Sunday 30/08 every one of the six
    // options the picker offered resolved to a day between 24/08 and 29/08.
    // Anchored on the Sunday-first week, day 0 is today and the rest are ahead.
    const midnight = new Date(2026, 7, 30);
    for (let day = 0; day <= 6; day++) {
      const { startIso } = slotToIsoRange(day, 9 * 60, 50, SUNDAY);
      expect(new Date(startIso).getTime()).toBeGreaterThanOrEqual(midnight.getTime());
    }
  });

  it("lands inside the window that was fetched for the same week", () => {
    const { startIso: wStart, endIso: wEnd } = weekIsoRange(SUNDAY);
    for (let day = 0; day <= 6; day++) {
      const { startIso } = slotToIsoRange(day, 10 * 60, 30, SUNDAY);
      expect(new Date(startIso).getTime()).toBeGreaterThanOrEqual(new Date(wStart).getTime());
      expect(new Date(startIso).getTime()).toBeLessThan(new Date(wEnd).getTime());
    }
  });
});

describe("mapHubEventToAppt", () => {
  it("keeps a Sunday event instead of dropping it", () => {
    // The AG-4 defect: `if (jsDay === 0) return null` meant a real Sunday
    // consultation was fetched, received, and thrown away without a trace.
    const sunday = wireEvent(new Date(2026, 7, 30, 10, 0), 50);
    const appt = mapHubEventToAppt(sunday);
    expect(appt).not.toBeNull();
    expect(appt?.day).toBe(0);
    expect(appt?.date).toBe("2026-08-30");
  });

  it("maps every weekday to its own column, Sunday=0..Saturday=6", () => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(2026, 7, 30 + i, 8, 0);
      const appt = mapHubEventToAppt(wireEvent(d, 30));
      expect(appt?.day).toBe(d.getDay());
      expect(appt?.date).toBe(toDateKey(d));
    }
  });

  it("carries the real date, so a slot is never just a column position", () => {
    const appt = mapHubEventToAppt(wireEvent(new Date(2026, 8, 2, 15, 30), 40));
    expect(appt?.date).toBe("2026-09-02");
    expect(appt?.start).toBe(15 * 60 + 30);
    expect(appt?.dur).toBe(40);
  });

  it("files a late-evening event on its local day, not the UTC one", () => {
    // 21:30 local in UTC-3 is already tomorrow in UTC.
    const appt = mapHubEventToAppt(wireEvent(new Date(2026, 7, 30, 21, 30), 30));
    expect(appt?.date).toBe("2026-08-30");
  });

  it("returns null only for unparseable dates", () => {
    expect(mapHubEventToAppt({ id: "x", summary: null, start: "nope", end: "nope" })).toBeNull();
  });

  it("classifies a tagged block and recovers its reason", () => {
    const block = wireEvent(new Date(2026, 8, 1, 12, 0), 60, {
      summary: formatBlockSummary("Almoço"),
    });
    const appt = mapHubEventToAppt(block);
    expect(appt?.status).toBe("bloqueio");
    expect(appt?.reason).toBe("Almoço");
    expect(appt?.date).toBe("2026-09-01");
  });

  it("falls back to a generic label for a bare block tag", () => {
    const block = wireEvent(new Date(2026, 8, 1, 12, 0), 60, { summary: "Bloqueado" });
    expect(mapHubEventToAppt(block)?.reason).toBe("Bloqueio");
  });

  it("names an untitled Google event honestly", () => {
    const appt = mapHubEventToAppt(wireEvent(new Date(2026, 8, 1, 9, 0), 30, { summary: null }));
    expect(appt?.patient).toBe("Evento sem título");
  });

  it("threads the local appointment id through, and null when absent", () => {
    expect(mapHubEventToAppt(wireEvent(new Date(2026, 8, 1, 9, 0), 30))?.appointmentId).toBe("appt-1");
    const orphan = wireEvent(new Date(2026, 8, 1, 9, 0), 30, { appointment_id: null });
    expect(mapHubEventToAppt(orphan)?.appointmentId).toBeNull();
  });

  it("floors a zero-length event at a visible duration", () => {
    const instant = wireEvent(new Date(2026, 8, 1, 9, 0), 0);
    expect(mapHubEventToAppt(instant)?.dur).toBe(5);
  });
});

describe("mapHubEventsToAppts", () => {
  it("keeps the Sunday event and drops only the unparseable one", () => {
    const events: CalendarEventWire[] = [
      wireEvent(new Date(2026, 7, 30, 10, 0), 50, { id: "sun" }),
      wireEvent(new Date(2026, 8, 2, 10, 0), 50, { id: "wed" }),
      { id: "bad", summary: "x", start: "not-a-date", end: "not-a-date" },
    ];
    const mapped = mapHubEventsToAppts(events);
    expect(mapped.map((a) => a.id)).toEqual(["hub-sun", "hub-wed"]);
    expect(mapped[0].date).toBe("2026-08-30");
  });

  it("returns an empty list for no events rather than throwing", () => {
    expect(mapHubEventsToAppts([])).toEqual([]);
  });
});

describe("formatBlockSummary", () => {
  it("prefixes the tag the read side recognises", () => {
    expect(formatBlockSummary("Almoço")).toBe("Bloqueado: Almoço");
    expect(formatBlockSummary("  ")).toBe("Bloqueado");
  });

  it("round-trips through the mapping", () => {
    const block = wireEvent(new Date(2026, 8, 3, 8, 0), 90, {
      summary: formatBlockSummary("Reunião"),
    });
    expect(mapHubEventToAppt(block)?.reason).toBe("Reunião");
  });
});
