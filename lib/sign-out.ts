// Shared "Sair" behavior: best-effort server-side revocation + local clear via
// logout() (which clears sessionStorage FIRST, so a network failure can never
// leave the user stuck logged in), then route to this app's login
// (LOGIN_ROUTE — /entrar since 2026-10-19; "/" is now the public landing page). Extracted so headers/
// layouts share one tested implementation instead of re-inlining the pattern.

import { logout } from "./manage-api";
import { LOGIN_ROUTE } from "./portal-routes";

export function signOut(navigate: (path: string) => void): void {
  void logout();
  navigate(LOGIN_ROUTE);
}
