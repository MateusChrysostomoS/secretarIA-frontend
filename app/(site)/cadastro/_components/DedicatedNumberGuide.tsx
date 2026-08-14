"use client";

// DedicatedNumberGuide — guided screen shown when the clinic has no WhatsApp
// Business App history yet (Q1 answer === "none"). Walks through getting a
// DEDICATED number for the clinic. Deliberately offers NO "use my personal
// number" option — converting an existing personal WhatsApp number is not
// supported by this flow.

import { StepHeading, StepActions } from "./WizardShell";

const STEPS = [
  {
    title: "Consiga um número dedicado à clínica",
    desc: "Um chip (SIM) ou eSIM novo, só para o WhatsApp da clínica — não o seu número pessoal.",
  },
  {
    title: "Instale o WhatsApp Business App nesse número",
    desc: "O aplicativo (não a API) — disponível na loja de aplicativos do seu celular.",
  },
  {
    title: "Verifique o número",
    desc: "Siga a verificação por SMS ou ligação do próprio WhatsApp Business App.",
  },
];

type DedicatedNumberGuideProps = {
  onNext: () => void;
  onBack: () => void;
};

export function DedicatedNumberGuide({ onNext, onBack }: DedicatedNumberGuideProps) {
  return (
    <div>
      <StepHeading
        title="Vamos preparar um número dedicado."
        desc={
          <>
            Não convertemos um número pessoal — o WhatsApp Business API exige um número{" "}
            <strong>dedicado à clínica</strong>. Veja os passos:
          </>
        }
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

      <div className="alert-line alert-line--amber">
        <span className="dot dot--amber" />
        Pode levar alguns dias para conseguir o chip/eSIM — sem problema, você pode continuar o
        cadastro agora e configurar o número quando ele chegar.
      </div>

      <StepActions onBack={onBack} onNext={onNext} nextLabel="Entendi, continuar" />
    </div>
  );
}
