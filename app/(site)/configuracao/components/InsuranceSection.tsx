"use client";
// InsuranceSection — the clinic's convênio (health-insurance) acceptance
// block, embedded inside ContextSection (Section 01). TASK-008.
//
// Unlike every other field on this page, convênio has NO draft state and NO
// "Salvar configuração" step: every action here (choosing a mode, ticking a
// catalog plan, toggling "Cobrar sinal", registering "Outro") calls its own
// hub endpoint immediately and repaints from the response — the same
// house style as ServiceEditorModal's createService/updateService, and for
// the same reason the backend forces it: `PUT /tenants/me/config` no longer
// accepts an `insurances` field at all (CHECKPOINT_convenio_catalogo §10.7).
//
// Three states, gated by `mode` (see lib/secretaria-hub.ts::InsuranceMode):
//   null (not chosen)       -> only the 3-option gate renders. SPEC §2: "sem
//                              modo padrão silencioso" — nothing else shows
//                              until the clinic picks one and saves it.
//   "shared" |
//   "clinic_with_exceptions" -> catalog multi-select + "Cobrar sinal" per row
//                               + the "Outro" custom-plan form.
//   "independent"            -> this whole block hides (SPEC §5.1): each
//                               professional picks their own list instead —
//                               see ProfessionalInsuranceSection.
//
// A session-less visitor (demo showcase) sees a short explanatory line
// instead of a live widget — there is no hub token to fetch or write with.

import { useCallback, useEffect, useState } from "react";
import { Btn, Field, TextArea, TextInput } from "../../_shared/ui";
import { CToggle } from "./CToggle";
import { ToggleRow } from "./ToggleRow";
import {
  createTenantCustomInsurancePlan,
  getInsuranceCatalog,
  getInsurancePlans,
  patchInsurancePlanDeposit,
  putInsurancePlans,
  type InsuranceCatalogEntryWire,
  type InsuranceMode,
  type InsurancePlanWire,
} from "@/lib/secretaria-hub";
import type { Session } from "@/lib/manage-api";
import type { InsuranceModeState } from "../lib/insurance";
import { insurancesError } from "@/lib/whatsapp-limits";

// The fixed disclaimer required by SPEC §5.1/§6 — always visible next to the
// deposit toggles, in both the clinic and the professional widgets.
export const INSURANCE_DEPOSIT_SCOPE_NOTE =
  "Vale só para agendamentos feitos pelos botões do WhatsApp e do Portal — não afeta o " +
  "agendamento manual no hub nem a conversa livre com a IA.";

const MODE_OPTIONS: { value: InsuranceMode; label: string; blurb: string }[] = [
  {
    value: "shared",
    label: "Compartilhado",
    blurb: "Um único conjunto de convênios vale para todos os profissionais da clínica.",
  },
  {
    value: "clinic_with_exceptions",
    label: "Clínica com exceção",
    blurb:
      "A clínica define o conjunto de convênios; cada profissional pode restringir o próprio, " +
      "dentro dele.",
  },
  {
    value: "independent",
    label: "Independente",
    blurb: "Cada profissional escolhe seus próprios convênios, sem lista da clínica.",
  },
];

type InsuranceSectionProps = {
  session: Session | null;
  readOnly?: boolean;
  // Owned by page.tsx's useInsuranceMode(session) — shared with
  // ProfessionalInsuranceSection so the two never disagree about the tenant's
  // current mode (see lib/insurance.ts).
  insuranceMode: InsuranceModeState;
};

export function InsuranceSection({ session, readOnly, insuranceMode }: InsuranceSectionProps) {
  const mode = insuranceMode.mode;
  const [pendingMode, setPendingMode] = useState<InsuranceMode | null>(null);
  const [savingMode, setSavingMode] = useState(false);
  const [changingMode, setChangingMode] = useState(false); // reopen the gate over an already-chosen mode

  const [catalog, setCatalog] = useState<InsuranceCatalogEntryWire[] | null>(null);
  const [plans, setPlans] = useState<InsurancePlanWire[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [search, setSearch] = useState("");

  const [busyCatalogId, setBusyCatalogId] = useState<string | null>(null);
  const [busyPlanId, setBusyPlanId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [showOtherForm, setShowOtherForm] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [otherDeposit, setOtherDeposit] = useState(true);
  const [otherSaving, setOtherSaving] = useState(false);
  const [otherError, setOtherError] = useState<string | null>(null);

  // --- load: catalog + the clinic's plans, once a mode that needs them is known ---
  const loadClinicPlans = useCallback(() => {
    if (!session) return;
    setLoadError(false);
    Promise.all([getInsuranceCatalog(session), getInsurancePlans(session)])
      .then(([cat, pl]) => {
        setCatalog(cat);
        setPlans(pl);
      })
      .catch((e) => {
        console.error("secretaria configuracao: failed to load insurance catalog/plans", e);
        setLoadError(true);
      });
  }, [session]);

  useEffect(() => {
    if (mode === "shared" || mode === "clinic_with_exceptions") {
      loadClinicPlans();
    }
  }, [mode, loadClinicPlans]);

  // --- mode gate ---
  async function handleConfirmMode() {
    if (!session || !pendingMode) return;
    setSavingMode(true);
    try {
      await insuranceMode.save(pendingMode);
      setChangingMode(false);
      setPendingMode(null);
    } catch (e) {
      console.error("secretaria configuracao: failed to save insurance mode", e);
      setRowError("Não foi possível salvar o modo agora. Tente novamente.");
    } finally {
      setSavingMode(false);
    }
  }

  // --- catalog membership (shared/clinic_with_exceptions) ---
  const catalogPlanIds = new Set(
    (plans ?? []).filter((p) => !p.is_custom && p.catalog_id).map((p) => p.catalog_id as string),
  );

  async function toggleCatalogPlan(entry: InsuranceCatalogEntryWire, checked: boolean) {
    if (!session || !plans) return;
    setRowError(null);
    setBusyCatalogId(entry.id);
    const nextCatalogPlans = (plans ?? [])
      .filter((p) => !p.is_custom && p.catalog_id)
      .filter((p) => p.catalog_id !== entry.id)
      .map((p) => ({ catalog_id: p.catalog_id as string, charge_deposit: p.charge_deposit }));
    if (checked) nextCatalogPlans.push({ catalog_id: entry.id, charge_deposit: true });
    try {
      const updated = await putInsurancePlans(session, nextCatalogPlans);
      setPlans(updated);
      // In clinic_with_exceptions mode, THIS list is the professional panel's
      // `selectable` — tell it to refetch (see lib/insurance.ts).
      insuranceMode.notifyPlansChanged();
    } catch (e) {
      console.error("secretaria configuracao: failed to update clinic insurance plans", e);
      setRowError("Não foi possível salvar essa mudança agora. Tente novamente.");
    } finally {
      setBusyCatalogId(null);
    }
  }

  async function toggleChargeDeposit(plan: InsurancePlanWire, next: boolean) {
    if (!session) return;
    setRowError(null);
    setBusyPlanId(plan.id);
    try {
      const updated = await patchInsurancePlanDeposit(session, plan.id, next);
      setPlans((prev) => (prev ?? []).map((p) => (p.id === updated.id ? updated : p)));
    } catch (e) {
      console.error("secretaria configuracao: failed to toggle charge_deposit", e);
      setRowError("Não foi possível salvar essa mudança agora. Tente novamente.");
    } finally {
      setBusyPlanId(null);
    }
  }

  async function handleSubmitOther() {
    if (!session) return;
    const nameError = insurancesError([otherName]);
    if (nameError) {
      setOtherError(nameError);
      return;
    }
    if (!otherNote.trim()) {
      setOtherError("Explique como funciona o pagamento para esse convênio.");
      return;
    }
    setOtherSaving(true);
    setOtherError(null);
    try {
      const created = await createTenantCustomInsurancePlan(session, {
        custom_name: otherName.trim(),
        custom_payment_note: otherNote.trim(),
        charge_deposit: otherDeposit,
      });
      setPlans((prev) => [...(prev ?? []), created]);
      insuranceMode.notifyPlansChanged();
      setShowOtherForm(false);
      setOtherName("");
      setOtherNote("");
      setOtherDeposit(true);
    } catch (e) {
      console.error("secretaria configuracao: failed to create custom insurance plan", e);
      setOtherError("Não foi possível salvar esse convênio agora. Tente novamente.");
    } finally {
      setOtherSaving(false);
    }
  }

  // --- render ---

  if (!session) {
    return (
      <Field label="Convênios aceitos">
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
          Entre na sua conta para configurar os convênios aceitos pela clínica.
        </p>
      </Field>
    );
  }

  if (mode === undefined) {
    return (
      <Field label="Convênios aceitos">
        {insuranceMode.error ? (
          <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", margin: 0 }}>
            Não foi possível carregar os convênios agora.{" "}
            <button
              type="button"
              onClick={insuranceMode.reload}
              style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              Tentar de novo
            </button>
          </p>
        ) : (
          <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: 0 }}>Carregando…</p>
        )}
      </Field>
    );
  }

  // --- gate: no mode chosen yet, or the clinic asked to change it ---
  if (mode === null || changingMode) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)" }}>
          Como sua clínica aceita convênios?
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {MODE_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                padding: "10px 12px", borderRadius: 10,
                border: `1px solid ${(pendingMode ?? mode) === opt.value ? "var(--brand)" : "var(--line)"}`,
                background: (pendingMode ?? mode) === opt.value ? "var(--brand-tint)" : "var(--surface-2)",
                cursor: readOnly ? "not-allowed" : "pointer",
              }}
            >
              <input
                type="radio"
                name="insurance-mode-gate"
                value={opt.value}
                checked={(pendingMode ?? mode) === opt.value}
                onChange={() => setPendingMode(opt.value)}
                disabled={readOnly}
                // Explicit, short accessible name: aria-label wins over the
                // wrapping <label>'s full text content, so a screen reader
                // hears just "Compartilhado" rather than the option plus its
                // whole description sentence (see skill
                // custom-control-accessible-name, Trap 3).
                aria-label={opt.label}
                style={{ marginTop: 3 }}
              />
              <span>
                <strong style={{ fontSize: 13.5, color: "var(--ink)" }}>{opt.label}</strong>
                <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 2, lineHeight: 1.45 }}>
                  {opt.blurb}
                </div>
              </span>
            </label>
          ))}
        </div>
        {rowError && (
          <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", margin: 0 }}>
            {rowError}
          </p>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn
            variant="primary"
            size="sm"
            onClick={handleConfirmMode}
            disabled={readOnly || !pendingMode || savingMode}
          >
            {savingMode ? "Salvando…" : "Confirmar modo"}
          </Btn>
          {changingMode && (
            <Btn variant="ghost" size="sm" onClick={() => { setChangingMode(false); setPendingMode(null); }}>
              Cancelar
            </Btn>
          )}
        </div>
      </div>
    );
  }

  // --- independent: no clinic-level block at all ---
  if (mode === "independent") {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
          Modo independente: cada profissional escolhe seus próprios convênios, na aba
          Profissionais.
        </p>
        <Btn
          variant="ghost"
          size="sm"
          onClick={() => setChangingMode(true)}
          disabled={readOnly}
          style={{ alignSelf: "flex-start" }}
        >
          Alterar modo
        </Btn>
      </div>
    );
  }

  // --- shared / clinic_with_exceptions: catalog multi-select ---
  const filteredCatalog = (catalog ?? []).filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const customPlans = (plans ?? []).filter((p) => p.is_custom);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)" }}>
          Convênios aceitos pela clínica
        </span>
        <Btn variant="ghost" size="sm" onClick={() => setChangingMode(true)} disabled={readOnly}>
          Alterar modo
        </Btn>
      </div>

      {catalog === null && !loadError && (
        <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: 0 }}>Carregando convênios…</p>
      )}
      {loadError && (
        <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", margin: 0 }}>
          Não foi possível carregar os convênios agora.{" "}
          <button
            type="button"
            onClick={loadClinicPlans}
            style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
          >
            Tentar de novo
          </button>
        </p>
      )}

      {catalog !== null && (
        <>
          <TextInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar convênio…"
            aria-label="Buscar convênio no catálogo"
            disabled={readOnly}
          />

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {filteredCatalog.map((entry) => {
              const checked = catalogPlanIds.has(entry.id);
              const planRow = (plans ?? []).find((p) => p.catalog_id === entry.id);
              return (
                <div
                  key={entry.id}
                  style={{
                    display: "flex", flexDirection: "column", gap: 8,
                    padding: "10px 12px", borderRadius: 10,
                    background: "var(--surface-2)", border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <CToggle
                      on={checked}
                      onChange={(v) => toggleCatalogPlan(entry, v)}
                      disabled={readOnly || busyCatalogId === entry.id}
                      label={"Aceitar " + entry.name}
                    />
                    <span style={{ fontSize: 13.5, color: "var(--ink)" }}>{entry.name}</span>
                  </div>
                  {checked && planRow && (
                    <ToggleRow
                      on={planRow.charge_deposit}
                      onChange={(v) => toggleChargeDeposit(planRow, v)}
                      title={"Cobrar sinal (Pix) — " + entry.name}
                      disabled={readOnly || busyPlanId === planRow.id}
                    />
                  )}
                </div>
              );
            })}
            {filteredCatalog.length === 0 && (
              <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: 0 }}>
                Nenhum convênio encontrado para &quot;{search}&quot;.
              </p>
            )}
          </div>

          {customPlans.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-faint)", letterSpacing: ".02em" }}>
                CONVÊNIOS "OUTRO"
              </span>
              {customPlans.map((plan) => (
                <div
                  key={plan.id}
                  style={{
                    display: "flex", flexDirection: "column", gap: 8,
                    padding: "10px 12px", borderRadius: 10,
                    background: "var(--surface-2)", border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)" }}>{plan.name}</div>
                  {plan.custom_payment_note && (
                    <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>{plan.custom_payment_note}</div>
                  )}
                  <ToggleRow
                    on={plan.charge_deposit}
                    onChange={(v) => toggleChargeDeposit(plan, v)}
                    title={"Cobrar sinal (Pix) — " + plan.name}
                    disabled={readOnly || busyPlanId === plan.id}
                  />
                </div>
              ))}
            </div>
          )}

          {rowError && (
            <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", margin: 0 }}>
              {rowError}
            </p>
          )}

          {(customPlans.length > 0 || filteredCatalog.some((e) => catalogPlanIds.has(e.id))) && (
            <p style={{ fontSize: 11.5, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
              {INSURANCE_DEPOSIT_SCOPE_NOTE}
            </p>
          )}

          {!showOtherForm && (
            <Btn variant="outline" size="sm" icon="plus" onClick={() => setShowOtherForm(true)} disabled={readOnly}>
              Outro
            </Btn>
          )}

          {showOtherForm && (
            <div
              style={{
                display: "flex", flexDirection: "column", gap: 10,
                padding: "12px 14px", borderRadius: 10,
                background: "var(--surface-2)", border: "1px solid var(--line)",
              }}
            >
              <Field label="Nome do convênio">
                <TextInput
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                  placeholder="Ex.: GEAP"
                  disabled={readOnly || otherSaving}
                />
              </Field>
              <Field label="Como funciona o pagamento desse convênio">
                <TextArea
                  value={otherNote}
                  onChange={(e) => setOtherNote(e.target.value)}
                  rows={2}
                  placeholder="Ex.: Paciente paga na hora e pede reembolso direto com o convênio."
                  disabled={readOnly || otherSaving}
                />
              </Field>
              <ToggleRow
                on={otherDeposit}
                onChange={setOtherDeposit}
                title="Cobrar sinal (Pix) para esse convênio"
                disabled={readOnly || otherSaving}
              />
              {otherError && (
                <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", margin: 0 }}>
                  {otherError}
                </p>
              )}
              <div style={{ display: "flex", gap: 10 }}>
                <Btn variant="primary" size="sm" onClick={handleSubmitOther} disabled={readOnly || otherSaving}>
                  {otherSaving ? "Salvando…" : "Salvar convênio"}
                </Btn>
                <Btn
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowOtherForm(false); setOtherError(null); }}
                  disabled={otherSaving}
                >
                  Cancelar
                </Btn>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
