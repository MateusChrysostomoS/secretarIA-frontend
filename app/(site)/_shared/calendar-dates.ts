// ===== secretarIA — calendar date derivation (pure, no browser globals) =====
//
// Every temporal label the agenda screen shows is derived HERE, from the same
// anchor Date that hub-mapping.ts turns into the fetch window. That single
// rule is the whole point of this module.
//
// It exists because the screen used to have two clocks. The fetch always asked
// for the real current week, while the labels (WEEK_DAYS, MONTH_LABEL,
// PERIOD_LABEL, dayFull's hardcoded "/06" suffix, NOW_MIN, MonthView's June
// grid) were literals left over from the ported design mock — frozen on
// 01–06/06/2026. The two never met, so the grid confidently described a week
// that did not exist, and `dayFull()` put that fabricated date straight into
// the WhatsApp confirmation sent to the patient.
//
// Two things to keep in mind when touching this file:
//
// 1. Everything here is LOCAL-time. `toDateKey` deliberately reads
//    getFullYear/getMonth/getDate instead of slicing toISOString(): the app
//    runs in America/Sao_Paulo (UTC-3), where the UTC date is already the next
//    day from 21:00 onwards. A UTC-derived key would file a 21:30 consultation
//    under tomorrow.
// 2. Date arithmetic goes through `addDays`, which rebuilds the date from
//    (year, month, day + n) at midnight rather than mutating with setDate on a
//    timestamp. Rebuilding is what keeps a DST transition from turning
//    "midnight + 1 day" into 23:00 of the same day.
//
// Callers must pass `today` explicitly rather than letting this module read
// the clock. That keeps it a pure function — testable with a fixed anchor —
// and it forces the caller to own the "when is now" decision, which on a
// prerendered (`output: "export"`) route has to happen after mount. See
// agenda/page.tsx.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** One column in the weekly calendar header. */
export type WeekDay = {
  /** Local date key, "YYYY-MM-DD". Doubles as the React key and the day's identity. */
  iso: string;
  /** Short header label, "Dom".."Sáb". */
  label: string;
  /** Full weekday name, "Domingo".."Sábado". */
  full: string;
  /** Day of month, for the header bubble. */
  date: number;
  /** True only for the real current day. */
  today: boolean;
};

/** One cell in the month grid. */
export type MonthCell = {
  /** Local date key, "YYYY-MM-DD". */
  iso: string;
  /** Day of month. */
  day: number;
  /** True when the cell belongs to the previous/next month (rendered dimmed). */
  out: boolean;
  /** True only for the real current day. */
  today: boolean;
};

/**
 * Columns in the week grid: Sunday..Saturday.
 *
 * The grid used to be six columns (Mon–Sat) and hub-mapping.ts dropped every
 * Sunday event on the floor to fit it. Seven columns is what lets a real
 * Sunday appointment — or a Sunday block typed into the connected Google
 * Calendar — actually appear.
 */
export const GRID_DAY_COUNT = 7;

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

/** Local midnight of the day containing `d`. */
export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Local midnight `n` days from `d` (n may be negative).
 * Rebuilds from date parts so a DST boundary can't shift the result — see the
 * module note above.
 */
export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 0, 0, 0, 0);
}

/** Local midnight on the 1st of the month `n` months from `d`. */
export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1, 0, 0, 0, 0);
}

/** Local midnight on the 1st of `d`'s month. */
export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

/**
 * Local midnight on the SUNDAY of the week containing `d`.
 *
 * Sunday-first, matching how a Brazilian calendar reads (and what MonthView's
 * "Dom Seg Ter…" header row already assumed). It also removes the sharpest
 * edge of the old Monday-first anchor: on a Sunday, "the Monday of this week"
 * pointed six days into the PAST, so the screen fetched the week that had just
 * ended and the "Nova consulta" day picker offered nothing but past dates.
 * With a Sunday-first anchor, Sunday is the first column of the week ahead.
 */
export function startOfWeek(d: Date): Date {
  return addDays(d, -d.getDay());
}

/** True when both dates fall on the same local calendar day. */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Minutes elapsed since local midnight — the unit the grid positions on. */
export function minutesFromMidnight(d: Date): number {
  return d.getHours() * 60 + d.getMinutes();
}

/** Local date key, "YYYY-MM-DD". Local on purpose — see the module note. */
export function toDateKey(d: Date): string {
  const y = String(d.getFullYear()).padStart(4, "0");
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Grid column for a date key: 0=Sunday .. 6=Saturday.
 * The one place `Appt.day` is derived, so the column and the date it claims to
 * be can never be set independently.
 */
export function dayIndexFromKey(key: string): number {
  return fromDateKey(key).getDay();
}

/**
 * Parses a "YYYY-MM-DD" key back to LOCAL midnight.
 *
 * Not `new Date(key)`: the ECMAScript spec parses a bare date-only string as
 * UTC, which in UTC-3 lands on 21:00 of the previous day — the label would be
 * off by one for the whole country.
 */
export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

// ---------------------------------------------------------------------------
// Localised labels
// ---------------------------------------------------------------------------

const WEEKDAY_FMT = new Intl.DateTimeFormat("pt-BR", { weekday: "long" });
const MONTH_FMT = new Intl.DateTimeFormat("pt-BR", { month: "long" });
const MONTH_YEAR_FMT = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

const capitalize = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "Domingo" / "Terça" — the screen's short form of the weekday name.
 *
 * Intl gives "terça-feira"; dropping the "-feira" suffix reproduces the labels
 * the design uses without hand-maintaining a names table that could drift out
 * of sync with the dates beside it. "domingo" and "sábado" have no suffix, so
 * the split is a no-op for them.
 */
function weekdayFull(d: Date): string {
  return capitalize(WEEKDAY_FMT.format(d).split("-")[0]);
}

/** "Agosto de 2026" — the month view's title. */
export function monthLabel(anchor: Date): string {
  return capitalize(MONTH_YEAR_FMT.format(anchor));
}

/**
 * "Dom" / "Ter" — the three-letter head for a date key.
 *
 * The month grid derives its column headers from its own first row with this,
 * instead of carrying a parallel ["Dom","Seg",…] table. A separate table is
 * one more thing that can end up describing different columns than the ones
 * below it.
 */
export function weekdayShortFromKey(iso: string): string {
  return weekdayFull(fromDateKey(iso)).slice(0, 3);
}

/** "Terça, 02/06" — a single day, as shown in the drawer and message templates. */
export function dayLabelFromKey(iso: string): string {
  const d = fromDateKey(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${weekdayFull(d)}, ${dd}/${mm}`;
}

/**
 * "30 – 5 de setembro" / "30 de agosto – 5 de setembro" — the week's span.
 *
 * The short form is kept for a week inside one month (the shape the original
 * hardcoded "1 – 6 de junho" had); a week straddling two months names both,
 * because "30 – 5 de setembro" would misdate the 30th.
 */
export function weekPeriodLabel(weekStart: Date): string {
  const end = addDays(weekStart, GRID_DAY_COUNT - 1);
  const startMonth = MONTH_FMT.format(weekStart);
  const endMonth = MONTH_FMT.format(end);
  return startMonth === endMonth && weekStart.getFullYear() === end.getFullYear()
    ? `${weekStart.getDate()} – ${end.getDate()} de ${endMonth}`
    : `${weekStart.getDate()} de ${startMonth} – ${end.getDate()} de ${endMonth}`;
}

// ---------------------------------------------------------------------------
// Grid builders
// ---------------------------------------------------------------------------

/**
 * The seven columns of the week starting at `weekStart` (a Sunday).
 * `today` is passed in rather than read from the clock so the result stays a
 * pure function of its inputs.
 */
export function weekDays(weekStart: Date, today: Date): WeekDay[] {
  const out: WeekDay[] = [];
  for (let i = 0; i < GRID_DAY_COUNT; i++) {
    const d = addDays(weekStart, i);
    const full = weekdayFull(d);
    out.push({
      iso: toDateKey(d),
      label: full.slice(0, 3),
      full,
      date: d.getDate(),
      today: isSameDay(d, today),
    });
  }
  return out;
}

/**
 * Every cell of the month grid containing `anchor`, padded with the
 * neighbouring months' days so the grid is whole weeks, Sunday-first.
 */
export function monthGrid(anchor: Date, today: Date): MonthCell[] {
  const first = startOfMonth(anchor);
  const nextMonth = addMonths(first, 1);
  const month = first.getMonth();
  const cells: MonthCell[] = [];
  let cursor = startOfWeek(first);
  // Run until the month is fully covered AND the last week is complete, so
  // every row has seven cells.
  while (cursor < nextMonth || cells.length % GRID_DAY_COUNT !== 0) {
    cells.push({
      iso: toDateKey(cursor),
      day: cursor.getDate(),
      out: cursor.getMonth() !== month,
      today: isSameDay(cursor, today),
    });
    cursor = addDays(cursor, 1);
  }
  return cells;
}
