import { describe, expect, it } from "vitest";
import { daysRemaining, daysRemainingLabel, formatDays } from "../test-window";

// ---------------------------------------------------------------------------
// /app/reativar showed "Prazo final" and "Dias de teste" but never how many
// days were actually left — the one number the doctor is looking for. The
// backend sends no days_remaining, so this is computed from deadline_at.
//
// Every case pins its own anchor: `new Date()` in a test here would make the
// suite pass or fail depending on the day it runs.
// ---------------------------------------------------------------------------

const anchor = new Date("2026-08-31T12:00:00.000Z");

describe("daysRemaining", () => {
  it("counts whole days ahead", () => {
    expect(daysRemaining("2026-09-14T12:00:00.000Z", anchor)).toBe(14);
  });

  it("rounds a partial day up — a few hours left is still a day left", () => {
    expect(daysRemaining("2026-09-01T03:00:00.000Z", anchor)).toBe(1);
    expect(daysRemaining("2026-08-31T12:00:01.000Z", anchor)).toBe(1);
  });

  it("reads exactly 0 the instant the deadline lands", () => {
    expect(daysRemaining("2026-08-31T12:00:00.000Z", anchor)).toBe(0);
  });

  // The screen only renders the countdown while the backend says the window is
  // open, but the backend's `expired` and this browser's clock can disagree
  // briefly — a deadline in the past must never render as a negative number.
  it("clamps a deadline already in the past to 0, never negative", () => {
    expect(daysRemaining("2026-08-31T11:00:00.000Z", anchor)).toBe(0);
    expect(daysRemaining("2026-07-01T00:00:00.000Z", anchor)).toBe(0);
  });

  it("crosses month and year boundaries on real elapsed time, not calendar arithmetic", () => {
    expect(daysRemaining("2026-09-02T12:00:00.000Z", anchor)).toBe(2);
    expect(daysRemaining("2027-01-01T12:00:00.000Z", new Date("2026-12-30T12:00:00.000Z"))).toBe(2);
  });

  it("survives a timezone-offset deadline as the same instant", () => {
    // 2026-09-01T00:00-03:00 === 2026-09-01T03:00Z — same answer as above
    expect(daysRemaining("2026-09-01T00:00:00.000-03:00", anchor)).toBe(1);
  });

  // The screen prints the countdown next to "de N dias de teste", so a count
  // larger than the window itself would read as a contradiction. Only a browser
  // clock sitting behind the window's start can produce it.
  it("caps at the window length when the total is supplied", () => {
    const behind = new Date("2026-08-30T12:00:00.000Z"); // a day before the window opened
    expect(daysRemaining("2026-09-14T12:00:00.000Z", behind)).toBe(15);
    expect(daysRemaining("2026-09-14T12:00:00.000Z", behind, 14)).toBe(14);
  });

  it("leaves an in-range count untouched by the cap", () => {
    expect(daysRemaining("2026-09-07T12:00:00.000Z", anchor, 14)).toBe(7);
    expect(daysRemaining("2026-08-30T12:00:00.000Z", anchor, 14)).toBe(0);
  });

  it("returns null with no deadline, so the caller can fall back to the total", () => {
    expect(daysRemaining(null, anchor)).toBeNull();
  });

  it("returns null rather than NaN for an unparseable deadline", () => {
    expect(daysRemaining("not-a-date", anchor)).toBeNull();
  });
});

describe("daysRemainingLabel", () => {
  it("agrees in number with the value it labels", () => {
    expect(daysRemainingLabel(1)).toBe("Dia restante");
    expect(daysRemainingLabel(0)).toBe("Dias restantes");
    expect(daysRemainingLabel(14)).toBe("Dias restantes");
  });
});

describe("formatDays", () => {
  it("pluralizes the total in the secondary caption", () => {
    expect(formatDays(1)).toBe("1 dia");
    expect(formatDays(14)).toBe("14 dias");
    expect(formatDays(0)).toBe("0 dias");
  });
});
