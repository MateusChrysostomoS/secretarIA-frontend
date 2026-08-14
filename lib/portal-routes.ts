// portal-routes.ts — where a signed-in user belongs in THIS app, and what to say
// when the answer is "nowhere".
//
// Split out of the components that use it (the / entry screen and
// usePortalGuard) for two reasons: both need the same answer and must not
// drift, and the decision is pure logic that can be unit-tested without a DOM —
// the vitest setup here is node-environment only, so anything worth testing has
// to live outside the React tree.

// The single home of this app. brain-frontend has several role homes
// (/admin/dashboard, /doctor/dashboard); this domain is secretarIA only.
export const PORTAL_HOME = "/agenda";

// Where the "contratar" path starts. `resolvePlan` in app/(site)/cadastro/lib/plans.ts
// falls back to `[planId]` when no `?catalog=` list is supplied, so the plan id
// alone is a complete instruction for the wizard.
export const SIGNUP_HREF = "/cadastro?plan=secretaria_basico";

// Shown to a platform admin. Admin accounts are platform-level: they own no
// tenant, so there is no clinic agenda or configuration for them to act on here.
// Their portal is the Brain one, on its own domain.
export const ADMIN_ACCESS_MESSAGE =
  "Esta área é dos médicos, gestores e secretárias da clínica. Contas de administração da plataforma devem usar o portal Brain.";

// Shown to a valid session whose role this app does not know what to do with.
// Reachable only if brain-api grows a role the frontend has not been taught yet —
// better an honest dead end than a redirect loop.
export const UNKNOWN_ROLE_MESSAGE =
  "Esta conta não tem acesso à secretarIA. Fale com o responsável pela sua clínica.";

// Roles that can use the secretarIA screens. `secretary` is the clinic's human
// receptionist (see brain-api CONTRACTS §12). `tenant_owner`/`tenant_staff` are
// the legacy pre-taxonomy roles, still accepted during the transition.
export const PORTAL_ROLES = [
  "doctor",
  "manager",
  "secretary",
  "tenant_owner",
  "tenant_staff",
];

export type PostLoginDecision =
  | { kind: "navigate"; to: string }
  | { kind: "denied"; message: string };

// What to do with a session that just authenticated, or that already existed.
// `denied` means render the message in place: there is no other screen in this
// app to send them to, so navigating anywhere would just bounce them back.
export function resolvePostLogin(role: string): PostLoginDecision {
  if (PORTAL_ROLES.includes(role)) return { kind: "navigate", to: PORTAL_HOME };
  if (role === "admin") return { kind: "denied", message: ADMIN_ACCESS_MESSAGE };
  return { kind: "denied", message: UNKNOWN_ROLE_MESSAGE };
}

// Compares a browser pathname against a route constant. `trailingSlash: true` in
// next.config.mjs means the live URL is "/agenda/" while the constant is
// "/agenda" — without normalising, a guard that redirects to PORTAL_HOME while
// already on PORTAL_HOME would loop forever.
export function isSamePath(pathname: string, route: string): boolean {
  const strip = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  return strip(pathname) === strip(route);
}
