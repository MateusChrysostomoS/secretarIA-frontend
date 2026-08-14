"use client";

// usePortalGuard — client-side session + role gate for the secretarIA portal
// screens. Reads the brain session, redirects to the entry screen (/) when
// absent, and bounces a signed-in user who cannot use this screen.
//
// Server-side is still the real authority (every brain-api call re-checks the JWT
// role); this only shapes navigation so a user never sees a screen they cannot use.
//
// DIFFERENCE FROM brain-frontend: that portal hosts several role homes
// (/admin/dashboard, /doctor/dashboard) and can always bounce a user somewhere
// useful. This domain is secretarIA only. It has exactly one home — /agenda —
// and no admin surface at all, so a platform admin cannot be redirected
// anywhere sensible here. Redirecting them to / would bounce them straight back
// (they hold a valid session), so instead the hook reports `accessDenied` and the
// screen renders that inline via <PortalAccessNotice>.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getSession, ManageApiError, type Session, clearSession } from "@/lib/manage-api";
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
    const current = getSession();
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
