"use client";

// RestartButton — "Reiniciar período de teste" (Task 2). Owns its own submit/
// error state, mirroring ../../onboarding/_components/ActivateButton. POSTs
// /doctor/onboarding/test-window/restart; on a 409 `checkout_required` the
// tenant's subscription needs a fresh Stripe Checkout before a restart is
// possible, so that case gets its own message instead of the generic error line.
// The message names the Brain portal's Assinatura screen rather than linking to
// it: billing is deliberately not part of this app. Never assumes success
// client-side — onRestarted only fires after a real 200 from the backend.

import { useState } from "react";
import {
  restartTestWindow,
  ManageApiError,
  type RestartTestWindowResult,
  type Session,
} from "@/lib/manage-api";

type RestartButtonProps = {
  session: Session;
  onRestarted: (result: RestartTestWindowResult) => void;
};

export function RestartButton({ session, onRestarted }: RestartButtonProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutRequired, setCheckoutRequired] = useState(false);

  async function handleClick() {
    setError(null);
    setCheckoutRequired(false);
    setSubmitting(true);
    try {
      const result = await restartTestWindow(session);
      onRestarted(result);
      // Leave `submitting` true — the parent is about to re-render this state
      // away (the window is no longer expired) once it refetches.
    } catch (e) {
      const status = e instanceof ManageApiError ? e.status : 0;
      const detail = e instanceof ManageApiError ? e.message : "";
      if (status === 409 && detail === "checkout_required") {
        setCheckoutRequired(true);
      } else {
        setError("Não foi possível reiniciar o período de teste agora. Tente novamente.");
      }
      setSubmitting(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn--primary" onClick={handleClick} disabled={submitting}>
        {submitting ? "Reiniciando…" : "Reiniciar período de teste"}
      </button>

      {checkoutRequired && (
        <div role="alert" className="rtv-payment-notice">
          {/* No link: the billing screen lives in the Brain portal, on its own
              domain, and is deliberately not part of this app. */}
          <p style={{ margin: 0 }}>
            Sua assinatura precisa passar por um novo checkout antes de reiniciar o
            teste. Abra Assinatura no portal Brain para concluir.
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="rtv-alert">
          {error}
        </p>
      )}
    </div>
  );
}
