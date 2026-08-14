"use client";

// "/" — the only public route in this app, and its single front door.
//
// It does exactly two things, deliberately: sign an existing clinic in, and send
// a new one to the signup wizard. There is no marketing content here — the
// product's marketing lives on the Brain site, on its own domain.
//
// This is a NEW composition, not a port. In brain-frontend the two paths are
// separate routes (/login, reached from a marketing home; /cadastro, reached
// from a pricing card via PlanCheckoutCta). Neither of those entry points exists
// on this domain, so both paths surface here: the login form owns the card, and
// the signup CTA sits below it in AuthShell's `belowCard` slot behind a divider —
// the same slot /login already used for its secondary link.
//
// Authentication itself is unchanged: POST /auth/token against brain-api via
// lib/manage-api.login(), which is the identity authority for every Brain
// domain. The same credentials work in the Brain portal.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { login } from "@/lib/manage-api";
import { SIGNUP_HREF, resolvePostLogin } from "@/lib/portal-routes";

import { AuthShell } from "./_shared/AuthShell";
import { PasswordField } from "./_shared/PasswordField";

export default function EntryPage() {
  const router = useRouter();

  // --- State ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // --- Handlers ---
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Preencha e-mail e senha.");
      return;
    }
    setLoading(true);
    try {
      // login() authenticates against brain-api and persists the session.
      const session = await login(email.trim(), password);
      const decision = resolvePostLogin(session.role);
      if (decision.kind === "denied") {
        // A valid session this app has no screen for (a platform admin, or a
        // role the frontend doesn't know). Say so in the card's own error
        // banner rather than navigating — every route here would bounce them
        // straight back to this page. resolvePostLogin owns the copy so the
        // message stays identical to the one usePortalGuard shows.
        setError(decision.message);
        setLoading(false);
        return;
      }
      router.push(decision.to);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(
        msg === "Credenciais inválidas"
          ? "E-mail ou senha incorretos."
          : "Erro ao conectar. Tente novamente.",
      );
      setLoading(false);
    }
  }

  return (
    <AuthShell
      title={
        <>
          A <em>secretarIA</em> da sua clínica.
        </>
      }
      subtitle="Entre para ver a agenda e configurar o atendimento no WhatsApp."
      error={error}
      belowCard={
        <>
          <div className="login-divider">ou</div>
          <p className="login-help">Sua clínica ainda não usa a secretarIA?</p>
          {/* The wizard resolves the plan from the query string; SIGNUP_HREF
              carries the one plan this domain sells. It is a plain link, not a
              gated button: /cadastro applies the launch gate itself (see
              app/(site)/_lib/launch.ts), so the rule lives in exactly one place. */}
          <Link
            href={SIGNUP_HREF}
            className="btn btn-secondary login-submit"
            style={{ marginTop: 12 }}
          >
            Contratar secretarIA
          </Link>
        </>
      }
    >
      <form className="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            autoComplete="username"
            placeholder="clinica@email.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <PasswordField
          id="senha"
          label="Senha"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          required
        />

        <button
          type="submit"
          className="btn btn-primary login-submit"
          disabled={loading}
        >
          {loading ? (
            "Entrando…"
          ) : (
            <>
              Entrar
              <ArrowRightIcon />
            </>
          )}
        </button>
      </form>
    </AuthShell>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
