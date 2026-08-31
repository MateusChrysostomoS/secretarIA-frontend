"use client";

// WizardShell — Brain-branded chrome for every /cadastro step: a minimal
// header (brand mark, links back to the `/` entry screen), a progress bar, and
// a centered card. Mirrors the look of /checkout/sucesso's CheckoutShell
// (checkout.css) rather than the full decorative AuthShell used by `/` — this
// wizard is a mid-flow step reached via `?plan=...` links, not a landing
// screen, so it keeps a lighter header instead.

import Link from "next/link";
import { useId, type ReactNode } from "react";
import { BrandGlyph } from "../../_components/BrandGlyph";
import "../../checkout/checkout.css";
import "../cadastro.css";

type WizardShellProps = {
  // 0..1 — drives the progress bar fill.
  progress: number;
  progressLabel: string;
  children: ReactNode;
};

export function WizardShell({ progress, progressLabel, children }: WizardShellProps) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  // Names the progressbar below. aria-valuenow/min/max were already there —
  // what a screen reader had no way to say was WHICH progress this is, so it
  // announced a bare "progress bar, 0%". Points at the step name only, not the
  // whole label row: the row's second span is the percentage, and repeating it
  // in the name would have it read twice, once as name and once as value.
  const labelId = useId();

  return (
    <>
      <header className="container" style={{ padding: "24px 0" }}>
        <Link href="/" className="brand-mark" aria-label="Brain — início">
          <BrandGlyph size={32} />
          <span className="wordmark">Brain</span>
        </Link>
      </header>

      <main className="cad-main">
        <div className="card cad-card">
          <div className="cad-progress-label">
            <span id={labelId}>{progressLabel}</span>
            <span>{Math.round(pct)}%</span>
          </div>
          <div
            className="cad-progress-track"
            role="progressbar"
            aria-labelledby={labelId}
            aria-valuenow={Math.round(pct)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="cad-progress-fill" style={{ width: `${pct}%` }} />
          </div>

          {children}
        </div>
      </main>
    </>
  );
}

// StepHeading — the title + optional description every step renders above its
// fields. Extracted so all seven step components stay visually identical.
export function StepHeading({ title, desc }: { title: string; desc?: ReactNode }) {
  return (
    <>
      <h1 className="cad-step-title">{title}</h1>
      {desc && <p className="cad-step-desc">{desc}</p>}
    </>
  );
}

// StepActions — the back/continue button row shared by every step.
export function StepActions({
  onBack,
  backLabel = "Voltar",
  nextLabel = "Continuar",
  onNext,
  nextDisabled,
  nextType = "button",
}: {
  onBack?: () => void;
  backLabel?: string;
  nextLabel?: string;
  onNext?: () => void;
  nextDisabled?: boolean;
  nextType?: "button" | "submit";
}) {
  return (
    <div className="cad-actions">
      {onBack && (
        <button type="button" className="btn btn--outline" onClick={onBack}>
          {backLabel}
        </button>
      )}
      <button
        type={nextType}
        className="btn btn--primary"
        onClick={nextType === "button" ? onNext : undefined}
        disabled={nextDisabled}
      >
        {nextLabel}
      </button>
    </div>
  );
}
