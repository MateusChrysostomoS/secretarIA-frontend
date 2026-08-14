"use client";

// FacebookPageStep — Q4: "Você (ou a clínica) já tem uma Página no Facebook?"
// A verified WhatsApp Business API connection is tied to a Facebook Page, so
// this determines whether the wizard routes to the page-creation guide next
// (answer === "no") — "yes_unknown_admin" gets an inline how-to-check note
// instead, same non-blocking pattern as PriorApiStep's "yes" branch.

import { StepHeading, StepActions } from "./WizardShell";
import { RadioPillGroup } from "../../_components/RadioPillGroup";
import type { SignupIntakeFbPage } from "@/lib/manage-api";

const OPTIONS: { value: SignupIntakeFbPage; label: string; hint?: string }[] = [
  { value: "yes_admin", label: "Sim, e eu sou administrador(a) dela" },
  {
    value: "yes_unknown_admin",
    label: "Sim, mas não sei se sou administrador(a)",
  },
  { value: "no", label: "Não, ainda não temos uma Página no Facebook" },
];

type FacebookPageStepProps = {
  value: SignupIntakeFbPage | null;
  onChange: (value: SignupIntakeFbPage) => void;
  onNext: () => void;
  onBack: () => void;
};

export function FacebookPageStep({ value, onChange, onNext, onBack }: FacebookPageStepProps) {
  return (
    <div>
      <StepHeading
        title="Você (ou a clínica) já tem uma Página no Facebook?"
        desc="A conexão oficial do WhatsApp Business API passa por uma Página do Facebook — mesmo que a clínica não a use ativamente."
      />
      <RadioPillGroup name="fb_page" options={OPTIONS} value={value} onChange={onChange} />

      {value === "yes_unknown_admin" && (
        <div className="cad-inline-note">
          <div className="cad-guide-item">
            <div>
              <strong style={{ color: "var(--ink)" }}>Como checar se você é administrador(a):</strong>
              <div style={{ marginTop: 6 }}>
                Na Página do Facebook, vá em <strong>Configurações → Acesso à Página</strong> (ou
                abra o <strong>Meta Business Suite → Configurações → Pessoas</strong>) e veja se seu
                perfil aparece com a função de administrador. Se não tiver certeza, pode continuar —
                ajustamos isso durante a ativação.
              </div>
            </div>
          </div>
        </div>
      )}

      <StepActions onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </div>
  );
}
