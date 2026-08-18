"use client";
// ===== secretarIA — Agenda modals =====
// Ported from _design-source/modals.jsx.
// Exports: NewApptModal, EditApptModal, RescheduleModal, CancelModal, BlockModal.
// Internal: Modal shell, MessagePreview, Select, Toggle, TIME_OPTS.

import { useState, useEffect } from "react";
import type { CSSProperties, ReactNode, ChangeEvent } from "react";
import {
  Icon,
  Btn,
  Avatar,
  IconBtn,
  Field,
  TextInput,
  inputStyle,
} from "../_shared/ui";
import {
  WEEK_DAYS,
  APPT_TYPES,
  DURATIONS,
  fmtTime,
  fmtRange,
  dayFull,
  firstName,
} from "../_shared/data";
import type { Appt } from "../_shared/data";
import type { CancelPreviewWire } from "@/lib/secretaria-hub";

// ---------------------------------------------------------------------------
// clinicDisplay — strips a leading "Consultório " so a real clinic_name reads
// naturally as "no {clinic}" / "do {clinic}" in the message templates below,
// the same way the old CLINIC demo constant's name was authored to. Real
// tenant names are free text (no guaranteed prefix), so this is a no-op for
// most of them — kept only for continuity with names that DO follow the old
// convention.
// ---------------------------------------------------------------------------

const clinicDisplay = (name: string): string => name.replace(/^Consultório\s+/, "");

// ---------------------------------------------------------------------------
// TIME_OPTS — list of selectable time slots (15-min intervals within HOUR_START..HOUR_END)
// ---------------------------------------------------------------------------

import { HOUR_START, HOUR_END } from "../_shared/data";

/** Every quarter-hour slot from HOUR_START to HOUR_END, expressed in minutes. */
const TIME_OPTS: number[] = (() => {
  const o: number[] = [];
  for (let h = HOUR_START; h < HOUR_END; h++) {
    for (let m = 0; m < 60; m += 15) o.push(h * 60 + m);
  }
  return o;
})();

// ---------------------------------------------------------------------------
// Select — styled native <select> with a chevron overlay
// ---------------------------------------------------------------------------

/**
 * Wraps a native <select> with the shared inputStyle and a chevron icon.
 * Focus border is applied via local state (matches TextInput behaviour).
 */
function Select({
  value,
  onChange,
  children,
  style,
}: {
  value: string | number;
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const [foc, setFoc] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={onChange}
        onFocus={() => setFoc(true)}
        onBlur={() => setFoc(false)}
        style={{
          ...inputStyle,
          appearance: "none",
          paddingRight: 34,
          cursor: "pointer",
          borderColor: foc ? "var(--brand)" : "var(--line-strong)",
          ...style,
        }}
      >
        {children}
      </select>
      {/* non-interactive chevron indicator */}
      <span
        style={{
          position: "absolute",
          right: 12,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          color: "var(--ink-faint)",
        }}
      >
        <Icon name="chevD" size={16} />
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toggle — pill-shaped on/off switch
// ---------------------------------------------------------------------------

/**
 * Simple binary toggle control.
 * Used for the "Enviar confirmação no WhatsApp" option in NewApptModal.
 */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 99,
        padding: 3,
        flexShrink: 0,
        transition: "background .2s var(--ease)",
        background: on ? "var(--brand)" : "var(--line-strong)",
        display: "flex",
        justifyContent: on ? "flex-end" : "flex-start",
        border: "none",
        cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 20,
          height: 20,
          borderRadius: 99,
          background: "#fff",
          boxShadow: "0 1px 3px rgba(0,0,0,.25)",
          transition: "all .2s var(--ease)",
        }}
      />
    </button>
  );
}

// ---------------------------------------------------------------------------
// Modal — generic modal shell with sticky header and optional footer
// ---------------------------------------------------------------------------

/**
 * Full-screen-overlay modal container.
 * Handles Escape key dismissal via useEffect.
 * Children render inside a scrollable panel with a sticky header and footer.
 */
function Modal({
  title,
  subtitle,
  icon,
  onClose,
  children,
  footer,
  width = 520,
}: {
  title: string;
  subtitle?: string;
  icon?: Parameters<typeof Icon>[0]["name"];
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  // Close on Escape key — cleaned up on unmount
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(8,28,24,.4)",
          zIndex: 60,
          animation: "fadeIn .18s",
        }}
      />

      {/* centred panel wrapper — pointer-events:none so backdrop click still works */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 61,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 22,
          pointerEvents: "none",
        }}
      >
        <div
          className="scroll"
          style={{
            width,
            maxWidth: "100%",
            maxHeight: "92vh",
            overflowY: "auto",
            pointerEvents: "auto",
            background: "var(--surface)",
            borderRadius: 20,
            boxShadow: "var(--shadow-lg)",
            border: "1px solid var(--line)",
            animation: "popIn .2s var(--ease)",
          }}
        >
          {/* sticky header */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 13,
              padding: "20px 22px 16px",
              borderBottom: "1px solid var(--line)",
              position: "sticky",
              top: 0,
              background: "var(--surface)",
              zIndex: 2,
            }}
          >
            {icon && (
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--brand-tint)",
                  color: "var(--brand)",
                }}
              >
                <Icon name={icon} size={20} />
              </span>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <h2
                style={{
                  fontSize: 19,
                  fontWeight: 600,
                  fontFamily: "var(--font-serif)",
                  color: "var(--ink)",
                  lineHeight: 1.2,
                }}
              >
                {title}
              </h2>
              {subtitle && (
                <p style={{ fontSize: 13, color: "var(--ink-soft)", marginTop: 3 }}>
                  {subtitle}
                </p>
              )}
            </div>
            <IconBtn icon="x" onClick={onClose} title="Fechar" />
          </div>

          {/* body */}
          <div style={{ padding: 22 }}>{children}</div>

          {/* sticky footer */}
          {footer && (
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
                padding: "16px 22px",
                borderTop: "1px solid var(--line)",
                position: "sticky",
                bottom: 0,
                background: "var(--surface)",
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// MessagePreview — editable WhatsApp-style message bubble
// ---------------------------------------------------------------------------

/**
 * Renders a mock WhatsApp chat bubble followed by an editable textarea.
 * Used in NewApptModal, RescheduleModal, and CancelModal so the secretary
 * can review and tweak the message before it is sent.
 */
function MessagePreview({
  patient,
  phone,
  value,
  onChange,
}: {
  patient: string;
  phone: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      {/* label row */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 7,
          fontSize: 12.5,
          fontWeight: 600,
          color: "var(--ink-soft)",
          marginBottom: 8,
        }}
      >
        <Icon name="whatsapp" size={15} style={{ color: "#25a35f" }} />
        Mensagem para {firstName(patient)} · {phone}
      </div>

      {/* WhatsApp screen mockup */}
      <div
        style={{
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid var(--line-strong)",
          background: "var(--wa-screen)",
        }}
      >
        {/* chat header bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 9,
            padding: "9px 13px",
            background: "#0e6a60",
          }}
        >
          <Avatar name={patient} size={28} color="#0b554d" />
          <div style={{ color: "#eafff4", fontSize: 13.5, fontWeight: 600 }}>
            {patient}
          </div>
        </div>

        {/* message bubble */}
        <div
          style={{
            padding: "14px 13px",
            minHeight: 70,
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              maxWidth: "88%",
              background: "var(--wa-bg)",
              color: "var(--wa-ink)",
              borderRadius: "13px 13px 4px 13px",
              padding: "9px 12px",
              fontSize: 13.5,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
              boxShadow: "0 1px 1px rgba(0,0,0,.12)",
            }}
          >
            {value}
            <span
              style={{
                display: "block",
                textAlign: "right",
                fontSize: 10.5,
                opacity: 0.55,
                marginTop: 3,
              }}
            >
              agora ✓✓
            </span>
          </div>
        </div>
      </div>

      {/* editable textarea below the bubble */}
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--ink-faint)",
            marginBottom: 6,
          }}
        >
          Mensagem (editável antes de enviar)
        </div>
        <textarea
          className="scroll"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{ ...inputStyle, resize: "vertical", lineHeight: 1.5, minHeight: 84 }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// NewApptModal — create a new appointment
// ---------------------------------------------------------------------------

/**
 * Modal for creating a new appointment.
 * Lets the secretary fill patient details, day/time/duration/type, notes,
 * and optionally send a WhatsApp confirmation message.
 */
export function NewApptModal({
  onClose,
  onCreate,
  presetDay,
  clinicName,
}: {
  onClose: () => void;
  onCreate: (
    data: Omit<Appt, "id">,
    message: string | null
  ) => void;
  presetDay?: number;
  // Real clinic name (from getMe(session) in page.tsx) — "" while logged out
  // or before the fetch settles, in which case the message below simply omits
  // the clinic mention rather than ever showing a hardcoded demo name.
  clinicName: string;
}) {
  const [patient, setPatient] = useState("");
  const [phone, setPhone]     = useState("+55 ");
  const [day, setDay]         = useState(presetDay ?? 1);
  const [start, setStart]     = useState(9 * 60);
  const [dur, setDur]         = useState(50);
  const [type, setType]       = useState(APPT_TYPES[2]);
  const [notes, setNotes]     = useState("");
  const [send, setSend]       = useState(true);

  const valid =
    patient.trim().length > 1 && phone.replace(/\D/g, "").length >= 10;

  // Build the default WhatsApp message — recalculated whenever key fields change
  const clinicPhrase = clinicName ? ` no ${clinicDisplay(clinicName)}` : "";
  const msg = `Olá, ${firstName(patient) || "tudo bem"}! Sua consulta de ${type}${clinicPhrase} ficou agendada para ${dayFull(day)} às ${fmtTime(start)}. Antes do atendimento envio a pré-consulta por aqui. Até lá! 😊`;
  const [text, setText] = useState(msg);

  // Keep the default text in sync when scheduling fields change
  useEffect(() => { setText(msg); }, [patient, type, day, start]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = () =>
    onCreate(
      {
        patient: patient.trim(),
        phone: phone.trim(),
        day,
        start,
        dur,
        type,
        notes,
        status: "agendado",
        anamnese: "pendente",
      },
      send ? text : null
    );

  return (
    <Modal
      title="Nova consulta"
      subtitle="Vincule paciente e telefone"
      icon="plus"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant="primary"
            icon={send ? "whatsapp" : "check"}
            disabled={!valid}
            onClick={submit}
          >
            {send ? "Agendar e confirmar" : "Agendar"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* patient + phone */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Paciente">
            <TextInput
              value={patient}
              onChange={(e) => setPatient(e.target.value)}
              placeholder="Nome completo"
              autoFocus
            />
          </Field>
          <Field label="Telefone (WhatsApp)">
            <TextInput
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 11 99999-9999"
            />
          </Field>
        </div>

        {/* day + start + duration */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr", gap: 14 }}
        >
          <Field label="Dia">
            <Select value={day} onChange={(e) => setDay(+e.target.value)}>
              {WEEK_DAYS.map((d, i) => (
                <option key={d.key} value={i}>
                  {d.full} {d.date}/06
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Início">
            <Select value={start} onChange={(e) => setStart(+e.target.value)}>
              {TIME_OPTS.map((t) => (
                <option key={t} value={t}>
                  {fmtTime(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duração">
            <Select value={dur} onChange={(e) => setDur(+e.target.value)}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* appointment type */}
        <Field label="Tipo de consulta">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {APPT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        {/* optional notes */}
        <Field label="Observações (opcional)">
          <TextInput
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Convênio, encaminhamento, etc."
          />
        </Field>

        {/* WhatsApp confirmation toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--surface-2)",
            border: "1px solid var(--line)",
          }}
        >
          <Toggle on={send} onChange={setSend} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>
              Enviar confirmação no WhatsApp
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              Você revisa a mensagem antes de disparar
            </div>
          </div>
        </div>

        {/* message preview — shown only when send is on */}
        {send && (
          <MessagePreview
            patient={patient || "Paciente"}
            phone={phone}
            value={text}
            onChange={setText}
          />
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// EditApptModal — update time, type, phone, or notes for an existing appointment
// ---------------------------------------------------------------------------

/**
 * Modal for editing appointment details without notifying the patient.
 * To reschedule with a WhatsApp notice, use RescheduleModal instead.
 */
export function EditApptModal({
  appt,
  onClose,
  onSave,
}: {
  appt: Appt;
  onClose: () => void;
  onSave: (appt: Appt, patch: Partial<Appt>) => void;
}) {
  const [start, setStart] = useState(appt.start);
  const [dur, setDur]     = useState(appt.dur);
  const [type, setType]   = useState(appt.type ?? "");
  const [phone, setPhone] = useState(appt.phone ?? "");
  const [notes, setNotes] = useState(appt.notes ?? "");

  return (
    <Modal
      title="Editar consulta"
      subtitle={appt.patient}
      icon="edit"
      onClose={onClose}
      width={520}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Descartar</Btn>
          <Btn
            variant="primary"
            icon="check"
            onClick={() => onSave(appt, { start, dur, type, phone, notes })}
          >
            Salvar alterações
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Field label="Início">
            <Select value={start} onChange={(e) => setStart(+e.target.value)}>
              {TIME_OPTS.map((t) => (
                <option key={t} value={t}>
                  {fmtTime(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duração">
            <Select value={dur} onChange={(e) => setDur(+e.target.value)}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <Field label="Tipo">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {APPT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Telefone">
          <TextInput
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>

        <Field label="Observações">
          <TextInput
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Convênio, encaminhamento, etc."
          />
        </Field>

        {/* clarification: editing here does not notify the patient */}
        <p style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          Mudar o horário aqui não avisa o paciente. Para reagendar com aviso, use{" "}
          <b>Remarcar</b>.
        </p>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// RescheduleModal — pick a new slot and send a WhatsApp notice
// ---------------------------------------------------------------------------

/**
 * Modal for rescheduling an appointment with a patient notification.
 * Shows a before/after slot summary and a pre-filled editable WhatsApp message.
 */
export function RescheduleModal({
  appt,
  onClose,
  onConfirm,
  clinicName,
}: {
  appt: Appt;
  onClose: () => void;
  onConfirm: (
    appt: Appt,
    slot: { day: number; start: number },
    message: string
  ) => void;
  // See NewApptModal's clinicName doc — same real-name-or-omit contract.
  // Currently unreachable from page.tsx (see agenda/drawer.tsx's disabled
  // "Remarcar" action) — kept wired so this component has no fake clinic
  // name left in it for whenever a follow-up re-enables it.
  clinicName: string;
}) {
  const [day, setDay]     = useState(appt.day);
  const [start, setStart] = useState(appt.start);

  // Base message template — {NOVO} is replaced by the new slot label
  const clinicPhrase = clinicName ? ` no ${clinicDisplay(clinicName)}` : "";
  const base = `Olá, ${firstName(appt.patient)}! Sua consulta de ${appt.type}${clinicPhrase} foi remarcada de ${dayFull(appt.day)} às ${fmtTime(appt.start)} para {NOVO}. Pode confirmar pra gente? Qualquer coisa é só responder por aqui.`;

  const newLabel = `${dayFull(day)} às ${fmtTime(start)}`;
  const [text, setText] = useState(base.replace("{NOVO}", newLabel));

  // Keep message in sync when the new slot changes
  useEffect(() => {
    setText(base.replace("{NOVO}", `${dayFull(day)} às ${fmtTime(start)}`));
  }, [day, start]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Modal
      title="Remarcar consulta"
      subtitle={appt.patient}
      icon="swap"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Voltar</Btn>
          <Btn
            variant="wa"
            icon="send"
            onClick={() => onConfirm(appt, { day, start }, text)}
          >
            Remarcar e avisar
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* before → after slot summary row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13.5,
            color: "var(--ink-soft)",
            padding: "10px 13px",
            background: "var(--surface-2)",
            borderRadius: 11,
          }}
        >
          <span style={{ textDecoration: "line-through", opacity: 0.7 }}>
            {dayFull(appt.day)} · {fmtTime(appt.start)}
          </span>
          <Icon name="chevR" size={16} style={{ color: "var(--brand)" }} />
          <b style={{ color: "var(--ink)" }}>{newLabel}</b>
        </div>

        {/* new slot selectors */}
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 14 }}>
          <Field label="Novo dia">
            <Select value={day} onChange={(e) => setDay(+e.target.value)}>
              {WEEK_DAYS.map((d, i) => (
                <option key={d.key} value={i}>
                  {d.full} {d.date}/06
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Novo horário">
            <Select value={start} onChange={(e) => setStart(+e.target.value)}>
              {TIME_OPTS.map((t) => (
                <option key={t} value={t}>
                  {fmtTime(t)}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <MessagePreview
          patient={appt.patient ?? ""}
          phone={appt.phone ?? ""}
          value={text}
          onChange={setText}
        />
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// CancelModal — cancel an appointment with a WhatsApp notification
// ---------------------------------------------------------------------------

const CANCEL_REASONS = [
  "Imprevisto do médico",
  "A pedido do paciente",
  "Convênio / documentação",
  "Outro",
] as const;

/**
 * Modal for cancelling an appointment.
 * Secretary picks a reason (chip-style selector) and reviews a pre-filled
 * WhatsApp message that will be sent to the patient.
 */
export function CancelModal({
  appt,
  onClose,
  onConfirm,
  preview,
}: {
  appt: Appt;
  onClose: () => void;
  /**
   * Whether the patient is still inside Meta's 24h window, and what notifying
   * costs if not. `null` = the lookup failed; the modal then says so instead
   * of guessing, because guessing "free" could silently bill the clinic and
   * guessing "paid" would scare them off telling the patient at all.
   */
  preview: CancelPreviewWire | null;
  /**
   * `justification` is the doctor's REASON, not the message body. secretarIA
   * renders the standard "O médico X desmarcou a sua consulta!" text and only
   * appends the quoted justification when there is one, so an empty string is
   * a supported outcome rather than a validation failure.
   *
   * `clinicName` is gone with the old body-composing behaviour: the patient's
   * message is now built server-side, where the doctor's name actually lives.
   */
  onConfirm: (appt: Appt, justification: string, notifyOutsideWindow: boolean) => void;
}) {
  // Nothing pre-selected and an empty field on open, deliberately: cancelling
  // WITHOUT a justification is a first-class path (the patient is told either
  // way), so the modal must not manufacture a reason the doctor never picked.
  const [reason, setReason] = useState<string>("");
  const [justification, setJustification] = useState("");
  // Only meaningful outside the window. Starts false so the billed send is
  // always a deliberate act, never the default.
  const [payToNotify, setPayToNotify] = useState(false);
  const [costOpen, setCostOpen] = useState(false);

  const outsideWindow = preview !== null && !preview.inside_window;
  const cost = preview?.template_cost_brl?.trim() ?? "";
  const costLabel = cost
    ? `custa ${preview?.cost_is_estimate ? "~" : ""}${cost}`
    : "tem custo por conversa";

  return (
    <Modal
      title="Cancelar consulta"
      subtitle={`${appt.patient} · ${dayFull(appt.day)} ${fmtTime(appt.start)}`}
      icon="xCircle"
      onClose={onClose}
      width={560}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Voltar</Btn>
          <Btn
            variant="wa"
            icon="send"
            onClick={() => onConfirm(appt, justification.trim(), payToNotify)}
          >
            {outsideWindow && !payToNotify ? "Cancelar sem avisar" : "Cancelar e avisar"}
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Reason chips. They used to be decorative — picked, then never
            interpolated into anything. Now they PRE-FILL the justification
            below, which the doctor can edit or clear; what reaches the patient
            is always the final free text, never the chip itself. "Outro"
            clears the field so they type their own instead of deleting ours. */}
        <Field label="Motivo do cancelamento">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CANCEL_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => {
                  setReason(r);
                  setJustification(r === "Outro" ? "" : r);
                }}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all .15s",
                  background:
                    reason === r ? "var(--brand-tint)" : "var(--surface-2)",
                  color: reason === r ? "var(--brand-ink)" : "var(--ink-soft)",
                  border: `1px solid ${reason === r ? "var(--brand)" : "var(--line)"}`,
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Justificativa para o paciente (opcional)">
          <textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            maxLength={4000}
            placeholder="Ex.: Imprevisto do médico. Deixe em branco para não enviar justificativa."
            style={{
              width: "100%",
              resize: "vertical",
              padding: "10px 12px",
              borderRadius: 10,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: "var(--ink)",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
            }}
          />
        </Field>

        {/* What the patient actually receives, in the same shape secretarIA
            builds server-side, so the doctor is never surprised by the
            wording. Their own name is the one slot filled in by the backend
            (it comes off the appointment's professional), hence the marker. */}
        <Field label="O paciente vai receber">
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 10,
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              fontSize: 13.5,
              lineHeight: 1.6,
              color: "var(--ink-soft)",
              whiteSpace: "pre-wrap",
            }}
          >
            {"O médico "}
            <span style={{ color: "var(--ink-faint)", fontStyle: "italic" }}>[seu nome]</span>
            {" desmarcou a sua consulta!"}
            {justification.trim()
              ? `

Justificativa do médico: "${justification.trim()}"`
              : ""}
          </div>
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)", marginTop: 6, lineHeight: 1.5 }}>
            O paciente é avisado com ou sem justificativa, e recebe botões para
            remarcar com você ou com outro profissional.
          </p>
        </Field>

        {/* Outside Meta's 24h window there is no free way to reach the patient
            through the API, so the doctor picks: pay for one template send, or
            write from their own phone for nothing. Never decided for them —
            one option costs the clinic money, the other costs them a minute. */}
        {outsideWindow && (
          <Field label="Este paciente não escreve há mais de 24 horas">
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 9,
                  fontSize: 13,
                  color: "var(--ink-soft)",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={payToNotify}
                  onChange={(e) => setPayToNotify(e.target.checked)}
                  style={{ marginTop: 2 }}
                />
                <span>
                  Avisar por aqui ({costLabel})
                  <button
                    type="button"
                    aria-label="Por que tem custo?"
                    onClick={() => setCostOpen((v) => !v)}
                    style={{
                      marginLeft: 6,
                      width: 16,
                      height: 16,
                      borderRadius: 999,
                      fontSize: 10.5,
                      fontWeight: 700,
                      lineHeight: "16px",
                      textAlign: "center",
                      color: "var(--ink-soft)",
                      background: "var(--surface-2)",
                      border: "1px solid var(--line)",
                      cursor: "pointer",
                    }}
                  >
                    ?
                  </button>
                </span>
              </label>

              {costOpen && (
                <p
                  style={{
                    fontSize: 11.5,
                    lineHeight: 1.55,
                    color: "var(--ink-faint)",
                    background: "var(--surface-2)",
                    border: "1px solid var(--line)",
                    borderRadius: 9,
                    padding: "9px 11px",
                    margin: 0,
                  }}
                >
                  Quando o paciente escreveu nas últimas 24 horas, responder é
                  gratuito. Passado esse prazo o WhatsApp só entrega uma mensagem
                  pré-aprovada e cobra por ela — por isso este aviso tem custo.
                  {preview?.cost_is_estimate ? " O valor mostrado é uma estimativa." : ""}
                </p>
              )}

              {preview?.whatsapp_link && (
                <a
                  href={preview.whatsapp_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 13, color: "var(--brand-ink)", textDecoration: "none" }}
                >
                  Ou abra a conversa no seu WhatsApp e avise você mesmo — sem custo →
                </a>
              )}
            </div>
          </Field>
        )}

        {preview === null && (
          <p style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
            Não foi possível verificar se o aviso ao paciente tem custo. A
            consulta será cancelada e o aviso só sai se for gratuito.
          </p>
        )}
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// BlockModal — create a time block (lunch, absence, meeting, etc.)
// ---------------------------------------------------------------------------

const BLOCK_REASONS = [
  "Almoço",
  "Ausência",
  "Reunião clínica",
  "Particular",
] as const;

/**
 * Modal for creating a time block on the calendar.
 * No patient is notified; the slot simply becomes unavailable for new bookings.
 */
export function BlockModal({
  onClose,
  onCreate,
  presetDay,
}: {
  onClose: () => void;
  onCreate: (data: {
    day: number;
    start: number;
    dur: number;
    reason: string;
  }) => void;
  presetDay?: number;
}) {
  const [day, setDay]     = useState(presetDay ?? 1);
  const [start, setStart] = useState(12 * 60);
  const [dur, setDur]     = useState(60);
  const [reason, setReason] = useState<string>(BLOCK_REASONS[0]);

  return (
    <Modal
      title="Bloquear horário"
      subtitle="Almoço, ausência, reunião — sem paciente"
      icon="ban"
      onClose={onClose}
      width={500}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancelar</Btn>
          <Btn
            variant="primary"
            icon="check"
            onClick={() => onCreate({ day, start, dur, reason })}
          >
            Bloquear horário
          </Btn>
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* reason chips */}
        <Field label="Motivo">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {BLOCK_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 999,
                  fontSize: 13,
                  fontWeight: 600,
                  transition: "all .15s",
                  background:
                    reason === r ? "var(--brand-tint)" : "var(--surface-2)",
                  color: reason === r ? "var(--brand-ink)" : "var(--ink-soft)",
                  border: `1px solid ${reason === r ? "var(--brand)" : "var(--line)"}`,
                  cursor: "pointer",
                }}
              >
                {r}
              </button>
            ))}
          </div>
        </Field>

        {/* day + time + duration selectors */}
        <div
          style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr", gap: 14 }}
        >
          <Field label="Dia">
            <Select value={day} onChange={(e) => setDay(+e.target.value)}>
              {WEEK_DAYS.map((d, i) => (
                <option key={d.key} value={i}>
                  {d.full} {d.date}/06
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Início">
            <Select value={start} onChange={(e) => setStart(+e.target.value)}>
              {TIME_OPTS.map((t) => (
                <option key={t} value={t}>
                  {fmtTime(t)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duração">
            <Select value={dur} onChange={(e) => setDur(+e.target.value)}>
              {[30, 60, 90, 120, 180].map((d) => (
                <option key={d} value={d}>
                  {d} min
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {/* notice: no patient notification */}
        <p style={{ fontSize: 11.5, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          O horário fica indisponível para novos agendamentos. Nenhum paciente é
          avisado.
        </p>
      </div>
    </Modal>
  );
}
