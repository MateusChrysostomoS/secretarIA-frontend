"use client";
// AvailabilitySection — Section 07 "Dias e horários de atendimento".
// A DayRow per weekday (toggle + time-range pickers) plus the one scheduling
// preference this screen can actually persist. DayRow is internal.
//
// `days` belongs to the SELECTED professional (business_hours); `defaultDur`
// (appointment_duration_min) stays tenant-level — see
// buildConfigUpdatePayload/buildProfessionalConfigPayload in lib/hub-mapping.ts.
// The two therefore gate on DIFFERENT hydration scopes, which is why there are
// two read-only flags below rather than one.
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
import { InheritanceChoice, InheritedNote } from "./InheritanceChoice";
import type { ConfigInheritance, DayConfig, Prefs } from "../lib/types";
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
// AvailabilitySection
// ---------------------------------------------------------------------------

type AvailabilitySectionProps = {
  days: DayConfig[];
  setDays: Dispatch<SetStateAction<DayConfig[]>>;
  prefs: Prefs;
  setPref: (key: keyof Prefs, value: number) => void;
  professionalName?: string;
  // Whether `days` is this professional's own schedule or the clinic's,
  // inherited — see lib/types.ts. The values alone cannot say: an inheriting
  // professional and one who closed every day both arrive as a closed week.
  source: ConfigInheritance;
  onSourceChange: (next: "inherit" | "own") => void;
  // The clinic's own weekly schedule, shown read-only while inheriting so the
  // section displays WHAT is inherited instead of a blank week that reads as
  // "nothing configured".
  inheritedDays: DayConfig[];
  // Weekly hours belong to the selected professional — locked until THAT
  // professional's config has hydrated (see lib/hydration.ts).
  readOnly?: boolean;
  // Default duration is tenant-level, so it unlocks with the tenant config
  // instead. Separate flag because the two scopes fail independently.
  durationReadOnly?: boolean;
};

// Section 07 — weekly schedule grid + default appointment duration.
export function AvailabilitySection({
  days,
  setDays,
  prefs,
  setPref,
  professionalName,
  source,
  onSourceChange,
  inheritedDays,
  readOnly,
  durationReadOnly,
}: AvailabilitySectionProps) {
  const updateDay = (i: number, d: DayConfig) =>
    setDays(prev => prev.map((x, j) => (j === i ? d : x)));

  const inheriting = source === "inherit";
  // While inheriting, the clinic's schedule is what patients actually get, so
  // that is what the grid shows — locked, because editing it here would be
  // editing the clinic's hours through a professional's form.
  const shownDays = inheriting ? inheritedDays : days;
  const gridReadOnly = readOnly || inheriting;
  const nothingOpen = shownDays.every(d => !d.on);

  return (
    <Section
      id="disp"
      num="07"
      icon="clock"
      title={"Dias e horários de atendimento" + (professionalName ? " · " + professionalName : "")}
      desc="Quando o médico atende. A secretarIA só oferece horários dentro dessas faixas e sincroniza com o Google Calendar para evitar conflitos."
    >
      <InheritanceChoice
        name="disp-source"
        source={source}
        onChange={onSourceChange}
        inheritHint="Usa os horários da clínica. Mudou lá, muda aqui."
        ownHint="Define horários só deste profissional, independentes da clínica."
        readOnly={readOnly}
      />

      {inheriting && (
        <InheritedNote>
          Estes são os horários <b>da clínica</b>, aplicados a este profissional. Para alterá-los só
          para ele, escolha <b>Configuração própria</b> acima — os horários abaixo viram o ponto de
          partida.
        </InheritedNote>
      )}

      {/* An own schedule with every day closed is a real choice, and a costly
          one: the bot can offer nothing. Say so here rather than letting the
          clinic discover it from a patient. */}
      {source === "own" && nothingOpen && (
        <InheritedNote>
          Nenhum dia está aberto. Com uma configuração própria, isso significa que a secretarIA{" "}
          <b>não oferecerá nenhum horário</b> deste profissional — os horários da clínica não
          entram como reserva.
        </InheritedNote>
      )}

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
        {shownDays.map((d, i) => (
          <DayRow key={d.key} day={d} onChange={nd => updateDay(i, nd)} readOnly={gridReadOnly} />
        ))}
      </div>

      {/* the one scheduling preference with a real wire field behind it */}
      <div style={{ marginTop: 22, maxWidth: 260 }}>
        <Field
          label="Duração padrão"
          tip="Tamanho do horário quando o serviço não define uma duração própria."
        >
          <CSelect
            value={prefs.defaultDur}
            onChange={e => setPref("defaultDur", +e.target.value)}
            disabled={durationReadOnly}
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
