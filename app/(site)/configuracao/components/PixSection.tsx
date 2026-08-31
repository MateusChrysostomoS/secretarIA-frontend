"use client";
// PixSection — Section 04 "Sinal via Pix": deposit-via-Pix no-show policy.
// Charges a partial deposit through Asaas (the Brain-managed PSP) when the
// appointment is booked. The backend only actually charges while the add-on
// "Sinal via Pix" is active on the plan, but every field here stays editable
// regardless — so the clinic can define the policy ahead of activating the
// add-on. asaasConnected is read-only/derived; there is no key input in this
// UI by design (see the status pill at the bottom) — the PSP credential never
// passes through the doctor-facing form (see GoogleSection's manual-credential
// pattern for contrast — deliberately NOT reused here).

import { useState, useEffect } from "react";
import { Field, TextInput, Icon } from "../../_shared/ui";
import { Section } from "./Section";
import { CSelect } from "./CSelect";
import { ToggleRow } from "./ToggleRow";
import type { PixDeposit } from "../lib/types";

type PixSectionProps = {
  v: PixDeposit;
  set: <K extends keyof PixDeposit>(key: K, value: PixDeposit[K]) => void;
  // True when the secretarIA hub is unreachable right now (see
  // useSecretariaHub) — inputs are disabled since nothing typed here could
  // be saved until the connection returns.
  readOnly?: boolean;
};

// ---------------------------------------------------------------------------
// NumberField — internal: integer input shared by this section's four
// numeric fields (percent/hours/limit). Keeps its own text "draft" so the box
// can go visually empty while the doctor is clearing/retyping it; a blank or
// unparseable draft is NEVER written to the parent's state (no NaN ever
// reaches `v`) and snaps back to the last committed value on blur. In-range
// keystrokes commit live; an out-of-range draft is clamped on blur.
// ---------------------------------------------------------------------------

type NumberFieldProps = {
  label: string;
  tip?: string;
  hint?: string;
  value: number;
  onCommit: (n: number) => void;
  min: number;
  max?: number;
  readOnly?: boolean;
};

function NumberField({ label, tip, hint, value, onCommit, min, max, readOnly }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value));

  // Re-sync the draft whenever the committed value changes from outside this
  // field (hydration from the backend) — not on every keystroke, since
  // `value` only changes once a keystroke has actually committed.
  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const clamp = (n: number) => Math.min(max ?? Infinity, Math.max(min, n));

  const handleChange = (raw: string) => {
    setDraft(raw); // always show exactly what was typed, including ""
    if (raw.trim() === "") return; // let the box go empty — `v` stays untouched
    const n = parseInt(raw, 10);
    if (Number.isNaN(n)) return; // never let a bad parse reach state
    if (n >= min && n <= (max ?? Infinity)) onCommit(n); // live-commit in-range values
  };

  const handleBlur = () => {
    const n = parseInt(draft, 10);
    const safe = Number.isNaN(n) ? value : clamp(n); // blank/invalid -> revert to last commit
    setDraft(String(safe));
    if (safe !== value) onCommit(safe);
  };

  return (
    <Field label={label} tip={tip} hint={hint}>
      <TextInput
        // Field's <label> binds to its FIRST labelable descendant, and that is the
        // HelpTip <button> whenever `tip` is set — so this input would be left
        // with no accessible name. Name it directly instead.
        aria-label={label}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={e => handleChange(e.target.value)}
        onBlur={handleBlur}
        disabled={readOnly}
      />
    </Field>
  );
}

// ---------------------------------------------------------------------------
// AsaasStatusPill — internal: read-only connection indicator. No key input
// anywhere near it — the Asaas credential is provisioned by the Brain team
// during onboarding, never entered by the doctor.
// ---------------------------------------------------------------------------

function AsaasStatusPill({ connected }: { connected: boolean }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{
        display: "inline-flex", alignItems: "center", gap: 7, alignSelf: "flex-start",
        padding: "5px 12px", borderRadius: 999,
        background: connected ? "var(--st-attend-bg)" : "var(--surface-2)",
        border: `1px solid ${connected ? "var(--st-attend-bd)" : "var(--line-strong)"}`,
        color: connected ? "var(--st-attend-ink)" : "var(--ink-faint)",
        fontSize: 12.5, fontWeight: 700,
      }}>
        <Icon name={connected ? "checkCircle" : "xCircle"} size={14} />
        {connected ? "Conta Asaas conectada" : "Conta Asaas não conectada"}
      </span>
      {!connected && (
        <span style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          A chave é configurada pela equipe Brain durante o onboarding.
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// PixSection
// ---------------------------------------------------------------------------

export function PixSection({ v, set, readOnly }: PixSectionProps) {
  return (
    <Section
      id="pix"
      num="04"
      icon="swap"
      title="Sinal via Pix"
      desc="Reduz falta cobrando um sinal via Pix no agendamento. A política pode ser preparada com antecedência, mesmo antes do add-on estar ativo."
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <ToggleRow
          on={v.enabled}
          onChange={value => set("enabled", value)}
          title="Cobrar sinal via Pix"
          desc="Reduz faltas cobrando um sinal quando o paciente agenda. Requer o add-on “Sinal via Pix (R$79/mês)” ativo no plano — a secretarIA só cobra de fato com o add-on ativo, mas o formulário fica editável para preparar a política com antecedência."
          disabled={readOnly}
        />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <NumberField
            label="Valor do sinal (% do preço do serviço)"
            tip="Percentual do preço do serviço cobrado como sinal no momento do agendamento."
            hint="Serviços sem preço configurado não vão cobrar sinal."
            value={v.depositPercent}
            onCommit={n => set("depositPercent", n)}
            min={1}
            max={100}
            readOnly={readOnly}
          />
          <NumberField
            label="Janela de reembolso (horas)"
            tip="Cancelamentos feitos com mais dessa quantidade de horas de antecedência recebem reembolso total. Dentro da janela, vale a política de retenção ao lado."
            value={v.refundWindowHours}
            onCommit={n => set("refundWindowHours", n)}
            min={0}
            readOnly={readOnly}
          />
        </div>

        <div style={{
          display: "grid",
          gridTemplateColumns: v.retentionPolicy === "partial" ? "1fr 1fr" : "1fr",
          gap: 16,
        }}>
          <Field
            label="Política de retenção"
            tip="O que acontece com o sinal quando o paciente cancela DENTRO da janela de reembolso."
          >
            <CSelect
              value={v.retentionPolicy}
              onChange={e => set("retentionPolicy", e.target.value as PixDeposit["retentionPolicy"])}
              disabled={readOnly}
              label="Política de retenção"
            >
              <option value="total">Retenção total (sem reembolso)</option>
              <option value="partial">Reembolso parcial</option>
            </CSelect>
          </Field>

          {v.retentionPolicy === "partial" && (
            <NumberField
              label="Percentual devolvido no reembolso parcial (%)"
              tip="Parte do sinal devolvida ao paciente quando ele cancela dentro da janela de reembolso."
              value={v.partialRefundPercent}
              onCommit={n => set("partialRefundPercent", n)}
              min={1}
              max={100}
              readOnly={readOnly}
            />
          )}
        </div>

        {/* honest-copy note — refunds are requested right away but still take PSP processing time */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 9,
          fontSize: 12.5, color: "var(--ink-faint)", lineHeight: 1.5,
        }}>
          <Icon name="clock" size={15} style={{ marginTop: 1, flexShrink: 0 }} />
          <span>
            O estorno é solicitado na hora, mas cai na conta do paciente em até alguns dias úteis —
            nunca é instantâneo.
          </span>
        </div>

        <NumberField
          label="Limite de remarcações com sinal"
          tip="Depois desse número de remarcações, o paciente precisa manter o horário ou cancelar — o sinal nunca migra indefinidamente de uma data para outra."
          value={v.rescheduleLimit}
          onCommit={n => set("rescheduleLimit", n)}
          min={0}
          readOnly={readOnly}
        />

        <AsaasStatusPill connected={v.asaasConnected} />
      </div>
    </Section>
  );
}
