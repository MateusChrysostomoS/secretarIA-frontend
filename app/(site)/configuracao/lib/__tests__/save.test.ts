// Tests for the guarded, transactional write path.
//
// Two properties are pinned here:
//
//  1. ZERO writes from an incomplete screen. The fakes count calls, so
//     "it refused" and "it refused without touching the network" are asserted
//     separately — a guard that returned an error after already writing would
//     pass the first and fail the second.
//
//  2. One logical save = one request. The default path is the transactional
//     endpoint; the two-PUT sequence only runs against a backend that has no
//     such route, and when it half-succeeds it says so instead of pretending.

import { describe, expect, it } from "vitest";
import {
  INITIAL_HYDRATION_STATE,
  hydrationReducer,
  type HydrationAction,
  type HydrationState,
} from "../hydration";
import { PARTIAL_SAVE_MESSAGE, SAVE_BLOCKED_MESSAGE, performSave, retryProfessionalOnly } from "../save";
import { HubApiError, isLegacyBackend } from "@/lib/secretaria-hub";
import { PROF_A, PROF_B, professionalWire, tenantWire } from "./fixtures";

function run(...actions: HydrationAction[]): HydrationState {
  return actions.reduce(hydrationReducer, INITIAL_HYDRATION_STATE);
}

const TENANT_PATCH = { greeting_message: "olá" };
const PROFESSIONAL_PATCH = { specialty: "clínica geral" };

/**
 * The same predicate page.tsx injects. Only the two whole-clinic refusals send
 * a structured `{code, message}` detail (see secretaria-hub's parseHubResponse),
 * so a `code` is exactly the signal that retrying will not help.
 */
const calendarRefusal = (error: unknown) =>
  error instanceof HubApiError && error.code
    ? { code: error.code, message: error.message }
    : null;

/**
 * Counting fakes. `configuration` records each aggregate body so a test can
 * assert the request carried both halves; `tenant`/`professional` record the
 * legacy calls, which must stay at zero on the happy path.
 */
function spies(overrides: Partial<Parameters<typeof performSave>[0]> = {}) {
  const calls = {
    configuration: [] as unknown[],
    tenant: 0,
    professional: [] as string[],
  };
  return {
    calls,
    deps: {
      putConfiguration: async (body: unknown) => {
        calls.configuration.push(body);
        return { tenant: tenantWire(), professional: professionalWire(PROF_A) };
      },
      putTenant: async () => {
        calls.tenant += 1;
        return tenantWire();
      },
      putProfessional: async (id: string) => {
        calls.professional.push(id);
        return professionalWire(id);
      },
      buildTenantPatch: () => TENANT_PATCH,
      buildProfessionalPatch: () => PROFESSIONAL_PATCH,
      isLegacyBackend,
      ...overrides,
    },
  };
}

const AUTHENTICATED: HydrationAction = { type: "session_resolved", mode: "authenticated" };
const STARTED: HydrationAction = { type: "hydration_started", generation: 1, rosterGeneration: 1 };
const TENANT_OK: HydrationAction = { type: "load_succeeded", scope: "tenant", generation: 1 };
const ROSTER_OK: HydrationAction = { type: "load_succeeded", scope: "roster", generation: 1 };

const LOADED_WITH_A = run(
  AUTHENTICATED,
  STARTED,
  TENANT_OK,
  ROSTER_OK,
  { type: "professional_selected", id: PROF_A },
  { type: "professional_loaded", id: PROF_A, rosterGeneration: 1 },
);

const LOADED_NO_PROFESSIONAL = run(AUTHENTICATED, STARTED, TENANT_OK, ROSTER_OK);

// ---------------------------------------------------------------------------
// Zero writes from an incomplete screen
// ---------------------------------------------------------------------------

describe("performSave refuses without issuing a single write", () => {
  const blockedScenarios: Array<[string, HydrationState, string]> = [
    ["session not resolved yet", INITIAL_HYDRATION_STATE, "no_session"],
    [
      "visitor looking at the demo",
      run({ type: "session_resolved", mode: "visitor" }),
      "demo_mode",
    ],
    ["authenticated, nothing requested yet", run(AUTHENTICATED), "tenant_not_loaded"],
    ["both GETs still in flight", run(AUTHENTICATED, STARTED), "tenant_not_loaded"],
    [
      "mint 200 + GET tenant 500",
      run(
        AUTHENTICATED,
        STARTED,
        { type: "load_failed", scope: "tenant", generation: 1, status: 500 },
        ROSTER_OK,
      ),
      "tenant_not_loaded",
    ],
    [
      "mint 200 + GET professionals 500",
      run(
        AUTHENTICATED,
        STARTED,
        TENANT_OK,
        { type: "load_failed", scope: "roster", generation: 1, status: 500 },
      ),
      "roster_not_loaded",
    ],
    [
      "tenant + roster fine, professional config never arrived",
      run(AUTHENTICATED, STARTED, TENANT_OK, ROSTER_OK, {
        type: "professional_selected",
        id: PROF_A,
      }),
      "professional_not_loaded",
    ],
    [
      "professional selected, its config failed",
      run(
        AUTHENTICATED,
        STARTED,
        TENANT_OK,
        ROSTER_OK,
        { type: "professional_selected", id: PROF_A },
        { type: "professional_failed", id: PROF_A, rosterGeneration: 1, status: 404 },
      ),
      "professional_not_loaded",
    ],
    [
      "switched to B while only A had hydrated",
      run(
        AUTHENTICATED,
        STARTED,
        TENANT_OK,
        ROSTER_OK,
        { type: "professional_selected", id: PROF_A },
        { type: "professional_loaded", id: PROF_A, rosterGeneration: 1 },
        { type: "professional_selected", id: PROF_B },
      ),
      "professional_not_loaded",
    ],
  ];

  for (const [name, state, reason] of blockedScenarios) {
    it(`${name} → refused (${reason}), zero requests`, async () => {
      const s = spies();
      const result = await performSave({ state, ...s.deps });

      expect(result.status).toBe("blocked");
      if (result.status === "blocked") expect(result.reason).toBe(reason);
      expect(s.calls.configuration).toEqual([]);
      expect(s.calls.tenant).toBe(0);
      expect(s.calls.professional).toEqual([]);
    });
  }

  it("has user-facing copy for every refusal reason", () => {
    for (const [, , reason] of blockedScenarios) {
      const message = SAVE_BLOCKED_MESSAGE[reason as keyof typeof SAVE_BLOCKED_MESSAGE];
      expect(typeof message).toBe("string");
      expect(message.length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// The transactional path
// ---------------------------------------------------------------------------

describe("performSave uses one transactional request", () => {
  it("sends both halves in a single call, and never touches the legacy routes", async () => {
    const s = spies();
    const result = await performSave({ state: LOADED_WITH_A, ...s.deps });

    expect(result.status).toBe("saved");
    if (result.status === "saved") {
      expect(result.mode).toBe("atomic");
      expect(result.professional?.id).toBe(PROF_A);
    }
    expect(s.calls.configuration).toEqual([
      { tenant: TENANT_PATCH, professional_id: PROF_A, professional: PROFESSIONAL_PATCH },
    ]);
    expect(s.calls.tenant).toBe(0);
    expect(s.calls.professional).toEqual([]);
  });

  it("omits the professional pair when nobody is selected", async () => {
    const s = spies({
      putConfiguration: async (body: unknown) => {
        (s.calls.configuration as unknown[]).push(body);
        return { tenant: tenantWire(), professional: null };
      },
    });
    const result = await performSave({ state: LOADED_NO_PROFESSIONAL, ...s.deps });

    expect(result.status).toBe("saved");
    if (result.status === "saved") expect(result.professional).toBeNull();
    expect(s.calls.configuration).toEqual([{ tenant: TENANT_PATCH }]);
  });

  it("writes under the id that was proven hydrated, not a later selection", async () => {
    const loadedWithB = hydrationReducer(
      hydrationReducer(LOADED_WITH_A, { type: "professional_selected", id: PROF_B }),
      { type: "professional_loaded", id: PROF_B, rosterGeneration: 1 },
    );
    const s = spies();
    await performSave({ state: loadedWithB, ...s.deps });
    expect((s.calls.configuration[0] as { professional_id: string }).professional_id).toBe(PROF_B);
  });

  it("returns what the backend echoed, not what the caller sent", async () => {
    const persisted = tenantWire({ greeting_message: "o que o servidor gravou" });
    const result = await performSave({
      state: LOADED_NO_PROFESSIONAL,
      ...spies({
        putConfiguration: async () => ({ tenant: persisted, professional: null }),
      }).deps,
    });
    expect(result.status).toBe("saved");
    if (result.status === "saved") expect(result.tenant).toBe(persisted);
  });

  it("is idempotent: the same payload twice converges to the same result", async () => {
    const s = spies();
    const deps = { state: LOADED_WITH_A, ...s.deps };
    const first = await performSave(deps);
    const second = await performSave(deps);

    expect(first).toEqual(second);
    expect(s.calls.configuration).toHaveLength(2);
    expect(s.calls.configuration[0]).toEqual(s.calls.configuration[1]);
  });

  it("lets a real failure surface — nothing was written, so nothing is claimed", async () => {
    const boom = new HubApiError(500, "server exploded");
    await expect(
      performSave({
        state: LOADED_WITH_A,
        ...spies({
          putConfiguration: async () => {
            throw boom;
          },
        }).deps,
      }),
    ).rejects.toBe(boom);
  });

  it("does NOT fall back to the two-PUT path on a 5xx", async () => {
    // Falling back here would reintroduce the exact half-save the aggregate
    // endpoint exists to prevent.
    const s = spies({
      putConfiguration: async () => {
        throw new HubApiError(503, "unavailable");
      },
    });
    await expect(performSave({ state: LOADED_WITH_A, ...s.deps })).rejects.toBeInstanceOf(
      HubApiError,
    );
    expect(s.calls.tenant).toBe(0);
    expect(s.calls.professional).toEqual([]);
  });

  it("does NOT fall back on a 422 validation error", async () => {
    const s = spies({
      putConfiguration: async () => {
        throw new HubApiError(422, "invalid");
      },
    });
    await expect(performSave({ state: LOADED_WITH_A, ...s.deps })).rejects.toBeInstanceOf(
      HubApiError,
    );
    expect(s.calls.tenant).toBe(0);
  });

  it("does NOT fall back on a network error with no status", async () => {
    const s = spies({
      putConfiguration: async () => {
        throw new TypeError("Failed to fetch");
      },
    });
    await expect(performSave({ state: LOADED_WITH_A, ...s.deps })).rejects.toBeInstanceOf(
      TypeError,
    );
    expect(s.calls.tenant).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Legacy fallback — only for a backend that genuinely lacks the route
// ---------------------------------------------------------------------------

describe("legacy fallback", () => {
  const missingRoute = async () => {
    throw new HubApiError(404, "Not Found");
  };

  it("recognises only a missing route as a version mismatch", () => {
    expect(isLegacyBackend(new HubApiError(404, "Not Found"))).toBe(true);
    expect(isLegacyBackend(new HubApiError(405, "Method Not Allowed"))).toBe(true);
    expect(isLegacyBackend(new HubApiError(500, "boom"))).toBe(false);
    expect(isLegacyBackend(new HubApiError(422, "invalid"))).toBe(false);
    expect(isLegacyBackend(new TypeError("Failed to fetch"))).toBe(false);
  });

  it("falls back to the two PUTs when the aggregate route is absent", async () => {
    const s = spies({ putConfiguration: missingRoute });
    const result = await performSave({ state: LOADED_WITH_A, ...s.deps });

    expect(result.status).toBe("saved");
    if (result.status === "saved") expect(result.mode).toBe("legacy");
    expect(s.calls.tenant).toBe(1);
    expect(s.calls.professional).toEqual([PROF_A]);
  });

  it("saves only the tenant when nobody is selected", async () => {
    const s = spies({ putConfiguration: missingRoute });
    const result = await performSave({ state: LOADED_NO_PROFESSIONAL, ...s.deps });

    expect(result.status).toBe("saved");
    if (result.status === "saved") expect(result.professional).toBeNull();
    expect(s.calls.tenant).toBe(1);
    expect(s.calls.professional).toEqual([]);
  });

  it("reports a HALF-SAVE as partial, naming which half landed", async () => {
    // The one case the aggregate endpoint makes impossible, and the reason the
    // fallback must never claim atomicity.
    const persisted = tenantWire({ greeting_message: "tenant já gravado" });
    const cause = new HubApiError(500, "professional PUT failed");
    const result = await performSave({
      state: LOADED_WITH_A,
      ...spies({
        putConfiguration: missingRoute,
        putTenant: async () => persisted,
        putProfessional: async () => {
          throw cause;
        },
      }).deps,
    });

    expect(result.status).toBe("partial");
    if (result.status === "partial") {
      expect(result.mode).toBe("legacy");
      expect(result.tenant).toBe(persisted);
      expect(result.professionalId).toBe(PROF_A);
      expect(result.cause).toBe(cause);
    }
  });

  it("throws (rather than reporting partial) when the tenant PUT itself fails", async () => {
    // Nothing was written, so this is a plain failure — not a half-save.
    const s = spies({
      putConfiguration: missingRoute,
      putTenant: async () => {
        throw new HubApiError(500, "tenant PUT failed");
      },
    });
    await expect(performSave({ state: LOADED_WITH_A, ...s.deps })).rejects.toBeInstanceOf(
      HubApiError,
    );
    expect(s.calls.professional).toEqual([]);
  });

  it("has copy that names both halves", () => {
    expect(PARTIAL_SAVE_MESSAGE).toContain("clínica");
    expect(PARTIAL_SAVE_MESSAGE).toContain("profissional");
  });

  it("retries only the professional half, never re-sending the tenant patch", async () => {
    const s = spies();
    await retryProfessionalOnly(s.deps, PROF_A);
    expect(s.calls.professional).toEqual([PROF_A]);
    expect(s.calls.tenant).toBe(0);
    expect(s.calls.configuration).toEqual([]);
  });
});


// ---------------------------------------------------------------------------
// Publishing services into the clinic catalog, and the calendar run.
//
// The order matters and is asserted: the catalog write has to happen BEFORE
// the config write, because the payload carries the ids it produces. Get that
// backwards and every save writes unlinked entries, which is exactly the
// pre-catalog state the round exists to leave.
// ---------------------------------------------------------------------------

describe("publishing services before the config write", () => {
  it("publishes first, then sends the ids it got back", async () => {
    const order: string[] = [];
    const s = spies({
      publishServices: async () => {
        order.push("publish");
        return { linked: new Map([[7, "svc-7"]]), failed: 0 };
      },
      buildProfessionalPatch: (linked?: Map<number, string>) => {
        order.push("build:" + (linked?.get(7) ?? "none"));
        return PROFESSIONAL_PATCH;
      },
      putConfiguration: async (body: unknown) => {
        order.push("put");
        return { tenant: tenantWire(), professional: professionalWire(PROF_A) };
      },
    });

    await performSave({ state: LOADED_WITH_A, ...s.deps });

    expect(order).toEqual(["publish", "build:svc-7", "put"]);
  });

  it("does not publish when no professional is selected", async () => {
    let published = 0;
    const s = spies({
      publishServices: async () => {
        published += 1;
        return { linked: new Map(), failed: 0 };
      },
    });

    await performSave({ state: LOADED_NO_PROFESSIONAL, ...s.deps });

    expect(published).toBe(0);
  });

  it("saves anyway when a publish fails, and reports how many", async () => {
    // One Save covers eight sections. A catalog hiccup must not hold the other
    // seven hostage - the leftovers stay off-catalog and the next save retries.
    const s = spies({
      publishServices: async () => ({ linked: new Map(), failed: 2 }),
    });

    const result = await performSave({ state: LOADED_WITH_A, ...s.deps });

    expect(result.status).toBe("saved");
    expect(s.calls.configuration).toHaveLength(1);
    if (result.status === "saved") expect(result.servicesNotPublished).toBe(2);
  });

  it("reports zero leftovers on the clean path", async () => {
    const s = spies();
    const result = await performSave({ state: LOADED_WITH_A, ...s.deps });
    if (result.status === "saved") expect(result.servicesNotPublished).toBe(0);
  });
});

describe("the shared_account calendar run", () => {
  it("creates the missing calendars after a successful save", async () => {
    const order: string[] = [];
    const s = spies({
      putConfiguration: async () => {
        order.push("put");
        return { tenant: tenantWire(), professional: professionalWire(PROF_A) };
      },
      shouldEnsureCalendars: true,
      ensureCalendars: async () => {
        order.push("calendars");
        return { created: 3, already: 1, failed: 0 };
      },
    });

    const result = await performSave({ state: LOADED_WITH_A, ...s.deps });

    // AFTER the config is persisted: creating agendas for a mode the server
    // rejected would leave the clinic's Google account holding calendars for a
    // setting that never took effect.
    expect(order).toEqual(["put", "calendars"]);
    if (result.status === "saved") expect(result.calendars?.created).toBe(3);
  });

  it("does not run in per_professional mode", async () => {
    let ran = 0;
    const s = spies({
      shouldEnsureCalendars: false,
      ensureCalendars: async () => {
        ran += 1;
        return { created: 0, already: 0, failed: 0 };
      },
    });

    const result = await performSave({ state: LOADED_WITH_A, ...s.deps });

    expect(ran).toBe(0);
    if (result.status === "saved") expect(result.calendars).toBeNull();
  });

  it("a Google failure never turns a successful save into an error", async () => {
    // The configuration IS saved by the time this runs. Reporting a failure
    // would send the user back to re-save something already live. A 503 carries
    // no `code`, so it stays an outage even with the refusal predicate wired —
    // which is what makes this a discrimination guard and not just an absence.
    const s = spies({
      shouldEnsureCalendars: true,
      calendarRefusal,
      ensureCalendars: async () => {
        throw new HubApiError(503, "Google indisponível");
      },
    });

    const result = await performSave({ state: LOADED_WITH_A, ...s.deps });

    expect(result.status).toBe("saved");
    if (result.status === "saved") expect(result.calendars).toBeNull();
  });

  // A refusal is the opposite of an outage: retrying changes nothing until the
  // clinic acts. Swallowed, it produced a green "Configuração salva" over a
  // clinic in shared_account mode with zero agendas — indistinguishable from
  // the missing-feature bug the bulk run was built to end.
  const refusals: Array<[string, number, string]> = [
    ["a token minted before the calendar.app.created scope", 409, "google_reconnect_required"],
    ["a clinic that never connected Google", 422, "clinic_calendar_not_connected"],
  ];

  for (const [name, status, code] of refusals) {
    it(`reports ${name} instead of swallowing it`, async () => {
      const s = spies({
        shouldEnsureCalendars: true,
        calendarRefusal,
        ensureCalendars: async () => {
          throw new HubApiError(status, "Reconecte a conta Google da clínica.", code);
        },
      });

      const result = await performSave({ state: LOADED_WITH_A, ...s.deps });

      // The save itself still succeeded — the mode IS persisted, and saying
      // otherwise would send the user back to re-save what is already live.
      expect(result.status).toBe("saved");
      if (result.status === "saved") {
        expect(result.calendars).not.toBeNull();
        expect(result.calendars?.blockedCode).toBe(code);
        expect(result.calendars?.blockedMessage).toBe("Reconecte a conta Google da clínica.");
        // No count is claimed: a thrown refusal carries no body, so what the
        // server committed before aborting is unknown here.
        expect(result.calendars?.created).toBe(0);
      }
    });
  }

  it("never runs when the save itself was refused", async () => {
    let ran = 0;
    const s = spies({
      shouldEnsureCalendars: true,
      ensureCalendars: async () => {
        ran += 1;
        return { created: 0, already: 0, failed: 0 };
      },
    });

    const result = await performSave({ state: INITIAL_HYDRATION_STATE, ...s.deps });

    expect(result.status).toBe("blocked");
    expect(ran).toBe(0);
  });
});
