"use client";

// /convite — team-invite accept page (Feature D). Reads `?token=` (the link
// emailed by POST /doctor/professionals/invites OR POST /doctor/secretaries/invites,
// or copied from the inviter's modal), exchanges it via POST
// /auth/exchange-invite-token, then collects a password (POST /auth/set-password)
// before persisting the session and routing into the portal. Brain-branded shell
// (checkout.css), not the ported-PreCheck AuthShell — this is a Brain onboarding step.
//
// Role-agnostic by construction, and deliberately so: the exchange resolves the
// user by token hash and mints THAT user's normal session, so the same screen
// onboards an invited doctor and an invited secretary. Every string here talks
// about "sua clínica" and "o painel", never a profession — keep it that way.
// Wrapped in Suspense because useSearchParams requires it.

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandGlyph } from "../_components/BrandGlyph";
import { SetPasswordForm } from "./_components/SetPasswordForm";
import {
  exchangeInviteToken,
  ManageApiError,
  saveSession,
  setPassword,
  type Session,
} from "@/lib/manage-api";
import "../checkout/checkout.css";

type ViewState = "missing-token" | "exchanging" | "invalid" | "set-password";

export default function ConvitePage() {
  return (
    <Suspense fallback={<ConviteShell><Spinner label="Carregando…" /></ConviteShell>}>
      <ConviteInner />
    </Suspense>
  );
}

function ConviteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [view, setView] = useState<ViewState>(token ? "exchanging" : "missing-token");
  const [session, setSession] = useState<Session | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    exchangeInviteToken(token)
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setView("set-password");
      })
      .catch(() => {
        if (!cancelled) setView("invalid");
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSetPassword(password: string) {
    if (!session) return;
    setSaveError(null);
    setSaving(true);
    try {
      await setPassword(session, password);
      // Only persist the session once the password is actually set — a
      // half-finished invite (token burned, no password) should never leave
      // a usable session behind.
      saveSession(session);
      router.replace("/configuracao");
    } catch (e) {
      const status = e instanceof ManageApiError ? e.status : 0;
      setSaveError(
        status === 401
          ? "Sua sessão de convite expirou. Peça um novo link para quem te convidou."
          : "Não foi possível salvar a senha agora. Tente novamente.",
      );
      setSaving(false);
    }
  }

  return (
    <ConviteShell>
      {view === "missing-token" && (
        <>
          <span className="checkout-icon" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Link de convite incompleto
          </h1>
          <p className="muted mt-s">
            Esse link não trouxe um convite válido. Copie o link completo enviado por e-mail, ou
            peça um novo à sua clínica.
          </p>
          <div className="checkout-actions">
            <Link href="/" className="btn btn--outline">
              Ir para o login
            </Link>
          </div>
        </>
      )}

      {view === "exchanging" && <Spinner label="Validando seu convite…" />}

      {view === "invalid" && (
        <>
          <span className="checkout-icon" aria-hidden="true">
            ✕
          </span>
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Convite inválido ou expirado
          </h1>
          <p className="muted mt-s">
            Esse convite já foi usado ou não é mais válido. Peça à sua clínica para gerar um novo
            link de convite.
          </p>
          <div className="checkout-actions">
            <Link href="/" className="btn btn--primary">
              Ir para o login
            </Link>
          </div>
        </>
      )}

      {view === "set-password" && (
        <>
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Crie sua senha
          </h1>
          <p className="muted mt-s">
            Convite confirmado! Escolha uma senha para acessar o painel da clínica.
          </p>
          <div className="mt-l">
            <SetPasswordForm onSubmit={handleSetPassword} submitting={saving} error={saveError} />
          </div>
        </>
      )}
    </ConviteShell>
  );
}

// ConviteShell — minimal Brain header + centered card, shared across every
// view state (mirrors /checkout/sucesso's CheckoutShell).
function ConviteShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="container" style={{ padding: "24px 0" }}>
        <Link href="/" className="brand-mark" aria-label="Brain — início">
          <BrandGlyph size={32} />
          <span className="wordmark">Brain</span>
        </Link>
      </header>
      <main className="checkout-shell">
        <div className="card checkout-card">{children}</div>
      </main>
    </>
  );
}

function Spinner({ label }: { label: string }) {
  return (
    <div aria-live="polite">
      <div className="checkout-spinner" aria-hidden="true" />
      <p style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</p>
    </div>
  );
}
