"use client";
// ContextSection — Section 01 "Contexto da clínica".
//
// HONESTY PASS (FIX 12)
// ---------------------
// Two controls here used to invite edits that went nowhere:
//
//  - "Nome da clínica" rendered as a normal editable input, but
//    buildConfigUpdatePayload has never included clinic_name — TenantConfigUpdate
//    has no such field. Typing a new name changed the screen and nothing else.
//    It is now static text, labeled with where the name actually comes from.
//
//  - "WhatsApp de atendimento" was a free-text field with no wire counterpart
//    at all, seeded with a demo number. It is gone. The connected number is
//    owned by the WhatsApp activation flow, so this section points there
//    instead of pretending to own it — and shows no number, which also keeps
//    a real clinic's line out of the DOM and out of screenshots.
//
// address/insurances/collectInsurance ARE real wire fields and stay editable.
// The address copy no longer claims the bot answers "onde fica?" from it — see
// ClinicCtx in ../lib/types.ts for why that promise was false.

import { Field, TextInput } from "../../_shared/ui";
import { Section } from "./Section";
import { AddressFields } from "./AddressFields";
import { ToggleRow } from "./ToggleRow";
import type { ClinicCtx } from "../lib/types";

type ContextSectionProps = {
  v: ClinicCtx;
  // Generic setter — keeps each key bound to its own value type (string/boolean).
  set: <K extends keyof ClinicCtx>(key: K, value: ClinicCtx[K]) => void;
  // True until this tenant's config has actually been read back from the hub
  // (see lib/hydration.ts). Editing is pointless before that and dangerous
  // after a failed load, so the inputs are genuinely disabled either way.
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
        {/* Read-only: owned by the clinic's registration, not by this form. */}
        <Field
          label="Nome da clínica / consultório"
          tip="Nome que a secretarIA usa ao se apresentar. Vem do cadastro da clínica no portal Brain e não é editável aqui."
          hint="Definido no cadastro da clínica. Para alterar, fale com o suporte da Brain."
        >
          <p
            style={{
              margin: 0,
              padding: "10px 12px",
              borderRadius: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              fontSize: 14,
              color: v.clinicName ? "var(--ink)" : "var(--ink-faint)",
            }}
          >
            {v.clinicName || "—"}
          </p>
        </Field>

        {/* structured clinic address — registration data, see AddressFields */}
        <AddressFields v={v} set={set} readOnly={readOnly} />

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

        {/* convênio collection preference (patient PII — minimized per LGPD) */}
        <ToggleRow
          on={v.collectInsurance}
          onChange={value => set("collectInsurance", value)}
          title="Coletar convênio do paciente"
          desc="Quando ativo, a secretarIA pergunta no agendamento se o paciente tem convênio e qual. Ative apenas se for usar essa informação."
          disabled={readOnly}
        />

        {/* Replaces the old free-text "WhatsApp de atendimento" input, which
            wrote to nothing. No number is rendered — the activation banner at
            the top of the page owns that status. */}
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", lineHeight: 1.5, margin: 0 }}>
          O número de WhatsApp que atende seus pacientes é definido na ativação do WhatsApp,
          não aqui. O estado da conexão aparece no aviso no topo desta página.
        </p>
      </div>
    </Section>
  );
}
