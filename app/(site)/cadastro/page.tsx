"use client";

// /cadastro — self-service signup wizard (Feature 0), selling secretarIA only.
// Reached directly from the `/` entry screen as `?plan=...&catalog=...` —
// there is no separate marketing/pricing page or CTA component in this app.
// Static export has no dynamic route segments, so plan selection travels
// entirely via query params (the repo's existing `?id=` convention, e.g.
// /admin/tenants?id=). Wrapped in Suspense because useSearchParams requires
// it (same pattern as /checkout/sucesso).
//
// PRE-LAUNCH GATE (see app/(site)/_lib/launch.ts): a bookmark or stale link can
// reach this route directly, so the wizard checks the gate itself rather than
// relying on `/` to have blocked the click. Every plan sold here is
// secretarIA-bearing, so today that means the gate blocks every purchase until
// PRODUCT_LAUNCHED flips true — CadastroWizard never renders (no registration,
// no signup intent, no Stripe) and the waitlist capture shows instead.

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { BrandGlyph } from "../_components/BrandGlyph";
import { LaunchWaitlistForm } from "../_components/LaunchWaitlistForm";
import { isPurchaseGated } from "../_lib/launch";
import { CadastroWizard } from "./_components/CadastroWizard";
import { resolvePlan } from "./lib/plans";
import "../checkout/checkout.css";

export default function CadastroPage() {
  return (
    <Suspense fallback={<CadastroFallback />}>
      <CadastroInner />
    </Suspense>
  );
}

function CadastroInner() {
  const searchParams = useSearchParams();
  const plan = resolvePlan(searchParams);

  // Checked AFTER the plan is resolved — an unknown plan id falls through to
  // "Plano não encontrado" below (the honest answer once part of the catalog
  // is genuinely purchasable) rather than being caught by the gate. `planId` is
  // included alongside `catalogIds` because a `?catalog=` list may name
  // add-ons only, never contradicting the plan.
  if (plan && isPurchaseGated([plan.planId, ...plan.catalogIds])) {
    return (
      <>
        <BrandHeader />
        <main className="checkout-shell">
          <div className="card checkout-card">
            <h1 className="h-sec" style={{ fontSize: 22 }}>
              Estamos quase lá
            </h1>
            <p className="muted mt-s">
              Ainda estamos finalizando os últimos ajustes antes do lançamento. Deixe seu
              nome e e-mail e avisamos você assim que for possível contratar.
            </p>
            <div className="mt-m" style={{ textAlign: "left" }}>
              <LaunchWaitlistForm
                // The gated plan the link asked for — same sales hint the modal
                // sends from a card click.
                planHint={plan.catalogIds.join(",")}
                doneAction={
                  <Link href="/" className="btn btn--outline btn--block mt-m">
                    Voltar ao início
                  </Link>
                }
              />
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!plan) {
    return (
      <>
        <BrandHeader />
        <main className="checkout-shell">
          <div className="card checkout-card">
            <span className="checkout-icon" aria-hidden="true">
              ⚠️
            </span>
            <h1 className="h-sec" style={{ fontSize: 22 }}>
              Plano não encontrado
            </h1>
            <p className="muted mt-s">
              O link usado para chegar aqui não trouxe um plano válido. Volte para o início e
              tente novamente.
            </p>
            <div className="checkout-actions">
              <Link href="/" className="btn btn--primary">
                Voltar ao início
              </Link>
            </div>
          </div>
        </main>
      </>
    );
  }

  return <CadastroWizard plan={plan} />;
}

function BrandHeader() {
  return (
    <header className="container" style={{ padding: "24px 0" }}>
      <Link href="/" className="brand-mark" aria-label="Brain — início">
        <BrandGlyph size={32} />
        <span className="wordmark">Brain</span>
      </Link>
    </header>
  );
}

function CadastroFallback() {
  return (
    <>
      <BrandHeader />
      <main className="checkout-shell">
        <div className="card checkout-card">
          <div className="checkout-spinner" aria-hidden="true" />
          <p style={{ fontSize: 14.5, fontWeight: 600 }}>Carregando…</p>
        </div>
      </main>
    </>
  );
}
