// Shared "Sair" behavior: best-effort server-side revocation + local clear via
// logout() (which clears sessionStorage FIRST, so a network failure can never
// leave the user stuck logged in), then route to /login. Extracted so headers/
// layouts share one tested implementation instead of re-inlining the pattern.

import { logout } from "./manage-api";

export function signOut(navigate: (path: string) => void): void {
  void logout();
  navigate("/");
}
