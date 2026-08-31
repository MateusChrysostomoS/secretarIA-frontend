"use client";

// PortalHeader — the Brain header bar for every logged-in screen in this app
// (/inicio and the full-viewport secretarIA product screens). The admin portal it
// also served in brain-frontend does not exist on this domain; /inicio is this
// domain's answer to that portal's doctor dashboard, minus the product switching.
//
// Extracted out of PortalShell so the secretarIA screens (/agenda,
// /configuracao) can render the SAME header. They cannot use
// PortalShell itself: their layout is a height:100vh flex column with its own
// internal scroll area (calendar grid, sticky save bar), not PortalShell's
// document-scrolling sidebar+main grid. Before this they shipped their own
// product header, so the chrome visibly changed when a doctor navigated into them.
//
// The Brain brand never varies. `product` only ADDS the per-screen product lockup
// beside it (see ProductLockup).

import Link from "next/link";
import type { ReactNode } from "react";

import { PORTAL_HOME } from "@/lib/portal-routes";

import { BrandGlyph } from "./BrandGlyph";
import { ProductLockup, type PortalProduct } from "./ProductLockup";
import { ThemeToggle } from "./ThemeToggle";
import "./PortalShell.css";

type PortalHeaderProps = {
  // Short portal name shown next to the brand (e.g. "Admin", "Clínica").
  portalLabel: string;
  // Identity shown on the right (admin email or clinic name).
  userLabel: string;
  // Logging out. OPTIONAL, and that is the whole gate on the "Sair" button:
  // /agenda and /configuracao render this same header for a session-less demo
  // VISITOR (see useSecretariaHub — a missing session there means "stay in demo
  // mode", not "leave"), and offering "Sair" to someone who never signed in
  // names an account state that does not exist. Omit the handler and the button
  // is not rendered.
  //
  // Modelled as an absent handler rather than a `showLogout` flag beside a
  // required one: two props can disagree, one cannot. There is no way to render
  // a "Sair" that logs nobody out, and no way to pass a logout that never shows.
  //
  // Do NOT re-derive this from a session inside the header. /inicio's
  // accessDenied branch has a real session in sessionStorage but a null
  // `session` in state (usePortalGuard only populates it on the allowed path),
  // and that screen is exactly where "Sair" is the only way out.
  onLogout?: () => void;
  // Which product backs the current screen. Omit on screens that aren't
  // product-specific — on this domain that means /inicio, whose subject is the
  // clinic itself rather than any one product (in brain-frontend: the doctor
  // dashboard, Meu Perfil, the whole admin portal).
  product?: PortalProduct;
  // Controls rendered between the account name and "Sair" (the admin "Modo
  // médico" switch, the doctor "Voltar ao admin" switch).
  headerActions?: ReactNode;
  // false on the full-viewport product screens, whose own flex column already
  // pins the header to the top — `position: sticky` there is redundant and its
  // z-index fights the screens' own overlays.
  sticky?: boolean;
};

export function PortalHeader({
  portalLabel,
  userLabel,
  onLogout,
  product,
  headerActions,
  sticky = true,
}: PortalHeaderProps) {
  const initial = (userLabel.trim()[0] || "B").toUpperCase();

  return (
    <header className={`portal-header${sticky ? "" : " portal-header--flow"}`}>
      <div className="portal-brand-row">
        {/* PORTAL_HOME, not "/": on this domain "/" is the LOGIN form — there is
            no marketing home here, unlike brain-frontend — so pointing the brand
            at the root used to drop a signed-in user on a login screen. As of
            2026-08-31 "/" does bounce a session it serves back here on mount
            (resolveEntryRedirect), so that would now merely be a round trip; the
            link stays on PORTAL_HOME because one navigation beats two, and
            because it is still correct for a session "/" deliberately refuses to
            route (a platform admin, whose decision is `denied` — /inicio at least
            explains that in place). This is the one way back to /inicio; "Sair"
            beside it is still how you leave, when there is a session to leave.
            Not every render of this header is behind a session: /agenda and
            /configuracao also serve a session-less VISITOR in demo mode (see
            useSecretariaHub / HubNotice). For that visitor the link now costs one
            extra client navigation — /inicio's guard finds no session and replaces
            with "/" — landing exactly where the old href went. */}
        <Link href={PORTAL_HOME} className="portal-brand" aria-label="Brain">
          <BrandGlyph size={26} />
          <span className="portal-wordmark">Brain</span>
          <span className="portal-label">{portalLabel}</span>
        </Link>
        {product && <ProductLockup product={product} />}
      </div>

      <div className="portal-header-right">
        <ThemeToggle />
        <span className="portal-user">
          <span className="portal-avatar" aria-hidden="true">
            {initial}
          </span>
          <span className="portal-user-label">{userLabel}</span>
        </span>
        {headerActions}
        {onLogout && (
          <button type="button" className="btn btn--outline btn--sm" onClick={onLogout}>
            Sair
          </button>
        )}
      </div>
    </header>
  );
}
