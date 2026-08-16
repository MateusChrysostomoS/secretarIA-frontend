"use client";

// /esqueci_senha — Step 1 of the password-reset flow.
// Owns the e-mail input and calls /auth/password-reset/request.
// The backend always returns the same generic message regardless of
// whether the e-mail exists, so the UI mirrors that: a single success
// banner that doesn't leak account existence.
//
// Ported from brain-frontend's app/(SignOut)/esqueci_senha/page.tsx, pointed at
// this app's own lib/manage-api (brain-api's native reset endpoints) instead of
// lib/api (PreCheck) — see docs/CHECKPOINT_secretaria_frontend.md. No /login here:
// this app's only entry point is /, so "back" links there.

import Link from "next/link";
import { useState } from "react";

import { ManageApiError, requestPasswordReset } from "@/lib/manage-api";

import { AuthShell } from "../_shared/AuthShell";
import { StepIndicator } from "../_shared/StepIndicator";

export default function ForgotPasswordPage() {
  // --- State ---
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  // After a successful submit we lock the form to prevent rapid re-sends.
  const [sent, setSent] = useState(false);

  // --- Handlers ---
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Informe seu e-mail.");
      return;
    }
    setLoading(true);
    try {
      const res = await requestPasswordReset(trimmed);
      // The backend's own message — deliberately identical whether or not the
      // e-mail exists (anti-enumeration). Display it as-is, never reword it.
      setSuccess(res.detail);
      setSent(true);
    } catch (err) {
      // Status-based, not message-based: ManageApiError carries the real HTTP
      // status, which is more reliable than matching translated backend text.
      const status = err instanceof ManageApiError ? err.status : 0;
      setError(
        status === 429
          ? "Muitas tentativas. Tente novamente em alguns minutos."
          : "Erro ao processar. Tente novamente.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={
        <>
          Esqueceu a <em>senha</em>?
        </>
      }
      subtitle="Informe o e-mail da sua conta. Enviaremos um link para redefinir a senha."
      error={error}
      success={success}
      belowCard={
        <p className="login-help">
          Lembrou a senha? <Link href="/">Entrar</Link>
        </p>
      }
    >
      <StepIndicator current={1} total={3} />

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="clinica@email.com"
            required
            disabled={sent}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={loading || sent}
        >
          {loading ? "Enviando…" : sent ? "Link enviado" : "Enviar link de redefinição"}
        </button>

        {sent ? (
          <p className="field-hint" style={{ textAlign: "center" }}>
            Se você não receber o e-mail em alguns minutos, verifique a caixa
            de spam. Já tem o link?{" "}
            <Link href="/esqueci_senha/token" style={{ color: "inherit" }}>
              Inserir token manualmente
            </Link>
            .
          </p>
        ) : null}
      </form>
    </AuthShell>
  );
}
