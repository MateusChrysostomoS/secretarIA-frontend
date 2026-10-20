"use client";

// /entrar — the login screen of this app (LOGIN_ROUTE in lib/portal-routes.ts).
//
// Lived at "/" until 2026-10-19, when "/" became the product's public landing
// page (app/(marketing)/page.tsx). The screen itself moved unchanged: same form,
// same session check on mount, same ?reset=success banner. What it signs into
// is the older hub (/inicio, /agenda, /configuracao); the clinic platform the
// landing's "Entrar" opens is the Brain-Message console, on its own domain —
// see lib/platform-links.ts.
//
// The slot below the card used to send a new clinic to the signup wizard
// ("Contratar secretarIA" → /cadastro). It now sends them to the landing
// instead: /cadastro sells the WhatsApp plan whose billing is on hold, and the
// landing is where a new clinic talks to the team. SIGNUP_HREF itself is kept
// (checkout/cancelado still uses it).
//
// Authentication itself is unchanged: POST /auth/token against brain-api via
// lib/manage-api.login(), which is the identity authority for every Brain
// domain. The same credentials work in the Brain portal.
//
// "Esqueci minha senha" was deliberately OMITTED at the initial split (2026-08-14):
// brain-api had no reset endpoints yet, and brain-frontend's own link pointed at
// the wrong backend anyway (PreCheck's API — see docs/CHECKPOINT_secretaria_frontend.md).
// Now that brain-api exposes its own /auth/password-reset/*, the link is back,
// pointing at the /esqueci_senha flow ported into this app. It rides in a bare
// `.login-row` (no checkbox here — "Lembrar de mim" was dropped, see the doc
// above) so it reads as a small tertiary affordance and never competes with
// "Entrar" or "Contratar secretarIA" for attention.
//
// Reads ?reset=success (set by /esqueci_senha/atualizar_senha's redirect back
// here) to show a confirmation banner — which means this component now reads
// URL state, so it needs the Suspense boundary static export requires.
//
// It also answers a third question before either of those: is someone already
// signed in? See the mount effect below — until 2026-08-31 it did not, and a
// signed-in user who opened the login got the form as if they were a stranger.

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { ensureSession, getSession, login } from "@/lib/manage-api";
import { resolveEntryRedirect, resolvePostLogin } from "@/lib/portal-routes";

import { AuthShell } from "../_shared/AuthShell";
import { PasswordField } from "../_shared/PasswordField";

export default function EntryPage() {
  return (
    <Suspense fallback={<EntryFallback />}>
      <EntryInner />
    </Suspense>
  );
}

function EntryInner() {
  const router = useRouter();
  const search = useSearchParams();

  // --- State ---
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // False until the mount effect below has looked for an existing session. While
  // false this screen renders the Suspense fallback rather than the form.
  const [entryChecked, setEntryChecked] = useState(false);

  // --- Derived ---
  // Shown when /esqueci_senha/atualizar_senha redirects here after a finished reset.
  const justReset = search.get("reset") === "success";
  const success = justReset
    ? "Senha redefinida com sucesso. Entre com a nova senha."
    : "";

  // --- Effects ---
  // A session that already exists when this screen mounts belongs in the app, not
  // in front of a login form. resolvePostLogin used to run ONLY inside
  // handleSubmit below, which meant it fired for a login performed in THIS page
  // load and never for a session that was already there: a bookmarked login, the
  // back button after signing in, or any link still pointing at the root all
  // showed the form as if nobody were signed in. resolveEntryRedirect owns the
  // rule — including the `denied` case, which stays on this screen on purpose —
  // so it is testable without a DOM. See lib/portal-routes.ts.
  //
  // The fallback stays up while redirecting instead of flashing the form: with
  // `output: "export"` the prerendered index.html for this route IS
  // <EntryFallback />, because useSearchParams above forces the Suspense
  // bail-out. So holding it one extra tick shows a visitor nothing they were not
  // already looking at, and spares a signed-in user a login screen they are about
  // to lose. (If this route ever stops reading URL state, re-check that: the
  // prerendered HTML would then be the form, and the gate would cost a flash
  // instead of saving one.)
  //
  // Mount-only, and replace() rather than push(): the question is "who is signed
  // in right now", and the form must not sit in history behind the app, where
  // "back" would land on a form that immediately bounces forward again.
  useEffect(() => {
    // Async since the session moved to an HttpOnly cookie: on a fresh load there
    // is nothing in memory yet, and answering synchronously would show the login
    // form to someone who is already signed in — precisely the ARQ-5 regression
    // this effect exists to prevent.
    let cancelled = false;
    void (async () => {
      const to = resolveEntryRedirect(getSession() ?? (await ensureSession()));
      if (cancelled) return;
      if (to) {
        router.replace(to);
        return;
      }
      setEntryChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

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

  // Still deciding whether this visitor is already signed in — or already
  // redirecting one. Same fallback the Suspense boundary renders, so the swap is
  // invisible either way.
  if (!entryChecked) return <EntryFallback />;

  return (
    <AuthShell
      title={
        <>
          A <em>secretarIA</em> da sua clínica.
        </>
      }
      subtitle="Entre para ver a agenda e configurar o atendimento no WhatsApp."
      error={error}
      success={success}
      belowCard={
        <>
          <div className="login-divider">ou</div>
          <p className="login-help">Sua clínica ainda não usa a secretarIA?</p>
          {/* The landing, not /cadastro: see the file header. "/" is the
              product's public page, where a new clinic talks to the team.

              prefetch={false}, here and on "Esqueci minha senha" below, for the
              same reason: this whole screen is above the fold, so <Link> would
              fetch both routes' RSC payloads the moment it paints — on a login
              page where the overwhelmingly likely next action is submitting the
              form. */}
          <Link
            href="/"
            className="btn btn-secondary login-submit"
            style={{ marginTop: 12 }}
            prefetch={false}
          >
            Conhecer a secretarIA
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

        {/* Tertiary affordance — not a full `.login-row` pair (no "Lembrar de
            mim" checkbox here, see the file header), just the link right-aligned
            so it stays subordinate to "Entrar" below. */}
        <div className="login-row" style={{ justifyContent: "flex-end" }}>
          <Link href="/esqueci_senha" prefetch={false}>
            Esqueci minha senha
          </Link>
        </div>

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

function EntryFallback() {
  return (
    <AuthShell
      title={
        <>
          A <em>secretarIA</em> da sua clínica.
        </>
      }
      subtitle="Carregando…"
    >
      <div style={{ height: 200 }} aria-hidden="true" />
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
