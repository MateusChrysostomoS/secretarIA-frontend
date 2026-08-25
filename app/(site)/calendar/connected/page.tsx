"use client";

// /calendar/connected — Google Calendar OAuth return page (Feature G). This is
// the frontend target secretaria's PORTAL_POST_OAUTH_REDIRECT setting should
// point at (both the tenant-level and per-professional Calendar connect flows
// redirect here after the Google consent round-trip). Reads `?status=` (and an
// optional `?reason=` for the error case) and shows the result + a button back
// to PORTAL_HOME. Wrapped in Suspense because useSearchParams requires it
// (same pattern as /checkout/sucesso).
//
// brain-frontend has its own copy of this same route, left over from before
// the 2026-08-14 domain split — PORTAL_POST_OAUTH_REDIRECT must point here
// instead (see docs/CHECKPOINT_secretaria_frontend.md).
//
// Not gated by usePortalGuard: the Calendar connect button only exists on an
// already-authenticated screen (/configuracao), but this landing page reads
// nothing from the session itself, so it stays unguarded and presentational —
// same pattern as /checkout/sucesso, /checkout/cancelado, /convite. If the
// session did not survive the round-trip, PORTAL_HOME's own guard sends the
// user to login when they click through.

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { BrandGlyph } from "../../_components/BrandGlyph";
import { PORTAL_HOME } from "@/lib/portal-routes";
import "../../checkout/checkout.css";

export default function CalendarConnectedPage() {
  return (
    <Suspense fallback={<CalendarConnectedShell><Placeholder /></CalendarConnectedShell>}>
      <CalendarConnectedInner />
    </Suspense>
  );
}

function CalendarConnectedInner() {
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const reason = searchParams.get("reason");
  const success = status === "success";

  return (
    <CalendarConnectedShell>
      <span className="checkout-icon" aria-hidden="true">
        {success ? "✅" : "⚠️"}
      </span>
      <h1 className="h-sec" style={{ fontSize: 22 }}>
        {success ? "Google Calendar conectado!" : "Não foi possível conectar"}
      </h1>
      <p className="muted mt-s">
        {success
          ? "A partir de agora a secretarIA sincroniza automaticamente com essa agenda do Google."
          : reason
            ? `Algo deu errado ao conectar o Google Calendar: ${reason}. Tente novamente.`
            : "Algo deu errado ao conectar o Google Calendar. Tente novamente pelas Configurações secretarIA."}
      </p>
      <div className="checkout-actions">
        <Link href={PORTAL_HOME} className="btn btn--primary">
          Voltar para o início da secretarIA
        </Link>
      </div>
    </CalendarConnectedShell>
  );
}

function CalendarConnectedShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="container" style={{ padding: "24px 0" }}>
        {/* PORTAL_HOME, not "/": this page is only ever reached from an
            already-authenticated screen (/configuracao), and on this domain
            "/" is the login form — see PortalHeader's identical note. */}
        <Link href={PORTAL_HOME} className="brand-mark" aria-label="Brain — início">
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

function Placeholder() {
  return (
    <div aria-live="polite">
      <div className="checkout-spinner" aria-hidden="true" />
      <p style={{ fontSize: 14.5, fontWeight: 600 }}>Carregando…</p>
    </div>
  );
}
