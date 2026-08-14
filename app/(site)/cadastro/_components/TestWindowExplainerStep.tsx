"use client";

// TestWindowExplainerStep — a dedicated screen, shown right after AddonsStep and
// before SummaryStep, for every secretarIA purchase (the only product this app
// sells — see CadastroWizard's transition table). This is the FULL, first
// explanation of how billing actually works: a WhatsApp Coexistence
// connection-test window, not a "free trial." CheckoutTrialNotice (rendered
// again, smaller, on SummaryStep right above the
// submit button) is the last-chance reminder right before checkout — the two
// intentionally overlap instead of one replacing the other, since the visitor may not
// re-read the first screen by the time they reach the second.
//
// Mirrors AddonsStep's fetch-then-render-or-skip shape: undefined = still resolving
// (loading state), 0 = no trial configured (silently onSkip — nothing to explain, same
// "don't trap Voltar" reasoning as AddonsStep: this step never lands in history when
// skipped). A FAILED fetch (null) still renders, with the day count omitted, instead of
// skipping — this is billing disclosure, not an upsell, so a transient network error
// hiding it would be worse than showing the generic version (same choice
// CheckoutTrialNotice already makes for its own null case).

import { useEffect, useState } from "react";
import { StepHeading, StepActions } from "./WizardShell";
import { getCheckoutTrialDays } from "@/lib/manage-api";

type TestWindowExplainerStepProps = {
  onNext: () => void;
  onSkip: () => void;
  onBack: () => void;
};

export function TestWindowExplainerStep({ onNext, onSkip, onBack }: TestWindowExplainerStepProps) {
  // undefined = still loading; null = fetch failed; 0 = no trial configured; N = days.
  const [trialDays, setTrialDays] = useState<number | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getCheckoutTrialDays().then((days) => {
      if (!cancelled) setTrialDays(days);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (trialDays === 0) onSkip();
  }, [trialDays, onSkip]);

  if (trialDays === undefined || trialDays === 0) {
    return (
      <div>
        <StepHeading title="Como funciona o período de teste" desc="Carregando…" />
        <div className="cad-addon-loading" aria-live="polite" aria-label="Carregando">
          <div className="checkout-spinner" aria-hidden="true" />
        </div>
      </div>
    );
  }

  const days = trialDays; // number | null here (undefined/0 handled above)
  const capLabel = days === null ? "alguns dias" : `no máximo ${days} dias`;

  return (
    <div>
      <StepHeading
        title="Como funciona o período de teste de conexão"
        desc="Antes de ir para o pagamento, veja exatamente o que vai acontecer com a sua cobrança."
      />

      <div className="cad-testwindow-highlight">Sem cobrança agora — {capLabel} até a primeira cobrança.</div>

      <div className="cad-guide-list">
        <div className="cad-guide-item">
          <span className="cad-guide-num">1</span>
          <div>
            <strong style={{ color: "var(--ink)" }}>Não é um período grátis por cortesia.</strong>
            <div style={{ marginTop: 3 }}>
              É o prazo de teste de conexão do número que você indicou com a API do WhatsApp
              Coexistence — o tempo que a Meta leva para validar essa conexão.
            </div>
          </div>
        </div>
        <div className="cad-guide-item">
          <span className="cad-guide-num">2</span>
          <div>
            <strong style={{ color: "var(--ink)" }}>O número é testado algumas vezes durante o período.</strong>
            <div style={{ marginTop: 3 }}>
              A aprovação é baseada na atividade do número que você já autenticou como WhatsApp
              Business — o mesmo número sobre o qual você respondeu nas telas anteriores (uso do
              WhatsApp, histórico de API, Página no Facebook).
            </div>
          </div>
        </div>
        <div className="cad-guide-item">
          <span className="cad-guide-num">3</span>
          <div>
            <strong style={{ color: "var(--ink)" }}>A cobrança só começa quando a conexão for aprovada.</strong>
            <div style={{ marginTop: 3 }}>
              {days !== null
                ? `Se a aprovação sair antes dos ${days} dias, o ciclo mensal começa na data da aprovação — não no dia do cadastro.`
                : "O ciclo mensal começa na data da aprovação — não no dia do cadastro."}
            </div>
          </div>
        </div>
        <div className="cad-guide-item">
          <span className="cad-guide-num">4</span>
          <div>
            <strong style={{ color: "var(--ink)" }}>Sem aprovação a tempo, você não paga nada.</strong>
            <div style={{ marginTop: 3 }}>
              {days !== null
                ? `Se a Meta não aprovar dentro dos ${days} dias, cancelamos a assinatura automaticamente.`
                : "Se a Meta não aprovar a tempo, cancelamos a assinatura automaticamente."}{" "}
              Dá para reiniciar o período de teste depois, se quiser tentar de novo.
            </div>
          </div>
        </div>
      </div>

      <StepActions onBack={onBack} onNext={onNext} nextLabel="Entendi, continuar" />
    </div>
  );
}
