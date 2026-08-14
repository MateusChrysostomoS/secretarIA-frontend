"use client";

// /checkout/sucesso — Stripe Checkout return URL for the self-service cold
// signup flow (the "Contratar secretarIA" CTA points Stripe here on success).
// Reads `session_id` from the query string and polls GET /public/onboarding-status
// every 2s until the async webhook activates the tenant's entitlement — the
// webhook can lag behind the redirect, so this NEVER assumes "ready" on the
// first load. The visitor is normally ALREADY logged in (registration saved a
// session at the first card, which survives the Stripe round-trip in the same
// tab), so once ready this just routes into the portal; the one-time
// onboarding-token exchange is only a FALLBACK for finishing checkout in a
// different browser/tab that never got that session. Wrapped in Suspense
// because useSearchParams requires it (same pattern as /cadastro).

import { Suspense, useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandGlyph } from "../../_components/BrandGlyph";
import {
  exchangeOnboardingToken,
  getOnboardingStatus,
  getSession,
  ManageApiError,
  saveSession,
} from "@/lib/manage-api";
import "../checkout.css";

const POLL_INTERVAL_MS = 2000;
const MAX_POLL_MS = 120_000; // ~2 minutes, then show the "taking longer" state

// What's currently shown to the visitor. Only "polling" keeps the interval
// alive — every other state is terminal for this page load.
type ViewState =
  | "missing-session"
  | "polling"
  | "failed"
  | "timeout"
  | "ready-secretaria"
  | "ready-already-claimed";

export default function CheckoutSucessoPage() {
  return (
    <Suspense
      fallback={
        <CheckoutShell>
          <Spinner label="Carregando…" />
        </CheckoutShell>
      }
    >
      <CheckoutSucessoInner />
    </Suspense>
  );
}

function CheckoutSucessoInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const [view, setView] = useState<ViewState>(
    sessionId ? "polling" : "missing-session",
  );
  // Only meaningful in the "ready-secretaria" view: the status poll succeeded
  // but exchanging the onboarding token (or saving the session) failed.
  const [exchangeFailed, setExchangeFailed] = useState(false);

  useEffect(() => {
    if (!sessionId) return;
    // Narrowed to a plain `string` for the closures below — TS does not carry
    // the `if (!sessionId) return` narrowing into nested function scopes.
    const sid: string = sessionId;

    let cancelled = false;
    let busy = false; // guards against overlapping ticks if a fetch is slow
    const startedAt = Date.now();

    function stop() {
      cancelled = true;
      clearInterval(intervalId);
    }

    async function tick() {
      if (cancelled || busy) return;
      busy = true;
      try {
        const status = await getOnboardingStatus(sid);
        if (cancelled) return;

        if (status.status === "failed") {
          stop();
          setView("failed");
          return;
        }

        if (status.status === "ready") {
          stop();
          setView("ready-secretaria");
          // Fast path: registration already saved a session in this browser — just
          // route into the portal (the entitlement is now active).
          if (getSession()) {
            router.replace("/configuracao");
          } else if (status.onboarding_token) {
            // Fallback (different browser/tab): trade the LATEST one-time token for a
            // session. Never reuse a token from an earlier poll.
            try {
              const session = await exchangeOnboardingToken(
                status.onboarding_token,
              );
              saveSession(session);
              router.replace("/configuracao");
            } catch {
              setExchangeFailed(true);
            }
          } else {
            // Token already spent in an earlier poll/tab and no local session — the
            // tenant exists, but there's nothing left here to trade for a session.
            setView("ready-already-claimed");
          }
          return;
        }

        // Still pending — bail out once the ~2 min ceiling is hit.
        if (Date.now() - startedAt >= MAX_POLL_MS) {
          stop();
          setView("timeout");
        }
      } catch (e) {
        if (e instanceof ManageApiError && e.status === 404) {
          // The backend doesn't know this session_id at all (not a cold-signup
          // checkout, or a bogus link) — terminal, don't spin until timeout.
          stop();
          setView("failed");
          return;
        }
        // Transient network hiccup — retried on the next tick.
      } finally {
        busy = false;
      }
    }

    const intervalId = setInterval(tick, POLL_INTERVAL_MS);
    tick(); // check immediately instead of waiting the first interval

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [sessionId, router]);

  return <CheckoutShell>{renderView(view, exchangeFailed)}</CheckoutShell>;
}

// renderView — pure mapping from state to markup, kept separate from the
// polling effect above so that logic reads top-to-bottom on its own.
function renderView(view: ViewState, exchangeFailed: boolean): ReactNode {
  switch (view) {
    case "missing-session":
      return (
        <>
          <span className="checkout-icon" aria-hidden="true">
            ⚠️
          </span>
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Não encontramos seu pagamento
          </h1>
          <p className="muted mt-s">
            O link de retorno não trouxe os dados do checkout. Se você acabou
            de pagar, use o link enviado pelo Stripe para voltar a esta
            página.
          </p>
          <div className="checkout-actions">
            <Link href="/" className="btn btn--outline">
              Ir para o início
            </Link>
          </div>
        </>
      );

    case "polling":
      return (
        <>
          <Spinner label="Pagamento confirmado? Estamos preparando sua conta…" />
          <p className="muted mt-s" style={{ fontSize: 13 }}>
            Isso normalmente leva alguns segundos.
          </p>
        </>
      );

    case "failed":
      return (
        <>
          <span className="checkout-icon" aria-hidden="true">
            ✕
          </span>
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Não foi possível confirmar o pagamento
          </h1>
          <p className="muted mt-s">
            Algo deu errado ao ativar sua conta. Fale com a nossa equipe
            informando o e-mail usado na compra — vamos resolver rapidamente.
          </p>
          <p className="muted mt-s" style={{ fontSize: 13 }}>
            Fale com o suporte da Brain.
          </p>
        </>
      );

    case "timeout":
      return (
        <>
          <span className="checkout-icon" aria-hidden="true">
            ⏳
          </span>
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Está demorando mais que o normal
          </h1>
          <p className="muted mt-s">
            Seu pagamento pode já ter sido aprovado — a confirmação está
            demorando mais que o esperado. Recarregue esta página em alguns
            minutos ou fale com o nosso suporte informando o e-mail usado na
            compra.
          </p>
          <p className="muted mt-s" style={{ fontSize: 13 }}>
            Fale com o suporte da Brain.
          </p>
        </>
      );

    case "ready-secretaria":
      return exchangeFailed ? (
        <>
          <span className="checkout-icon" aria-hidden="true">
            ✅
          </span>
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Pagamento confirmado!
          </h1>
          <p className="muted mt-s">
            Sua conta foi criada, mas não conseguimos abrir o painel
            automaticamente. Entre com o e-mail usado na compra.
          </p>
          <div className="checkout-actions">
            <Link href="/" className="btn btn--primary">
              Entrar
            </Link>
          </div>
        </>
      ) : (
        <Spinner label="Pagamento confirmado! Abrindo o seu painel…" />
      );

    case "ready-already-claimed":
      return (
        <>
          <span className="checkout-icon" aria-hidden="true">
            ✅
          </span>
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Sua conta já está pronta
          </h1>
          <p className="muted mt-s">
            Entre com o e-mail usado na compra para acessar o painel.
          </p>
          <div className="checkout-actions">
            <Link href="/" className="btn btn--primary">
              Entrar
            </Link>
          </div>
        </>
      );
  }
}

// CheckoutShell — minimal brand header + centered card, shared look for every
// state on this page (and reused by /checkout/cancelado).
function CheckoutShell({ children }: { children: ReactNode }) {
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

// Spinner — small inline "working on it" indicator, used by every pending state.
function Spinner({ label }: { label: string }) {
  return (
    <div aria-live="polite">
      <div className="checkout-spinner" aria-hidden="true" />
      <p style={{ fontSize: 14.5, fontWeight: 600 }}>{label}</p>
    </div>
  );
}
