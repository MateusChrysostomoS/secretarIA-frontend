"use client";

// ContactStep — Step 1: name, clinic, email, the clinic's WhatsApp number, and a
// password. Submitting this card REGISTERS the account (the wizard calls registerSignup
// and saves the returned session) — so from here on the visitor is logged in and can log
// back in later regardless of whether they finish the wizard or pay. Also carries the
// honeypot field (visually hidden), matching the convention used by the anonymous-signup
// modal it replaced.

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { StepHeading, StepActions } from "./WizardShell";
import { passwordError } from "../lib/password";
import type { ContactFields } from "../lib/types";

const honeypotStyle = {
  position: "absolute" as const,
  left: -9999,
  width: 1,
  height: 1,
  opacity: 0,
};

type ContactStepProps = {
  value: ContactFields;
  onChange: (patch: Partial<ContactFields>) => void;
  planLabel: string;
  planTagline: string;
  // Triggers the wizard's registration call (registerSignup + saveSession). ContactStep
  // validates locally first, then delegates the network round-trip to the wizard.
  onSubmit: () => void;
  // Registration in flight (wizard-owned) — disables the submit button.
  submitting: boolean;
  // Registration error surfaced by the wizard (409 existing account, 422, network).
  serverError: string | null;
  // True when serverError means "you already have a Brain account" — show a login link.
  showLoginLink: boolean;
};

export function ContactStep({
  value,
  onChange,
  planLabel,
  planTagline,
  onSubmit,
  submitting,
  serverError,
  showLoginLink,
}: ContactStepProps) {
  // Local (pre-network) validation error, e.g. weak password / mismatch.
  const [localError, setLocalError] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Password policy check before hitting the network (the backend re-validates too).
    const pwError = passwordError(value.password, value.confirmPassword);
    if (pwError) {
      setLocalError(pwError);
      return;
    }
    setLocalError(null);
    onSubmit();
  }

  // The submit button only needs the required identity fields to be non-empty; the
  // password policy is checked on submit (so the visitor gets a specific message).
  const basicsFilled =
    value.name.trim() &&
    value.clinicName.trim() &&
    value.email.trim() &&
    value.whatsappPhone.trim() &&
    value.password &&
    value.confirmPassword;

  const error = localError ?? serverError;

  return (
    <form onSubmit={handleSubmit} noValidate>
      <span className="tag" style={{ marginBottom: 14 }}>
        {planLabel} · {planTagline}
      </span>
      <StepHeading
        title="Vamos criar sua conta."
        desc="Alguns dados de contato e uma senha para o acesso da sua clínica na Brain."
      />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <label className="field-l">
          <span>Seu nome</span>
          <input
            className="input"
            type="text"
            placeholder="Dr. Aurélio Lima"
            value={value.name}
            onChange={(e) => onChange({ name: e.target.value })}
            required
            autoFocus
          />
        </label>

        <label className="field-l">
          <span>Nome da clínica</span>
          <input
            className="input"
            type="text"
            placeholder="Consultório Dr. Aurélio Lima"
            value={value.clinicName}
            onChange={(e) => onChange({ clinicName: e.target.value })}
            required
          />
        </label>

        <label className="field-l">
          <span>E-mail</span>
          <input
            className="input"
            type="email"
            placeholder="voce@clinica.com.br"
            value={value.email}
            onChange={(e) => onChange({ email: e.target.value })}
            autoComplete="email"
            required
          />
        </label>

        <label className="field-l">
          <span>WhatsApp da clínica</span>
          <input
            className="input"
            type="tel"
            placeholder="(11) 91234-5678"
            value={value.whatsappPhone}
            onChange={(e) => onChange({ whatsappPhone: e.target.value })}
            required
          />
        </label>

        <label className="field-l">
          <span>Senha</span>
          <input
            className="input"
            type="password"
            placeholder="Pelo menos 8 caracteres, com letra e número"
            value={value.password}
            onChange={(e) => onChange({ password: e.target.value })}
            autoComplete="new-password"
            required
          />
        </label>

        <label className="field-l">
          <span>Confirmar senha</span>
          <input
            className="input"
            type="password"
            value={value.confirmPassword}
            onChange={(e) => onChange({ confirmPassword: e.target.value })}
            autoComplete="new-password"
            required
          />
        </label>

        {/* Honeypot — real visitors never see or fill this field. */}
        <input
          type="text"
          name="website"
          value={value.website}
          onChange={(e) => onChange({ website: e.target.value })}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={honeypotStyle}
        />
      </div>

      {error && (
        <p role="alert" style={{ fontSize: 12.5, color: "var(--danger, #c0392b)", marginTop: 14 }}>
          {error}
          {showLoginLink && (
            <>
              {" "}
              <Link href="/">Entrar</Link>
            </>
          )}
        </p>
      )}

      <StepActions
        nextType="submit"
        nextLabel={submitting ? "Criando conta…" : "Continuar"}
        nextDisabled={!basicsFilled || submitting}
      />
    </form>
  );
}
