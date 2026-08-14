"use client";
// AvailabilitySection — Section 07 "Dias e horários de atendimento".
// Shows a DayRow per weekday (toggle + time-range pickers) plus three
// scheduling preference selects: defaultDur, gap, and lead time.
// DayRow is an internal sub-component not used elsewhere.
//
// Onboarding & Multi-Professional pass: `days` now belongs to the SELECTED
// professional (business_hours), while `defaultDur` (appointment_duration_min)
// stays tenant-level — see buildConfigUpdatePayload/buildProfessionalConfigPayload
// in lib/hub-mapping.ts.

import { HelpTip, Field } from "../../_shared/ui";
import { Section } from "./Section";
import { CSelect } from "./CSelect";
import { CToggle } from "./CToggle";
import { Icon } from "../../_shared/ui";
import type { DayConfig, Prefs } from "../lib/types";
import type { Dispatch, SetStateAction } from "react";

// ---------------------------------------------------------------------------
// Time helpers — mirrored from config.jsx
// ---------------------------------------------------------------------------

// Every half-hour slot from 06:00 to 22:00 (inclusive), stored as minutes.
const TIME_LIST: number[] = (() => {
  const slots: number[] = [];
  for (let h = 6; h <= 22; h++) {
    slots.push(h * 60);
    slots.push(h * 60 + 30);
  }
  return slots;
})();

// Formats minutes-from-midnight as "HH:MM" for <option> labels.
const fmtHM = (m: number): string =>
  String(Math.floor(m / 60)).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");

// ---------------------------------------------------------------------------
// DayRow — internal: one weekday with toggle + time ranges
// ---------------------------------------------------------------------------

type DayRowProps = {
  day: DayConfig;
  onChange: (updated: DayConfig) => void;
};

// Renders the day label toggle and its list of time-range pickers.
function DayRow({ day, onChange }: DayRowProps) {
  const addRange = () =>
    onChange({ ...day, ranges: [...day.ranges, { start: 14 * 60, end: 18 * 60 }] });

  const setRange = (i: number, r: { start: number; end: number }) =>
    onChange({ ...day, ranges: day.ranges.map((x, j) => (j === i ? r : x)) });

  const removeRange = (i: number) =>
    onChange({ ...day, ranges: day.ranges.filter((_, j) => j !== i) });

  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 16,
      padding: "14px 0", borderBottom: "1px solid var(--line)",
    }}>
      {/* left: toggle + day label */}
      <div style={{
        display: "flex", alignItems: "center", gap: 11,
        width: 150, flexShrink: 0, paddingTop: 6,
      }}>
        <CToggle on={day.on} onChange={v => onChange({ ...day, on: v })} />
        <span style={{
          fontSize: 14.5, fontWeight: 600,
          color: day.on ? "var(--ink)" : "var(--ink-faint)",
        }}>
          {day.label}
        </span>
      </div>

      {/* right: time ranges or "Fechado" text */}
      <div style={{ flex: 1 }}>
        {!day.on ? (
          <span style={{
            fontSize: 13.5, color: "var(--ink-faint)",
            paddingTop: 9, display: "inline-block",
          }}>
            Fechado
          </span>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {day.ranges.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                {/* start time */}
                <CSelect
                  value={r.start}
                  onChange={e => setRange(i, { ...r, start: +e.target.value })}
                  style={{ width: 108 }}
                >
                  {TIME_LIST.map(t => (
                    <option key={t} value={t}>{fmtHM(t)}</option>
                  ))}
                </CSelect>

                <span style={{ color: "var(--ink-faint)", fontSize: 14 }}>às</span>

                {/* end time */}
                <CSelect
                  value={r.end}
                  onChange={e => setRange(i, { ...r, end: +e.target.value })}
                  style={{ width: 108 }}
                >
                  {TIME_LIST.map(t => (
                    <option key={t} value={t}>{fmtHM(t)}</option>
                  ))}
                </CSelect>

                {/* remove range button — only shown when multiple ranges exist */}
                {day.ranges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRange(i)}
                    title="Remover faixa"
                    style={{
                      width: 34, height: 34, borderRadius: 9,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--ink-faint)",
                      background: "var(--surface-2)", border: "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                  >
                    <Icon name="x" size={15} />
                  </button>
                )}
              </div>
            ))}

            {/* add another time range, e.g. afternoon block */}
            <button
              type="button"
              onClick={addRange}
              style={{
                alignSelf: "flex-start",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 600,
                color: "var(--brand)",
                padding: "5px 2px",
                background: "none", border: "none", cursor: "pointer",
              }}
            >
              <Icon name="plus" size={15} />
              Adicionar faixa (ex.: tarde)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// AvailabilitySection
// ---------------------------------------------------------------------------

type AvailabilitySectionProps = {
  days: DayConfig[];
  setDays: Dispatch<SetStateAction<DayConfig[]>>;
  prefs: Prefs;
  setPref: (key: keyof Prefs, value: number) => void;
  professionalName?: string;
};

// Section 07 — weekly schedule grid + scheduling preferences row.
export function AvailabilitySection({ days, setDays, prefs, setPref, professionalName }: AvailabilitySectionProps) {
  const updateDay = (i: number, d: DayConfig) =>
    setDays(prev => prev.map((x, j) => (j === i ? d : x)));

  return (
    <Section
      id="disp"
      num="07"
      icon="clock"
      title={"Dias e horários de atendimento" + (professionalName ? " · " + professionalName : "")}
      desc="Quando o médico atende. A secretarIA só oferece horários dentro dessas faixas e sincroniza com o Google Calendar para evitar conflitos."
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        {/* schedule header label */}
        <div style={{
          display: "flex", alignItems: "center", gap: 7,
          fontSize: 11.5, fontWeight: 700,
          color: "var(--ink-faint)", letterSpacing: ".04em",
          textTransform: "uppercase", paddingBottom: 4,
        }}>
          Horário semanal
          <HelpTip text="Ative os dias de atendimento e defina uma ou mais faixas por dia (ex.: manhã e tarde, com intervalo de almoço entre elas)." />
        </div>

        {/* one row per weekday */}
        {days.map((d, i) => (
          <DayRow key={d.key} day={d} onChange={nd => updateDay(i, nd)} />
        ))}
      </div>

      {/* scheduling preferences: default duration, gap, lead time */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3,1fr)",
        gap: 16, marginTop: 22,
      }}>
        <Field
          label="Duração padrão"
          tip="Tamanho do horário quando o serviço não define uma duração própria."
        >
          <CSelect
            value={prefs.defaultDur}
            onChange={e => setPref("defaultDur", +e.target.value)}
          >
            {[20, 30, 40, 50, 60].map(d => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </CSelect>
        </Field>

        <Field
          label="Intervalo entre consultas"
          tip="Folga automática reservada após cada atendimento, para o médico respirar e organizar."
        >
          <CSelect
            value={prefs.gap}
            onChange={e => setPref("gap", +e.target.value)}
          >
            {[0, 5, 10, 15, 20].map(d => (
              <option key={d} value={d}>
                {d === 0 ? "Sem intervalo" : `${d} min`}
              </option>
            ))}
          </CSelect>
        </Field>

        <Field
          label="Antecedência mínima"
          tip="Tempo mínimo entre o agendamento e a consulta. Ex.: 2h impede que marquem em cima da hora."
        >
          <CSelect
            value={prefs.lead}
            onChange={e => setPref("lead", +e.target.value)}
          >
            {[1, 2, 4, 12, 24].map(d => (
              <option key={d} value={d}>{d}h antes</option>
            ))}
          </CSelect>
        </Field>
      </div>
    </Section>
  );
}
