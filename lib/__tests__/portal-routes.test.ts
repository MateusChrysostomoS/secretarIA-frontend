import { existsSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  ADMIN_ACCESS_MESSAGE,
  PORTAL_HOME,
  PORTAL_ROLES,
  SIGNUP_HREF,
  UNKNOWN_ROLE_MESSAGE,
  canManageClinic,
  isSamePath,
  resolveEntryRedirect,
  resolvePostLogin,
} from "../portal-routes";

// PORTAL_HOME moved from /agenda to /inicio on 2026-08-23 (see the constant's own
// comment). Pinned literally because every other assertion below compares against
// the constant — without this one they would all pass no matter what it holds, and
// a typo'd route would ship green. There must also BE a route at this path:
// app/(site)/inicio/page.tsx.
describe("PORTAL_HOME", () => {
  it("is the /inicio home, not one of the product screens", () => {
    expect(PORTAL_HOME).toBe("/inicio");
  });

  it("points at a route that actually exists on disk", () => {
    // The value alone proves nothing: with `output: "export"` a route that isn't
    // there is a static 404, and this is the path EVERY successful login and every
    // guard bounce is sent to — so a typo here 404s the whole portal, silently,
    // only in production. The node-environment vitest setup lets us just look.
    const route = path.join(__dirname, "..", "..", "app", "(site)", PORTAL_HOME, "page.tsx");
    expect(existsSync(route)).toBe(true);
  });
});

// resolvePostLogin is the decision the / entry screen makes after a successful
// POST /auth/token, and the one usePortalGuard makes for an already-signed-in
// visitor. Both must agree, which is why it lives in one tested place.
describe("resolvePostLogin", () => {
  it("sends every clinic role to the portal home", () => {
    for (const role of ["doctor", "manager", "secretary"]) {
      expect(resolvePostLogin(role)).toEqual({ kind: "navigate", to: PORTAL_HOME });
    }
  });

  it("still accepts the legacy pre-taxonomy roles", () => {
    // brain-api may still mint these until migration 0012_role_taxonomy is
    // applied in production; a logged-in clinic must not hit a dead end.
    for (const role of ["tenant_owner", "tenant_staff"]) {
      expect(resolvePostLogin(role)).toEqual({ kind: "navigate", to: PORTAL_HOME });
    }
  });

  it("denies a platform admin in place instead of redirecting", () => {
    // An admin holds a valid session, so bouncing them to / would send them
    // straight back here. The only honest answer is an inline message.
    expect(resolvePostLogin("admin")).toEqual({
      kind: "denied",
      message: ADMIN_ACCESS_MESSAGE,
    });
  });

  it("denies an unknown role rather than guessing a destination", () => {
    expect(resolvePostLogin("auditor")).toEqual({
      kind: "denied",
      message: UNKNOWN_ROLE_MESSAGE,
    });
  });

  it("treats the role as opaque — no prefix or case coercion", () => {
    // brain-api is the authority on role strings; matching loosely here would
    // let a near-miss role silently gain portal access.
    expect(resolvePostLogin("Doctor").kind).toBe("denied");
    expect(resolvePostLogin("doctor_assistant").kind).toBe("denied");
    expect(resolvePostLogin("").kind).toBe("denied");
  });

  it("never routes anywhere except the single portal home", () => {
    // Role decides what a screen OFFERS (see canManageClinic), never which screen
    // you land on — so there is still exactly one navigable destination.
    for (const role of PORTAL_ROLES) {
      const decision = resolvePostLogin(role);
      expect(decision.kind === "navigate" && decision.to).toBe(PORTAL_HOME);
    }
  });
});

// What "/" does with a session that is ALREADY there when it mounts. Until
// 2026-08-31 the answer was "nothing": resolvePostLogin was only ever called from
// the entry screen's submit handler, so a bookmarked "/", the back button after
// signing in, or a stale tab all showed the login form to a signed-in user. The
// rule lives here rather than in that component because the component cannot be
// rendered by this (node-environment) test setup at all.
describe("resolveEntryRedirect", () => {
  it("leaves a visitor with no session on the login screen", () => {
    expect(resolveEntryRedirect(null)).toBeNull();
    expect(resolveEntryRedirect(undefined)).toBeNull();
  });

  it("ignores a stored session that carries no token", () => {
    // Storage can hold a half-written or legacy shape. usePortalGuard tests the
    // same `?.token` rather than mere presence, and the two must agree — or a
    // tokenless session bounces between "/" and the guard forever.
    expect(resolveEntryRedirect({ role: "doctor" })).toBeNull();
    expect(resolveEntryRedirect({ role: "doctor", token: "" })).toBeNull();
  });

  it("sends every clinic role straight to the portal home", () => {
    for (const role of PORTAL_ROLES) {
      expect(resolveEntryRedirect({ role, token: "jwt" })).toBe(PORTAL_HOME);
    }
  });

  it("does NOT redirect a platform admin — that is the loop", () => {
    // An admin holds a valid token, so /inicio's guard would bounce them right
    // back to "/", which would bounce them again. `denied` means stay put, and
    // the login form is a real way out: sign in as someone else.
    expect(resolveEntryRedirect({ role: "admin", token: "jwt" })).toBeNull();
  });

  it("does not redirect a role this app does not know", () => {
    expect(resolveEntryRedirect({ role: "auditor", token: "jwt" })).toBeNull();
    expect(resolveEntryRedirect({ role: "Doctor", token: "jwt" })).toBeNull();
  });

  it("reads resolvePostLogin instead of forming a second opinion", () => {
    // Two functions answering "where does this session belong" is exactly how a
    // redirect loop is born (see the module header) — this one must stay a thin
    // read of the other.
    for (const role of [...PORTAL_ROLES, "admin", "auditor", ""]) {
      const decision = resolvePostLogin(role);
      expect(resolveEntryRedirect({ role, token: "jwt" })).toBe(
        decision.kind === "navigate" ? decision.to : null,
      );
    }
  });
});

// The clinic portal's one real authorization boundary. Everything else here is
// navigation; this decides whether an owner-only affordance is even offered.
describe("canManageClinic", () => {
  it("accepts the is_owner claim", () => {
    expect(canManageClinic({ role: "doctor", isOwner: true })).toBe(true);
    expect(canManageClinic({ role: "secretary", isOwner: true })).toBe(true);
  });

  it("accepts a legacy tenant_owner token that carries no claim", () => {
    // Pre-migration-0012 tokens have no is_owner at all; the clinic's actual
    // owner must not lose invites for the life of an already-issued token.
    expect(canManageClinic({ role: "tenant_owner" })).toBe(true);
  });

  it("refuses a clinic member who is not the owner", () => {
    for (const role of ["doctor", "manager", "secretary", "tenant_staff"]) {
      expect(canManageClinic({ role })).toBe(false);
      expect(canManageClinic({ role, isOwner: false })).toBe(false);
    }
  });

  it("refuses a missing session instead of throwing", () => {
    // /inicio calls this while usePortalGuard is still resolving, so `null` is a
    // normal input — and the safe answer is "no", never a crash.
    expect(canManageClinic(null)).toBe(false);
    expect(canManageClinic(undefined)).toBe(false);
  });

  it("coerces a malformed claim instead of passing it through", () => {
    // Pins the Boolean() wrapper, and it takes a malformed claim to do it: with a
    // well-typed `boolean | undefined`, a bare `a || b` already yields a boolean,
    // so every well-formed input passes with or without the wrapper. `isOwner`
    // is decoded from a JWT, and the result feeds a prop typed `boolean` — a
    // token carrying a string must not be able to smuggle it through.
    const malformed = { role: "doctor", isOwner: "sim" as unknown as boolean };
    expect(canManageClinic(malformed)).toBe(true);
    expect(typeof canManageClinic(malformed)).toBe("boolean");
  });
});

// The guard redirects to PORTAL_HOME when a signed-in user opens a screen their
// role cannot use. With trailingSlash: true the live path is "/inicio/", so a
// naive comparison against "/inicio" would redirect /inicio to itself forever.
describe("isSamePath", () => {
  it("ignores a trailing slash in either direction", () => {
    expect(isSamePath("/inicio/", "/inicio")).toBe(true);
    expect(isSamePath("/inicio", "/inicio/")).toBe(true);
    expect(isSamePath("/inicio/", "/inicio/")).toBe(true);
  });

  it("does not collapse the root path to an empty string", () => {
    expect(isSamePath("/", "/")).toBe(true);
    expect(isSamePath("/", "/inicio")).toBe(false);
  });

  it("does not match a different route or a nested one", () => {
    // /agenda is still a real route — it just stopped being the home.
    expect(isSamePath("/agenda/", "/inicio")).toBe(false);
    expect(isSamePath("/configuracao/", "/inicio")).toBe(false);
    expect(isSamePath("/inicio/detalhe/", "/inicio")).toBe(false);
  });
});

describe("SIGNUP_HREF", () => {
  it("carries a plan id resolvePlan can accept", () => {
    // resolvePlan() returns null without a `plan` param and renders "Plano não
    // encontrado" — the entry screen's contratar button must never do that.
    const query = new URLSearchParams(SIGNUP_HREF.split("?")[1] ?? "");
    expect(query.get("plan")).toBe("secretaria_basico");
  });

  it("points at the signup wizard", () => {
    expect(SIGNUP_HREF.startsWith("/cadastro?")).toBe(true);
  });
});
