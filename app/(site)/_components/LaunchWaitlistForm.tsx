"use client";

// LaunchWaitlistForm — the "avise-me quando lançar" capture itself: two fields, a
// submit, and the confirmation that REPLACES them on success. Presentation-free
// on purpose (no dialog chrome, no card) because the pre-launch gate surfaces it
// in two shapes:
//
// - LaunchWaitlistModal — over the pricing page, when a buy CTA is clicked.
// - /cadastro — inline in a checkout-card, for the links that point straight at
//   the signup wizard (e.g. the "PreCheck Advanced" upsell on the homepage,
//   which never passes through PlanCheckoutCta) and for anyone arriving by
//   bookmark or old URL.
//
// Both read the same PRODUCT_LAUNCHED constant; this component just makes sure
// the form itself exists once instead of twice.
//
// It NEVER unmounts itself on failure — the caller decides what closing means,
// and a network error must leave what the visitor typed on screen.

import { useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import { submitLaunchWaitlist } from "@/lib/manage-api";

export type LaunchWaitlistFormProps = {
  // Which purchase the blocked click was for — the catalog ids joined by ",".
  // Stored as a sales hint (who wanted what), never validated as an enum.
  planHint?: string | null;
  // Notified once the lead is captured — the modal uses it to move focus onto
  // the confirmation, which has nothing tabbable of its own.
  onSubmitted?: () => void;
  // Rendered under the confirmation: "Fechar" in the modal, "Ver planos" on
  // /cadastro. Omitted, the confirmation simply stands alone.
  doneAction?: ReactNode;
};

// Matches the backend's `plan_hint` column width so an unexpectedly long
// selection can never turn a captured lead into a 422.
const PLAN_HINT_MAX = 255;

// Deliberately permissive: this is a "did they typo it" check, not an address
// validator. Anything stricter starts rejecting real addresses, and the backend
// validates properly anyway.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const errorStyle: CSSProperties = {
  fontSize: 12.5,
  lineHeight: 1.4,
  color: "var(--danger, #c0392b)",
  margin: "10px 0 0",
};

export function LaunchWaitlistForm({ planHint, onSubmitted, doneAction }: LaunchWaitlistFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName) {
      setError("Informe seu nome.");
      return;
    }
    if (!EMAIL_RE.test(trimmedEmail)) {
      setError("Informe um e-mail válido.");
      return;
    }

    setSubmitting(true);
    try {
      await submitLaunchWaitlist({
        name: trimmedName,
        email: trimmedEmail,
        plan_hint: planHint ? planHint.slice(0, PLAN_HINT_MAX) : null,
      });
      setSubmitted(true);
      onSubmitted?.();
    } catch {
      // Stay put on ANY failure (network or server) — unmounting here would drop
      // the lead silently. The visitor can just press the button again. The
      // backend is idempotent per e-mail, so a retry after a timeout that
      // actually succeeded is still exactly one lead.
      setError("Não foi possível registrar agora. Tente novamente em instantes.");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div role="status">
        <span style={{ fontSize: 34 }}>✅</span>
        <h2 className="h-card" style={{ marginTop: 12 }}>
          Prontinho!
        </h2>
        <p className="muted mt-s" style={{ fontSize: 14.5 }}>
          Avisaremos você por e-mail assim que for possível contratar.
        </p>
        {doneAction}
      </div>
    );
  }

  return (
    // noValidate: the inline messages below are the single source of validation
    // copy, in pt-BR — native bubbles would speak the browser's language and
    // say something different for the same two rules.
    <form onSubmit={handleSubmit} noValidate>
      <label className="field-l">
        <span>Nome</span>
        <input
          className="input"
          type="text"
          name="waitlist-name"
          autoComplete="name"
          placeholder="Dr. Aurélio Lima"
          value={name}
          onChange={(e) => setName(e.target.value)}
          // Deliberately NOT autoFocus: React applies that during the commit
          // phase, which runs BEFORE the modal's effect gets to record which
          // element opened the dialog — so the modal would memorise this input
          // as the "opener" and have nothing to hand focus back to on close.
          // LaunchWaitlistModal focuses this field itself, in the right order.
          required
        />
      </label>

      <label className="field-l mt-s">
        <span>E-mail</span>
        <input
          className="input"
          type="email"
          name="waitlist-email"
          autoComplete="email"
          placeholder="voce@clinica.com.br"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>

      <button type="submit" className="btn btn--primary btn--block mt-m" disabled={submitting}>
        {submitting ? "Enviando…" : "Avisem-me quando lançar"}
      </button>

      {error && (
        <p role="alert" style={errorStyle}>
          {error}
        </p>
      )}
    </form>
  );
}
