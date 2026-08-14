"use client";

// PageCreationGuide — guided screen shown when the clinic has no Facebook Page
// yet (Q4 answer === "no"). A Page is required for the official WhatsApp
// Business API connection later in onboarding.

import { StepHeading, StepActions } from "./WizardShell";

const STEPS = [
  {
    title: "Acesse facebook.com/pages/create",
    desc: "Com a sua conta pessoal do Facebook (a Página fica separada do seu perfil).",
  },
  {
    title: 'Escolha "Empresa ou marca"',
    desc: "Preencha o nome da clínica e a categoria (ex.: \"Clínica médica\" ou \"Consultório médico\").",
  },
  {
    title: "Adicione foto e informações básicas",
    desc: "Endereço, telefone e um resumo curto — não precisa ser definitivo agora.",
  },
];

type PageCreationGuideProps = {
  onNext: () => void;
  onBack: () => void;
};

export function PageCreationGuide({ onNext, onBack }: PageCreationGuideProps) {
  return (
    <div>
      <StepHeading
        title="Vamos criar a Página da clínica no Facebook."
        desc="Leva menos de cinco minutos e é gratuito. Você pode continuar o cadastro agora e criar a Página em paralelo."
      />

      <div className="cad-guide-list">
        {STEPS.map((s, i) => (
          <div className="cad-guide-item" key={s.title}>
            <span className="cad-guide-num">{i + 1}</span>
            <div>
              <strong style={{ color: "var(--ink)" }}>{s.title}</strong>
              <div style={{ marginTop: 3 }}>{s.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <StepActions onBack={onBack} onNext={onNext} nextLabel="Entendi, continuar" />
    </div>
  );
}
