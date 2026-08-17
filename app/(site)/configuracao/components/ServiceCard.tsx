"use client";
// ServiceCard — one appointment type in Section 02.
// Holds the type's name/duration/price/active flag plus an expandable editor
// for its pre-visit requirements (fasting, prior exams, documents) that
// SecretarIA surfaces to the patient when this type is being booked.

import { useState } from "react";
import { Icon, TextInput } from "../../_shared/ui";
import { CSelect } from "./CSelect";
import { CToggle } from "./CToggle";
import type { Service, Requirement } from "../lib/types";

// Duration options in minutes — matches the original ServicesSection source.
const DURATION_OPTIONS = [15, 20, 30, 40, 50, 60, 90];

// ---------------------------------------------------------------------------
// RequirementRow — internal: a single editable pre-visit instruction
// ---------------------------------------------------------------------------

type RequirementRowProps = {
  requirement: Requirement;
  onChange: (text: string) => void;
  onRemove: () => void;
  readOnly?: boolean;
};

// One requirement line: free-text input + remove button.
function RequirementRow({ requirement, onChange, onRemove, readOnly }: RequirementRowProps) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      {/* leading dot bullet to read as a list item */}
      <Icon name="dot" size={16} style={{ color: "var(--ink-faint)", flexShrink: 0 }} />
      <TextInput
        value={requirement.text}
        onChange={e => onChange(e.target.value)}
        placeholder="Ex.: Jejum de 8 horas antes da consulta"
        style={{ flex: 1 }}
        disabled={readOnly}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={readOnly}
        title="Remover orientação"
        aria-label="Remover orientação"
        style={{
          width: 34, height: 34, borderRadius: 9, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--ink-faint)",
          background: "var(--surface)", border: "1px solid var(--line)",
          opacity: readOnly ? 0.5 : 1,
          cursor: readOnly ? "not-allowed" : "pointer",
        }}
      >
        <Icon name="x" size={15} />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ServiceCard
// ---------------------------------------------------------------------------

type ServiceCardProps = {
  service: Service;
  onChange: (updated: Service) => void;
  onRemove: () => void;
  canRemove: boolean;
  // True until the selected professional's config has hydrated — see
  // ServicesSection.
  readOnly?: boolean;
};

// Renders a single appointment-type card with its requirements editor.
export function ServiceCard({
  service,
  onChange,
  onRemove,
  canRemove,
  readOnly,
}: ServiceCardProps) {
  // Start expanded when the type already has requirements, so they're visible.
  const [expanded, setExpanded] = useState(() => service.requirements.length > 0);

  // --- Requirement handlers ---
  const addRequirement = () => {
    setExpanded(true);
    onChange({
      ...service,
      requirements: [...service.requirements, { id: Date.now(), text: "" }],
    });
  };

  const setRequirement = (i: number, text: string) =>
    onChange({
      ...service,
      requirements: service.requirements.map((r, j) => (j === i ? { ...r, text } : r)),
    });

  const removeRequirement = (i: number) =>
    onChange({
      ...service,
      requirements: service.requirements.filter((_, j) => j !== i),
    });

  const count = service.requirements.length;
  // One place to decide "can this card be removed right now", so the visual
  // state and the DOM disabled attribute can never disagree.
  const removable = canRemove && !readOnly;

  return (
    <div style={{
      background: "var(--surface-2)",
      border: "1px solid var(--line)",
      borderRadius: 14,
      padding: 14,
      transition: "opacity .18s var(--ease)",
    }}>
      {/* --- main row: name / duration / price / active / remove --- */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* left cluster — dims when the type is inactive */}
        <div style={{
          flex: 1, minWidth: 0,
          display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          opacity: service.active ? 1 : 0.55,
          transition: "opacity .18s var(--ease)",
        }}>
          <TextInput
            value={service.name}
            onChange={e => onChange({ ...service, name: e.target.value })}
            placeholder="Nome do serviço"
            aria-label="Nome do serviço"
            style={{ flex: 1, minWidth: 160 }}
            disabled={readOnly}
          />
          <CSelect
            value={service.dur}
            onChange={e => onChange({ ...service, dur: +e.target.value })}
            style={{ width: 116 }}
            disabled={readOnly}
          >
            {DURATION_OPTIONS.map(d => (
              <option key={d} value={d}>{d} min</option>
            ))}
          </CSelect>
          <TextInput
            value={service.price}
            onChange={e => onChange({ ...service, price: e.target.value })}
            placeholder="R$ — (opcional)"
            aria-label="Valor"
            style={{ width: 120 }}
            disabled={readOnly}
          />
        </div>

        {/* right cluster — active toggle + remove (stay fully visible) */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 7, cursor: "pointer" }}>
            <CToggle
              on={service.active}
              onChange={v => onChange({ ...service, active: v })}
              disabled={readOnly}
            />
            <span style={{
              fontSize: 12.5, fontWeight: 600,
              color: service.active ? "var(--ink-soft)" : "var(--ink-faint)",
              width: 44, // reserve width so the row doesn't shift on toggle
            }}>
              {service.active ? "Ativo" : "Inativo"}
            </span>
          </label>
          <button
            type="button"
            onClick={onRemove}
            disabled={!removable}
            title="Remover serviço"
            aria-label="Remover serviço"
            style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "var(--surface)", border: "1px solid var(--line)",
              color: "var(--ink-faint)",
              opacity: removable ? 1 : 0.4,
              cursor: removable ? "pointer" : "not-allowed",
            }}
          >
            <Icon name="x" size={16} />
          </button>
        </div>
      </div>

      {/* --- expander: pre-visit requirements --- */}
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        aria-expanded={expanded}
        style={{
          display: "flex", alignItems: "center", gap: 8,
          marginTop: 12, padding: "4px 2px",
          background: "none", border: "none", cursor: "pointer",
          fontSize: 13, fontWeight: 600, color: "var(--ink-soft)",
        }}
      >
        <Icon name={expanded ? "chevD" : "chevR"} size={16} style={{ color: "var(--ink-faint)" }} />
        Orientações de pré-consulta
        {/* count badge — only when there is at least one requirement */}
        {count > 0 && (
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            minWidth: 20, height: 20, padding: "0 6px", borderRadius: 999,
            fontSize: 11.5, fontWeight: 700,
            background: "var(--brand-tint)", color: "var(--brand-ink)",
          }}>
            {count}
          </span>
        )}
      </button>

      {/* requirements editor — only mounted when expanded */}
      {expanded && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 9,
          marginTop: 10, paddingTop: 12, borderTop: "1px solid var(--line)",
        }}>
          {count === 0 ? (
            // Empty state with a concrete example so the field reads as optional.
            <p style={{ fontSize: 12.5, color: "var(--ink-faint)", lineHeight: 1.5, margin: 0 }}>
              Nenhuma orientação ainda. Ex.: jejum de 8h, trazer exames anteriores,
              documento com foto e carteirinha do convênio.
            </p>
          ) : (
            service.requirements.map((r, i) => (
              <RequirementRow
                key={r.id}
                requirement={r}
                onChange={text => setRequirement(i, text)}
                onRemove={() => removeRequirement(i)}
                readOnly={readOnly}
              />
            ))
          )}

          {/* add a requirement line */}
          <button
            type="button"
            onClick={addRequirement}
            disabled={readOnly}
            style={{
              alignSelf: "flex-start",
              display: "inline-flex", alignItems: "center", gap: 6,
              fontSize: 13, fontWeight: 600, color: "var(--brand)",
              padding: "5px 2px",
              background: "none", border: "none",
              opacity: readOnly ? 0.5 : 1,
              cursor: readOnly ? "not-allowed" : "pointer",
            }}
          >
            <Icon name="plus" size={15} />
            Adicionar orientação
          </button>
        </div>
      )}
    </div>
  );
}
