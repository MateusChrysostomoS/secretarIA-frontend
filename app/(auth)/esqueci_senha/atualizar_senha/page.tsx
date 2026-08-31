"use client";

// /esqueci_senha/atualizar_senha — Step 3 of the password-reset flow.
// Receives the validated token via ?token=... and POSTs the new
// password to /auth/password-reset/confirm. On success, redirects
// to /?reset=success so the entry screen shows a confirmation
// banner. No auto-login by design (brain-api doesn't return a session here).
//
// Ported from brain-frontend's app/(SignOut)/esqueci_senha/atualizar_senha/page.tsx,
// pointed at this app's own lib/manage-api instead of lib/api (PreCheck), redirecting
// to / instead of /login (this app has no /login route), and validating the new
// password against the real backend rule (8-72 chars, letter + digit — see
// lib/password-policy.ts) instead of brain-frontend's looser length-only check.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ManageApiError, confirmPasswordReset } from "@/lib/manage-api";
import {
  MAX_PASSWORD_LENGTH,
  MIN_PASSWORD_LENGTH,
  passwordPolicyError,
} from "@/lib/password-policy";
import { stripQueryParamFromUrl } from "@/lib/url-token";

import { AuthShell } from "../../_shared/AuthShell";
import { PasswordField } from "../../_shared/PasswordField";
import { StepIndicator } from "../../_shared/StepIndicator";

export default function UpdatePasswordPage() {
  return (
    <Suspense fallback={<UpdatePasswordFallback />}>
      <UpdatePasswordInner />
    </Suspense>
  );
}

function UpdatePasswordInner() {
  const router = useRouter();
  const search = useSearchParams();

  // --- State ---
  const [password, setPassword] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Derived ---
  // Captured ONCE, on the first client render: the effect below wipes ?token=
  // out of the address bar, and reading it reactively afterwards would see an
  // empty value and bounce a user who is mid-way through typing a password.
  //
  // This screen is where the token used to be exposed longest — it stayed in
  // the bar, and in the session history, for however long choosing a password
  // takes. The cost of cleaning it is that RELOADING this URL no longer
  // carries a token, so it bounces to step 2 (below) instead of staying put.
  // That is the same path a missing token already took, and the e-mail link is
  // unaffected: it points at step 2, which re-verifies and forwards here.
  const [token] = useState(() => search.get("token") ?? "");

  // --- Effects ---
  // If we landed here without a token, bounce back to step 2 so the user
  // can paste one. This avoids a confusing "invalid token" error on submit.
  useEffect(() => {
    if (!token) {
      router.replace("/esqueci_senha/token");
      return;
    }
    stripQueryParamFromUrl();
  }, [token, router]);

  // --- Handlers ---
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const policyError = passwordPolicyError(password);
    if (policyError) {
      setError(policyError);
      return;
    }
    if (password !== confirmPwd) {
      setError("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      router.push("/?reset=success");
    } catch (err) {
      const status = err instanceof ManageApiError ? err.status : 0;
      setError(
        status === 429
          ? "Muitas tentativas. Aguarde um minuto e tente novamente."
          : status === 400
            ? "Token inválido ou expirado. Solicite um novo link."
            : status === 422
              ? "Senha inválida. Verifique os requisitos abaixo."
              : "Não foi possível redefinir a senha. Tente novamente.",
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={
        <>
          Crie uma <em>nova senha</em>.
        </>
      }
      subtitle="Escolha uma senha forte. Você usará ela para acessar o painel da clínica."
      error={error}
      belowCard={
        <p className="login-help">
          Mudou de ideia? <Link href="/">Entrar</Link>
        </p>
      }
    >
      <StepIndicator current={3} total={3} />

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <PasswordField
          id="new-password"
          label="Nova senha"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          required
          hint={`Entre ${MIN_PASSWORD_LENGTH} e ${MAX_PASSWORD_LENGTH} caracteres, com letra e número.`}
        />

        <PasswordField
          id="confirm-password"
          label="Confirmar nova senha"
          value={confirmPwd}
          onChange={setConfirmPwd}
          autoComplete="new-password"
          required
        />

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={loading || !password || !confirmPwd}
        >
          {loading ? "Salvando…" : "Redefinir senha"}
        </button>
      </form>
    </AuthShell>
  );
}

function UpdatePasswordFallback() {
  return (
    <AuthShell
      title={
        <>
          Crie uma <em>nova senha</em>.
        </>
      }
      subtitle="Carregando…"
    >
      <div style={{ height: 120 }} aria-hidden="true" />
    </AuthShell>
  );
}
