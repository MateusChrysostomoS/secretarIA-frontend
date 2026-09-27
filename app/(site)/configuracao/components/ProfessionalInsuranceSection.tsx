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
//
// STALE-RESPONSE GUARD (Reviewer HIGH-1, post-review fix)
// ---------------------------------------------------------------------------
// `professionalId` changes on every roster click, and each change fires a
// NEW `getProfessionalInsurancePlans` GET — this is the first place on the
// page where selecting a professional triggers a fresh network request
// rather than a read of already-hydrated data (every other per-professional
// field is preloaded once by page.tsx's hydrate() into `professionalsById`).
// Two requests can resolve out of order: clicking B right after A means A's
// GET can land AFTER B's, and without a guard `setData` would silently paint
// A's `selectable`/`accepted_plan_ids` while `professionalId` (the prop) is
// already B's — and a toggle fired in that window derives its PUT body from
// that now-wrong `data`, corrupting B's real convênio subset with a mix of
// A's. `requestGenerationRef` is the same epoch pattern page.tsx already
// uses (`generationRef`/`rosterGenerationRef`) for this exact hazard class —
// replicated here rather than reinvented, per the front-brain skill §4.

import { useCallback, useEffect, useRef, useState } from "react";
import { Btn, Field, TextArea, TextInput } from "../../_shared/ui";
import { CToggle } from "./CToggle";
import { ToggleRow } from "./ToggleRow";
import {
  HUB_ERROR_INSURANCE_MODE_NOT_APPLICABLE,
  HubApiError,
  createProfessionalCustomInsurancePlan,
  getProfessionalInsurancePlans,
  putProfessionalInsurancePlans,
  type InsuranceMode,
  type ProfessionalInsuranceWire,
} from "@/lib/secretaria-hub";
import type { Session } from "@/lib/manage-api";
import { MAX_LIST_ROW_TITLE_CHARS, insurancesError } from "@/lib/whatsapp-limits";

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
  // Whether ANY membership write (PUT plan_ids/catalog_ids) for THIS
  // professional is in flight. Disables the WHOLE list, not just the touched
  // row (Reviewer MEDIUM-1): the PUT is a full-replace built from local
  // `data.accepted_plan_ids`, so two rows toggled within one round-trip would
  // race — the second request's body would not yet include the first's
  // not-applied change, and whichever response lands last silently drops the
  // other. Disabling the list while a save is in flight makes the second
  // click impossible until the first has actually landed, which removes the
  // race rather than narrowing it.
  const [listSaving, setListSaving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const [showOtherForm, setShowOtherForm] = useState(false);
  const [otherName, setOtherName] = useState("");
  const [otherNote, setOtherNote] = useState("");
  const [otherDeposit, setOtherDeposit] = useState(true);
  const [otherSaving, setOtherSaving] = useState(false);
  const [otherError, setOtherError] = useState<string | null>(null);

  // Bumped on every professional/mode IDENTITY change (not on every plain
  // refetch — see the two effects below). A request captures the generation
  // it was issued under and checks it again before touching state; a
  // mismatch means "this professional/mode is no longer what's on screen",
  // and the response is dropped (the write itself already reached the
  // correct professional server-side — see the two toggle functions).
  const requestGenerationRef = useRef(0);

  const applicable = tenantMode === "clinic_with_exceptions" || tenantMode === "independent";

  const load = useCallback(() => {
    if (!session || !professionalId || !applicable) return;
    const generation = requestGenerationRef.current;
    setLoadError(false);
    getProfessionalInsurancePlans(session, professionalId)
      .then((res) => {
        if (requestGenerationRef.current !== generation) return; // superseded
        setData(res);
      })
      .catch((e) => {
        if (requestGenerationRef.current !== generation) return;
        // 409 insurance_mode_not_applicable is a legitimate race (tenant mode
        // changed between the two loads) — treat it the same as "nothing to
        // show" rather than an error banner. Checked by BOTH `.status` and
        // `.code`: the contract documents this 409 without the explicit
        // `{code, message}` shape it spells out for the 422s (§10.5), so the
        // backend may send either a bare string `detail` (code stays
        // undefined) or the structured form other hub errors use — matching
        // only `.code` would silently regress to the ad-hoc check this
        // replaces if the backend turns out to send the bare-string form.
        if (
          e instanceof HubApiError &&
          (e.status === 409 || e.code === HUB_ERROR_INSURANCE_MODE_NOT_APPLICABLE)
        ) {
          setData(null);
          return;
        }
        console.error("secretaria configuracao: failed to load professional insurance plans", e);
        setLoadError(true);
      });
  }, [session, professionalId, applicable]);

  // Initial/identity-changed load: bumps the generation FIRST (invalidating
  // any request/mutation still in flight for the professional or mode this
  // panel is leaving), then resets the form and loads fresh. `tenantMode` is
  // in this effect's deps (not just `load`'s, via `applicable`) because a
  // mode SWITCH between "clinic_with_exceptions" and "independent" leaves
  // `applicable` at `true` on both sides of the change — without `tenantMode`
  // itself here, changing the clinic's mode gate would leave this panel
  // showing the PREVIOUS mode's selectable list until something else
  // remounted it.
  useEffect(() => {
    requestGenerationRef.current++;
    setData(null);
    setShowOtherForm(false);
    setListSaving(false);
    setRowError(null);
    load();
  }, [load, tenantMode]);

  // A clinic-side plan write (see lib/insurance.ts's plansVersion) — refetch
  // WITHOUT resetting `data`/`showOtherForm` first, so this professional's own
  // in-progress "Outro" form is not wiped by an unrelated clinic edit. Does
  // NOT bump the generation: this is a refresh for the SAME professional/mode
  // already on screen, not an identity change, so a toggle the user just
  // fired must not be invalidated by it.
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
    const generation = requestGenerationRef.current;
    setRowError(null);
    setListSaving(true);
    const next = checked
      ? [...data.accepted_plan_ids, planId]
      : data.accepted_plan_ids.filter((id) => id !== planId);
    try {
      const updated = await putProfessionalInsurancePlans(session, professionalId, { plan_ids: next });
      // The PUT above always targeted the professionalId captured at the top
      // of this function (correct, whatever was selected at click time) — a
      // generation mismatch here means the panel has since moved on to a
      // DIFFERENT professional, so painting `updated` into `data` now would
      // show that other professional B's screen with A's just-saved result.
      if (requestGenerationRef.current !== generation) return;
      setData(updated);
    } catch (e) {
      if (requestGenerationRef.current !== generation) return;
      console.error("secretaria configuracao: failed to update professional insurance plans", e);
      setRowError("Não foi possível salvar essa mudança agora. Tente novamente.");
    } finally {
      if (requestGenerationRef.current === generation) setListSaving(false);
    }
  }

  async function toggleIndependentCatalog(catalogId: string, checked: boolean) {
    if (!session || !professionalId || !data) return;
    const generation = requestGenerationRef.current;
    setRowError(null);
    setListSaving(true);
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
      if (requestGenerationRef.current !== generation) return; // see the sibling function above
      setData(updated);
    } catch (e) {
      if (requestGenerationRef.current !== generation) return;
      console.error("secretaria configuracao: failed to update professional insurance plans", e);
      setRowError("Não foi possível salvar essa mudança agora. Tente novamente.");
    } finally {
      if (requestGenerationRef.current === generation) setListSaving(false);
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
    const generation = requestGenerationRef.current;
    setOtherSaving(true);
    setOtherError(null);
    try {
      await createProfessionalCustomInsurancePlan(session, professionalId, {
        custom_name: otherName.trim(),
        custom_payment_note: otherNote.trim(),
        charge_deposit: otherDeposit,
      });
      // The plan was created for the professionalId captured above regardless
      // of what happens next — but if the panel has since moved on to a
      // different professional, this form's state belongs to THAT one now,
      // and clearing/closing it here would stomp on whatever they're doing.
      if (requestGenerationRef.current !== generation) return;
      // Simpler and safer than merging the single-row response by hand: the
      // full professional payload (selectable + accepted_plan_ids) comes back
      // consistent from one GET.
      load();
      setShowOtherForm(false);
      setOtherName("");
      setOtherNote("");
      setOtherDeposit(true);
    } catch (e) {
      if (requestGenerationRef.current !== generation) return;
      console.error("secretaria configuracao: failed to create professional custom insurance plan", e);
      setOtherError("Não foi possível salvar esse convênio agora. Tente novamente.");
    } finally {
      if (requestGenerationRef.current === generation) setOtherSaving(false);
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
                disabled={readOnly || listSaving}
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

      {/* No "Cobrar sinal (Pix)" disclaimer here (Reviewer MEDIUM-3): unlike
          InsuranceSection, this panel has NO deposit toggle at all — there is
          no PATCH endpoint for a professional's own plan `charge_deposit`
          (Decision 2, header comment). A deposit-scope note next to nothing
          the reader can act on would raise "cobrar sinal de quê, aqui?"
          instead of answering it; the deposit policy for these plans is
          whatever the clinic (or, for a professional's own "Outro", the
          value picked once at creation below) already set. */}

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
              maxLength={MAX_LIST_ROW_TITLE_CHARS}
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
