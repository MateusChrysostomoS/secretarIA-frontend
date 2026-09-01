"use client";
// MessagesSection — Section 02 "Mensagens".
//
// Greeting frame (2026-08-31 round): the FIRST-contact message is no longer
// clinic free text. `greeting_message` is gone from the wire; secretarIA
// renders a fixed product frame (services/greeting_template.py) carrying the
// automated-assistant disclosure, the "no medical advice here" line, the
// button guidance and the emergency escape, and the clinic fills exactly one
// slot inside it: `clinic_description`. GreetingComposer below shows the
// frame around that slot, because a bare textarea invites a clinic to write
// a whole greeting the frame already contains.
//
// `returning_greeting_message`/`language` stay real editable wire fields,
// capped at 1024 chars server-side. The old free-text tone/behavior-rules
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
import { GREETING_PREVIEW_PLACEHOLDER } from "../../../../lib/secretaria-hub";

// Server-side cap on returning_greeting_message (secretarIA schemas/config.py)
// — mirrored client-side so the doctor sees the limit before hitting a 422.
// The FIRST-contact greeting no longer has a flat cap like this: its budget is
// per-clinic and arrives on the wire as `clinicDescriptionMax`.
const GREETING_MESSAGE_MAX_LENGTH = 1024;

// Fixed product-level WhatsApp action buttons — see header comment. These are
// what a patient with NO upcoming appointment sees; someone who already has one
// gets [Remarcar] [Cancelar] [Outro] instead (workers/tasks.py::
// _greeting_buttons_for). The calendar emoji on Agendar is rendered by the
// backend and mirrored here so this preview matches the real message.
const FIXED_GREETING_BUTTONS = ["🗓️ Agendar", "Outro"];

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
        Botões do menu de atendimento
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
        Estes botões aparecem depois que o paciente aceita os termos, na mensagem “O que você
        precisa?” — Agendar inicia o fluxo automático de marcação e Outro abre a conversa livre
        com a assistente. A mensagem de boas-vindas em si vai sem botões, de propósito: antes do
        aceite não há como atender.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// GreetingComposer — internal: the clinic's slot PLUS the frame around it.
//
// This exists because the field alone is ambiguous. A textarea labelled
// "mensagem de boas-vindas" invites a clinic to write a whole greeting
// ("Olá! Sou a secretária do Dr. X…") — which is now duplicated, because the
// product frame already opens exactly that way. Showing the frame, with the
// typed text highlighted in position, is what makes the field's real job
// self-evident without anyone having to read a paragraph of instructions.
//
// The frame is NOT written here. It arrives on the wire as
// `greetingPreviewTemplate`, already rendered with this clinic's name, and is
// split once on GREETING_PREVIEW_PLACEHOLDER. Re-typing 800+ characters of
// copy in this file would guarantee the preview and the message patients
// actually receive drift apart the first time either side is edited.
// ---------------------------------------------------------------------------

function GreetingComposer({ v, set, readOnly }: MessagesSectionProps) {
  const [before, after] = splitGreetingTemplate(v.greetingPreviewTemplate);
  const typed = v.clinicDescription.trim();
  const max = v.clinicDescriptionMax;
  const used = v.clinicDescription.length;
  // Only warn once the server would actually refuse the save. `max === 0` means
  // the hub has not answered yet (or is an older build) — no counter is shown
  // rather than a wrong one.
  const over = max > 0 && used > max;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field
        label="Descrição da clínica"
        tip="Só o que a sua clínica oferece — especialidades, convênios, diferenciais. Não escreva uma saudação: o texto padrão abaixo já cumprimenta o paciente e se apresenta."
        hint={
          max > 0
            ? `${used}/${max} caracteres. O limite é curto porque a mensagem inteira precisa caber no máximo do WhatsApp.`
            : "Carregando o limite…"
        }
      >
        <TextArea
          value={v.clinicDescription}
          onChange={e => set("clinicDescription", e.target.value)}
          rows={3}
          // No maxLength: a hard cut would silently swallow characters the
          // clinic typed. It is allowed to go over and told so, in the same
          // spirit as the service-name and insurance fields (PROMPT_04B).
          placeholder='Ex.: "Oftalmologia e cirurgia refrativa. Atendemos particular e os principais convênios."'
          disabled={readOnly}
          aria-invalid={over || undefined}
        />
      </Field>

      {over && (
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--danger, #b3261e)" }}>
          Passou {used - max} {used - max === 1 ? "caractere" : "caracteres"} do limite — o
          servidor vai recusar o salvamento até encurtar.
        </span>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
        <span style={{
          fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", letterSpacing: ".01em",
        }}>
          Como o paciente recebe
        </span>

        {before || after ? (
          <div style={{
            border: "1px solid var(--line)", borderRadius: 14,
            background: "var(--surface-2, #f6f7f9)",
            padding: "14px 16px",
            fontSize: 13, lineHeight: 1.55,
            whiteSpace: "pre-wrap", wordBreak: "break-word",
            color: "var(--ink-soft)",
            maxHeight: 340, overflowY: "auto",
          }}>
            {collapseBlankRun(before)}
            {typed ? (
              <mark style={{
                background: "var(--brand-tint)", color: "var(--brand)",
                fontWeight: 600, borderRadius: 4, padding: "1px 3px",
              }}>
                {typed}
              </mark>
            ) : (
              <em style={{ color: "var(--ink-faint)" }}>
                (sua descrição aparece aqui)
              </em>
            )}
            {collapseBlankRun(after)}
          </div>
        ) : (
          <span style={{ fontSize: 12, color: "var(--ink-faint)" }}>
            A pré-visualização aparece quando a conexão com a secretarIA responder.
          </span>
        )}

        <span style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          O texto em cinza é padrão da secretarIA e não pode ser editado — ele avisa o paciente
          que está falando com um assistente automatizado, que nenhuma orientação médica é dada
          por ali e o que fazer em emergência.
        </span>

        <span style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          <strong>Como a conversa começa:</strong> esta mensagem sai primeiro, sem botões. Logo
          depois o paciente recebe uma segunda com os Termos de Uso e a Política de Privacidade e
          um botão “✅ Concordo”, exigido pela LGPD. Só após o aceite a secretarIA abre o
          atendimento — nenhum agendamento acontece antes disso, e o momento do aceite fica
          registrado.
        </span>
      </div>
    </div>
  );
}

// Splits the server-rendered frame into what comes before and after the
// clinic's slot. A template that has not arrived yet (or an older backend that
// does not send one) yields two empty strings, which the caller renders as
// "no preview" — never as an invented frame.
function splitGreetingTemplate(template: string): [string, string] {
  if (!template) return ["", ""];
  const at = template.indexOf(GREETING_PREVIEW_PLACEHOLDER);
  if (at < 0) return ["", ""];
  return [
    template.slice(0, at),
    template.slice(at + GREETING_PREVIEW_PLACEHOLDER.length),
  ];
}

// Mirrors the one collapse rule the backend applies after filling the slot
// (services/greeting_template.py::render_greeting): with no description, the
// blank lines that framed it collapse too, so the preview shows the same
// spacing the patient gets instead of an extra empty line.
function collapseBlankRun(chunk: string): string {
  return chunk.replace(/\n{3,}/g, "\n\n");
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
        <GreetingComposer v={v} set={set} readOnly={readOnly} />

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
