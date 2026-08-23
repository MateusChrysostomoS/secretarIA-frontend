"use client";

// /inicio — the home of this domain (PORTAL_HOME). Names the clinic and hands the
// user onward to the screens they can actually use.
//
// WHY IT EXISTS (2026-08-23). The 3-domain split (2026-08-14) made /agenda the
// home, on the reasoning that one product needs one screen. That held for a week
// and then didn't: /agenda and /configuracao had no link between them, so a doctor
// who signed in could reach the configuration screen only by typing its URL. The
// fix is the shape brain-frontend already proved — a home that is a directory of
// destinations rather than one of the destinations. See
// docs/CHECKPOINT_secretaria_frontend.md, decision nº2.
//
// Modelled on brain-frontend's /doctor/dashboard and reusing its exact
// design-system vocabulary (.portal-page-head, .portal-links, .portal-link-card),
// but NOT its content: that dashboard's job is choosing between products (PreCheck
// vs secretarIA) from `entitlements.products`. This domain sells one product, so
// there is nothing to choose — the cards here are screens, and a PreCheck card has
// no business on this domain even though EntitlementResponse still carries the flag
// (a leftover of the clone, see lib/manage-api.ts).
//
// WHAT THE ROLES CHANGE — and it is less than you would guess. Not which screens
// exist: every PORTAL_ROLES member can open /agenda and /configuracao, and neither
// guards on role at the door. Not the cards either. Checked route by route rather
// than assumed: the ONLY owner-only endpoint in brain-api is `pause_onboarding`
// (`require_owner`, which even admits `secretary`), and it lives on /app/onboarding,
// not behind anything here — both invite routes are `require_doctor`, opened up
// deliberately in the 2026-07-22 corrections round.
//
// So ownership changes no destination on this screen, and pretending otherwise
// would have this home disagree with /configuracao about the same buttons. What
// canManageClinic drives is a SIGNAL: the "Titular da clínica" badge and the
// subtitle. A statement of fact about the session, not a gate over a door that
// isn't locked.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { getDoctorMe, type DoctorMe } from "@/lib/manage-api";
import { PORTAL_ROLES, canManageClinic } from "@/lib/portal-routes";
import { signOut } from "@/lib/sign-out";

import { BrandIcon, type IconName } from "../_components/BrandIcon";
import { PortalAccessNotice } from "../_components/PortalAccessNotice";
import { PortalHeader } from "../_components/PortalHeader";
import { SecretariaWordmark } from "../_components/SecretariaWordmark";
import {
  clearSession,
  isSessionExpired,
  usePortalGuard,
} from "../_components/usePortalGuard";

// QuickLink — a navigation card into one of this app's screens. Local to this
// route, same as its counterpart in brain-frontend's doctor dashboard.
function QuickLink({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: IconName;
  // ReactNode so a title can embed the product wordmark (see SecretariaWordmark).
  title: ReactNode;
  description: string;
}) {
  return (
    <Link href={href} className="portal-link-card">
      <span className="feat-ico">
        <BrandIcon name={icon} />
      </span>
      {/* h2, not the h3 this was ported with: the page head's clinic name is the
          h1 and these cards are its only sub-structure, so h3 would skip a level
          and leave a gap for anyone navigating by heading. PortalShell.css styles
          h2 and h3 identically here, so nothing moves visually. */}
      <h2>{title}</h2>
      <p>{description}</p>
    </Link>
  );
}

export default function InicioPage() {
  const router = useRouter();
  // Exactly PORTAL_ROLES — the same list resolvePostLogin routes here. Guarding on
  // a narrower list would strand a role that has nowhere else to go: this screen is
  // the destination every other guard falls back to.
  const { session, ready, accessDenied } = usePortalGuard(PORTAL_ROLES);

  const [me, setMe] = useState<DoctorMe | null>(null);
  const [error, setError] = useState(false);
  // Bumped by "Tentar de novo" to re-run the fetch. A counter rather than a
  // callback because the effect below already owns the whole request lifecycle,
  // cancellation included.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!ready || !session) return;
    let cancelled = false;
    setError(false);
    // GET /doctor/me is gated by brain-api's require_doctor, which admits every
    // PORTAL_ROLES member (secretary included) — so it is safe as this screen's
    // only fetch. It is also the sole reason to call it: the clinic's name.
    getDoctorMe(session)
      .then((data) => {
        if (!cancelled) setMe(data);
      })
      .catch((e) => {
        if (cancelled) return;
        if (isSessionExpired(e)) {
          clearSession();
          // "/" is this domain's login screen — there is no separate /login here.
          router.replace("/");
          return;
        }
        // Kept out of state but not swallowed: the banner below says the same
        // thing to the user either way, so the only place the difference between
        // a 403, a 500 and an offline blip can survive is the console.
        console.error("secretaria inicio: failed to load /doctor/me", e);
        setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, session, router, attempt]);

  const canManage = canManageClinic(session);

  // A valid session this app has no screen for (a platform admin, or a role the
  // frontend does not know). Rendered in place — every route here would bounce
  // them straight back — but keeping the header, so "Sair" stays reachable. The
  // page head is deliberately dropped: "Sua clínica / Bem-vindo(a)" over a notice
  // saying this is not their portal would be the app contradicting itself.
  if (accessDenied) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--page)" }}>
        <PortalHeader
          portalLabel="Clínica"
          userLabel="Brain"
          onLogout={() => signOut((path) => router.push(path))}
        />
        <PortalAccessNotice message={accessDenied} />
      </div>
    );
  }
  // Guard still deciding, or already redirecting: render nothing rather than a
  // flash of chrome the user is about to be navigated away from.
  if (!ready || !session) return null;

  return (
    <div style={{ minHeight: "100vh", background: "var(--page)" }}>
      {/* No `product` prop: this screen's subject is the clinic, not one product. */}
      <PortalHeader
        portalLabel="Clínica"
        userLabel={session.email || me?.tenant.clinic_name || "Brain"}
        onLogout={() => signOut((path) => router.push(path))}
      />
      {/* .portal-main carries the design system's page padding and 1100px measure;
          it normally sits in PortalShell's sidebar grid, so centring is ours. */}
      <main className="portal-main" style={{ margin: "0 auto", width: "100%" }}>
        <header className="portal-page-head">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              {/* Neutral title while /doctor/me is in flight or failed, so the
                  heading never flashes a name that isn't the clinic's. */}
              <h1>{me ? me.tenant.clinic_name : "Sua clínica"}</h1>
              {/* The one thing on this screen that depends on clinic-management
                  permission. A statement of fact, not a gate: nothing here is
                  hidden from a non-owner, because nothing behind these cards is
                  owner-only in brain-api (only the onboarding pause is, and it
                  lives on /app/onboarding). Reuses .pbadge rather than porting
                  brain-frontend's StatusBadge, which this repo left out on
                  purpose — see docs/CHECKPOINT_secretaria_frontend.md. */}
              {canManage && (
                <span className="pbadge pbadge--blue">Titular da clínica</span>
              )}
            </div>
            <p className="sub">
              {canManage
                ? "Você administra esta clínica na secretarIA."
                : "Bem-vindo(a) ao painel da sua clínica."}
            </p>
          </div>
        </header>

        {/* The failed fetch costs the clinic NAME, nothing else — so it is a
            banner above the links, never a replacement for them. This screen is
            PORTAL_HOME and the fallback of every other screen's guard: if a bad
            /doctor/me could blank the card grid, one failing request would leave
            the user with no way to reach /agenda or /configuracao at all. */}
        {error && (
          <div
            className="portal-error"
            role="alert"
            style={{
              marginBottom: 20,
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span style={{ flex: 1, minWidth: 200 }}>
              Não foi possível carregar os dados da sua clínica.
            </span>
            <button
              type="button"
              className="btn btn--outline btn--sm"
              onClick={() => setAttempt((n) => n + 1)}
            >
              Tentar de novo
            </button>
          </div>
        )}

        {/* Always rendered: every href here is static, so none of it depends on
            the request above. */}
        <div className="portal-links">
          <QuickLink
            href="/agenda"
            icon="calendar"
            title="Agenda"
            description="Consultas marcadas e disponibilidade da sua clínica."
          />
          <QuickLink
            href="/configuracao"
            icon="sliders"
            title={
              <>
                Configurações <SecretariaWordmark />
              </>
            }
            description="Ajuste como o atendimento no WhatsApp responde seus pacientes."
          />
          {/* NOT owner-gated, and that is deliberate. brain-api gates both invite
              routes with require_doctor, not require_owner — they were owner-only
              until the 2026-07-22 corrections round opened them to any doctor or
              staff — and ProfessionalsSection renders the two invite buttons behind
              a plain `session &&` for the same reason. Hiding this card from a
              non-owner would invent a restriction neither layer imposes, and the
              two screens would then disagree about the same affordance.
              `?secao=prof` lands on the Profissionais section rather than the top
              of an eight-section page; /configuracao reads that param itself. */}
          <QuickLink
            href="/configuracao?secao=prof"
            icon="users"
            title="Convidar equipe"
            description="Adicione médicos e secretárias ao portal da clínica."
          />
        </div>
      </main>
    </div>
  );
}
