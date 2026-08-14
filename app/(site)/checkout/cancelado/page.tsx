// /checkout/cancelado — Stripe Checkout "cancel_url" landing page for the
// self-service cold signup flow. The visitor backed out before paying, so
// this is intentionally minimal: nothing was charged, no state to reconcile.
// Pure server component — no client JS needed.

import Link from "next/link";
import { BrandGlyph } from "../../_components/BrandGlyph";
import "../checkout.css";

export default function CheckoutCanceladoPage() {
  return (
    <>
      <header className="container" style={{ padding: "24px 0" }}>
        <Link href="/" className="brand-mark" aria-label="Brain — início">
          <BrandGlyph size={32} />
          <span className="wordmark">Brain</span>
        </Link>
      </header>
      <main className="checkout-shell">
        <div className="card checkout-card">
          <h1 className="h-sec" style={{ fontSize: 22 }}>
            Pagamento cancelado
          </h1>
          <p className="muted mt-s">
            Nenhuma cobrança foi feita. Você pode tentar novamente quando
            quiser.
          </p>
          <div className="checkout-actions">
            <Link href="/" className="btn btn--primary">
              Contratar novamente
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
