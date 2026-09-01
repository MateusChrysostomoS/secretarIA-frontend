"use client";

// usePortalGuard — client-side session + role gate for the secretarIA portal
// screens. Reads the brain session, redirects to the entry screen (/) when
// absent, and bounces a signed-in user who cannot use this screen.
//
// Server-side is still the real authority (every brain-api call re-checks the JWT
// role); this only shapes navigation so a user never sees a screen they cannot use.
//
// DIFFERENCE FROM brain-frontend: that portal hosts several role homes
// (/admin/dashboard, /doctor/dashboard) and picks between them by role. This
// domain has ONE home — /inicio (PORTAL_HOME) — not because there is only one
// screen, but because every clinic role here can open every screen: the roles
// differ in what a screen OFFERS them (see canManageClinic in lib/portal-routes),
// never in which screen they land on. So resolvePostLogin has a single navigable
// answer, and this hook only ever redirects to that one.
//
// What survives from the single-screen era is the admin dead end, for the same
// reason as before: this domain has no admin surface at all, so a platform admin
// cannot be redirected anywhere sensible. Sending them to / would bounce them
// straight back (they hold a valid session), so instead the hook reports
// `accessDenied` and the screen renders that inline via <PortalAccessNotice>.
// The same applies to the one-destination case below — /inicio guards on exactly
// PORTAL_ROLES, so any role it turns away has nowhere left to be sent.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ensureSession,
  getSession,
  ManageApiError,
  type Session,
  clearSession,
} from "@/lib/manage-api";
import { PORTAL_HOME, isSamePath, resolvePostLogin } from "@/lib/portal-routes";

export function usePortalGuard(allowed: string[]): {
  session: Session | null;
  ready: boolean;
  // Non-null when a VALID session exists but this app has nothing for that role.
  // The caller renders it inline instead of a spinner — see PortalAccessNotice.
  accessDenied: string | null;
} {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  // Stable primitive dep so the effect doesn't re-run on every render (new array each time).
  const allowedKey = allowed.join(",");

  useEffect(() => {
    // ASYNC ON PURPOSE, and the reason is easy to miss: since the refresh token
    // moved to an HttpOnly cookie, a signed-in user who RELOADS arrives here with
    // nothing in memory. A synchronous getSession() would read null and bounce
    // them to the login screen they were already past. ensureSession() spends the
    // cookie once (single-flight, shared with every other mount) and answers who
    // they are. `cancelled` guards the unmount that a StrictMode double-invoke —
    // or a fast navigation — makes routine.
    let cancelled = false;
    void (async () => {
      const current = getSession() ?? (await ensureSession());
      if (cancelled) return;
      if (!current?.token) {
        // No session at all — the entry screen (/) is both login and signup.
        router.replace("/");
        return;
      }
      if (!allowed.includes(current.role)) {
        const decision = resolvePostLogin(current.role);
        // Nowhere to send them inside this app — say so in place. Also covers the
        // case where the ONLY destination is the screen they are already on: this
        // app has a single home, so redirecting there from there would loop.
        if (
          decision.kind === "denied" ||
          isSamePath(window.location.pathname, decision.to)
        ) {
          setAccessDenied(
            decision.kind === "denied"
              ? decision.message
              : "Esta conta não tem acesso a esta tela.",
          );
          return;
        }
        // Right user, wrong screen — route to the one home this app has.
        router.replace(decision.to);
        return;
      }
      setSession(current);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, allowedKey]);

  return { session, ready, accessDenied };
}

// True when an error is an expired/invalid-session signal (brain-api 401). Callers should
// clear the session and bounce to the entry screen.
export function isSessionExpired(error: unknown): boolean {
  return error instanceof ManageApiError && error.status === 401;
}

// Convenience: handle a thrown API error by logging the user out on 401, returning a
// human PT-BR message otherwise (for inline display).
export function describeApiError(error: unknown): string {
  if (error instanceof ManageApiError) {
    if (error.status === 403) return "Você não tem permissão para esta ação.";
    if (error.status === 404) return "Registro não encontrado.";
    if (error.status === 409) return error.message || "Conflito de dados.";
    if (error.status === 422) return "Dados inválidos. Verifique os campos.";
  }
  return "Algo deu errado. Tente novamente.";
}

export { clearSession };
