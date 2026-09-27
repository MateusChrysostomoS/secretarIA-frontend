"use client";
// ProfessionalInsuranceSection — the SELECTED professional's own convênio
// subset, rendered inside ProfessionalsSection (Section 05). TASK-008.
//
// Renders nothing when the tenant's insurance_mode is null or "shared" — the
// backend itself 409s `insurance_mode_not_applicable` for those (contract
// §10.5), and SPEC §5.2 says there is no section to show. Otherwise:
//
//   "clinic_with_exceptions" -> a restricted multi-select over the CLINIC's
//     own enabled plans (`selectable`, keyed by `id` = tenant_insurance_plans
//     row id). A professional who never customised opens with everything
//     ticked (`inherits_clinic: true`) — SPEC §2's "herda tudo, nunca nada por
//     omissão" — and the backend, not this component, is the source of truth
//     for that starting state.
//   "independent" -> the WHOLE global catalog + this professional's own
//     "Outro". Catalog rows toggle via `catalog_ids`; a professional's own
//     custom rows are permanent once created (no delete/PATCH endpoint for
//     them yet — CHECKPOINT §10.8.4) and render as a static accepted row.
//
// Like InsuranceSection, every toggle here writes immediately — there is no
// batching into the page's "Salvar configuração".

import { useCallback, useEffect, useState } from "react";
import { Btn, Field, TextArea, TextInput } from "../../_shared/ui";
import { CToggle } from "./CToggle";
import { ToggleRow } from "./ToggleRow";
import { INSURANCE_DEPOSIT_SCOPE_NOTE } from "./InsuranceSection";
import {
  createProfessionalCustomInsurancePlan,
  getProfessionalInsurancePlans,
  putProfessionalInsurancePlans,
  type InsuranceMode,
  type ProfessionalInsuranceWire,
} from "@/lib/secretaria-hub";
import type { Session } from "@/lib/manage-api";
import { insurancesError } from "@/lib/whatsapp-limits";

type ProfessionalInsuranceSectionProps = {
  session: Session | null;
  professionalId: string | null;
  // The tenant's current mode, as loaded by InsuranceSection's sibling
  // fetch — used only to decide WHETHER to render at all before the
  // professional-scoped GET lands; once it lands, `data.mode` (the backend's
  // own answer) drives everything else.
  tenantMode: InsuranceMode | null | undefined;
  // Bumped whenever InsuranceSection writes to the CLINIC's plan list — in
  // clinic_with_exceptions mode that list IS this component's `selectable`,
  // so a stale count here would hide a plan the clinic just added until
  // something else happened to remount this component (see lib/insurance.ts).
  plansVersion: number;
  readOnly?: boolean;
};

export function ProfessionalInsuranceSection({
  session,
  professionalId,
  tenantMode,
  plansVersion,
  readOnly,
}: ProfessionalInsuranceSectionProps) {
  const [data, setData] = useState<ProfessionalInsuranceWire | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const [showOtherForm, setShowOtherForm] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [otherDeposit, setOtherDeposit] = useState(true);
  const [otherSaving, setOtherSaving] = useState(false);
  const [otherError, setOtherError] = useState<string | null>(null);

  const applicable = tenantMode === "clinic_with_exceptions" || tenantMode === "independent";

  const load = useCallback(() => {
    if (!session || !professionalId || !applicable) return;
    setLoadError(false);
    getProfessionalInsurancePlans(session, professionalId)
      .then(setData)
      .catch((e) => {
        // 409 insurance_mode_not_applicable is a legitimate race (tenant mode
        // changed between the two loads) — treat it the same as "nothing to
        // show" rather than an error banner.
        if (e && typeof e === "object" && "status" in e && (e as { status: number }).status === 409) {
          setData(null);
          return;
        }
        console.error("secretaria configuracao: failed to load professional insurance plans", e);
        setLoadError(true);
      });
  }, [session, professionalId, applicable]);

  // Initial/identity-changed load: resets the form first, so a professional
  // switch never briefly shows the previous one's data. `tenantMode` is in
  // this effect's deps (not just `load`'s, via `applicable`) because a mode
  // SWITCH between "clinic_with_exceptions" and "independent" leaves
  // `applicable` at `true` on both sides of the change — without `tenantMode`
  // itself here, changing the clinic's mode gate would leave this panel
  // showing the PREVIOUS mode's selectable list until something else
  // remounted it.
  useEffect(() => {
    setData(null);
    setShowOtherForm(false);
    load();
  }, [load, tenantMode]);

  // A clinic-side plan write (see lib/insurance.ts's plansVersion) — refetch
  // WITHOUT resetting `data`/`showOtherForm` first, so this professional's own
  // in-progress "Outro" form is not wiped by an unrelated clinic edit.
  useEffect(() => {
    if (plansVersion === 0) return; // the initial mount, already covered above
    load();
  }, [plansVersion, load]);

  if (!applicable || !session || !professionalId) return null;
  if (!data && !loadError) {
    return (
      <p style={{ fontSize: 12.5, color: "var(--ink-faint)", margin: 0 }}>
        Carregando convênios do profissional…
      </p>
    );
  }
  if (!data && loadError) {
    return (
      <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", margin: 0 }}>
        Não foi possível carregar os convênios deste profissional agora.{" "}
        <button
          type="button"
          onClick={load}
          style={{ color: "var(--brand)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Tentar de novo
        </button>
      </p>
    );
  }
  if (!data) return null;

  const mode = data.mode;
  if (mode !== "clinic_with_exceptions" && mode !== "independent") return null;

  async function toggleClinicWithExceptions(planId: string, checked: boolean) {
    if (!session || !professionalId || !data) return;
    setRowError(null);
    setBusyId(planId);
    const next = checked
      ? [...data.accepted_plan_ids, planId]
      : data.accepted_plan_ids.filter((id) => id !== planId);
    try {
      const updated = await putProfessionalInsurancePlans(session, professionalId, { plan_ids: next });
      setData(updated);
    } catch (e) {
      console.error("secretaria configuracao: failed to update professional insurance plans", e);
      setRowError("Não foi possível salvar essa mudança agora. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  async function toggleIndependentCatalog(catalogId: string, checked: boolean) {
    if (!session || !professionalId || !data) return;
    setRowError(null);
    setBusyId(catalogId);
    // Only catalog-direct ids belong in this body — custom rows are permanent
    // and must not be echoed back here (see the header comment).
    const currentCatalogIds = data.selectable
      .filter((p) => !p.is_custom && p.catalog_id)
      .map((p) => p.catalog_id as string)
      .filter((id) => data.accepted_plan_ids.includes(id));
    const next = checked
      ? [...currentCatalogIds, catalogId]
      : currentCatalogIds.filter((id) => id !== catalogId);
    try {
      const updated = await putProfessionalInsurancePlans(session, professionalId, { catalog_ids: next });
      setData(updated);
    } catch (e) {
      console.error("secretaria configuracao: failed to update professional insurance plans", e);
      setRowError("Não foi possível salvar essa mudança agora. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmitOther() {
    if (!session || !professionalId) return;
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
      await createProfessionalCustomInsurancePlan(session, professionalId, {
        custom_name: otherName.trim(),
        custom_payment_note: otherNote.trim(),
        charge_deposit: otherDeposit,
      });
      // Simpler and safer than merging the single-row response by hand: the
      // full professional payload (selectable + accepted_plan_ids) comes back
      // consistent from one GET.
      load();
      setShowOtherForm(false);
      setOtherName("");
      setOtherNote("");
      setOtherDeposit(true);
    } catch (e) {
      console.error("secretaria configuracao: failed to create professional custom insurance plan", e);
      setOtherError("Não foi possível salvar esse convênio agora. Tente novamente.");
    } finally {
      setOtherSaving(false);
    }
  }

  const acceptedSet = new Set(data.accepted_plan_ids);

  return (
    <div
      style={{
        display: "flex", flexDirection: "column", gap: 10,
        padding: "12px 14px", borderRadius: 12,
        background: "var(--surface-2)", border: "1px solid var(--line)",
      }}
    >
      <span style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-soft)" }}>
        Convênios aceitos por este profissional
      </span>

      {mode === "clinic_with_exceptions" && data.inherits_clinic && (
        <p style={{ fontSize: 11.5, color: "var(--ink-faint)", margin: 0 }}>
          Ainda não customizado — aceitando todos os convênios habilitados pela clínica.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {data.selectable
          .filter((p) => mode === "clinic_with_exceptions" || !p.is_custom)
          .map((plan) => (
            <div key={plan.id} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <CToggle
                on={acceptedSet.has(plan.id) || acceptedSet.has(plan.catalog_id ?? "")}
                onChange={(v) =>
                  mode === "clinic_with_exceptions"
                    ? toggleClinicWithExceptions(plan.id, v)
                    : toggleIndependentCatalog(plan.catalog_id ?? plan.id, v)
                }
                disabled={
                  readOnly ||
                  busyId === plan.id ||
                  // `plan.catalog_id` is `null` for any custom "Outro" row, and
                  // so is `busyId` outside a request — comparing them directly
                  // would read `null === null` as "busy" and disable every
                  // custom-plan toggle at rest, permanently.
                  (plan.catalog_id !== null && busyId === plan.catalog_id)
                }
                label={"Aceitar " + plan.name + " — este profissional"}
              />
              <span style={{ fontSize: 13, color: "var(--ink)" }}>{plan.name}</span>
            </div>
          ))}
        {/* independent mode: this professional's own "Outro" rows — permanent
            once created (no delete endpoint), shown as a static accepted row. */}
        {mode === "independent" &&
          data.selectable
            .filter((p) => p.is_custom)
            .map((plan) => (
              <div key={plan.id} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span style={{ fontSize: 13, color: "var(--ink)" }}>✓ {plan.name} (Outro)</span>
                {plan.custom_payment_note && (
                  <span style={{ fontSize: 11.5, color: "var(--ink-faint)" }}>
                    {plan.custom_payment_note}
                  </span>
                )}
              </div>
            ))}
      </div>

      {rowError && (
        <p role="alert" style={{ fontSize: 12, color: "var(--danger, #c0392b)", margin: 0 }}>
          {rowError}
        </p>
      )}

      {data.selectable.length > 0 && (
        <p style={{ fontSize: 11, color: "var(--ink-faint)", margin: 0, lineHeight: 1.5 }}>
          {INSURANCE_DEPOSIT_SCOPE_NOTE}
        </p>
      )}

      {/* "Outro" is a professional-scoped affordance only in independent mode
          (SPEC §5.2) — clinic_with_exceptions has no per-professional custom
          plan, only the clinic's own. */}
      {mode === "independent" && !showOtherForm && (
        <Btn variant="outline" size="sm" icon="plus" onClick={() => setShowOtherForm(true)} disabled={readOnly}>
          Outro
        </Btn>
      )}

      {mode === "independent" && showOtherForm && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
            <p role="alert" style={{ fontSize: 12, color: "var(--danger, #c0392b)", margin: 0 }}>
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
    </div>
  );
}
