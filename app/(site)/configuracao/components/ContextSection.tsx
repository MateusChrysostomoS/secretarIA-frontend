"use client";
// ContextSection — Section 01 "Contexto da clínica".
// Collects the clinic name, structured address, phone, accepted insurances,
// and the convênio-collection preference. clinicName is read-only
// (TenantConfigRead.clinic_name, never sent back on save); address/insurances/
// collectInsurance are REAL wire fields (Onboarding & Multi-Professional
// contract §10) as of this pass. `phone` stays demo-only — secretarIA still
// has no clinic-phone wire field. Specialty/about moved out: they are now
// per-professional (see ProfessionalsSection). Tone-of-voice is no longer
// clinic-editable at all — a hardcoded safety layer now lives in the
// backend prompt instead of a form field.

import { Field, TextInput } from "../../_shared/ui";
import { Section } from "./Section";
import { AddressFields } from "./AddressFields";
import { ToggleRow } from "./ToggleRow";
import type { ClinicCtx } from "../lib/types";

type ContextSectionProps = {
  v: ClinicCtx;
  // Generic setter — keeps each key bound to its own value type (string/boolean).
  set: <K extends keyof ClinicCtx>(key: K, value: ClinicCtx[K]) => void;
  // True when the secretarIA hub is unreachable right now (see
  // useSecretariaHub) — inputs are disabled since nothing typed here could
  // be saved until the connection returns.
  readOnly?: boolean;
};

// Renders all context fields inside a Section card with HelpTip annotations.
export function ContextSection({ v, set, readOnly }: ContextSectionProps) {
  return (
    <Section
      id="ctx"
      num="01"
      icon="note"
      title="Contexto da clínica"
      desc="É a base de tudo. A secretarIA usa essas informações para responder pacientes no WhatsApp com o tom e os dados certos."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field
          label="Nome da clínica / consultório"
          tip="Nome que a secretarIA usa ao se apresentar e em mensagens — ex.: “Consultório Dr. Aurélio Lima”."
        >
          <TextInput
            value={v.clinicName}
            onChange={e => set("clinicName", e.target.value)}
            placeholder="Consultório Dr. Aurélio Lima"
            disabled={readOnly}
          />
        </Field>

        {/* structured clinic address */}
        <AddressFields v={v} set={set} readOnly={readOnly} />

        {/* row: WhatsApp + accepted insurances */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 16 }}>
          <Field
            label="WhatsApp de atendimento"
            tip="Número conectado ao chatbot. É por ele que a secretarIA conversa com os pacientes."
          >
            <TextInput
              value={v.phone}
              onChange={e => set("phone", e.target.value)}
              placeholder="+55 11 99999-9999"
              disabled={readOnly}
            />
          </Field>
          <Field
            label="Convênios aceitos"
            tip="Liste os convênios separados por vírgula. O bot informa o paciente e evita agendamentos indevidos. Deixe em branco se for só particular."
          >
            <TextInput
              value={v.insurances}
              onChange={e => set("insurances", e.target.value)}
              placeholder="Unimed, Bradesco Saúde… (ou vazio para só particular)"
              disabled={readOnly}
            />
          </Field>
        </div>

        {/* convênio collection preference (patient PII — minimized per LGPD) */}
        <ToggleRow
          on={v.collectInsurance}
          onChange={value => set("collectInsurance", value)}
          title="Coletar convênio do paciente"
          desc="Quando ativo, a secretarIA pergunta no agendamento se o paciente tem convênio e qual. Ative apenas se for usar essa informação."
          disabled={readOnly}
        />
      </div>
    </Section>
  );
}
