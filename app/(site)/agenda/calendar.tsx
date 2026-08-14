"use client";
// ===== secretarIA — Agenda calendar views =====
// Ported from _design-source/calendar.jsx.
// Exports: WeekView, DayView, MonthView (and the NOW_MIN constant).
// All three views receive appointments + blocks as a unified Appt[] array.

import { useState } from "react";
import { Icon, StatusBadge } from "../_shared/ui";
import {
  WEEK_DAYS,
  HOUR_START,
  HOUR_END,
  SLOT_H,
  STATUS_META,
  fmtTime,
  fmtRange,
} from "../_shared/data";
import type { Appt } from "../_shared/data";

// ---------------------------------------------------------------------------
// Calendar layout constants
// ---------------------------------------------------------------------------

/** Minutes from midnight representing "now" (11:22 on Tue). */
export const NOW_MIN = 11 * 60 + 22;

/** Total pixel height of the time grid (hours × px-per-hour). */
const TOTAL_H = (HOUR_END - HOUR_START) * SLOT_H;

// ---------------------------------------------------------------------------
// Shared layout helpers
// ---------------------------------------------------------------------------

/** Returns the CSS design-token tone for a given appointment. */
const toneOf = (a: Appt): string =>
  (STATUS_META[a.status] || {}).tone || "pending";

/** Converts minutes-from-midnight to a CSS top offset (px) within the grid. */
const topOf = (min: number): number =>
  ((min - HOUR_START * 60) / 60) * SLOT_H;

/**
 * Maps duration in minutes to a rendered block height (px).
 * Floor at 22px so even 15-min slots are legible.
 */
const heightOf = (dur: number): number =>
  Math.max((dur / 60) * SLOT_H - 4, 22);

// ---------------------------------------------------------------------------
// ApptBlock — compact block used inside WeekView columns
// ---------------------------------------------------------------------------

/**
 * Renders a single appointment or block slot inside the weekly grid.
 * Uses `compact` mode to suppress the type label on short slots.
 */
function ApptBlock({
  a,
  onSelect,
  compact,
}: {
  a: Appt;
  onSelect: (a: Appt) => void;
  compact?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const tone = toneOf(a);
  const isBlock = a.status === "bloqueio";
  const cancelled = a.status === "cancelado";

  if (isBlock) {
    return (
      <div
        onClick={() => onSelect(a)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position: "absolute",
          top: topOf(a.start) + 2,
          height: heightOf(a.dur),
          left: 3,
          right: 3,
          borderRadius: 8,
          padding: "6px 9px",
          cursor: "pointer",
          overflow: "hidden",
          color: "var(--st-block-ink)",
          border: "1px dashed var(--st-block-bd)",
          background:
            "repeating-linear-gradient(135deg, var(--st-block) 0 7px, transparent 7px 14px)",
          transition: "all .15s var(--ease)",
          transform: hov ? "translateY(-1px)" : "none",
          boxShadow: hov ? "var(--shadow-md)" : "none",
          zIndex: hov ? 5 : 1,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontSize: 12.5,
            fontWeight: 700,
          }}
        >
          <Icon name="ban" size={13} />
          {a.reason}
        </div>
        <div style={{ fontSize: 11.5, opacity: 0.8, marginTop: 1 }}>
          {fmtRange(a.start, a.dur)}
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(a)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "absolute",
        top: topOf(a.start) + 2,
        height: heightOf(a.dur),
        left: 3,
        right: 3,
        borderRadius: 9,
        padding: "5px 9px 5px 11px",
        cursor: "pointer",
        overflow: "hidden",
        background: `var(--st-${tone}-bg)`,
        color: `var(--st-${tone}-ink)`,
        border: `1px solid var(--st-${tone}-bd)`,
        transition: "all .15s var(--ease)",
        transform: hov ? "translateY(-1px)" : "none",
        boxShadow: hov ? "var(--shadow-md)" : "none",
        zIndex: hov ? 5 : 2,
        opacity: cancelled ? 0.55 : 1,
      }}
    >
      {/* coloured left accent bar matching the status tone */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 6,
          bottom: 6,
          width: 3,
          borderRadius: 99,
          background: `var(--st-${tone}-ink)`,
        }}
      />
      <div style={{ fontSize: 11, fontWeight: 600, opacity: 0.85, lineHeight: 1.2 }}>
        {fmtTime(a.start)}
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 700,
          lineHeight: 1.15,
          marginTop: 1,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textDecoration: cancelled ? "line-through" : "none",
        }}
      >
        {a.patient}
      </div>
      {/* type label only when the block is tall enough and not in compact mode */}
      {!compact && heightOf(a.dur) > 44 && (
        <div
          style={{
            fontSize: 11.5,
            opacity: 0.8,
            lineHeight: 1.2,
            marginTop: 1,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {a.type}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// NowLine — animated "current time" indicator
// ---------------------------------------------------------------------------

/**
 * Red dot + horizontal rule that marks the current time inside a day column.
 * Positioned absolutely via topOf(NOW_MIN).
 */
function NowLine() {
  return (
    <div
      style={{
        position: "absolute",
        left: -1,
        right: 0,
        top: topOf(NOW_MIN),
        zIndex: 6,
        pointerEvents: "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <div
          style={{
            width: 9,
            height: 9,
            borderRadius: 99,
            background: "#e0573f",
            marginLeft: -4,
            boxShadow: "0 0 0 3px rgba(224,87,63,.18)",
          }}
        />
        <div style={{ flex: 1, height: 2, background: "#e0573f" }} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HourGutter — left-side hour labels column
// ---------------------------------------------------------------------------

/**
 * Fixed-width column that renders "HH:00" labels aligned to each grid row.
 * Shared by WeekView and DayView.
 */
function HourGutter() {
  const hours: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  return (
    <div style={{ position: "relative", width: 60, flexShrink: 0 }}>
      {hours.map((h, i) => (
        <div
          key={h}
          style={{
            position: "absolute",
            top: i * SLOT_H - 8,
            right: 12,
            fontSize: 11.5,
            fontWeight: 600,
            color: "var(--ink-faint)",
          }}
        >
          {String(h).padStart(2, "0")}:00
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// GridLines — horizontal hour and half-hour dividers
// ---------------------------------------------------------------------------

/**
 * Renders full-opacity hour lines and 40%-opacity half-hour lines across a
 * day column. Positioned absolutely inside a relative container.
 */
function GridLines() {
  const rows: number[] = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) rows.push(h);

  return (
    <>
      {rows.map((h, i) => (
        <div
          key={h}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: i * SLOT_H,
            height: 1,
            background: "var(--line)",
          }}
        />
      ))}
      {rows.slice(0, -1).map((h, i) => (
        <div
          key={"half" + h}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: i * SLOT_H + SLOT_H / 2,
            height: 1,
            background: "var(--line)",
            opacity: 0.4,
          }}
        />
      ))}
    </>
  );
}

// ---------------------------------------------------------------------------
// WeekView — 6-column (Mon–Sat) scrollable week grid
// ---------------------------------------------------------------------------

/**
 * Full-week calendar view.
 * Sticky header row shows day labels with today highlighted;
 * clicking a day label navigates to DayView via onDayClick.
 */
export function WeekView({
  items,
  onSelect,
  onDayClick,
}: {
  items: Appt[];
  onSelect: (a: Appt) => void;
  onDayClick: (dayIdx: number) => void;
}) {
  const byDay = (d: number) => items.filter((a) => a.day === d);

  return (
    <div className="scroll" style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
      {/* sticky column header — day name + date bubble */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          display: "grid",
          gridTemplateColumns: "60px repeat(6, 1fr)",
          background: "var(--page)",
          borderBottom: "1px solid var(--line-strong)",
        }}
      >
        <div />
        {WEEK_DAYS.map((d, di) => (
          <button
            key={d.key}
            onClick={() => onDayClick(di)}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              padding: "11px 0 12px",
              background: "transparent",
              border: "none",
              borderLeft: "1px solid var(--line)",
              cursor: "pointer",
            } as React.CSSProperties}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: ".05em",
                textTransform: "uppercase",
                color: d.today ? "var(--brand)" : "var(--ink-faint)",
              }}
            >
              {d.label}
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 700,
                fontFamily: "var(--font-serif)",
                lineHeight: 1.1,
                color: d.today ? "#fff" : "var(--ink)",
                background: d.today ? "var(--brand)" : "transparent",
                width: 30,
                height: 30,
                borderRadius: 99,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {d.date}
            </span>
          </button>
        ))}
      </div>

      {/* grid body — hour gutter + one column per day */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "60px repeat(6, 1fr)",
          position: "relative",
        }}
      >
        <div style={{ position: "relative", height: TOTAL_H }}>
          <HourGutter />
        </div>
        {WEEK_DAYS.map((d, di) => (
          <div
            key={d.key}
            style={{
              position: "relative",
              height: TOTAL_H,
              borderLeft: "1px solid var(--line)",
              background: d.today ? "var(--brand-tint)" : "transparent",
            }}
          >
            {/* subtle today tint overlay */}
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: d.today ? "var(--surface)" : "transparent",
                opacity: d.today ? 0.35 : 0,
              }}
            />
            <GridLines />
            {byDay(di).map((a) => (
              <ApptBlock key={a.id} a={a} onSelect={onSelect} />
            ))}
            {d.today && <NowLine />}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayView — single-day detail view centred at max 860px
// ---------------------------------------------------------------------------

/**
 * Single-day calendar view.
 * Renders a wider appointment card (DayBlock) that shows full patient name,
 * time range, type, anamnese badge, and status.
 */
export function DayView({
  dayIdx,
  items,
  onSelect,
}: {
  dayIdx: number;
  items: Appt[];
  onSelect: (a: Appt) => void;
}) {
  const d = WEEK_DAYS[dayIdx];
  const list = items
    .filter((a) => a.day === dayIdx)
    .sort((x, y) => x.start - y.start);

  return (
    <div
      className="scroll"
      style={{
        flex: 1,
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          display: "flex",
          width: "100%",
          maxWidth: 860,
          padding: "0 24px",
        }}
      >
        <div
          style={{ position: "relative", width: 60, flexShrink: 0, height: TOTAL_H }}
        >
          <HourGutter />
        </div>
        <div
          style={{
            position: "relative",
            flex: 1,
            height: TOTAL_H,
            borderLeft: "1px solid var(--line)",
          }}
        >
          <GridLines />
          {list.map((a) => (
            <DayBlock key={a.id} a={a} onSelect={onSelect} />
          ))}
          {d?.today && <NowLine />}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DayBlock — expanded appointment card used only inside DayView
// ---------------------------------------------------------------------------

/**
 * Full-width appointment or block row for the day-detail view.
 * Shows more detail than the compact WeekView ApptBlock.
 */
function DayBlock({
  a,
  onSelect,
}: {
  a: Appt;
  onSelect: (a: Appt) => void;
}) {
  const [hov, setHov] = useState(false);
  const tone = toneOf(a);
  const isBlock = a.status === "bloqueio";
  const h = heightOf(a.dur);

  if (isBlock) {
    return (
      <div
        onClick={() => onSelect(a)}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{
          position: "absolute",
          top: topOf(a.start) + 2,
          height: h,
          left: 8,
          right: 8,
          borderRadius: 10,
          padding: "8px 14px",
          cursor: "pointer",
          color: "var(--st-block-ink)",
          border: "1px dashed var(--st-block-bd)",
          background:
            "repeating-linear-gradient(135deg, var(--st-block) 0 8px, transparent 8px 16px)",
          display: "flex",
          alignItems: "center",
          gap: 9,
          transition: "all .15s",
          boxShadow: hov ? "var(--shadow-md)" : "none",
        }}
      >
        <Icon name="ban" size={16} />
        <b style={{ fontSize: 14 }}>{a.reason}</b>
        <span style={{ fontSize: 12.5, opacity: 0.8 }}>
          · {fmtRange(a.start, a.dur)}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={() => onSelect(a)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        position: "absolute",
        top: topOf(a.start) + 2,
        height: h,
        left: 8,
        right: 8,
        borderRadius: 11,
        padding: "9px 15px 9px 17px",
        cursor: "pointer",
        overflow: "hidden",
        background: `var(--st-${tone}-bg)`,
        color: `var(--st-${tone}-ink)`,
        border: `1px solid var(--st-${tone}-bd)`,
        transition: "all .15s var(--ease)",
        transform: hov ? "translateY(-1px)" : "none",
        boxShadow: hov ? "var(--shadow-md)" : "none",
        opacity: a.status === "cancelado" ? 0.55 : 1,
      }}
    >
      {/* thick left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 8,
          bottom: 8,
          width: 4,
          borderRadius: 99,
          background: `var(--st-${tone}-ink)`,
        }}
      />
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 10,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 15.5,
              fontWeight: 700,
              lineHeight: 1.2,
              textDecoration: a.status === "cancelado" ? "line-through" : "none",
            }}
          >
            {a.patient}
          </div>
          <div
            style={{
              fontSize: 12.5,
              opacity: 0.85,
              marginTop: 2,
              display: "flex",
              alignItems: "center",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
            >
              <Icon name="clock" size={13} />
              {fmtRange(a.start, a.dur)}
            </span>
            <span>· {a.type}</span>
            {a.anamnese === "recebida" && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 3,
                  fontWeight: 600,
                }}
              >
                <Icon name="check" size={12} />
                Pré-consulta
              </span>
            )}
          </div>
        </div>
        {/* status badge only when the block is tall enough to fit it */}
        {h > 50 && <StatusBadge status={a.status} size="sm" />}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// MonthView — full month grid (June 2026 hard-coded like the design source)
// ---------------------------------------------------------------------------

/**
 * Builds the month grid cells for June 2026.
 * Week starts on Sunday to match the Brazilian calendar convention.
 * Cells outside the month (May 31, July overflow) are marked `out: true`.
 */
const MONTH_GRID = (() => {
  const cells: Array<{ d: number; dayIdx?: number; out?: boolean }> = [];
  // Week 1: May 31 (Sun) + June 1–6
  cells.push({ d: 31, out: true });
  for (let d = 1; d <= 6; d++) cells.push({ d, dayIdx: d - 1 });
  // June 7–30 (no WEEK_DAYS entry for these — month grid only shows dot counts)
  for (let d = 7; d <= 30; d++) cells.push({ d });
  // Pad the last partial week with July dates
  let jul = 1;
  while (cells.length % 7 !== 0) cells.push({ d: jul++, out: true });
  return cells;
})();

const WD_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

/**
 * Month-at-a-glance view.
 * Each cell shows the day number and up to 3 appointment dots.
 * Clicking a week-1 day (those with a dayIdx) drills into DayView.
 */
export function MonthView({
  items,
  onDayClick,
}: {
  items: Appt[];
  onDayClick: (dayIdx: number) => void;
}) {
  const countFor = (dayIdx: number) =>
    items.filter((a) => a.day === dayIdx && a.status !== "bloqueio");

  const rows = Math.ceil(MONTH_GRID.length / 7);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "4px 24px 22px",
      }}
    >
      {/* weekday label row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          borderBottom: "1px solid var(--line)",
        }}
      >
        {WD_LABELS.map((w) => (
          <div
            key={w}
            style={{
              padding: "10px 12px",
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: ".05em",
              textTransform: "uppercase",
              color: "var(--ink-faint)",
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* day cell grid */}
      <div
        className="scroll"
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gridTemplateRows: `repeat(${rows}, 1fr)`,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        {MONTH_GRID.map((c, i) => {
          const appts = c.dayIdx != null ? countFor(c.dayIdx) : [];
          // June 2: today (index 1 in WEEK_DAYS, but in month grid it's d=2)
          const today = c.d === 2 && !c.out;
          const clickable = c.dayIdx != null;

          return (
            <button
              key={i}
              onClick={() => clickable && onDayClick(c.dayIdx!)}
              disabled={!clickable}
              style={{
                padding: "8px 9px",
                display: "flex",
                flexDirection: "column",
                gap: 5,
                alignItems: "stretch",
                textAlign: "left",
                background: today ? "var(--brand-tint)" : "transparent",
                minHeight: 84,
                cursor: clickable ? "pointer" : "default",
                opacity: c.out ? 0.35 : 1,
                transition: "background .14s",
                border: "none",
                borderRight: i % 7 !== 6 ? "1px solid var(--line)" : "none",
                borderBottom: "1px solid var(--line)",
              } as React.CSSProperties}
            >
              {/* day number bubble — filled brand for today */}
              <span
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: "var(--font-serif)",
                  alignSelf: "flex-start",
                  color: today ? "#fff" : "var(--ink)",
                  background: today ? "var(--brand)" : "transparent",
                  width: 26,
                  height: 26,
                  borderRadius: 99,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {c.d}
              </span>

              {/* up to 3 appointment dot rows */}
              {appts.slice(0, 3).map((a) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: `var(--st-${toneOf(a)}-ink)`,
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 99,
                      background: `var(--st-${toneOf(a)}-ink)`,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {fmtTime(a.start)} {(a.patient || "").split(" ")[0]}
                  </span>
                </div>
              ))}

              {/* overflow count when more than 3 appointments */}
              {appts.length > 3 && (
                <span
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "var(--ink-faint)",
                  }}
                >
                  +{appts.length - 3} mais
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
