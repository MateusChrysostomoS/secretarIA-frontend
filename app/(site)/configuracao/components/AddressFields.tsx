"use client";
// AddressFields — the structured clinic address block for Section 01.
//
// These fields DO round-trip: TenantConfigWire.address <-> tenants.address, via
// toWireAddress/applyWireAddress in lib/hub-mapping.ts. What they do NOT do is
// reach the bot. A search of secretarIA turns up exactly two readers of
// tenants.address — the hub config endpoint that echoes it back, and the model
// column itself. The only address the agent ever speaks is Unit.address, a
// different table, surfaced by the multi_unit plugin's list_units tool; the
// scoped-help prompt even lists "endereço" as out of scope.
//
// So the copy below calls this registration data and stops there. Making it
// answer "onde fica?" is a separate end-to-end scope (resolver + prompt
// injection + tests), not a tooltip.

import { Field, TextInput } from "../../_shared/ui";
import type { ClinicCtx } from "../lib/types";

type AddressFieldsProps = {
  v: ClinicCtx;
  // Generic setter shared with ContextSection — type-safe per ClinicCtx key.
  set: <K extends keyof ClinicCtx>(key: K, value: ClinicCtx[K]) => void;
  // True when the secretarIA hub is unreachable right now — see ContextSection.
  readOnly?: boolean;
};

// Renders street/complement/neighborhood/city/state/postal-code inputs.
export function AddressFields({ v, set, readOnly }: AddressFieldsProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* group label — mirrors the Field label styling used elsewhere */}
      <span style={{
        fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", letterSpacing: ".01em",
      }}>
        Endereço da clínica <span style={{ fontWeight: 500, color: "var(--ink-faint)" }}>
          (dado cadastral)
        </span>
      </span>
      <p style={{ fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5, margin: "-4px 0 0" }}>
        Fica guardado no cadastro da clínica. A secretarIA ainda não usa este endereço nas
        respostas do WhatsApp — se você atende em mais de um local, cadastre as unidades.
      </p>

      {/* row 1: street + number | complement */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Field
          label="Endereço (rua e número)"
          tip="Guardado no cadastro da clínica. Hoje não é enviado automaticamente ao paciente."
        >
          <TextInput
            value={v.addressLine}
            onChange={e => set("addressLine", e.target.value)}
            placeholder="Av. Paulista, 1000"
            disabled={readOnly}
          />
        </Field>
        <Field label="Complemento">
          <TextInput
            value={v.addressComplement}
            onChange={e => set("addressComplement", e.target.value)}
            placeholder="Sala 302, bloco B (opcional)"
            disabled={readOnly}
          />
        </Field>
      </div>

      {/* row 2: neighborhood | city */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Bairro">
          <TextInput
            value={v.neighborhood}
            onChange={e => set("neighborhood", e.target.value)}
            placeholder="Bela Vista"
            disabled={readOnly}
          />
        </Field>
        <Field label="Cidade">
          <TextInput
            value={v.city}
            onChange={e => set("city", e.target.value)}
            placeholder="São Paulo"
            disabled={readOnly}
          />
        </Field>
      </div>

      {/* row 3: state (UF) | postal code (CEP) */}
      <div style={{ display: "grid", gridTemplateColumns: "0.5fr 1fr", gap: 16 }}>
        <Field label="UF">
          <TextInput
            value={v.state}
            onChange={e => set("state", e.target.value)}
            placeholder="SP"
            maxLength={2}
            disabled={readOnly}
          />
        </Field>
        <Field label="CEP">
          <TextInput
            value={v.postalCode}
            onChange={e => set("postalCode", e.target.value)}
            placeholder="01310-100"
            disabled={readOnly}
          />
        </Field>
      </div>
    </div>
  );
}
