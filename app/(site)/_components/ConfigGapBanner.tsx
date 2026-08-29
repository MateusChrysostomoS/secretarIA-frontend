"use client";

// ConfigGapBanner — the "configure sua secretarIA" notice (FEAT 42): a
// dismissible toast pinned to the TOP-RIGHT of every signed-in screen, shown
// while at least one of the clinic's active professionals cannot be booked.
//
// WHY A CORNER TOAST AND NOT A FULL-WIDTH ROW. It is what was asked for, in
// those words: "uma notificação com um 'x' para fechar no canto direito superior
// da tela". The full-width slot under the header (PortalShell's `banner` prop,
// .portal-banner) was the other candidate and is deliberately not this.
//
// SELF-SUFFICIENT, the same shape as OnboardingBanner: it owns its fetch and
// renders nothing when there is no session, when the fetch fails, when nothing is
// incomplete, or when this session already dismissed this exact notice. No parent
// has to thread state through for it.
//
// FAIL-CLOSED on purpose — every failure path here ends in silence rather than a
// notice. Telling a correctly-configured clinic to go fix nothing is worse than
// saying nothing, and FEAT 41 already emails the clinic AND the doctor the moment
// a patient actually walks into the gap. This is the proactive half of that pair,
// never its safety net.
//
// Identical in brain-frontend and secretarIA-frontend. The one thing that differs
// between the two domains — where "Configurar" points — is a prop, not a fork: on
// the Brain domain the secretarIA screens live on another origin (and may not be
// configured in this build at all), on the secretarIA domain they are one route
// away. Verify parity with `diff --strip-trailing-cr`.

import { useEffect, useState } from "react";

import {
  dismissConfigGap,
  isConfigGapDismissed,
  resolveConfigGapNotice,
  type ConfigGapNotice,
} from "@/lib/config-gap";
import { getDoctorProfessionals, type Session } from "@/lib/manage-api";

import { BrandIcon } from "./BrandIcon";

type ConfigGapBannerProps = {
  /** Null while the guard resolves, or for a session-less demo visitor. */
  session: Session | null;
  /**
   * Where "Configurar" sends the user, or null to render no link at all.
   *
   * Null is a real, expected value on the Brain domain: the secretarIA app's
   * origin comes from NEXT_PUBLIC_SECRETARIA_APP_BASE_URL, baked at build time,
   * and `secretariaAppUrl` returns null when it is unset. A link that goes
   * nowhere reads to a clinic as the product being broken, so the notice simply
   * states the fact and stops there.
   */
  fixHref?: string | null;
  /**
   * Gate for callers that know the tenant may not even have secretarIA. Pass
   * `false` while that is unknown, not `true`: this must never tell a
   * PreCheck-only clinic to configure a product it did not buy.
   */
  enabled?: boolean;
};

export function ConfigGapBanner({
  session,
  fixHref = null,
  enabled = true,
}: ConfigGapBannerProps) {
  const [notice, setNotice] = useState<ConfigGapNotice | null>(null);

  useEffect(() => {
    if (!enabled || !session) {
      setNotice(null);
      return;
    }
    let cancelled = false;
    getDoctorProfessionals(session)
      .then((rows) => {
        if (cancelled) return;
        // Neither call below can throw — resolveConfigGapNotice is pure and
        // guards every wire read, isConfigGapDismissed swallows blocked storage.
        // That matters here specifically: a throw inside .then() is exactly the
        // uncaught-exception shape that blanks a static-export page.
        const next = resolveConfigGapNotice(rows, session);
        setNotice(next && isConfigGapDismissed(next.dismissKey) ? null : next);
      })
      .catch(() => {
        // A roster we could not read is not evidence of a gap. Includes the 401
        // case: the host screen owns session expiry, and a banner is no place to
        // start a logout.
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, session]);

  if (!notice) return null;

  function handleDismiss() {
    if (notice) dismissConfigGap(notice.dismissKey);
    setNotice(null);
  }

  return (
    <div className="config-gap-toast">
      <div
        // Keyed on the message so a notice that CHANGES (the user fixed their own
        // row, a colleague's gap surfaced behind it) replays the entrance
        // animation instead of silently swapping text in place.
        key={notice.message}
        className="alert-line alert-line--amber alert-line--enter"
        // polite + status: announced without stealing focus from whatever the
        // user is doing on the screen underneath.
        role="status"
        aria-live="polite"
      >
        <BrandIcon name="bell" />
        <span className="alert-line__text">
          {notice.message}
          {fixHref && (
            // Plain <a>, never next/link: on the Brain domain this URL is
            // cross-origin and client-side routing cannot leave the app, which
            // would produce a link that quietly does nothing. The session lives
            // in sessionStorage (per-origin), so crossing over means a second
            // sign-in — which is why the label promises navigation, not a silent
            // handoff.
            <a className="config-gap-toast__link" href={fixHref}>
              Configurar
            </a>
          )}
        </span>
        <button
          type="button"
          className="alert-line__close"
          onClick={handleDismiss}
          aria-label="Dispensar aviso"
          title="Dispensar"
        >
          <BrandIcon name="x" />
        </button>
      </div>
    </div>
  );
}
