import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

// ARQ-2 / ARQ-5 regression guards — the two places this app disagreed with
// itself about whether anybody was signed in.
//
// ARQ-2: PortalHeader rendered "Sair" unconditionally, but /agenda and
// /configuracao render that same header for a session-less demo VISITOR (they
// have no guard, deliberately — the demo is a sales path, see useSecretariaHub).
// Someone who had never logged in was shown, and could click, a logout button.
//
// ARQ-5: "/" never looked for an existing session, so a signed-in user who
// opened it got the login form as if they were a stranger. The decision itself
// is unit-tested in lib/__tests__/portal-routes.test.ts (resolveEntryRedirect);
// what is pinned here is that the screen actually calls it, and on mount.
//
// WHY SOURCE TESTS: vitest runs in the `node` environment here (see
// vitest.config.ts) — there is no jsdom, so no React tree can be rendered and no
// prop wiring can be asserted at runtime. These read the wiring as text instead.
// Same tactic, and the same reason, as app-shell-viewport.test.ts.

const repoRoot = process.cwd();
const read = (rel: string) => readFileSync(path.join(repoRoot, rel), "utf8");

const HEADER = "app/(site)/_components/PortalHeader.tsx";
const ENTRY = "app/(auth)/page.tsx";
// Unguarded by design: a missing session on these means "stay in demo mode".
const DEMO_SCREENS = ["app/(site)/agenda/page.tsx", "app/(site)/configuracao/page.tsx"];

describe("logout is offered only where there is a session (ARQ-2)", () => {
  it("PortalHeader takes onLogout as an optional prop", () => {
    // Optionality IS the gate. A `showLogout` boolean beside a required handler
    // could disagree with it; an absent handler cannot.
    expect(read(HEADER)).toMatch(/onLogout\?: \(\) => void;/);
  });

  it("PortalHeader renders the Sair button only when that handler exists", () => {
    const src = read(HEADER);
    const conditional = src.indexOf("{onLogout && (");
    expect(conditional).toBeGreaterThan(-1);
    // The button must live INSIDE that conditional, not beside it.
    expect(src.slice(conditional, conditional + 260)).toContain("Sair");
  });

  it.each(DEMO_SCREENS)("%s passes onLogout only with a session", (file) => {
    expect(read(file)).toMatch(/onLogout=\{session \? /);
  });

  it("/inicio keeps logout unconditional, including its accessDenied dead end", () => {
    // The opposite failure, and the reason this is not "gate it everywhere":
    // usePortalGuard reports accessDenied with a null `session` even though the
    // session is real and in storage, and on that screen "Sair" is the only exit.
    const calls = read("app/(site)/inicio/page.tsx").match(/onLogout=\{[^}]*\}/g) ?? [];
    expect(calls).toHaveLength(2);
    for (const call of calls) expect(call).not.toContain("session ?");
  });
});

describe("/ hands an already-signed-in user to the app (ARQ-5)", () => {
  const src = read(ENTRY);
  // Everything before handleSubmit — i.e. what runs without anyone typing.
  const beforeSubmit = src.slice(0, src.indexOf("async function handleSubmit"));

  it("checks for a session on mount, not only after a login", () => {
    expect(beforeSubmit).toContain("useEffect(");
    expect(beforeSubmit).toContain("resolveEntryRedirect(getSession())");
  });

  it("navigates only when that rule returned a destination", () => {
    // resolveEntryRedirect returns null for a session this app cannot route (a
    // platform admin). Redirecting one anyway is an infinite loop: it holds a
    // valid token, so every route sends it right back here.
    expect(beforeSubmit).toMatch(/if \(to\) \{\s*router\.replace\(to\)/);
  });

  it("replaces rather than pushes, so Back does not land on the form", () => {
    expect(beforeSubmit).not.toContain("router.push(to)");
  });

  it("still resolves the decision after an interactive login", () => {
    // This fix adds a second entry point to the same rule; it does not move the
    // original one out of the submit handler.
    expect(src).toContain("resolvePostLogin(session.role)");
  });
});
