// Unit tests for the agenda's date derivation.
//
// Every case below pins an explicit anchor. None of them call `new Date()`
// with no argument: a test that reads the clock passes or fails depending on
// the day it runs, which is the exact failure mode this module exists to
// prevent (the screen shipped a week frozen on 01–06/06/2026 and nothing
// noticed for months).
//
// Assertions stay on LOCAL date parts rather than on UTC strings so they hold
// regardless of the machine's timezone.

import { describe, it, expect } from "vitest";
import {
  GRID_DAY_COUNT,
  addDays,
  addMonths,
  dayIndexFromKey,
  dayLabelFromKey,
  fromDateKey,
  isSameDay,
  minutesFromMidnight,
  monthGrid,
  monthLabel,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDateKey,
  weekDays,
  weekPeriodLabel,
  weekdayShortFromKey,
} from "../calendar-dates";

// Sunday 30 August 2026 — the day the frozen-label bug was found, and the
// weekday the old Monday-first anchor handled worst.
const SUNDAY = new Date(2026, 7, 30);

describe("startOfWeek", () => {
  it("returns the Sunday of the week for every weekday", () => {
    // Sun 30/08 .. Sat 05/09 all belong to the week starting Sun 30/08.
    for (let i = 0; i < GRID_DAY_COUNT; i++) {
      const d = addDays(SUNDAY, i);
      expect(toDateKey(startOfWeek(d))).toBe("2026-08-30");
    }
  });

  it("does not walk backwards when the date IS a Sunday", () => {
    // The regression this replaces: mondayOfWeek(Sunday) returned the Monday
    // six days EARLIER, so the screen fetched the week that had just ended and
    // every slot the day picker offered was already in the past.
    expect(toDateKey(startOfWeek(SUNDAY))).toBe("2026-08-30");
    expect(startOfWeek(SUNDAY).getTime()).toBe(SUNDAY.getTime());
  });

  it("crosses a month boundary", () => {
    // Tue 01/09/2026 belongs to the week that began Sun 30/08.
    expect(toDateKey(startOfWeek(new Date(2026, 8, 1)))).toBe("2026-08-30");
  });

  it("crosses a year boundary", () => {
    // Fri 01/01/2027 belongs to the week that began Sun 27/12/2026.
    expect(toDateKey(startOfWeek(new Date(2027, 0, 1)))).toBe("2026-12-27");
  });
});

describe("addDays / addMonths", () => {
  it("rolls over month and year ends", () => {
    expect(toDateKey(addDays(new Date(2026, 7, 31), 1))).toBe("2026-09-01");
    expect(toDateKey(addDays(new Date(2026, 11, 31), 1))).toBe("2027-01-01");
    expect(toDateKey(addDays(new Date(2027, 0, 1), -1))).toBe("2026-12-31");
  });

  it("normalises to local midnight", () => {
    const noon = new Date(2026, 7, 30, 12, 34, 56, 789);
    const next = addDays(noon, 1);
    expect(next.getHours()).toBe(0);
    expect(next.getMinutes()).toBe(0);
    expect(next.getSeconds()).toBe(0);
    expect(next.getMilliseconds()).toBe(0);
  });

  it("lands on the 1st, so a 31st can't overflow into the next month", () => {
    // The classic addMonths trap: 31 Jan + 1 month naively becomes 3 March.
    expect(toDateKey(addMonths(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
    expect(toDateKey(addMonths(new Date(2026, 11, 15), 1))).toBe("2027-01-01");
    expect(toDateKey(addMonths(new Date(2026, 0, 15), -1))).toBe("2025-12-01");
  });
});

describe("toDateKey / fromDateKey", () => {
  it("round-trips", () => {
    const d = new Date(2026, 8, 5);
    expect(toDateKey(fromDateKey(toDateKey(d)))).toBe("2026-09-05");
  });

  it("reads LOCAL date parts, not UTC ones", () => {
    // 21:30 in UTC-3 is already the next day in UTC. Keying off toISOString()
    // would file this evening consultation under the 31st.
    expect(toDateKey(new Date(2026, 7, 30, 21, 30))).toBe("2026-08-30");
  });

  it("parses a key to LOCAL midnight, not UTC midnight", () => {
    // `new Date("2026-08-30")` is UTC midnight, which is 21:00 on the 29th in
    // UTC-3 — a whole day off for every label in the country.
    const d = fromDateKey("2026-08-30");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(30);
    expect(d.getHours()).toBe(0);
  });

  it("pads single-digit months and days", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});

describe("weekDays", () => {
  const days = weekDays(SUNDAY, SUNDAY);

  it("has one column per weekday, Sunday first", () => {
    expect(days).toHaveLength(7);
    expect(days.map((d) => d.label)).toEqual([
      "Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb",
    ]);
    expect(days[0].full).toBe("Domingo");
    expect(days[2].full).toBe("Terça");
    expect(days[6].full).toBe("Sábado");
  });

  it("carries the real dates of that week, spanning the month change", () => {
    expect(days.map((d) => d.iso)).toEqual([
      "2026-08-30",
      "2026-08-31",
      "2026-09-01",
      "2026-09-02",
      "2026-09-03",
      "2026-09-04",
      "2026-09-05",
    ]);
    expect(days.map((d) => d.date)).toEqual([30, 31, 1, 2, 3, 4, 5]);
  });

  it("flags exactly the real today, and only when it is in this week", () => {
    expect(days.filter((d) => d.today).map((d) => d.iso)).toEqual(["2026-08-30"]);

    const wednesday = weekDays(SUNDAY, new Date(2026, 8, 2));
    expect(wednesday.filter((d) => d.today).map((d) => d.iso)).toEqual(["2026-09-02"]);

    // A week the user navigated to that does not contain today has no
    // highlight at all — the old grid always highlighted a column.
    const otherWeek = weekDays(new Date(2026, 9, 4), SUNDAY);
    expect(otherWeek.some((d) => d.today)).toBe(false);
  });
});

describe("labels", () => {
  it("names the day and its real date", () => {
    // The one date the frozen mock happened to state correctly: Tue 02/06/2026.
    // It still formats identically, so this is a pure de-hardcoding.
    expect(dayLabelFromKey("2026-06-02")).toBe("Terça, 02/06");
  });

  it("no longer forces every date into June", () => {
    // dayFull() used to append a literal "/06". This label reaches the patient
    // on WhatsApp, so the month has to be the appointment's own.
    expect(dayLabelFromKey("2026-08-30")).toBe("Domingo, 30/08");
    expect(dayLabelFromKey("2026-12-25")).toBe("Sexta, 25/12");
  });

  it("titles the month with its year", () => {
    expect(monthLabel(new Date(2026, 7, 15))).toBe("Agosto de 2026");
    expect(monthLabel(new Date(2027, 0, 1))).toBe("Janeiro de 2027");
  });

  it("shortens a week inside one month and names both when it straddles two", () => {
    expect(weekPeriodLabel(new Date(2026, 7, 2))).toBe("2 – 8 de agosto");
    expect(weekPeriodLabel(SUNDAY)).toBe("30 de agosto – 5 de setembro");
  });

  it("derives month-grid column heads from a date key", () => {
    expect(weekdayShortFromKey("2026-08-30")).toBe("Dom");
    expect(weekdayShortFromKey("2026-09-05")).toBe("Sáb");
  });

  it("maps a date key to its grid column", () => {
    expect(dayIndexFromKey("2026-08-30")).toBe(0); // Sunday
    expect(dayIndexFromKey("2026-09-05")).toBe(6); // Saturday
  });
});

describe("monthGrid", () => {
  const cells = monthGrid(SUNDAY, SUNDAY);

  it("is whole Sunday-first weeks", () => {
    expect(cells.length % GRID_DAY_COUNT).toBe(0);
    expect(fromDateKey(cells[0].iso).getDay()).toBe(0);
    expect(fromDateKey(cells[cells.length - 1].iso).getDay()).toBe(6);
  });

  it("covers every day of the anchor's month exactly once", () => {
    const inMonth = cells.filter((c) => !c.out).map((c) => c.iso);
    expect(inMonth).toHaveLength(31); // August
    expect(inMonth[0]).toBe("2026-08-01");
    expect(inMonth[30]).toBe("2026-08-31");
    expect(new Set(inMonth).size).toBe(31);
  });

  it("marks padding days from the neighbouring months", () => {
    // August 2026 starts on a Saturday, so the first row is 26–31 July + 1 Aug.
    expect(cells[0].iso).toBe("2026-07-26");
    expect(cells[0].out).toBe(true);
    expect(cells.filter((c) => c.out).every((c) => !c.iso.startsWith("2026-08"))).toBe(true);
  });

  it("flags exactly one today when today is on the grid, and none otherwise", () => {
    expect(cells.filter((c) => c.today).map((c) => c.iso)).toEqual(["2026-08-30"]);
    // The old grid pinned today to `c.d === 2` — every month showed a today.
    expect(monthGrid(new Date(2027, 4, 10), SUNDAY).some((c) => c.today)).toBe(false);
  });

  it("handles a month that starts on a Sunday with no leading padding", () => {
    // 1 November 2026 is a Sunday.
    const nov = monthGrid(new Date(2026, 10, 15), SUNDAY);
    expect(nov[0].iso).toBe("2026-11-01");
    expect(nov[0].out).toBe(false);
  });

  it("crosses into the next year", () => {
    const dec = monthGrid(new Date(2026, 11, 15), SUNDAY);
    expect(dec.some((c) => c.iso.startsWith("2027-01"))).toBe(true);
    expect(dec.filter((c) => !c.out)).toHaveLength(31);
  });
});

describe("misc primitives", () => {
  it("startOfDay strips the time", () => {
    const d = startOfDay(new Date(2026, 7, 30, 22, 55, 32));
    expect(d.getHours()).toBe(0);
    expect(toDateKey(d)).toBe("2026-08-30");
  });

  it("startOfMonth lands on the 1st", () => {
    expect(toDateKey(startOfMonth(new Date(2026, 7, 30)))).toBe("2026-08-01");
  });

  it("isSameDay compares calendar days, not instants", () => {
    expect(isSameDay(new Date(2026, 7, 30, 0, 0), new Date(2026, 7, 30, 23, 59))).toBe(true);
    expect(isSameDay(new Date(2026, 7, 30, 23, 59), new Date(2026, 7, 31, 0, 1))).toBe(false);
  });

  it("minutesFromMidnight matches the grid's unit", () => {
    expect(minutesFromMidnight(new Date(2026, 7, 30, 11, 22))).toBe(11 * 60 + 22);
    expect(minutesFromMidnight(new Date(2026, 7, 30, 0, 0))).toBe(0);
  });
});
