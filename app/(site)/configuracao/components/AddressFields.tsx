"use client";
// AddressFields — the structured clinic address block for Section 01.
// REAL as of the Onboarding & Multi-Professional contract (Feature 1):
// TenantConfigWire.address round-trips these fields — see toWireAddress/
// applyWireAddress in lib/hub-mapping.ts.

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
        Endereço da clínica
      </span>

      {/* row 1: street + number | complement */}
      <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16 }}>
        <Field
          label="Endereço (rua e número)"
          tip="A secretarIA envia ao paciente quando perguntam “onde fica?” e na confirmação da consulta."
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
