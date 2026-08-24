"use client";
// AvailabilitySection — Section 07 "Dias e horários de atendimento".
// Two weekly grids — the CLINIC's opening hours and the SELECTED professional's
// own — plus the one scheduling preference this screen can persist. DayRow and
// WeekGrid are internal.
//
// `days` belongs to the professional (professionals.business_hours);
// `clinicDays` (tenants.business_hours) and `defaultDur`
// (appointment_duration_min) are tenant-level — see buildConfigUpdatePayload /
// buildProfessionalConfigPayload in lib/hub-mapping.ts. They gate on DIFFERENT
// hydration scopes, which is why there are two read-only flags below.
//
// WHY THERE IS NO "HERDAR DA CLÍNICA / CONFIGURAÇÃO PRÓPRIA" SWITCH ANY MORE
// -------------------------------------------------------------------------
// There used to be one, and it made the doctor answer a question about data
// modelling ("is your schedule an override?") before they could type an
// opening time. Worse, the clinic's own hours had no field anywhere on this
// screen: they existed only as the thing the "herdar" branch displayed,
// read-only, so a clinic could never actually SET them.
//
// Now the clinic states its hours in its own grid, and a professional's grid is
// always directly editable with a "Preencher com o horário da clínica" button
// that copies them in as a starting point. Inheritance is still real underneath
// — a professional who has never touched their grid keeps `business_hours:
// null` and follows the clinic live — but it is now a CONSEQUENCE of not having
// typed anything rather than a mode to pick. Touching the grid (or pressing the
// fill button) is what takes over, and page.tsx's `setProfessionalDays` is
// where that flip happens.
//
// HONESTY PASS (FIX 12): the "Intervalo entre consultas" and "Antecedência
// mínima" selects are gone. TenantConfigUpdate has no field for either,
// buildConfigUpdatePayload never sent them, and nothing in the slot resolver
// reads them — so every clinic that chose "10 min" or "2h antes" was
// configuring nothing at all. They come back the day they exist end to end,
// not before.

import { HelpTip, Field } from "../../_shared/ui";
import { Section } from "./Section";
import { CSelect } from "./CSelect";
import { CToggle } from "./CToggle";
import { Icon } from "../../_shared/ui";
import { InlineNote } from "./InlineNote";
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
  readOnly?: boolean;
};

// Renders the day label toggle and its list of time-range pickers.
function DayRow({ day, onChange, readOnly }: DayRowProps) {
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
        <CToggle on={day.on} onChange={v => onChange({ ...day, on: v })} disabled={readOnly} />
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
                  disabled={readOnly}
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
                  disabled={readOnly}
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
                    disabled={readOnly}
                    title="Remover faixa"
                    aria-label="Remover faixa"
                    style={{
                      width: 34, height: 34, borderRadius: 9,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: "var(--ink-faint)",
                      background: "var(--surface-2)", border: "1px solid var(--line)",
                      opacity: readOnly ? 0.5 : 1,
                      cursor: readOnly ? "not-allowed" : "pointer",
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
              disabled={readOnly}
              style={{
                alignSelf: "flex-start",
                display: "inline-flex", alignItems: "center", gap: 6,
                fontSize: 13, fontWeight: 600,
                color: "var(--brand)",
                padding: "5px 2px",
                background: "none", border: "none",
                opacity: readOnly ? 0.5 : 1,
                cursor: readOnly ? "not-allowed" : "pointer",
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
// WeekGrid — internal: the seven DayRows plus their heading.
// ---------------------------------------------------------------------------

function WeekGrid({
  days,
  onChange,
  label,
  tip,
  readOnly,
}: {
  days: DayConfig[];
  // Takes the WHOLE next week, not a functional update: the caller may be
  // showing the clinic's grid in place of a professional's empty one, so an
  // updater relative to the professional's own state would edit the wrong
  // array. See `shownDays` below.
  onChange: (next: DayConfig[]) => void;
  label: string;
  tip: string;
  readOnly?: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 7,
        fontSize: 11.5, fontWeight: 700,
        color: "var(--ink-faint)", letterSpacing: ".04em",
        textTransform: "uppercase", paddingBottom: 4,
      }}>
        {label}
        <HelpTip text={tip} />
      </div>

      {days.map((d, i) => (
        <DayRow
          key={d.key}
          day={d}
          onChange={nd => onChange(days.map((x, j) => (j === i ? nd : x)))}
          readOnly={readOnly}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// AvailabilitySection
// ---------------------------------------------------------------------------

type AvailabilitySectionProps = {
  days: DayConfig[];
  // Setting this is what takes a professional off the clinic's schedule — see
  // page.tsx's `setProfessionalDays`, which flips the inheritance flag.
  setDays: Dispatch<SetStateAction<DayConfig[]>>;
  prefs: Prefs;
  setPref: (key: keyof Prefs, value: number) => void;
  professionalName?: string;
  // The CLINIC's own weekly schedule (tenants.business_hours) — editable here,
  // and the source the fill button copies from.
  clinicDays: DayConfig[];
  setClinicDays: Dispatch<SetStateAction<DayConfig[]>>;
  // True while this professional still has NO schedule of their own, so the
  // clinic's applies to them live. Display-only: it decides which week the
  // grid shows and whether the "following the clinic" note appears — it is
  // never a control the user sets.
  inheritingHours: boolean;
  // Weekly hours belong to the selected professional — locked until THAT
  // professional's config has hydrated (see lib/hydration.ts).
  readOnly?: boolean;
  // The clinic schedule and the default duration are tenant-level, so they
  // unlock with the tenant config instead. Separate flag because the two
  // scopes fail independently.
  tenantReadOnly?: boolean;
};

// Section 07 — clinic opening hours, the professional's own week, default duration.
export function AvailabilitySection({
  days,
  setDays,
  prefs,
  setPref,
  professionalName,
  clinicDays,
  setClinicDays,
  inheritingHours,
  readOnly,
  tenantReadOnly,
}: AvailabilitySectionProps) {
  // While a professional has no schedule of their own, what patients actually
  // get is the clinic's — so that is what the grid shows. Editing it there is
  // exactly the act of taking over, and `setDays` writes the WHOLE week, so
  // the first edit carries the other six days with it instead of landing on a
  // blank one.
  const shownDays = inheritingHours ? clinicDays : days;
  const nothingOpen = shownDays.every(d => !d.on);
  const clinicIsEmpty = clinicDays.every(d => !d.on);

  // Copies the clinic's week in as a starting point. Deep-copies the ranges:
  // sharing them would make editing the professional's Tuesday silently edit
  // the clinic's Tuesday too.
  const fillFromClinic = () =>
    setDays(clinicDays.map(d => ({ ...d, ranges: d.ranges.map(r => ({ ...r })) })));

  const fillBlocked = readOnly || clinicIsEmpty;

  return (
    <Section
      id="disp"
      num="07"
      icon="clock"
      title="Dias e horários de atendimento"
      desc="Quando a clínica abre e quando cada profissional atende. A secretarIA só oferece horários dentro dessas faixas e sincroniza com o Google Calendar para evitar conflitos."
    >
      {/* ---------- the clinic's own opening hours ---------- */}
      <div style={{ marginBottom: 30 }}>
        <InlineNote>
          Este é o horário <b>da clínica</b>, e vale para toda ela: é o que a secretarIA usa para
          saber se está dentro do expediente, e o ponto de partida sugerido para cada profissional.
        </InlineNote>

        <WeekGrid
          days={clinicDays}
          onChange={setClinicDays}
          label="Horário de funcionamento da clínica"
          tip="Ative os dias em que a clínica abre e defina uma ou mais faixas por dia (ex.: manhã e tarde, com intervalo de almoço entre elas)."
          readOnly={tenantReadOnly}
        />
      </div>

      {/* ---------- the selected professional's own week ---------- */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 14, flexWrap: "wrap", marginBottom: 10,
      }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)" }}>
          Horário de atendimento{professionalName ? " · " + professionalName : ""}
        </span>

        {/* The whole point of the clinic grid above: fill this one from it and
            then change only what differs, instead of retyping a week. */}
        <button
          type="button"
          onClick={fillFromClinic}
          disabled={fillBlocked}
          title={
            clinicIsEmpty
              ? "Defina primeiro o horário de funcionamento da clínica, acima"
              : "Copia o horário da clínica para este profissional. Depois é só ajustar o que for diferente."
          }
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "8px 14px", borderRadius: 10,
            fontSize: 13, fontWeight: 600,
            color: "var(--brand)", background: "var(--brand-tint)",
            border: "1px dashed var(--brand)",
            opacity: fillBlocked ? 0.5 : 1,
            cursor: fillBlocked ? "not-allowed" : "pointer",
          }}
        >
          <Icon name="swap" size={15} />
          Preencher horários padrão da clínica
        </button>
      </div>

      {inheritingHours && !clinicIsEmpty && (
        <InlineNote>
          Este profissional ainda não tem horário próprio, então segue o da clínica — inclusive se
          ele mudar depois. Ao alterar qualquer coisa abaixo, ele passa a ter o próprio horário e
          para de acompanhar o da clínica.
        </InlineNote>
      )}

      {/* An own schedule with every day closed is a real choice, and a costly
          one: the bot can offer nothing. Say so here rather than letting the
          clinic discover it from a patient. */}
      {!inheritingHours && nothingOpen && (
        <InlineNote>
          Nenhum dia está aberto. Com um horário próprio, isso significa que a secretarIA{" "}
          <b>não oferecerá nenhum horário</b> deste profissional — o horário da clínica não entra
          como reserva.
        </InlineNote>
      )}

      <WeekGrid
        days={shownDays}
        onChange={setDays}
        label="Horário semanal do profissional"
        tip="Ative os dias de atendimento e defina uma ou mais faixas por dia (ex.: manhã e tarde, com intervalo de almoço entre elas)."
        readOnly={readOnly}
      />

      {/* the one scheduling preference with a real wire field behind it */}
      <div style={{ marginTop: 22, maxWidth: 260 }}>
        <Field
          label="Duração padrão"
          tip="Tamanho do horário quando o serviço não define uma duração própria."
        >
          <CSelect
            value={prefs.defaultDur}
            onChange={e => setPref("defaultDur", +e.target.value)}
            disabled={tenantReadOnly}
          >
            {[20, 30, 40, 50, 60].map(d => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </CSelect>
        </Field>
      </div>
    </Section>
  );
}
