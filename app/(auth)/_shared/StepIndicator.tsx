// StepIndicator — small pill at the top of forgot-password cards.
// Keeps the user oriented through the 3-step flow.
//
// Ported unchanged from brain-frontend's (SignOut)/_shared — purely generic
// (no branding, no copy tied to PreCheck), and auth-shell.css already carries
// the `.step-indicator`/`.step-dot` rules (light + dark) it depends on, kept
// there since the initial split even with no consumer until now.

type StepIndicatorProps = {
  current: number;
  total: number;
};

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="step-indicator" aria-label={`Etapa ${current} de ${total}`}>
      <span className="step-dot" aria-hidden="true" />
      <span>{`Etapa ${current} de ${total}`}</span>
    </div>
  );
}
