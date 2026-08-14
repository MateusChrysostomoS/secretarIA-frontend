"use client";

// AddonsStep — Task 1a: optional add-on selection shown right before the summary/
// checkout step, for every secretarIA purchase (the only product this app sells —
// see CadastroWizard's transition table). Renders one toggle card per
// add-on the backend currently reports as `available: true` (GET
// /public/checkout-config). If that config hasn't been deployed yet (missing/empty
// `addons`), or none of the two known ids are available, the step calls onSkip —
// NOT onNext — so it leaves itself without being recorded in the wizard's history
// stack; otherwise "Voltar" from the summary step would land back on a step that
// just silently skips forward again, trapping the visitor. On "Continuar" it PATCHes
// the selection onto the pending signup intent (updateSignupIntentCatalog) before
// handing off to SummaryStep.

import { useEffect, useState } from "react";
import { StepHeading, StepActions } from "./WizardShell";
import { BrandIcon } from "../../_components/BrandIcon";
import { getCheckoutConfig, updateSignupIntentCatalog, ManageApiError } from "@/lib/manage-api";
import { SIGNUP_ADDON_IDS, type SignupAddonId } from "../lib/types";
import type { ResolvedPlan } from "../lib/plans";

// Display copy for each offerable add-on. Card title/blurb only — Task 1a is
// explicit that analytics_bi_advanced gets NO preview/screenshot here (handled
// separately, out of scope).
const ADDON_COPY: Record<SignupAddonId, { title: string; blurb: string }> = {
  analytics_bi_advanced: {
    title: "Dashboard Avançado (BI)",
    blurb:
      "Acompanhe a evolução dos agendamentos mês a mês, por profissional e por origem — dados para a clínica decidir com mais segurança.",
  },
  pix_deposit: {
    title: "Sinal via Pix",
    blurb:
      "Reduza faltas cobrando um sinal antecipado via Pix, direto na conversa do WhatsApp.",
  },
};

type AddonsStepProps = {
  intentId: string | null;
  plan: ResolvedPlan;
  // Lives in CadastroWizard's answers so it survives "Voltar" navigation.
  selected: string[];
  onSelectedChange: (ids: string[]) => void;
  // Advances to summary AFTER a successful PATCH (records history normally).
  onNext: () => void;
  // Silently leaves the step without recording it in history — see file header.
  onSkip: () => void;
  onBack: () => void;
};

export function AddonsStep({
  intentId,
  plan,
  selected,
  onSelectedChange,
  onNext,
  onSkip,
  onBack,
}: AddonsStepProps) {
  // undefined = still resolving availability; array = the ids actually offerable.
  const [availableIds, setAvailableIds] = useState<SignupAddonId[] | undefined>(undefined);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getCheckoutConfig().then((config) => {
      if (cancelled) return;
      const offered = SIGNUP_ADDON_IDS.filter((id) =>
        config?.addons?.some((a) => a.id === id && a.available === true),
      );
      if (offered.length === 0) {
        // Not deployed yet, or nothing enabled for this tenant — never block signup.
        onSkip();
        return;
      }
      // Drop any preselected id (from plan.catalogIds) the backend didn't actually
      // confirm as available, so the PATCH below never sends an unofferable id.
      const reconciled = selected.filter((id) => offered.includes(id as SignupAddonId));
      if (reconciled.length !== selected.length) onSelectedChange(reconciled);
      setAvailableIds(offered);
    });
    return () => {
      cancelled = true;
    };
    // Runs once on mount — availability doesn't change while the visitor is on
    // this step, and onSkip/onSelectedChange/selected would otherwise churn it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggle(id: SignupAddonId) {
    const isOn = selected.includes(id);
    onSelectedChange(isOn ? selected.filter((x) => x !== id) : [...selected, id]);
  }

  async function handleContinue() {
    if (!intentId) {
      // Defensive: reaching this step implies registration succeeded (see
      // SummaryStep's identical guard).
      setError("Sua sessão de cadastro expirou. Recomece o cadastro.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await updateSignupIntentCatalog(intentId, [plan.planId, ...selected]);
      onNext();
      // Leave `submitting` true — the step is about to unmount.
    } catch (e) {
      const status = e instanceof ManageApiError ? e.status : 0;
      if (status === 409) {
        setError("Este cadastro já foi finalizado. Atualize a página e entre na sua conta.");
      } else if (status === 422) {
        setError("Não foi possível validar a seleção. Atualize a página e tente novamente.");
      } else {
        setError("Não foi possível salvar sua seleção agora. Tente novamente.");
      }
      setSubmitting(false);
    }
  }

  // --- Still resolving availability: lightweight loading state, no flash of
  // empty content before the (likely) silent skip above fires. ---
  if (availableIds === undefined) {
    return (
      <div>
        <StepHeading title="Complementos" desc="Verificando o que está disponível para o seu plano…" />
        <div className="cad-addon-loading" aria-live="polite" aria-label="Carregando complementos">
          <div className="checkout-spinner" aria-hidden="true" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <StepHeading
        title="Quer incluir algum complemento?"
        desc="Você pode ativar (ou pular) esses módulos agora — dá para mudar depois em Assinatura."
      />

      <div className="cad-addon-list">
        {availableIds.map((id) => (
          <AddonToggleCard key={id} id={id} checked={selected.includes(id)} onToggle={() => toggle(id)} />
        ))}
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", marginTop: 4 }}>
          {error}
        </p>
      )}

      <StepActions
        onBack={onBack}
        onNext={handleContinue}
        nextLabel={submitting ? "Salvando…" : "Continuar"}
        nextDisabled={submitting}
      />
    </div>
  );
}

// AddonToggleCard — one checkbox card for a single add-on. The pix_deposit id
// additionally gets an expandable "Como funciona" (native <details>, Task 1b) as a
// SIBLING of the checkbox <label>, not nested inside it — nesting a <details> inside
// a <label> risks the browser also forwarding clicks on <summary> to the checkbox.
function AddonToggleCard({
  id,
  checked,
  onToggle,
}: {
  id: SignupAddonId;
  checked: boolean;
  onToggle: () => void;
}) {
  const copy = ADDON_COPY[id];
  return (
    <div className={"cad-addon-card" + (checked ? " on" : "")}>
      <label className="cad-addon-toggle">
        <input type="checkbox" checked={checked} onChange={onToggle} />
        <span className="cad-addon-check" aria-hidden="true">
          <BrandIcon name="check" />
        </span>
        <span className="cad-addon-body">
          <span className="cad-addon-title">{copy.title}</span>
          <span className="cad-addon-desc">{copy.blurb}</span>
        </span>
      </label>

      {id === "pix_deposit" && (
        <details className="cad-addon-details">
          <summary>Como funciona</summary>
          <div className="cad-addon-details-body">
            <p>
              Faltas e no-shows são um dos maiores ralos de faturamento em consultórios — estudos
              do setor apontam que algo entre 20% e 30% das consultas agendadas acabam não
              acontecendo, virando agenda parada e custo fixo perdido.
            </p>
            <p>
              Com o sinal via Pix, o paciente agenda pelo WhatsApp, recebe a cobrança do sinal na
              própria conversa e o pagamento confirma a reserva do horário. Quem não paga dentro do
              prazo não garante a vaga — sem ligação de cobrança, sem constrangimento. O valor pago
              é abatido da consulta (ou tratado conforme a política que a clínica define).
            </p>
            <p>
              Depois de ativar, você configura: percentual ou valor do sinal, janela de reembolso
              (em horas), política de retenção quando o paciente cancela fora do prazo, percentual
              de reembolso parcial e o limite de remarcações permitido.
            </p>
          </div>
        </details>
      )}
    </div>
  );
}
