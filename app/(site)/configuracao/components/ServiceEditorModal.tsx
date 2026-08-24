"use client";
// ServiceEditorModal — create or edit ONE row of the clinic's service catalog.
//
// This is the only place a service's name and descriptive copy are written,
// and that is the whole point of the catalog: every professional references
// the row's id, so renaming here renames it for all of them at once, with no
// fan-out write and no half-applied state.
//
// THE WARNING IS THE FEATURE
// --------------------------
// Because there is no per-doctor copy to leave alone, editing a service a
// colleague also offers changes what THEY offer too. That is easy to do by
// accident and impossible to notice afterwards, so a change to the name — or
// retiring the service outright — is gated behind a confirmation that names
// the affected colleagues out loud. Editing only the description does not gate:
// it changes the copy patients read, not what anyone offers.
//
// The near-duplicate check mirrors the backend's (which answers 409
// `similar_service_exists`); doing it here too is what lets the dialog ask
// "did you mean 'Limpeza Dental'?" while the user is still typing rather than
// only after a failed round-trip. The server stays the authority — this can
// only ever warn earlier, never permit more.

import { useMemo, useState, type ReactNode } from "react";
import { Btn, Field, Icon, TextArea, TextInput } from "../../_shared/ui";
import { nearDuplicateNames } from "../lib/service-name";
import type { CatalogService } from "../lib/types";
import {
  MAX_LIST_ROW_TITLE_CHARS,
  SERVICE_NAME_LIMIT_MESSAGE,
  SERVICE_NAME_TIP,
  isServiceNameAtLimit,
  serviceNameError,
} from "@/lib/whatsapp-limits";

export type ServiceDraft = {
  name: string;
  description: string;
  longDescription: string;
  requirements: string[];
  active: boolean;
};

type ServiceEditorModalProps = {
  // The row being edited, or null to create a new one.
  service: CatalogService | null;
  // Every other catalog name, for the near-duplicate warning.
  otherNames: string[];
  // Colleagues who also offer this service (lib/catalog.ts::alsoAffected).
  // Never includes the professional currently being edited.
  affected: { id: string; name: string }[];
  onCancel: () => void;
  onSubmit: (draft: ServiceDraft) => void;
  // Server-side failure, already in pt-BR (e.g. the 409 for an exact
  // duplicate). Shown verbatim: the backend's copy is the display copy.
  error: string | null;
  saving: boolean;
};

export function ServiceEditorModal({
  service,
  otherNames,
  affected,
  onCancel,
  onSubmit,
  error,
  saving,
}: ServiceEditorModalProps) {
  const creating = service === null;
  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [longDescription, setLongDescription] = useState(service?.longDescription ?? "");
  const [requirements, setRequirements] = useState<string[]>(
    () => service?.requirements.map((r) => r.text) ?? [],
  );
  const [active, setActive] = useState(service?.active ?? true);
  // Set once the user tries to submit a change that would reach colleagues.
  // Holds the draft so confirming does not have to rebuild it.
  const [confirming, setConfirming] = useState<ServiceDraft | null>(null);

  const similar = useMemo(
    () => (creating ? nearDuplicateNames(name, otherNames) : []),
    [creating, name, otherNames],
  );

  const nameError = serviceNameError(name);
  const nameNotice =
    nameError ?? (isServiceNameAtLimit(name) ? SERVICE_NAME_LIMIT_MESSAGE : null);
  const trimmed = name.trim();

  // What actually reaches other doctors: the name they show patients, and
  // whether the service exists at all. A description edit does not.
  const renaming = !creating && trimmed !== (service?.name ?? "").trim();
  const retiring = !creating && !active && (service?.active ?? true);
  const reachesColleagues = affected.length > 0 && (renaming || retiring);

  const draft = (): ServiceDraft => ({
    name: trimmed,
    description: description.trim(),
    longDescription: longDescription.trim(),
    requirements: requirements.map((r) => r.trim()).filter(Boolean),
    active,
  });

  function handleSubmit() {
    if (!trimmed || saving) return;
    if (reachesColleagues && !confirming) {
      setConfirming(draft());
      return;
    }
    onSubmit(confirming ?? draft());
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={creating ? "Criar serviço no catálogo" : "Editar serviço do catálogo"}
      style={{
        position: "fixed", inset: 0, zIndex: 60,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, background: "rgba(15, 23, 32, .46)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onCancel();
      }}
    >
      <div style={{
        width: "100%", maxWidth: 520, maxHeight: "88vh", overflowY: "auto",
        background: "var(--surface)", border: "1px solid var(--line-strong)",
        borderRadius: 16, padding: 22,
        boxShadow: "0 18px 48px rgba(15, 23, 32, .22)",
      }}>
        <h3 style={{
          margin: 0, fontSize: 18, fontWeight: 600,
          fontFamily: "var(--font-serif)", color: "var(--ink)",
        }}>
          {creating ? "Criar serviço no catálogo" : "Editar serviço do catálogo"}
        </h3>
        <p style={{ margin: "7px 0 18px", fontSize: 13, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          {creating
            ? "O serviço entra no catálogo da clínica e fica disponível para todos os profissionais marcarem que também o oferecem."
            : "Nome e descrição são da clínica: valem para todos os profissionais que oferecem este serviço. Preço e duração continuam sendo de cada um."}
        </p>

        {confirming ? (
          <ConfirmReach
            affected={affected}
            retiring={retiring}
            name={trimmed}
            saving={saving}
            error={error}
            onBack={() => setConfirming(null)}
            onConfirm={handleSubmit}
          />
        ) : (
          <>
            <Field label="Nome do serviço" tip={SERVICE_NAME_TIP}>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Limpeza"
                maxLength={MAX_LIST_ROW_TITLE_CHARS}
                aria-invalid={nameError ? true : undefined}
                autoFocus
                disabled={saving}
              />
            </Field>
            {nameNotice && (
              <p role="alert" style={{
                margin: "-8px 0 12px", fontSize: 12, lineHeight: 1.45,
                color: "var(--danger, #c0392b)",
              }}>
                {nameNotice}
              </p>
            )}

            {similar.length > 0 && (
              <Notice tone="warn">
                Já existe {similar.length > 1 ? "os serviços" : "o serviço"}{" "}
                <b>{similar.join(", ")}</b> no catálogo. Se for a mesma coisa, feche isto e marque
                o serviço existente — assim os dois profissionais ficam apontando para o mesmo.
              </Notice>
            )}

            <Field label="Descrição curta">
              <TextInput
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Avaliação inicial completa"
                maxLength={2000}
                disabled={saving}
              />
            </Field>

            <Field label="Descrição longa (opcional)">
              <TextArea
                value={longDescription}
                onChange={(e) => setLongDescription(e.target.value)}
                placeholder="Detalhes que a secretarIA pode contar ao paciente sobre este serviço."
                rows={3}
                maxLength={2000}
                disabled={saving}
              />
            </Field>

            <RequirementsEditor
              requirements={requirements}
              onChange={setRequirements}
              disabled={saving}
            />

            {!creating && (
              <label style={{
                display: "flex", alignItems: "center", gap: 9,
                marginTop: 16, fontSize: 13.5, cursor: saving ? "not-allowed" : "pointer",
              }}>
                <input
                  type="checkbox"
                  checked={!active}
                  onChange={(e) => setActive(!e.target.checked)}
                  disabled={saving}
                />
                <span style={{ color: "var(--ink-soft)" }}>
                  A clínica não oferece mais este serviço
                </span>
              </label>
            )}

            {error && <Notice tone="error">{error}</Notice>}

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
              <Btn variant="ghost" onClick={onCancel} disabled={saving}>
                Cancelar
              </Btn>
              <Btn
                variant="primary"
                icon="check"
                onClick={handleSubmit}
                disabled={!trimmed || saving}
              >
                {saving ? "Salvando…" : creating ? "Criar serviço" : "Salvar serviço"}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ConfirmReach — the "this also changes it for them" step.
// ---------------------------------------------------------------------------

function ConfirmReach({
  affected,
  retiring,
  name,
  saving,
  error,
  onBack,
  onConfirm,
}: {
  affected: { id: string; name: string }[];
  retiring: boolean;
  name: string;
  saving: boolean;
  error: string | null;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const names = affected.map((p) => p.name);
  const one = names.length === 1;
  const list = one
    ? names[0]
    : names.slice(0, -1).join(", ") + " e " + names[names.length - 1];

  return (
    <div>
      <Notice tone="warn">
        <b>{list}</b> também {one ? "oferece" : "oferecem"} este serviço.{" "}
        {retiring ? (
          <>
            Ao marcar que a clínica não o oferece mais, ele deixa de ser agendável{" "}
            <b>para {one ? "ele também" : "eles também"}</b>.
          </>
        ) : (
          <>
            O serviço passa a se chamar <b>{name}</b> na agenda{" "}
            <b>{one ? "dele também" : "deles também"}</b> e no WhatsApp do paciente.
          </>
        )}{" "}
        Confira se isso também vale para {one ? "ele" : "eles"}.
      </Notice>

      {error && <Notice tone="error">{error}</Notice>}

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 }}>
        <Btn variant="ghost" onClick={onBack} disabled={saving}>
          Voltar
        </Btn>
        <Btn variant="primary" icon="check" onClick={onConfirm} disabled={saving}>
          {saving ? "Salvando…" : "Entendi, alterar para todos"}
        </Btn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// RequirementsEditor — the clinic-level pre-consult orientations.
// ---------------------------------------------------------------------------

function RequirementsEditor({
  requirements,
  onChange,
  disabled,
}: {
  requirements: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  return (
    <div style={{ marginTop: 4 }}>
      <div style={{
        fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)", marginBottom: 8,
      }}>
        Orientações de pré-consulta
      </div>
      <p style={{ margin: "0 0 10px", fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5 }}>
        Enviadas ao paciente quando ele agenda este serviço. São do serviço, não do profissional —
        o preparo de um exame é o mesmo com qualquer médico.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {requirements.map((text, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icon name="dot" size={16} style={{ color: "var(--ink-faint)", flexShrink: 0 }} />
            <TextInput
              value={text}
              onChange={(e) =>
                onChange(requirements.map((r, j) => (j === i ? e.target.value : r)))
              }
              placeholder="Ex.: Jejum de 8 horas antes da consulta"
              maxLength={300}
              style={{ flex: 1 }}
              disabled={disabled}
            />
            <button
              type="button"
              onClick={() => onChange(requirements.filter((_, j) => j !== i))}
              disabled={disabled}
              title="Remover orientação"
              aria-label="Remover orientação"
              style={{
                width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--ink-faint)",
                background: "var(--surface)", border: "1px solid var(--line)",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <Icon name="x" size={15} />
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...requirements, ""])}
        disabled={disabled || requirements.length >= 20}
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          marginTop: 10, padding: "7px 12px", borderRadius: 9,
          fontSize: 12.5, fontWeight: 600,
          color: "var(--brand)", background: "var(--brand-tint)",
          border: "1px dashed var(--brand)",
          cursor: disabled ? "not-allowed" : "pointer",
        }}
      >
        <Icon name="plus" size={14} />
        Adicionar orientação
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Notice — one inline message box, two tones.
// ---------------------------------------------------------------------------

function Notice({ tone, children }: { tone: "warn" | "error"; children: ReactNode }) {
  const error = tone === "error";
  return (
    <div
      role={error ? "alert" : undefined}
      style={{
        margin: "12px 0", padding: "11px 13px", borderRadius: 10,
        fontSize: 12.5, lineHeight: 1.55,
        color: error ? "var(--danger, #c0392b)" : "var(--ink-soft)",
        background: error ? "var(--surface-2)" : "var(--brand-tint)",
        border: "1px solid " + (error ? "var(--danger, #c0392b)" : "var(--line)"),
      }}
    >
      {children}
    </div>
  );
}
