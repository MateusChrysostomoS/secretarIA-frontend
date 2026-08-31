"use client";
// MessagesSection — Section 02 "Mensagens". greeting_message/
// returning_greeting_message/language are real fields on secretarIA's wire
// (TenantConfigWire) — editable here, capped at 1024 chars server-side (see
// GREETING_MESSAGE_MAX_LENGTH below). The old free-text tone/behavior-rules
// field was removed from this UI — a hardcoded safety layer now lives in the
// backend prompt instead of a clinic-editable field.
//
// Greeting buttons (2026-08 rounds): the WhatsApp first-contact buttons are
// no longer clinic-editable text. secretarIA ships a FIXED product-level
// set — now [Agendar] [Gerenciar consulta] [Outro] (the trio-gerenciar
// round consolidated the old separate Remarcar/Cancelar slots into one
// manage entry, freeing the third slot for "Outro", the explicit
// talk-to-the-assistant escape). Agendar/Gerenciar route deterministically
// server-side; Outro opens the LLM conversation. `greeting_buttons` was
// REMOVED from TenantConfigWire (GET no longer returns it) and
// TenantConfigUpdatePayload (PUT ignores it silently if sent) — see
// lib/secretaria-hub.ts. FIXED_GREETING_BUTTONS below is purely local
// display copy, not a wire value — there is no endpoint to fetch it from, so
// it is rendered read-only with no edit control at all.

import { Icon, Field, TextArea } from "../../_shared/ui";
import { Section } from "./Section";
import { CSelect } from "./CSelect";
import type { Messages } from "../lib/types";

// Server-side cap on greeting_message/returning_greeting_message
// (secretarIA schemas/config.py) — mirrored client-side so the doctor sees
// the limit before hitting a 422 on save.
const GREETING_MESSAGE_MAX_LENGTH = 1024;

// Fixed product-level WhatsApp greeting buttons — see header comment. Order
// matches the deterministic routing the backend documents.
const FIXED_GREETING_BUTTONS = ["Agendar", "Gerenciar consulta", "Outro"];

const LANGUAGE_OPTIONS: { value: string; label: string }[] = [
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-US", label: "English (US)" },
];

type MessagesSectionProps = {
  v: Messages;
  set: <K extends keyof Messages>(key: K, value: Messages[K]) => void;
  // True when the secretarIA hub is unreachable right now (see
  // useSecretariaHub) — inputs are disabled since nothing typed here could
  // be saved until the connection returns.
  readOnly?: boolean;
};

// ---------------------------------------------------------------------------
// GreetingButtonsPreview — internal: read-only display of the fixed product
// buttons. There is no input anywhere here by design (mirrors PixSection's
// AsaasStatusPill pattern for showing fixed/derived state without inventing
// an editable control for something that can't actually be changed).
// ---------------------------------------------------------------------------

function GreetingButtonsPreview() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
      <span style={{
        fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", letterSpacing: ".01em",
      }}>
        Botões da primeira mensagem
      </span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {FIXED_GREETING_BUTTONS.map(label => (
          <span
            key={label}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6,
              padding: "6px 14px", borderRadius: 999,
              background: "var(--brand-tint)", color: "var(--brand)",
              border: "1px solid var(--line)",
              fontSize: 13, fontWeight: 700,
            }}
          >
            <Icon name="whatsapp" size={13} />
            {label}
          </span>
        ))}
      </div>
      <span style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
        Estes são os botões que seus pacientes veem na primeira mensagem — Agendar e Gerenciar
        consulta iniciam os fluxos automáticos, e Outro abre a conversa livre com a assistente.
      </span>
    </div>
  );
}

export function MessagesSection({ v, set, readOnly }: MessagesSectionProps) {
  return (
    <Section
      id="msg"
      num="02"
      icon="send"
      title="Mensagens"
      desc="Como a secretarIA cumprimenta e se comporta no WhatsApp — a primeira impressão que o paciente tem da clínica."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <Field
          label="Mensagem de boas-vindas"
          tip="Enviada quando um paciente escreve pela primeira vez (ou depois de muito tempo sem conversar)."
          hint={`Até ${GREETING_MESSAGE_MAX_LENGTH} caracteres.`}
        >
          <TextArea
            value={v.greetingMessage}
            onChange={e => set("greetingMessage", e.target.value)}
            rows={3}
            maxLength={GREETING_MESSAGE_MAX_LENGTH}
            placeholder='Ex.: "Olá! Aqui é a secretária do Dr. Aurélio Lima. Como posso ajudar você hoje?"'
            disabled={readOnly}
          />
        </Field>

        <Field
          label="Mensagem para paciente recorrente"
          tip="Enviada quando o paciente já conversou com a secretarIA antes — pode ser mais direta e pessoal."
          hint={`Até ${GREETING_MESSAGE_MAX_LENGTH} caracteres.`}
        >
          <TextArea
            value={v.returningGreetingMessage}
            onChange={e => set("returningGreetingMessage", e.target.value)}
            rows={3}
            maxLength={GREETING_MESSAGE_MAX_LENGTH}
            placeholder='Ex.: "Oi de novo! Em que posso ajudar dessa vez?"'
            disabled={readOnly}
          />
        </Field>

        <GreetingButtonsPreview />

        <Field label="Idioma de atendimento">
          <CSelect
            value={v.language}
            onChange={e => set("language", e.target.value)}
            disabled={readOnly}
            style={{ maxWidth: 320 }}
            label="Idioma de atendimento"
          >
            {LANGUAGE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </CSelect>
        </Field>
      </div>
    </Section>
  );
}
