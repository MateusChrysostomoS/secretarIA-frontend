// test-window.ts — the date arithmetic behind /app/reativar's stats. GET
// /doctor/onboarding/test-window sends `deadline_at` but no `days_remaining`,
// so the countdown is derived here. Kept out of page.tsx so it can be tested
// against a fixed anchor (never `new Date()` inside a test), mirroring
// ../../onboarding/lib/meta-embedded-signup.ts.

const MS_PER_DAY = 86_400_000;

/**
 * Whole days left until `deadlineIso`, counting any part of a day as a full one.
 *
 * `now` is passed in rather than read from the clock so the caller owns the
 * anchor — the screen must derive the countdown from the same instant it shows
 * everything else, and a test must be able to pin it.
 *
 * Returns null when there is no usable deadline, so the caller can fall back to
 * showing the total instead of printing a meaningless number.
 *
 * Bounded at both ends, because the only clock available here is the browser's
 * and it can disagree with the backend that produced `deadline_at`:
 * - a deadline already behind us reads as 0, never as a countdown running
 *   backwards (`expired` is the backend's flag; the two can lag each other, or
 *   the deadline can pass while the tab sits open);
 * - passing `daysTotal` caps the count at the window's own length, so a device
 *   clock running behind the window's start can't render the contradiction
 *   "15 dias restantes de 14 dias de teste".
 */
export function daysRemaining(
  deadlineIso: string | null,
  now: Date,
  daysTotal?: number,
): number | null {
  if (!deadlineIso) return null;
  const deadline = new Date(deadlineIso).getTime();
  if (Number.isNaN(deadline)) return null;
  const days = Math.max(0, Math.ceil((deadline - now.getTime()) / MS_PER_DAY));
  return daysTotal === undefined ? days : Math.min(days, daysTotal);
}

/** Stat label agreeing with the countdown: "Dia restante" at exactly 1. */
export function daysRemainingLabel(days: number): string {
  return days === 1 ? "Dia restante" : "Dias restantes";
}

/** "14 dias" / "1 dia" — the secondary caption under the countdown. */
export function formatDays(days: number): string {
  return `${days} ${days === 1 ? "dia" : "dias"}`;
}
