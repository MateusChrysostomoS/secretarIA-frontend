"use client";

// SummaryStep — Step 5: review + submit. The account is already registered (ContactStep
// did that at the first card), so this step only: attaches the collected `intake` to the
// signup intent via the authenticated POST /doctor/onboarding/intake (best-effort — the
// visitor is logged in), then opens the Stripe Checkout session for the existing intent
// and redirects. Also renders CheckoutTrialNotice right above the submit button — this is
// the cold-signup funnel's last screen before Stripe's hosted Checkout page, so the
// billing/trial disclosure must be visible here. Passes `plan.catalogIds` (the wizard's
// actual selection) to the notice. The review rows also surface
// `answers.selectedAddonIds` (Task 1a) — the add-on choice AddonsStep already PATCHed
// onto the intent itself before handing off here, so this step only displays it, it
// doesn't send it again.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { StepHeading, StepActions } from "./WizardShell";
import {
  attachSignupIntake,
  createPublicCheckoutSession,
  redeemCourtesyCoupon,
  ensureSession,
  getSession,
  ManageApiError,
} from "@/lib/manage-api";
import { CheckoutTrialNotice } from "../../_components/CheckoutTrialNotice";
import type { ResolvedPlan } from "../lib/plans";
import type { WizardAnswers } from "../lib/types";

const USAGE_LABEL: Record<string, string> = {
  business_7d_plus: "Já uso há mais de 7 dias",
  business_recent: "Comecei a usar recentemente",
  none: "Ainda não uso — vou dedicar um número novo",
};
const PRIOR_API_LABEL: Record<string, string> = {
  yes: "Sim, já foi usado com outra API",
  no: "Não, nunca foi usado com uma API",
  unknown: "Não sei dizer",
};
const FB_PAGE_LABEL: Record<string, string> = {
  yes_admin: "Sim, sou administrador(a)",
  yes_unknown_admin: "Sim, mas não sei se sou administrador(a)",
  no: "Ainda não tenho uma Página",
};
// Task 1a — mirrors the card titles in AddonsStep, but WITHOUT the "(BI)" suffix:
// matches the shorter label already used on /app/billing's "Módulos ativos" list,
// the next place the tenant sees this same id after checkout.
const ADDON_SUMMARY_LABEL: Record<string, string> = {
  analytics_bi_advanced: "Dashboard Avançado",
  pix_deposit: "Sinal via Pix",
};

type SummaryStepProps = {
  answers: WizardAnswers;
  plan: ResolvedPlan;
  // The signup intent created at registration (ContactStep). Always set by the time the
  // wizard reaches this step; guarded defensively below.
  intentId: string | null;
  onBack: () => void;
};

export function SummaryStep({ answers, plan, intentId, onBack }: SummaryStepProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Cupom de cortesia: fica escondido atrás de um link. Um campo de cupom sempre
  // visível convida todo visitante a procurar um código antes de pagar.
  const [cupomAberto, setCupomAberto] = useState(false);
  const [cupom, setCupom] = useState("");
  const [resgatando, setResgatando] = useState(false);

  async function handleSubmit() {
    if (!intentId) {
      // Defensive: reaching summary implies registration succeeded, but never redirect
      // to Stripe without an intent.
      setError("Sua sessão de cadastro expirou. Recomece o cadastro.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await attachIntakeBestEffort();

      const { checkout_url } = await createPublicCheckoutSession(intentId);
      window.location.assign(checkout_url);
      // Leave `submitting` true — the browser is navigating away to Stripe.
    } catch (e) {
      const status = e instanceof ManageApiError ? e.status : 0;
      if (status === 503) {
        setError("Cobrança ainda não configurada. Fale com a Brain.");
      } else if (status === 409) {
        setError("Este cadastro já foi finalizado. Atualize a página e entre na sua conta.");
      } else if (status === 422) {
        setError("Não foi possível validar os dados. Confira e tente novamente.");
      } else {
        setError("Não foi possível continuar agora. Tente novamente.");
      }
      setSubmitting(false);
    }
  }

  // Best-effort: attach the eligibility answers so onboarding starts in the state
  // the visitor just described. A failure here must never block activation, so it
  // is swallowed. ensureSession, not getSession alone: the wizard survives a
  // mid-flow reload now that registration plants a refresh cookie, and the intake
  // attach should survive it too.
  //
  // Chamado pelos DOIS caminhos de saída — pagar e resgatar cupom. Neste app todo
  // cadastro passa pelas três telas de elegibilidade (não há o desvio de PreCheck
  // que existe no brain-frontend), então deixar isto de fora da cortesia jogaria
  // fora respostas que a pessoa acabou de dar e a clínica começaria no estado
  // padrão. Cortesia é o caminho pago com o pagamento pulado, nada mais.
  async function attachIntakeBestEffort() {
    const session = getSession() ?? (await ensureSession());
    if (!session || !answers.whatsappUsage || !answers.priorApi || !answers.fbPage) {
      return;
    }
    try {
      await attachSignupIntake(session, {
        whatsapp_usage: answers.whatsappUsage,
        prior_api: answers.priorApi,
        fb_page: answers.fbPage,
      });
    } catch {
      // Non-fatal — the tenant just starts in the default onboarding state.
    }
  }

  async function resgatarCupom() {
    if (!intentId) {
      setError("Sua sessão de cadastro expirou. Recomece o cadastro.");
      return;
    }
    const codigo = cupom.trim();
    if (!codigo) return;
    setError(null);
    setResgatando(true);
    try {
      // Antes do resgate, como no caminho pago: depois dele o intent sai de
      // `pending_payment` e a clínica já está ativa.
      await attachIntakeBestEffort();
      await redeemCourtesyCoupon(intentId, codigo);
      // A clínica já está ativa. `?courtesy=1` diz à tela de sucesso para pular o
      // polling (não há Checkout Session para consultar) e ir direto ao portal —
      // o mesmo destino do caminho pago.
      router.push("/checkout/sucesso?courtesy=1");
    } catch (e) {
      const status = e instanceof ManageApiError ? e.status : 0;
      if (status === 422) {
        // O backend responde `coupon_invalid` para TODO motivo de recusa
        // (inexistente, expirado, esgotado, desativado) de propósito — não há o
        // que distinguir aqui sem ensinar quais códigos existem.
        setError("Cupom inválido ou já utilizado.");
      } else if (status === 409) {
        setError("Este cadastro já foi finalizado. Atualize a página e entre na sua conta.");
      } else if (status === 429) {
        setError("Muitas tentativas. Aguarde um instante e tente de novo.");
      } else {
        setError("Não foi possível validar o cupom agora. Tente novamente.");
      }
      setResgatando(false);
    }
  }

  return (
    <div>
      <StepHeading title="Confira e finalize." desc="Revise seus dados antes de ir para o pagamento." />

      <div style={{ marginBottom: 4 }}>
        <Row label="Plano" value={`${plan.label} · ${plan.tagline}`} />
        <Row label="Nome" value={answers.contact.name} />
        <Row label="Clínica" value={answers.contact.clinicName} />
        <Row label="E-mail" value={answers.contact.email} />
        <Row label="WhatsApp" value={answers.contact.whatsappPhone} />
        <Row
          label="Uso do WhatsApp Business App"
          value={USAGE_LABEL[answers.whatsappUsage ?? ""] ?? "—"}
        />
        <Row
          label="Número usado com API antes"
          value={PRIOR_API_LABEL[answers.priorApi ?? ""] ?? "—"}
        />
        <Row label="Página no Facebook" value={FB_PAGE_LABEL[answers.fbPage ?? ""] ?? "—"} />
        <Row
          label="Complementos"
          value={
            answers.selectedAddonIds.length > 0
              ? answers.selectedAddonIds.map((id) => ADDON_SUMMARY_LABEL[id] ?? id).join(", ")
              : "nenhum"
          }
        />
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", marginTop: 16 }}>
          {error}
        </p>
      )}

      {/* Pre-checkout billing disclosure — this submit opens the Stripe Checkout session
          for the already-registered intent and redirects straight there. */}
      <CheckoutTrialNotice catalogIds={plan.catalogIds} />

      {/* Cortesia: ativa na hora, sem cartão e sem assinatura no Stripe. Fica
          atrás de um link porque um campo sempre visível faz todo visitante
          parar para procurar um código antes de pagar. */}
      <div className="cad-cupom">
        {!cupomAberto ? (
          <button
            type="button"
            className="cad-cupom-link"
            onClick={() => setCupomAberto(true)}
          >
            Tenho um cupom
          </button>
        ) : (
          <div className="cad-cupom-box">
            <label className="cad-cupom-label" htmlFor="cad-cupom-input">
              Cupom de acesso
            </label>
            <div className="cad-cupom-row">
              <input
                id="cad-cupom-input"
                className="cad-cupom-input"
                value={cupom}
                onChange={(e) => setCupom(e.target.value)}
                placeholder="Digite seu cupom"
                autoFocus
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                disabled={resgatando || submitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    resgatarCupom();
                  }
                }}
              />
              <button
                type="button"
                className="cad-cupom-btn"
                onClick={resgatarCupom}
                disabled={resgatando || submitting || !cupom.trim()}
              >
                {resgatando ? "Validando…" : "Ativar"}
              </button>
            </div>
          </div>
        )}
      </div>

      <StepActions
        onBack={onBack}
        onNext={handleSubmit}
        nextLabel={submitting ? "Processando…" : "Ir para pagamento"}
        nextDisabled={submitting || resgatando}
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="cad-summary-row">
      <span className="cad-summary-label">{label}</span>
      <span className="cad-summary-value">{value}</span>
    </div>
  );
}
