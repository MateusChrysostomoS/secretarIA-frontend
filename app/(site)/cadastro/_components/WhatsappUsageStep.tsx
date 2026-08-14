"use client";

// WhatsappUsageStep — Q1: "Você já usa o WhatsApp Business App (o aplicativo,
// não a API) nesse número, com conversas reais?" Drives whether the wizard
// routes to the dedicated-number guide next (answer === "none").

import { StepHeading, StepActions } from "./WizardShell";
import { RadioPillGroup } from "../../_components/RadioPillGroup";
import type { SignupIntakeWhatsappUsage } from "@/lib/manage-api";

const OPTIONS: { value: SignupIntakeWhatsappUsage; label: string; hint?: string }[] = [
  {
    value: "business_7d_plus",
    label: "Sim, há mais de 7 dias, com conversas reais de pacientes",
  },
  {
    value: "business_recent",
    label: "Sim, mas comecei a usar recentemente",
    hint: "Menos de 7 dias de uso nesse número",
  },
  {
    value: "none",
    label: "Não, ainda não uso o WhatsApp Business App nesse número",
  },
];

type WhatsappUsageStepProps = {
  value: SignupIntakeWhatsappUsage | null;
  onChange: (value: SignupIntakeWhatsappUsage) => void;
  onNext: () => void;
  onBack: () => void;
};

export function WhatsappUsageStep({ value, onChange, onNext, onBack }: WhatsappUsageStepProps) {
  return (
    <div>
      <StepHeading
        title="Você já usa o WhatsApp Business App (o aplicativo, não a API) nesse número, com conversas reais?"
        desc="Isso nos ajuda a calibrar quanto tempo o WhatsApp leva para liberar a automação nesse número."
      />
      <RadioPillGroup name="whatsapp_usage" options={OPTIONS} value={value} onChange={onChange} />
      <StepActions onBack={onBack} onNext={onNext} nextDisabled={!value} />
    </div>
  );
}
