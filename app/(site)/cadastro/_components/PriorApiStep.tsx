"use client";

// PriorApiStep — Q3: "Esse número já foi usado com alguma API de WhatsApp
// antes (outro chatbot, outro fornecedor)?" When the answer is "yes", shows
// the manual-action explainer inline — informational only, it never blocks
// continuing (the clinic can do these steps in parallel with the rest of
// onboarding).

import { StepHeading, StepActions } from "./WizardShell";
import { RadioPillGroup } from "../../_components/RadioPillGroup";
import type { SignupIntakePriorApi } from "@/lib/manage-api";

const OPTIONS: { value: SignupIntakePriorApi; label: string }[] = [
  { value: "yes", label: "Sim, já foi usado com outra API/chatbot" },
  { value: "no", label: "Não, esse número nunca foi usado com uma API de WhatsApp" },
  { value: "unknown", label: "Não sei dizer" },
];

type PriorApiStepProps = {
  value: SignupIntakePriorApi | null;
  onChange: (value: SignupIntakePriorApi) => void;
  onNext: () => void;
  onBack: () => void;
};

export function PriorApiStep({ value, onChange, onNext, onBack }: PriorApiStepProps) {
  return (
    <div>
      <StepHeading title="Esse número já foi usado com alguma API de WhatsApp antes (outro chatbot, outro fornecedor)?" />
      <RadioPillGroup name="prior_api" options={OPTIONS} value={value} onChange={onChange} />

      {value === "yes" && (
        <div className="cad-inline-note">
          <div className="cad-guide-item">
            <div>
              <strong style={{ color: "var(--ink)" }}>Duas ações vão agilizar a liberação:</strong>
              <ol style={{ margin: "8px 0 0", paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Desative a verificação em duas etapas (2FA) na conta antiga desse número.</li>
                <li>Peça ao fornecedor/chatbot anterior para desconectar o número da API dele.</li>
              </ol>
              <div style={{ marginTop: 8 }}>
                Pode continuar o cadastro agora — resolvemos isso junto com você durante a ativação.
              </div>
            </div>
          </div>
        </div>
      )}

      <StepActions onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </div>
  );
}
