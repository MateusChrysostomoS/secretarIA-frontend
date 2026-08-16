"use client";

// /esqueci_senha/token — Step 2 of the password-reset flow.
// The e-mail link lands here with ?token=... ; we pre-validate via
// /auth/password-reset/verify so a broken or expired token is caught
// before the user picks a new password.
// The user can also paste a token manually if the link didn't autofill.
//
// Ported from brain-frontend's app/(SignOut)/esqueci_senha/token/page.tsx,
// pointed at this app's own lib/manage-api instead of lib/api (PreCheck).

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ManageApiError, verifyResetToken } from "@/lib/manage-api";

import { AuthShell } from "../../_shared/AuthShell";
import { StepIndicator } from "../../_shared/StepIndicator";

// Suspense boundary required by Next.js 15 for hooks that read URL state
// (this app is a static export — no SSR to fall back on).
export default function ResetTokenPage() {
  return (
    <Suspense fallback={<TokenPageFallback />}>
      <ResetTokenInner />
    </Suspense>
  );
}

function ResetTokenInner() {
  const router = useRouter();
  const search = useSearchParams();

  // --- State ---
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Derived ---
  const queryToken = search.get("token");

  // --- Effects ---
  // Auto-verify when the URL carries a token (deep link from the e-mail).
  useEffect(() => {
    if (!queryToken) return;
    setToken(queryToken);
    let cancelled = false;
    setLoading(true);
    verifyResetToken(queryToken)
      .then(() => {
        if (cancelled) return;
        setSuccess("Token confirmado. Redirecionando…");
        router.replace(
          `/esqueci_senha/atualizar_senha?token=${encodeURIComponent(queryToken)}`,
        );
      })
      .catch((err) => {
        if (cancelled) return;
        const status = err instanceof ManageApiError ? err.status : 0;
        setError(
          status === 429
            ? "Muitas tentativas. Aguarde um minuto e tente novamente."
            : "Token inválido ou expirado. Solicite um novo link.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [queryToken, router]);

  // --- Handlers ---
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    const trimmed = token.trim();
    if (!trimmed) {
      setError("Informe o token que você recebeu por e-mail.");
      return;
    }
    setLoading(true);
    try {
      await verifyResetToken(trimmed);
      router.push(
        `/esqueci_senha/atualizar_senha?token=${encodeURIComponent(trimmed)}`,
      );
    } catch (err) {
      const status = err instanceof ManageApiError ? err.status : 0;
      setError(
        status === 429
          ? "Muitas tentativas. Aguarde um minuto e tente novamente."
          : "Token inválido ou expirado.",
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={
        <>
          Confirme o <em>token</em>.
        </>
      }
      subtitle="Cole o código recebido no e-mail. Se o link já preencheu o campo, é só esperar."
      error={error}
      success={success}
      belowCard={
        <p className="login-help">
          Não recebeu o e-mail?{" "}
          <Link href="/esqueci_senha">Solicitar novo link</Link>
        </p>
      }
    >
      <StepIndicator current={2} total={3} />

      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="token">Token</label>
          <input
            id="token"
            type="text"
            autoComplete="one-time-code"
            placeholder="Cole o token aqui"
            required
            value={token}
            onChange={(e) => setToken(e.target.value)}
            spellCheck={false}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={loading || !token.trim()}
        >
          {loading ? "Validando…" : "Validar e continuar"}
        </button>
      </form>
    </AuthShell>
  );
}

function TokenPageFallback() {
  return (
    <AuthShell
      title={
        <>
          Confirme o <em>token</em>.
        </>
      }
      subtitle="Carregando…"
    >
      <div style={{ height: 80 }} aria-hidden="true" />
    </AuthShell>
  );
}
