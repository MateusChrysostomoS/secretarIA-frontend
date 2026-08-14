import { describe, expect, it } from "vitest";

import {
  ADMIN_ACCESS_MESSAGE,
  PORTAL_HOME,
  PORTAL_ROLES,
  SIGNUP_HREF,
  UNKNOWN_ROLE_MESSAGE,
  isSamePath,
  resolvePostLogin,
} from "../portal-routes";

// resolvePostLogin is the decision the / entry screen makes after a successful
// POST /auth/token, and the one usePortalGuard makes for an already-signed-in
// visitor. Both must agree, which is why it lives in one tested place.
describe("resolvePostLogin", () => {
  it("sends every clinic role to the agenda", () => {
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
    for (const role of PORTAL_ROLES) {
      const decision = resolvePostLogin(role);
      expect(decision.kind === "navigate" && decision.to).toBe(PORTAL_HOME);
    }
  });
});

// The guard redirects to PORTAL_HOME when a signed-in user opens a screen their
// role cannot use. With trailingSlash: true the live path is "/agenda/", so a
// naive comparison against "/agenda" would redirect /agenda to itself forever.
describe("isSamePath", () => {
  it("ignores a trailing slash in either direction", () => {
    expect(isSamePath("/agenda/", "/agenda")).toBe(true);
    expect(isSamePath("/agenda", "/agenda/")).toBe(true);
    expect(isSamePath("/agenda/", "/agenda/")).toBe(true);
  });

  it("does not collapse the root path to an empty string", () => {
    expect(isSamePath("/", "/")).toBe(true);
    expect(isSamePath("/", "/agenda")).toBe(false);
  });

  it("does not match a different route or a nested one", () => {
    expect(isSamePath("/configuracao/", "/agenda")).toBe(false);
    expect(isSamePath("/agenda/detalhe/", "/agenda")).toBe(false);
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
