// Tests for the fail-closed hydration state machine.
//
// The property under test throughout: an AUTHENTICATED session may never edit
// or save anything it has not actually read back. Every "loading" and every
// "error" is a closed door, and a response that belongs to a superseded cycle
// or to a professional the user has already navigated away from changes
// nothing at all.

import { describe, expect, it } from "vitest";
import {
  INITIAL_HYDRATION_STATE,
  buildLoadFailedEvent,
  canEditProfessionalFields,
  canEditTenantFields,
  canSave,
  hasLoadError,
  hydrationReducer,
  isHydrating,
  isVisitorDemo,
  saveBlockedReason,
  statusOf,
  type HydrationAction,
  type HydrationState,
} from "../hydration";
import { PROF_A, PROF_B } from "./fixtures";

/** Applies a sequence of actions, so each test reads as a scenario. */
function run(...actions: HydrationAction[]): HydrationState {
  return actions.reduce(hydrationReducer, INITIAL_HYDRATION_STATE);
}

/** An authenticated session with tenant + roster loaded and PROF_A hydrated. */
function fullyLoaded(): HydrationState {
  return run(
    { type: "session_resolved", mode: "authenticated" },
    { type: "hydration_started", generation: 1, rosterGeneration: 1 },
    { type: "load_succeeded", scope: "tenant", generation: 1 },
    { type: "load_succeeded", scope: "roster", generation: 1 },
    { type: "professional_selected", id: PROF_A },
    { type: "professional_loaded", id: PROF_A, rosterGeneration: 1 },
  );
}

describe("initial state", () => {
  it("is fail-closed before the session is even known", () => {
    const s = INITIAL_HYDRATION_STATE;
    expect(s.mode).toBe("unknown");
    expect(canEditTenantFields(s)).toBe(false);
    expect(canEditProfessionalFields(s)).toBe(false);
    expect(canSave(s)).toBe(false);
    expect(saveBlockedReason(s)).toBe("no_session");
    // "unknown" is not a demo: an unresolved session must not unlock the seed.
    expect(isVisitorDemo(s)).toBe(false);
  });
});

describe("visitor (no session)", () => {
  const visitor = run({ type: "session_resolved", mode: "visitor" });

  it("may see and interact with the labeled demo", () => {
    expect(isVisitorDemo(visitor)).toBe(true);
    expect(canEditTenantFields(visitor)).toBe(true);
    expect(canEditProfessionalFields(visitor)).toBe(true);
  });

  it("can never save — there is nothing and nobody to save for", () => {
    expect(canSave(visitor)).toBe(false);
    expect(saveBlockedReason(visitor)).toBe("demo_mode");
  });

  it("shows no loading or error affordances", () => {
    expect(isHydrating(visitor)).toBe(false);
    expect(hasLoadError(visitor)).toBe(false);
  });
});

describe("authenticated: nothing is editable or savable until it loads", () => {
  it("stays locked while the session is authenticated but nothing has loaded", () => {
    const s = run({ type: "session_resolved", mode: "authenticated" });
    expect(isVisitorDemo(s)).toBe(false);
    expect(canEditTenantFields(s)).toBe(false);
    expect(canSave(s)).toBe(false);
    expect(saveBlockedReason(s)).toBe("tenant_not_loaded");
  });

  it("stays locked while the loads are still in flight", () => {
    const s = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
    );
    expect(isHydrating(s)).toBe(true);
    expect(canEditTenantFields(s)).toBe(false);
    expect(saveBlockedReason(s)).toBe("tenant_not_loaded");
  });

  it("unlocks tenant fields only once the tenant GET succeeded", () => {
    const s = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "load_succeeded", scope: "tenant", generation: 1 },
    );
    expect(canEditTenantFields(s)).toBe(true);
    // ...but the roster hasn't answered, so saving is still refused.
    expect(saveBlockedReason(s)).toBe("roster_not_loaded");
  });

  it("keeps tenant fields locked when the tenant GET failed", () => {
    const s = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "load_failed", scope: "tenant", generation: 1, status: 500 },
      { type: "load_succeeded", scope: "roster", generation: 1 },
    );
    expect(canEditTenantFields(s)).toBe(false);
    expect(hasLoadError(s)).toBe(true);
    expect(s.tenant.status).toBe(500);
    expect(saveBlockedReason(s)).toBe("tenant_not_loaded");
  });

  it("refuses to save when the roster GET failed, even with a healthy tenant", () => {
    const s = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "load_succeeded", scope: "tenant", generation: 1 },
      { type: "load_failed", scope: "roster", generation: 1, status: 500 },
    );
    expect(saveBlockedReason(s)).toBe("roster_not_loaded");
    // A failed roster also drops any selection derived from it.
    expect(s.selectedProfessionalId).toBeNull();
    expect(canEditProfessionalFields(s)).toBe(false);
  });

  it("allows a tenant-level save when the roster loaded with nobody in it", () => {
    const s = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "load_succeeded", scope: "tenant", generation: 1 },
      { type: "load_succeeded", scope: "roster", generation: 1 },
    );
    expect(s.selectedProfessionalId).toBeNull();
    expect(canSave(s)).toBe(true);
    // Nothing professional-scoped is editable, though — nobody is selected.
    expect(canEditProfessionalFields(s)).toBe(false);
  });

  it("is fully unlocked once tenant, roster and the selected professional loaded", () => {
    const s = fullyLoaded();
    expect(canEditTenantFields(s)).toBe(true);
    expect(canEditProfessionalFields(s)).toBe(true);
    expect(canSave(s)).toBe(true);
    expect(saveBlockedReason(s)).toBeNull();
  });
});

describe("switching professionals", () => {
  it("invalidates the form until the NEW id has hydrated", () => {
    const s = hydrationReducer(fullyLoaded(), { type: "professional_selected", id: PROF_B });
    expect(s.selectedProfessionalId).toBe(PROF_B);
    expect(s.professional.phase).toBe("loading");
    expect(s.professional.id).toBeNull();
    expect(canEditProfessionalFields(s)).toBe(false);
    expect(saveBlockedReason(s)).toBe("professional_not_loaded");
    // Tenant scope is untouched by a selection change.
    expect(canEditTenantFields(s)).toBe(true);
  });

  it("drops a late response for the PREVIOUS selection (A → B, A answers last)", () => {
    const switched = hydrationReducer(fullyLoaded(), {
      type: "professional_selected",
      id: PROF_B,
    });
    // A's request finally comes back, after the user already moved to B.
    const s = hydrationReducer(switched, {
      type: "professional_loaded",
      id: PROF_A,
      rosterGeneration: 1,
    });
    expect(s).toBe(switched); // identical reference: nothing changed at all
    expect(s.professional.phase).toBe("loading");
    expect(canEditProfessionalFields(s)).toBe(false);
    expect(canSave(s)).toBe(false);
  });

  it("drops a late FAILURE for the previous selection too", () => {
    const switched = hydrationReducer(fullyLoaded(), {
      type: "professional_selected",
      id: PROF_B,
    });
    const s = hydrationReducer(switched, {
      type: "professional_failed",
      id: PROF_A,
      rosterGeneration: 1,
      status: 500,
    });
    expect(s).toBe(switched); // B must not inherit A's error
  });

  it("unlocks again when the new id's own response lands", () => {
    const s = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "load_succeeded", scope: "tenant", generation: 1 },
      { type: "load_succeeded", scope: "roster", generation: 1 },
      { type: "professional_selected", id: PROF_A },
      { type: "professional_loaded", id: PROF_A, rosterGeneration: 1 },
      { type: "professional_selected", id: PROF_B },
      { type: "professional_loaded", id: PROF_B, rosterGeneration: 1 },
    );
    expect(s.professional.id).toBe(PROF_B);
    expect(canEditProfessionalFields(s)).toBe(true);
    expect(canSave(s)).toBe(true);
  });

  it("refuses to save when the selected professional's config failed to load", () => {
    const s = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "load_succeeded", scope: "tenant", generation: 1 },
      { type: "load_succeeded", scope: "roster", generation: 1 },
      { type: "professional_selected", id: PROF_A },
      { type: "professional_failed", id: PROF_A, rosterGeneration: 1, status: null },
    );
    expect(saveBlockedReason(s)).toBe("professional_not_loaded");
    expect(canEditProfessionalFields(s)).toBe(false);
    expect(hasLoadError(s)).toBe(true);
  });
});

describe("superseded cycles", () => {
  it("ignores a tenant response from an older generation", () => {
    const retried = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "hydration_started", generation: 2, rosterGeneration: 2 }, // retry
    );
    const stale = hydrationReducer(retried, {
      type: "load_succeeded",
      scope: "tenant",
      generation: 1,
    });
    expect(stale).toBe(retried);
    expect(canEditTenantFields(stale)).toBe(false);
  });

  it("ignores a stale roster response after another roster refresh started", () => {
    const refreshed = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "load_succeeded", scope: "roster", generation: 1 },
      { type: "roster_reload_started", rosterGeneration: 2 },
    );
    const stale = hydrationReducer(refreshed, {
      type: "load_failed",
      scope: "roster",
      generation: 1,
      status: 500,
    });
    expect(stale).toBe(refreshed);
    expect(stale.roster.phase).toBe("loading"); // not poisoned by the old failure
  });

  it("keeps a roster refresh from disturbing the tenant scope", () => {
    const s = run(
      { type: "session_resolved", mode: "authenticated" },
      { type: "hydration_started", generation: 1, rosterGeneration: 1 },
      { type: "load_succeeded", scope: "tenant", generation: 1 },
      { type: "load_succeeded", scope: "roster", generation: 1 },
      { type: "professional_selected", id: PROF_A },
      { type: "professional_loaded", id: PROF_A, rosterGeneration: 1 },
      { type: "roster_reload_started", rosterGeneration: 2 },
    );
    // The tenant stays loaded (unsaved tenant-level edits survive), and the
    // already-hydrated professional keeps its edits too.
    expect(s.tenant.phase).toBe("loaded");
    expect(canEditTenantFields(s)).toBe(true);
    expect(s.professional.phase).toBe("loaded");
    expect(s.professional.id).toBe(PROF_A);
  });
});

describe("session boundaries", () => {
  it("drops every verdict when the viewer changes identity", () => {
    const s = hydrationReducer(fullyLoaded(), {
      type: "session_resolved",
      mode: "visitor",
    });
    expect(s.tenant.phase).toBe("idle");
    expect(s.roster.phase).toBe("idle");
    expect(s.professional.id).toBeNull();
    expect(s.selectedProfessionalId).toBeNull();
    expect(canSave(s)).toBe(false);
  });

  it("bumps both generations on reset, so in-flight answers are stale", () => {
    const loaded = fullyLoaded();
    const s = hydrationReducer(loaded, { type: "reset" });
    expect(s.generation).toBeGreaterThan(loaded.generation);
    expect(s.rosterGeneration).toBeGreaterThan(loaded.rosterGeneration);
    expect(s.mode).toBe("authenticated"); // a reset is not a logout
    expect(canSave(s)).toBe(false);

    const stale = hydrationReducer(s, {
      type: "load_succeeded",
      scope: "tenant",
      generation: loaded.generation,
    });
    expect(stale).toBe(s);
  });

  it("re-resolving the SAME mode is a no-op, not a reset", () => {
    const loaded = fullyLoaded();
    const s = hydrationReducer(loaded, { type: "session_resolved", mode: "authenticated" });
    expect(s).toBe(loaded);
  });
});

describe("telemetry payloads", () => {
  it("carries only scope, status and attempt", () => {
    const event = buildLoadFailedEvent("tenant", { status: 500, message: "boom" }, 2);
    expect(event).toEqual({
      event: "config_load_failed",
      scope: "tenant",
      status: 500,
      attempt: 2,
    });
    // No message, no body, no ids — the shape has nowhere to put them.
    expect(Object.keys(event).sort()).toEqual(["attempt", "event", "scope", "status"]);
  });

  it("reports a null status for a network failure rather than inventing one", () => {
    expect(statusOf(new Error("network"))).toBeNull();
    expect(statusOf(null)).toBeNull();
    expect(statusOf(undefined)).toBeNull();
    expect(statusOf({ status: "500" })).toBeNull(); // a string is not a status
    expect(statusOf({ status: 403 })).toBe(403);
  });
});
