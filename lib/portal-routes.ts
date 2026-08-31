// portal-routes.ts — where a signed-in user belongs in THIS app, and what to say
// when the answer is "nowhere".
//
// Split out of the components that use it (the / entry screen and
// usePortalGuard) for two reasons: both need the same answer and must not
// drift, and the decision is pure logic that can be unit-tested without a DOM —
// the vitest setup here is node-environment only, so anything worth testing has
// to live outside the React tree.

// The home of this app: the screen every clinic role lands on after login, and
// the one a guard bounces someone back to.
//
// Was /agenda until 2026-08-23. The split (2026-08-14) gave this domain a single
// screen-as-home because there was only ever one product here, but that left the
// two real screens unreachable from each other — a doctor who landed on /agenda
// could only get to /configuracao by typing the URL. /inicio is a real home: it
// names the clinic and links onward, so "one product" stopped meaning "one door".
export const PORTAL_HOME = "/inicio";

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

// What "/" — the entry screen — should do with a session that ALREADY exists when
// it mounts: a bookmarked root, the back button after signing in, a link that
// still points at "/". Returns the path to replace with, or null for "stay here
// and render the login form".
//
// Split out of that screen for the reason at the top of this file. The entry
// screen is a React component, and the node-environment vitest setup cannot
// render one — so a rule that lives inside it is a rule with no test. This
// particular rule was already wrong once: resolvePostLogin ran ONLY inside the
// submit handler, so it fired for a login performed in that page load and never
// for a session that was already there, and "/" showed a login form to someone
// who was signed in. The guard against that returning has to be callable.
//
// `denied` collapses into the same null as "no session at all", because both
// mean stay. A session this app has no screen for still holds a valid token, so
// every route would bounce it straight back here — redirecting it is an infinite
// loop, not an error (see resolvePostLogin above). Rendering the login form is
// the honest answer, and signing in as someone else is a real way out of it.
export function resolveEntryRedirect(
  session: { token?: string; role: string } | null | undefined,
): string | null {
  if (!session?.token) return null;
  const decision = resolvePostLogin(session.role);
  return decision.kind === "navigate" ? decision.to : null;
}

// "Does this session administer the clinic?" — the ONE authorization boundary the
// clinic portal actually has. Every PORTAL_ROLES member can open every screen
// here; owner-only affordances (team invites, subscription, onboarding pause) are
// the exception, and this is the predicate that hides them.
//
// `is_owner` is the role-taxonomy claim; the `tenant_owner` role string is the
// legacy fallback for a token minted before migration 0012, which carries no
// claim at all. Both spellings must be accepted until those tokens expire.
//
// Typed structurally rather than against `Session` on purpose: keeping this module
// free of a lib/manage-api import is what lets it stay pure logic the
// node-environment vitest setup can exercise without a DOM.
//
// This gates what a screen OFFERS, never what the backend permits — brain-api
// re-checks with `require_owner` on every owner-only route.
export function canManageClinic(
  session: { isOwner?: boolean; role: string } | null | undefined,
): boolean {
  if (!session) return false;
  return Boolean(session.isOwner) || session.role === "tenant_owner";
}

// Compares a browser pathname against a route constant. `trailingSlash: true` in
// next.config.mjs means the live URL is "/inicio/" while the constant is
// "/inicio" — without normalising, a guard that redirects to PORTAL_HOME while
// already on PORTAL_HOME would loop forever.
export function isSamePath(pathname: string, route: string): boolean {
  const strip = (p: string) => (p.length > 1 ? p.replace(/\/+$/, "") : p);
  return strip(pathname) === strip(route);
}
