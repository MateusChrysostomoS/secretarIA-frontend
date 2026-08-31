import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../manage-api";

// ---------------------------------------------------------------------------
// Test harness: manage-api.ts guards session-persistence paths on
// `typeof window === "undefined"`, so every test needs a fake `window` +
// `sessionStorage` installed BEFORE the module is imported. The module also
// keeps a module-level single-flight variable (`refreshInFlight`), so each
// test gets a fresh module instance via vi.resetModules() + dynamic import.
// ---------------------------------------------------------------------------

type ManageApiModule = typeof import("../manage-api");

let api: ManageApiModule;
let fetchMock: ReturnType<typeof vi.fn>;

function makeSessionStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

beforeEach(async () => {
  vi.resetModules();

  const sessionStorageMock = makeSessionStorage();
  (globalThis as any).sessionStorage = sessionStorageMock;
  (globalThis as any).window = {
    sessionStorage: sessionStorageMock,
    location: { assign: vi.fn() },
  };
  (globalThis as any).atob = (b64: string) =>
    Buffer.from(b64, "base64").toString("binary");

  fetchMock = vi.fn();
  (globalThis as any).fetch = fetchMock;

  api = await import("../manage-api");
});

// --- helpers ---------------------------------------------------------------

function mockResponse(status: number, body: unknown, statusText = ""): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function b64url(raw: string): string {
  return Buffer.from(raw)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function makeJwt(payload: Record<string, unknown>): string {
  const header = b64url(JSON.stringify({ alg: "none", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  return `${header}.${body}.signature`;
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    token: "old",
    tenantId: "t1",
    email: "doc@clinic.com",
    role: "doctor",
    refreshToken: "r1",
    ...overrides,
  };
}

function entitlementBody() {
  return {
    tenant_id: "t1",
    clinic_name: "Clinic",
    products: { precheck: true, secretaria: false },
    plan: "precheck",
    secretaria_tier: null,
    status: "active",
    addons: {},
    limits: {},
    usage: {},
  };
}

async function expectManageError(
  promise: Promise<unknown>,
  status: number,
  message?: string,
) {
  let threw = false;
  try {
    await promise;
  } catch (err) {
    threw = true;
    expect(err).toBeInstanceOf(api.ManageApiError);
    expect((err as InstanceType<ManageApiModule["ManageApiError"]>).status).toBe(
      status,
    );
    if (message !== undefined) {
      expect((err as Error).message).toBe(message);
    }
  }
  expect(threw).toBe(true);
}

// ---------------------------------------------------------------------------
// refresh-and-retry (via getEntitlements — GET /entitlements does NOT start
// with "/auth/", so it is eligible for the transparent-refresh guard; getMe
// is NOT, see "surprises" in the final report)
// ---------------------------------------------------------------------------

describe("manageFetch refresh-and-retry", () => {
  it("1. happy retry: 401 -> refresh 200 -> retried call 200; session updated", async () => {
    const session = makeSession({ token: "old", refreshToken: "r1" });
    api.saveSession(session);

    fetchMock
      .mockResolvedValueOnce(mockResponse(401, { detail: "token_expired" }))
      .mockResolvedValueOnce(
        mockResponse(200, {
          access_token: "new-jwt",
          token_type: "bearer",
          refresh_token: "r2",
          expires_in: 1800,
        }),
      )
      .mockResolvedValueOnce(mockResponse(200, entitlementBody()));

    const result = await api.getEntitlements(session);

    expect(result.plan).toBe("precheck");
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const call1 = fetchMock.mock.calls[0];
    expect(call1[0]).toBe("/entitlements");
    expect(call1[1].headers.Authorization).toBe("Bearer old");

    const call2 = fetchMock.mock.calls[1];
    expect(call2[0]).toBe("/auth/refresh");
    expect(call2[1].method).toBe("POST");
    expect(JSON.parse(call2[1].body)).toEqual({ refresh_token: "r1" });

    const call3 = fetchMock.mock.calls[2];
    expect(call3[0]).toBe("/entitlements");
    expect(call3[1].headers.Authorization).toBe("Bearer new-jwt");

    const stored = JSON.parse(sessionStorage.getItem(api.SESSION_KEY)!);
    expect(stored.token).toBe("new-jwt");
    expect(stored.refreshToken).toBe("r2");
  });

  it("2. refresh rejection: 401 -> refresh 401 -> clears session, redirects to /login", async () => {
    const session = makeSession({ token: "old", refreshToken: "r1" });
    api.saveSession(session);

    fetchMock
      .mockResolvedValueOnce(mockResponse(401, { detail: "token_expired" }))
      .mockResolvedValueOnce(mockResponse(401, { detail: "refresh_token_revoked" }));

    await expectManageError(api.getEntitlements(session), 401);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sessionStorage.getItem(api.SESSION_KEY)).toBeNull();
    expect(sessionStorage.getItem(api.IMPERSONATION_KEY)).toBeNull();
    expect((window as any).location.assign).toHaveBeenCalledWith("/");
  });

  it("3. retry-once: 401 -> refresh 200 -> retried call 401 again -> rejects, no second refresh", async () => {
    const session = makeSession({ token: "old", refreshToken: "r1" });
    api.saveSession(session);

    fetchMock
      .mockResolvedValueOnce(mockResponse(401, { detail: "token_expired" }))
      .mockResolvedValueOnce(
        mockResponse(200, {
          access_token: "new-jwt",
          token_type: "bearer",
          refresh_token: "r2",
          expires_in: 1800,
        }),
      )
      .mockResolvedValueOnce(mockResponse(401, { detail: "token_expired" }));

    await expectManageError(api.getEntitlements(session), 401);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("4. no refresh token -> no refresh attempt", async () => {
    const session = makeSession({ token: "old", refreshToken: undefined });
    api.saveSession(session);

    fetchMock.mockResolvedValueOnce(mockResponse(401, { detail: "token_expired" }));

    await expectManageError(api.getEntitlements(session), 401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("5. single-flight: two concurrent 401s share one /auth/refresh call", async () => {
    const session = makeSession({ token: "old", refreshToken: "r1" });
    api.saveSession(session);

    let resolveRefresh!: (res: Response) => void;
    const deferredRefresh = new Promise<Response>((resolve) => {
      resolveRefresh = resolve;
    });

    fetchMock.mockImplementation(async (url: string, opts: any) => {
      const auth = opts?.headers?.Authorization;
      if (url === "/entitlements") {
        if (auth === "Bearer old") return mockResponse(401, { detail: "token_expired" });
        if (auth === "Bearer new-jwt") return mockResponse(200, entitlementBody());
        throw new Error("unexpected auth header: " + auth);
      }
      if (url === "/auth/refresh") return deferredRefresh;
      throw new Error("unexpected url: " + url);
    });

    const p1 = api.getEntitlements(session);
    const p2 = api.getEntitlements(session);

    resolveRefresh(
      mockResponse(200, {
        access_token: "new-jwt",
        token_type: "bearer",
        refresh_token: "r2",
        expires_in: 1800,
      }),
    );

    await Promise.all([p1, p2]);

    const refreshCalls = fetchMock.mock.calls.filter(
      (c: any[]) => c[0] === "/auth/refresh",
    );
    expect(refreshCalls).toHaveLength(1);

    const retriedCalls = fetchMock.mock.calls.filter(
      (c: any[]) => c[0] === "/entitlements" && c[1]?.headers?.Authorization === "Bearer new-jwt",
    );
    expect(retriedCalls).toHaveLength(2);
  });

  it("6. token mismatch guard: passed session token != current stored token -> no refresh", async () => {
    const oldSession = makeSession({ token: "old", refreshToken: "r1" });
    api.saveSession(oldSession);
    // A different session was saved afterwards (e.g. another tab/flow refreshed
    // or replaced it) — the stored session's token no longer matches oldSession.
    const newSession = makeSession({ token: "different-token", refreshToken: "r2" });
    api.saveSession(newSession);

    fetchMock.mockResolvedValueOnce(mockResponse(401, { detail: "token_expired" }));

    await expectManageError(api.getEntitlements(oldSession), 401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// login / logout
// ---------------------------------------------------------------------------

describe("login / logout", () => {
  it("7. login stores refreshToken and decodes tenant_id/role from the JWT", async () => {
    const jwt = makeJwt({ tenant_id: "tenant-1", role: "doctor", sub: "user-1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        access_token: jwt,
        token_type: "bearer",
        refresh_token: "rtok-1",
        expires_in: 1800,
      }),
    );

    const session = await api.login("doc@clinic.com", "hunter2");

    expect(session.token).toBe(jwt);
    expect(session.refreshToken).toBe("rtok-1");
    expect(session.tenantId).toBe("tenant-1");
    expect(session.role).toBe("doctor");
    // Role-taxonomy claims default to false when absent from the JWT.
    expect(session.isOwner).toBe(false);
    expect(session.isManager).toBe(false);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/auth/token");
    expect(JSON.parse(call[1].body)).toEqual({
      email: "doc@clinic.com",
      password: "hunter2",
    });

    const stored = JSON.parse(sessionStorage.getItem(api.SESSION_KEY)!);
    expect(stored.refreshToken).toBe("rtok-1");
  });

  it("7b. login decodes is_owner/is_manager claims when present", async () => {
    const jwt = makeJwt({
      tenant_id: "tenant-1",
      role: "doctor",
      sub: "user-1",
      is_owner: true,
      is_manager: true,
    });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        access_token: jwt,
        token_type: "bearer",
        refresh_token: "rtok-1",
        expires_in: 1800,
      }),
    );

    const session = await api.login("doc@clinic.com", "hunter2");

    expect(session.isOwner).toBe(true);
    expect(session.isManager).toBe(true);
  });

  it("8. logout clears session synchronously and best-effort revokes even on network failure", async () => {
    const session = makeSession({ token: "old", refreshToken: "r1" });
    api.saveSession(session);

    fetchMock.mockRejectedValueOnce(new Error("network down"));

    const logoutPromise = api.logout();

    // Session must be cleared IMMEDIATELY — before the network call settles.
    expect(sessionStorage.getItem(api.SESSION_KEY)).toBeNull();

    await expect(logoutPromise).resolves.toBeUndefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/auth/logout");
    expect(JSON.parse(call[1].body)).toEqual({ refresh_token: "r1" });
  });
});

// ---------------------------------------------------------------------------
// billing
// ---------------------------------------------------------------------------

describe("billing", () => {
  it("9. createCheckoutSession success resolves to the Stripe url", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { url: "https://checkout.stripe.com/xyz" }),
    );

    const url = await api.createCheckoutSession(session, "precheck", [
      "reactivation_pack",
    ]);

    expect(url).toBe("https://checkout.stripe.com/xyz");
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/billing/checkout");
    expect(call[1].method).toBe("POST");
    expect(JSON.parse(call[1].body)).toEqual({
      plan: "precheck",
      addons: ["reactivation_pack"],
    });
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("10. checkout 503 billing_not_configured -> ManageApiError 503", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(503, { detail: "billing_not_configured" }),
    );

    await expectManageError(
      api.createCheckoutSession(session, "precheck"),
      503,
      "billing_not_configured",
    );
  });

  it("11. checkout 422 -> ManageApiError 422", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        422,
        { detail: [{ loc: ["body", "plan"], msg: "invalid", type: "value_error" }] },
        "Unprocessable Entity",
      ),
    );

    await expectManageError(api.createCheckoutSession(session, "not-a-plan"), 422);
  });

  it("12. createPortalSession 409 no_billing_account -> ManageApiError 409", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(409, { detail: "no_billing_account" }),
    );

    await expectManageError(
      api.createPortalSession(session),
      409,
      "no_billing_account",
    );
  });
});

// ---------------------------------------------------------------------------
// PreCheck billing — usage/top-up/upgrade (Feature: PreCheck billing portal)
// ---------------------------------------------------------------------------

describe("getPrecheckBillingUsage", () => {
  function usageBody(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      plan: "precheck_basic",
      plan_name: "PreCheck Basic",
      precheck_enabled: true,
      enforced: true,
      quota: 100,
      used: 40,
      remaining: 60,
      topup_credits: 0,
      topup_expires_at: null,
      window_start: "2026-08-01T00:00:00Z",
      window_end: "2026-08-31T23:59:59Z",
      spend: { topup_cents: 0, topup_count: 0, currency: "brl" },
      ...overrides,
    };
  }

  it("GETs /billing/precheck/usage authenticated and resolves the payload as-is", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(200, usageBody()));

    const result = await api.getPrecheckBillingUsage(session);

    expect(result).toEqual(usageBody());
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/billing/precheck/usage");
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("resolves null on a non-200 response instead of throwing (optional-fetch idiom)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(500, { detail: "server_error" }));

    await expect(api.getPrecheckBillingUsage(session)).resolves.toBeNull();
  });

  it("resolves null on a network failure instead of rejecting", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(api.getPrecheckBillingUsage(session)).resolves.toBeNull();
  });
});

describe("createPrecheckTopupSession", () => {
  it("POSTs { quantity } to /billing/precheck/topup authenticated and resolves the Stripe url", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { url: "https://checkout.stripe.com/topup-abc" }),
    );

    const url = await api.createPrecheckTopupSession(session, 12);

    expect(url).toBe("https://checkout.stripe.com/topup-abc");
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/billing/precheck/topup");
    expect(call[1].method).toBe("POST");
    // The per-unit price means the QUANTITY is the purchase — it has to reach the API.
    expect(JSON.parse(call[1].body)).toEqual({ quantity: 12 });
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("503 billing unconfigured -> ManageApiError 503", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(503, { detail: "billing_not_configured" }));

    await expectManageError(
      api.createPrecheckTopupSession(session, 10),
      503,
      "billing_not_configured",
    );
  });

  it("409 plan not precheck -> ManageApiError 409", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(409, { detail: "plan_not_precheck" }));

    await expectManageError(api.createPrecheckTopupSession(session, 10), 409, "plan_not_precheck");
  });

  it("422 quantity_below_minimum -> ManageApiError 422 (server bounds are the enforcement point)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(422, { detail: "quantity_below_minimum" }));

    await expectManageError(
      api.createPrecheckTopupSession(session, 4),
      422,
      "quantity_below_minimum",
    );
  });
});

describe("upgradePrecheckPlan", () => {
  it("POSTs { plan } to /billing/precheck/upgrade authenticated and resolves the fresh usage payload", async () => {
    const session = makeSession({ token: "tok1" });
    const fresh = {
      plan: "precheck_advanced",
      plan_name: "PreCheck Advanced",
      precheck_enabled: true,
      enforced: true,
      quota: 300,
      used: 40,
      remaining: 260,
      topup_credits: 0,
      topup_expires_at: null,
      window_start: "2026-08-01T00:00:00Z",
      window_end: "2026-08-31T23:59:59Z",
      spend: { topup_cents: 0, topup_count: 0, currency: "brl" },
    };
    fetchMock.mockResolvedValueOnce(mockResponse(200, fresh));

    const result = await api.upgradePrecheckPlan(session, "precheck_advanced");

    expect(result).toEqual(fresh);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/billing/precheck/upgrade");
    expect(call[1].method).toBe("POST");
    expect(JSON.parse(call[1].body)).toEqual({ plan: "precheck_advanced" });
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("409 already_on_plan -> ManageApiError 409", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(409, { detail: "already_on_plan" }));

    await expectManageError(
      api.upgradePrecheckPlan(session, "precheck_advanced"),
      409,
      "already_on_plan",
    );
  });

  it("409 no_active_subscription -> ManageApiError 409", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(409, { detail: "no_active_subscription" }));

    await expectManageError(
      api.upgradePrecheckPlan(session, "precheck_advanced"),
      409,
      "no_active_subscription",
    );
  });

  it("422 invalid plan -> ManageApiError 422", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(
        422,
        { detail: [{ loc: ["body", "plan"], msg: "invalid" }] },
        "Unprocessable Entity",
      ),
    );

    await expectManageError(api.upgradePrecheckPlan(session, "precheck_advanced"), 422);
  });
});

// ---------------------------------------------------------------------------
// catalogRequiresWhatsappCoexistence — truth table backing the pre-checkout
// disclosure's PreCheck-only exclusion (CheckoutTrialNotice)
// ---------------------------------------------------------------------------

describe("catalogRequiresWhatsappCoexistence", () => {
  it("PreCheck-only catalog -> false (no secretarIA, no Coexistence promise)", () => {
    expect(api.catalogRequiresWhatsappCoexistence(["precheck"])).toBe(false);
  });

  it("any secretaria_* plan id -> true", () => {
    expect(api.catalogRequiresWhatsappCoexistence(["secretaria_basico"])).toBe(true);
    // Prefix-based (id.startsWith("secretaria")), not a fixed-list lookup — proven with
    // a non-real id so this doesn't silently pass only because "basico" is the one real id.
    expect(api.catalogRequiresWhatsappCoexistence(["secretaria_anything"])).toBe(true);
  });

  it("complete_clinic_combo -> true", () => {
    expect(api.catalogRequiresWhatsappCoexistence(["complete_clinic_combo"])).toBe(true);
  });

  it("mixed list matches if ANY id qualifies", () => {
    expect(
      api.catalogRequiresWhatsappCoexistence(["precheck", "secretaria_basico"]),
    ).toBe(true);
  });

  it("empty list or unrelated ids -> false", () => {
    expect(api.catalogRequiresWhatsappCoexistence([])).toBe(false);
    expect(api.catalogRequiresWhatsappCoexistence(["reactivation_pack"])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// secretarIA hub token
// ---------------------------------------------------------------------------

describe("getSecretariaHubToken", () => {
  it("13a. maps { hub_token, expires_in } -> { hubToken, expiresIn }", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { hub_token: "hub-abc", token_type: "bearer", expires_in: 600 }),
    );

    const result = await api.getSecretariaHubToken(session);
    expect(result).toEqual({ hubToken: "hub-abc", expiresIn: 600 });
  });

  it("13b. 403 secretaria_not_entitled -> ManageApiError 403", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(403, { detail: "secretaria_not_entitled" }),
    );

    await expectManageError(
      api.getSecretariaHubToken(session),
      403,
      "secretaria_not_entitled",
    );
  });
});

// ---------------------------------------------------------------------------
// Self-service cold signup (public, unauthenticated) — CONTRACTS §14
// ---------------------------------------------------------------------------

describe("getCheckoutTrialDays", () => {
  it("18a. 200 with a valid trial_period_days resolves the number, unauthenticated", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { trial_period_days: 75 }));

    const result = await api.getCheckoutTrialDays();

    expect(result).toBe(75);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/public/checkout-config");
    expect(call[1].headers.Authorization).toBeUndefined();
  });

  it("18b. non-200 response resolves null instead of throwing", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(500, { detail: "server_error" }));

    await expect(api.getCheckoutTrialDays()).resolves.toBeNull();
  });

  it("18c. malformed body (non-numeric trial_period_days) resolves null", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { trial_period_days: "75" }));

    await expect(api.getCheckoutTrialDays()).resolves.toBeNull();
  });

  it("18d. network failure resolves null instead of rejecting", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(api.getCheckoutTrialDays()).resolves.toBeNull();
  });

  it("18e. trial_period_days === 0 resolves 0 (caller renders nothing, not a fetch failure)", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { trial_period_days: 0 }));

    await expect(api.getCheckoutTrialDays()).resolves.toBe(0);
  });
});

describe("getCheckoutConfig", () => {
  it("resolves trial_period_days + addons, unauthenticated", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        trial_period_days: 30,
        addons: [
          { id: "analytics_bi_advanced", available: true },
          { id: "pix_deposit", available: false },
        ],
      }),
    );

    const result = await api.getCheckoutConfig();

    expect(result).toEqual({
      trial_period_days: 30,
      addons: [
        { id: "analytics_bi_advanced", available: true },
        { id: "pix_deposit", available: false },
      ],
    });
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/public/checkout-config");
    expect(call[1].headers.Authorization).toBeUndefined();
  });

  it("missing addons field defaults to an empty array (backend not deployed yet)", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(200, { trial_period_days: 30 }));

    const result = await api.getCheckoutConfig();

    expect(result).toEqual({ trial_period_days: 30, addons: [] });
  });

  it("malformed addon entries are dropped, valid ones kept", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        trial_period_days: 30,
        addons: [
          { id: "pix_deposit", available: true },
          { id: "no_available_field" },
          { available: true },
          "not-an-object",
          null,
        ],
      }),
    );

    const result = await api.getCheckoutConfig();

    expect(result).toEqual({
      trial_period_days: 30,
      addons: [{ id: "pix_deposit", available: true }],
    });
  });

  it("non-200 response resolves null instead of throwing", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(500, { detail: "server_error" }));

    await expect(api.getCheckoutConfig()).resolves.toBeNull();
  });

  it("network failure resolves null instead of rejecting", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(api.getCheckoutConfig()).resolves.toBeNull();
  });

  it("malformed trial_period_days resolves null even when addons is well-formed", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { trial_period_days: null, addons: [{ id: "pix_deposit", available: true }] }),
    );

    await expect(api.getCheckoutConfig()).resolves.toBeNull();
  });
});

describe("registerSignup", () => {
  it("14a. registers unauthenticated with the password, returns intentId + a decoded session, persists nothing itself", async () => {
    // A fresh signup mints the clinic's owner — is_owner true on the claim.
    const jwt = makeJwt({ tenant_id: "tenant-1", role: "doctor", is_owner: true, sub: "user-1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(201, {
        intent_id: "intent-1",
        session: {
          access_token: jwt,
          token_type: "bearer",
          refresh_token: "rtok-1",
          expires_in: 1800,
        },
      }),
    );

    const result = await api.registerSignup({
      name: "Dr. Aurélio Lima",
      clinic_name: "Consultório Aurélio",
      email: "aurelio@clinica.com.br",
      whatsapp_phone: "+5511999998888",
      password: "signup123",
      catalog_ids: ["precheck"],
      website: "",
    });

    expect(result.intentId).toBe("intent-1");
    expect(result.session.token).toBe(jwt);
    expect(result.session.refreshToken).toBe("rtok-1");
    expect(result.session.tenantId).toBe("tenant-1");
    expect(result.session.role).toBe("doctor");
    expect(result.session.isOwner).toBe(true);
    // Email comes from the submitted payload (the access token carries no email claim).
    expect(result.session.email).toBe("aurelio@clinica.com.br");

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/public/signup-intents");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers.Authorization).toBeUndefined();
    expect(JSON.parse(call[1].body)).toEqual({
      name: "Dr. Aurélio Lima",
      clinic_name: "Consultório Aurélio",
      email: "aurelio@clinica.com.br",
      whatsapp_phone: "+5511999998888",
      password: "signup123",
      catalog_ids: ["precheck"],
      website: "",
    });

    // Unlike login(), registerSignup does NOT persist — the caller (wizard) saves it.
    expect(sessionStorage.getItem(api.SESSION_KEY)).toBeNull();
  });

  it("14b. 409 email_already_registered -> ManageApiError 409", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(409, { detail: "email_already_registered" }),
    );

    await expectManageError(
      api.registerSignup({
        name: "n",
        clinic_name: "c",
        email: "e@x.com",
        whatsapp_phone: "+551199999999",
        password: "signup123",
        catalog_ids: ["precheck"],
      }),
      409,
      "email_already_registered",
    );
  });

  it("14c. 422 weak password / bad catalog -> ManageApiError 422", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(422, { detail: [{ loc: ["body", "password"], msg: "too weak" }] }),
    );

    await expectManageError(
      api.registerSignup({
        name: "n",
        clinic_name: "c",
        email: "e@x.com",
        whatsapp_phone: "+551199999999",
        password: "12345678",
        catalog_ids: ["precheck"],
      }),
      422,
    );
  });
});

describe("updateSignupIntentCatalog", () => {
  it("PATCHes { catalog_ids }, unauthenticated, and resolves the response body", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { intent_id: "intent-1", catalog_ids: ["secretaria_basico", "pix_deposit"] }),
    );

    const result = await api.updateSignupIntentCatalog("intent-1", [
      "secretaria_basico",
      "pix_deposit",
    ]);

    expect(result).toEqual({
      intent_id: "intent-1",
      catalog_ids: ["secretaria_basico", "pix_deposit"],
    });
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/public/signup-intents/intent-1");
    expect(call[1].method).toBe("PATCH");
    expect(call[1].headers.Authorization).toBeUndefined();
    expect(JSON.parse(call[1].body)).toEqual({
      catalog_ids: ["secretaria_basico", "pix_deposit"],
    });
  });

  it("409 intent no longer pending -> ManageApiError 409", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(409, { detail: "signup_intent_not_pending" }),
    );

    await expectManageError(
      api.updateSignupIntentCatalog("intent-1", ["secretaria_basico"]),
      409,
      "signup_intent_not_pending",
    );
  });

  it("422 invalid selection -> ManageApiError 422", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(422, { detail: [{ loc: ["body", "catalog_ids"], msg: "invalid" }] }),
    );

    await expectManageError(
      api.updateSignupIntentCatalog("intent-1", ["not-a-real-addon"]),
      422,
    );
  });
});

describe("attachSignupIntake", () => {
  it("posts the intake authenticated to /doctor/onboarding/intake (204)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(204, {}));

    await api.attachSignupIntake(session, {
      whatsapp_usage: "business_recent",
      prior_api: "no",
      fb_page: "yes_admin",
    });

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/doctor/onboarding/intake");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
    expect(JSON.parse(call[1].body)).toEqual({
      whatsapp_usage: "business_recent",
      prior_api: "no",
      fb_page: "yes_admin",
    });
  });
});

describe("setPassword", () => {
  it("posts { new_password } (the field the backend requires), authenticated", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(204, {}));

    await api.setPassword(session, "newpass123");

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/auth/set-password");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
    // Regression guard: the backend SetPasswordIn requires `new_password` (extra=forbid),
    // NOT `password`.
    expect(JSON.parse(call[1].body)).toEqual({ new_password: "newpass123" });
  });
});

describe("createPublicCheckoutSession", () => {
  it("15a. posts { intent_id } and resolves the checkout url", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { checkout_url: "https://checkout.stripe.com/abc" }),
    );

    const result = await api.createPublicCheckoutSession("intent-1");

    expect(result).toEqual({ checkout_url: "https://checkout.stripe.com/abc" });
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/public/checkout-sessions");
    expect(JSON.parse(call[1].body)).toEqual({ intent_id: "intent-1" });
  });

  it("15b. 503 price_not_configured:<id> -> ManageApiError 503", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(503, { detail: "price_not_configured:precheck" }),
    );

    await expectManageError(
      api.createPublicCheckoutSession("intent-1"),
      503,
      "price_not_configured:precheck",
    );
  });
});

describe("getOnboardingStatus", () => {
  it("16a. builds the query string and passes through the (rotating) response", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        status: "ready",
        products: { secretaria: true, precheck: false },
        onboarding_token: "onb-tok-1",
      }),
    );

    const result = await api.getOnboardingStatus("cs_test_123");

    expect(result).toEqual({
      status: "ready",
      products: { secretaria: true, precheck: false },
      onboarding_token: "onb-tok-1",
    });
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/public/onboarding-status?session_id=cs_test_123");
  });

  it("16b. pending status with null token", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { status: "pending", products: null, onboarding_token: null }),
    );

    const result = await api.getOnboardingStatus("cs_test_123");
    expect(result.status).toBe("pending");
    expect(result.onboarding_token).toBeNull();
  });
});

describe("exchangeOnboardingToken", () => {
  it("17a. decodes tenant_id/role from the JWT, does NOT call saveSession", async () => {
    // Post-checkout onboarding also mints the clinic's owner.
    const jwt = makeJwt({ tenant_id: "tenant-9", role: "doctor", is_owner: true, email: "new@clinic.com" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        access_token: jwt,
        token_type: "bearer",
        refresh_token: "rtok-9",
        expires_in: 1800,
      }),
    );

    const session = await api.exchangeOnboardingToken("onb-tok-1");

    expect(session.token).toBe(jwt);
    expect(session.refreshToken).toBe("rtok-9");
    expect(session.tenantId).toBe("tenant-9");
    expect(session.role).toBe("doctor");
    expect(session.isOwner).toBe(true);
    expect(session.email).toBe("new@clinic.com");

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/auth/exchange-onboarding-token");
    expect(JSON.parse(call[1].body)).toEqual({ token: "onb-tok-1" });

    // Unlike login(), this must NOT persist the session — the caller decides.
    expect(sessionStorage.getItem(api.SESSION_KEY)).toBeNull();
  });

  it("17b. 401 invalid_onboarding_token -> ManageApiError 401", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(401, { detail: "invalid_onboarding_token" }),
    );

    await expectManageError(
      api.exchangeOnboardingToken("bad-token"),
      401,
      "invalid_onboarding_token",
    );
  });
});

// ---------------------------------------------------------------------------
// admin — tenant cascade delete
// ---------------------------------------------------------------------------

describe("adminDeleteTenant", () => {
  it("18. DELETEs the tenant path with the admin bearer and returns the result", async () => {
    const session = makeSession({ token: "admtok", role: "admin" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        tenant_id: "ten-9",
        deleted: { users: 2, entitlements: 1, refresh_tokens: 3 },
        secretaria: { status: "skipped_unconfigured" },
      }),
    );

    const result = await api.adminDeleteTenant(session, "ten-9");

    expect(result.tenant_id).toBe("ten-9");
    expect(result.deleted.users).toBe(2);
    expect(result.secretaria.status).toBe("skipped_unconfigured");

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/admin/tenants/ten-9");
    expect(call[1].method).toBe("DELETE");
    expect(call[1].headers.Authorization).toBe("Bearer admtok");
  });

  it("18b. 404 unknown tenant -> ManageApiError 404", async () => {
    const session = makeSession({ token: "admtok", role: "admin" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(404, { detail: "Tenant not found" }),
    );

    await expectManageError(
      api.adminDeleteTenant(session, "missing"),
      404,
      "Tenant not found",
    );
  });
});

// ---------------------------------------------------------------------------
// Doctor appointments / patients — /app dashboard SecretariaPanel data-truth pass
// ---------------------------------------------------------------------------

describe("listDoctorAppointments", () => {
  it("GETs /doctor/appointments with skip/limit and the bearer, resolves { data }", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        data: [
          {
            id: "appt-1",
            patient_id: "pat-1",
            appointment_type: "Retorno",
            start_at: "2026-07-22T11:00:00Z",
            end_at: "2026-07-22T11:30:00Z",
            status: "confirmed",
            phone: "+5511999998888",
          },
        ],
      }),
    );

    const result = await api.listDoctorAppointments(session, 0, 100);

    expect(result.data).toHaveLength(1);
    expect(result.data[0].status).toBe("confirmed");
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/doctor/appointments?skip=0&limit=100");
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("defaults to skip=0, limit=100 when omitted", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(200, { data: [] }));

    await api.listDoctorAppointments(session);

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/doctor/appointments?skip=0&limit=100");
  });

  it("degraded mesh: 200 with { data: [], stub: true } resolves normally, not an error", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(200, { data: [], stub: true }));

    const result = await api.listDoctorAppointments(session);

    expect(result).toEqual({ data: [], stub: true });
  });

  it("upstream failure -> ManageApiError 502", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(502, { detail: "secretaria upstream error" }),
    );

    await expectManageError(
      api.listDoctorAppointments(session),
      502,
      "secretaria upstream error",
    );
  });
});

describe("listDoctorPatients", () => {
  it("GETs /doctor/patients with skip/limit and the bearer, resolves { data }", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        data: [
          {
            id: "pat-1",
            name: "Maria Souza",
            wa_id: "5511999999999",
            created_at: "2026-07-01T10:00:00Z",
          },
        ],
      }),
    );

    const result = await api.listDoctorPatients(session, 0, 100);

    expect(result.data).toEqual([
      {
        id: "pat-1",
        name: "Maria Souza",
        wa_id: "5511999999999",
        created_at: "2026-07-01T10:00:00Z",
      },
    ]);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/doctor/patients?skip=0&limit=100");
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("upstream failure -> ManageApiError 502", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(502, { detail: "secretaria upstream error" }),
    );

    await expectManageError(
      api.listDoctorPatients(session),
      502,
      "secretaria upstream error",
    );
  });
});

// ---------------------------------------------------------------------------
// Secretaries — the clinic's human receptionists (secretary role, 2026-08-14)
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// getDoctorProfessionals — per-session cache + single-flight.
//
// The bug this locks down: the endpoint has two INDEPENDENT consumers per
// screen (/configuracao's hydrate() and the <ConfigGapBanner> it renders), so
// one mount fired the same GET twice. Every test here counts fetchMock calls,
// because "how many requests hit the network" is the whole point.
//
// beforeEach already does vi.resetModules() + a fresh dynamic import, so the
// module-level cache/in-flight/epoch Maps start empty in every test.
// ---------------------------------------------------------------------------

function professionalRow(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    id,
    name: `Dra. ${id}`,
    is_active: true,
    has_calendar: true,
    has_hours: true,
    has_services: true,
    complete: true,
    linked_user_email: null,
    invite_pending: false,
    ...overrides,
  };
}

describe("getDoctorProfessionals — cache + single-flight", () => {
  it("concurrent callers share ONE request (the /configuracao double-fetch)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1")] }),
    );

    // Started before either resolves — exactly how the page and the banner
    // race on a real mount.
    const [a, b] = await Promise.all([
      api.getDoctorProfessionals(session),
      api.getDoctorProfessionals(session),
    ]);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/doctor/professionals");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe("Bearer tok1");
    expect(a).toEqual(b);
    expect(a[0].id).toBe("p-1");
  });

  it("a caller arriving after the first RESOLVED is still served from memory", async () => {
    // Single-flight alone would miss this one: the two consumers are gated on
    // the same hub-token signal but need not land in the same React commit.
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1")] }),
    );

    await api.getDoctorProfessionals(session);
    const second = await api.getDoctorProfessionals(session);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(second[0].id).toBe("p-1");
  });

  it("goes back to the network once the short TTL has passed", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1")] }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-2")] }),
    );

    const realNow = Date.now();
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(realNow);
    try {
      await api.getDoctorProfessionals(session);
      nowSpy.mockReturnValue(realNow + 60_000); // well past PROFESSIONALS_TTL_MS
      const fresh = await api.getDoctorProfessionals(session);

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(fresh[0].id).toBe("p-2");
    } finally {
      nowSpy.mockRestore();
    }
  });

  it("refetches after invalidateDoctorProfessionals (the reloadRoster path)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1")] }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1"), professionalRow("p-2")] }),
    );

    const before = await api.getDoctorProfessionals(session);
    expect(before).toHaveLength(1);

    // Stands in for an invite accepted / self-bind / calendar connected.
    api.invalidateDoctorProfessionals(session);
    const after = await api.getDoctorProfessionals(session);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(after).toHaveLength(2);
  });

  it("invalidation also drops an IN-FLIGHT read, so nobody joins a stale one", async () => {
    // The subtle half: a request that started BEFORE the mutation resolves with
    // the pre-mutation roster. Clearing only the cache would let reloadRoster
    // join it and show the roster it was called to refresh away.
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1")] }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1"), professionalRow("p-2")] }),
    );

    const started = api.getDoctorProfessionals(session); // in flight
    api.invalidateDoctorProfessionals(session); // mutation lands mid-flight
    const afterMutation = api.getDoctorProfessionals(session);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    // Whoever asked before the change keeps the answer to the question it asked.
    expect(await started).toHaveLength(1);
    expect(await afterMutation).toHaveLength(2);
  });

  it("a superseded read never republishes its stale rows to the cache", async () => {
    // Same race as above, but with the OLD request resolving LAST. Without the
    // epoch guard it would overwrite the fresh roster for the rest of the TTL.
    const session = makeSession({ token: "tok1" });
    let releaseStale: (r: Response) => void = () => {};
    const stale = new Promise<Response>((resolve) => {
      releaseStale = resolve;
    });
    fetchMock.mockReturnValueOnce(stale); // the slow, pre-mutation one
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1"), professionalRow("p-2")] }),
    );

    const superseded = api.getDoctorProfessionals(session);
    api.invalidateDoctorProfessionals(session);
    expect(await api.getDoctorProfessionals(session)).toHaveLength(2);

    releaseStale(mockResponse(200, { items: [professionalRow("p-1")] }));
    expect(await superseded).toHaveLength(1); // its own caller, its own answer

    // A third consumer within the TTL must still see the POST-mutation roster,
    // and must not have paid for another request to get it.
    expect(await api.getDoctorProfessionals(session)).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("is keyed by session — a second clinic never reads the first one's roster", async () => {
    // Login is a route push, so one tab can hold two clinics' sessions inside a
    // single page lifetime. An unkeyed cache would serve tenant A's roster to B.
    const a = makeSession({ tenantId: "t1", token: "tok-a" });
    const b = makeSession({ tenantId: "t2", token: "tok-b" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("clinic-a-prof")] }),
    );
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("clinic-b-prof")] }),
    );

    expect((await api.getDoctorProfessionals(a))[0].id).toBe("clinic-a-prof");
    expect((await api.getDoctorProfessionals(b))[0].id).toBe("clinic-b-prof");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe("Bearer tok-b");
    // And invalidating one clinic must not evict the other.
    api.invalidateDoctorProfessionals(b);
    expect((await api.getDoctorProfessionals(a))[0].id).toBe("clinic-a-prof");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("hands every caller its OWN array, so one consumer cannot reorder another's", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1"), professionalRow("p-2")] }),
    );

    const first = await api.getDoctorProfessionals(session);
    first.reverse(); // a consumer sorting the roster for display
    const second = await api.getDoctorProfessionals(session);

    expect(second.map((p) => p.id)).toEqual(["p-1", "p-2"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failure — the next caller retries", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockRejectedValueOnce(new Error("network down"));
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { items: [professionalRow("p-1")] }),
    );

    await expect(api.getDoctorProfessionals(session)).rejects.toThrow("network down");
    expect((await api.getDoctorProfessionals(session))[0].id).toBe("p-1");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("still unwraps { items }, tolerates a bare array, and never returns a non-array", async () => {
    // Pre-existing contract, unchanged by the cache: a non-array reaching the
    // Configuração page throws during render and blanks the screen.
    const session = makeSession({ token: "tok1" });

    fetchMock.mockResolvedValueOnce(mockResponse(200, [professionalRow("p-1")]));
    expect(await api.getDoctorProfessionals(session)).toHaveLength(1);

    api.invalidateDoctorProfessionals(session);
    fetchMock.mockResolvedValueOnce(mockResponse(200, { unexpected: "shape" }));
    expect(await api.getDoctorProfessionals(session)).toEqual([]);

    api.invalidateDoctorProfessionals(session);
    fetchMock.mockResolvedValueOnce(mockResponse(200, { items: "not a list" }));
    expect(await api.getDoctorProfessionals(session)).toEqual([]);
  });
});

describe("getDoctorSecretaries", () => {
  it("GETs /doctor/secretaries with the bearer and unwraps the { items } envelope", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        items: [
          {
            user_id: "u-1",
            name: "Rita Andrade",
            email: "recepcao@clinica.com.br",
            invite_pending: true,
            created_at: "2026-08-14T10:00:00Z",
          },
        ],
      }),
    );

    const result = await api.getDoctorSecretaries(session);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Rita Andrade");
    expect(result[0].invite_pending).toBe(true);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/doctor/secretaries");
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("tolerates a bare array and a malformed body (never a non-array into render)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(mockResponse(200, []));
    expect(await api.getDoctorSecretaries(session)).toEqual([]);

    fetchMock.mockResolvedValueOnce(mockResponse(200, { unexpected: "shape" }));
    expect(await api.getDoctorSecretaries(session)).toEqual([]);
  });
});

describe("createSecretaryInvite", () => {
  it("POSTs name+email only (no specialty) and resolves the invite link", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(201, { invite_link: "https://app.brain.co/convite?token=abc" }),
    );

    const result = await api.createSecretaryInvite(session, {
      name: "Rita Andrade",
      email: "recepcao@clinica.com.br",
    });

    expect(result.invite_link).toBe("https://app.brain.co/convite?token=abc");
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/doctor/secretaries/invites");
    expect(call[1].method).toBe("POST");
    expect(JSON.parse(call[1].body)).toEqual({
      name: "Rita Andrade",
      email: "recepcao@clinica.com.br",
    });
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("409 email_already_registered -> ManageApiError 409 (modal shows the pt-BR message)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(409, { detail: "email_already_registered" }),
    );

    await expectManageError(
      api.createSecretaryInvite(session, { name: "Rita", email: "ja@existe.com" }),
      409,
      "email_already_registered",
    );
  });
});

// ---------------------------------------------------------------------------
// Activation test window — /app/reativar (Task 2)
// ---------------------------------------------------------------------------

describe("getTestWindow", () => {
  it("GETs /doctor/onboarding/test-window authenticated and passes the shape through", async () => {
    const session = makeSession({ token: "tok1" });
    const body = {
      applicable: true,
      days_total: 14,
      started_at: "2026-07-10T12:00:00Z",
      deadline_at: "2026-07-24T12:00:00Z",
      onboarding_state: "aquecimento",
      connected_at: null,
      expired: false,
      notified: false,
      subscription_status: "trialing",
      can_restart: false,
    };
    fetchMock.mockResolvedValueOnce(mockResponse(200, body));

    const result = await api.getTestWindow(session);

    expect(result).toEqual(body);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/doctor/onboarding/test-window");
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("applicable=false (e.g. PreCheck-only plan)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        applicable: false,
        days_total: 0,
        started_at: null,
        deadline_at: null,
        onboarding_state: "ativo",
        connected_at: null,
        expired: false,
        notified: false,
        subscription_status: "active",
        can_restart: false,
      }),
    );

    const result = await api.getTestWindow(session);
    expect(result.applicable).toBe(false);
  });
});

describe("restartTestWindow", () => {
  it("POSTs the restart, authenticated, and resolves the new deadline + payment_method_present", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, {
        restarted: true,
        deadline_at: "2026-08-05T12:00:00Z",
        payment_method_present: false,
      }),
    );

    const result = await api.restartTestWindow(session);

    expect(result).toEqual({
      restarted: true,
      deadline_at: "2026-08-05T12:00:00Z",
      payment_method_present: false,
    });
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/doctor/onboarding/test-window/restart");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers.Authorization).toBe("Bearer tok1");
  });

  it("409 checkout_required -> ManageApiError 409 (caller routes to /app/billing)", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(409, { detail: "checkout_required" }),
    );

    await expectManageError(api.restartTestWindow(session), 409, "checkout_required");
  });

  it("409 test_window_not_applicable -> ManageApiError 409", async () => {
    const session = makeSession({ token: "tok1" });
    fetchMock.mockResolvedValueOnce(
      mockResponse(409, { detail: "test_window_not_applicable" }),
    );

    await expectManageError(
      api.restartTestWindow(session),
      409,
      "test_window_not_applicable",
    );
  });
});

// ---------------------------------------------------------------------------
// submitLaunchWaitlist — the pre-launch buy gate's lead capture. Unauthenticated
// (no Authorization header must ever be attached) and the ONLY network call the
// gated pricing page makes, so its failure mode matters: the modal keeps the
// visitor's data on screen and lets them retry, which depends on this rejecting
// rather than resolving.
// ---------------------------------------------------------------------------

describe("submitLaunchWaitlist", () => {
  it("POSTs /public/launch-waitlist unauthenticated and returns the confirmation", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(201, { id: "lead-1", message: "Prontinho!" }),
    );

    const result = await api.submitLaunchWaitlist({
      name: "Dr. Aurélio Lima",
      email: "voce@clinica.com.br",
      plan_hint: "secretaria_basico",
    });

    expect(result).toEqual({ id: "lead-1", message: "Prontinho!" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe("/public/launch-waitlist");
    expect(call[1].method).toBe("POST");
    expect(call[1].headers.Authorization).toBeUndefined();
    expect(JSON.parse(call[1].body)).toEqual({
      name: "Dr. Aurélio Lima",
      email: "voce@clinica.com.br",
      plan_hint: "secretaria_basico",
    });
  });

  it("sends plan_hint: null when the click carried no catalog hint", async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(201, { id: "lead-2", message: "ok" }));

    await api.submitLaunchWaitlist({
      name: "Dra. Ana",
      email: "ana@clinica.com.br",
      plan_hint: null,
    });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).plan_hint).toBeNull();
  });

  it("rate limit -> ManageApiError 429 (modal shows the retry message)", async () => {
    fetchMock.mockResolvedValueOnce(
      mockResponse(429, { detail: "Muitas solicitações. Tente novamente em instantes." }),
    );

    await expectManageError(
      api.submitLaunchWaitlist({ name: "Dr. A", email: "a@clinica.com.br" }),
      429,
    );
  });

  it("network failure rejects (never a silent success that drops the lead)", async () => {
    fetchMock.mockRejectedValueOnce(new Error("network down"));

    await expect(
      api.submitLaunchWaitlist({ name: "Dr. A", email: "a@clinica.com.br" }),
    ).rejects.toThrow("network down");
  });
});
