import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../manage-api";

// ---------------------------------------------------------------------------
// Test harness: mirrors lib/__tests__/manage-api.test.ts. secretaria-hub.ts
// keeps a module-level token cache (tokenCache/mintsInFlight), so each test
// gets a fresh module instance via vi.resetModules() + dynamic import — same
// reason manage-api.test.ts does it for its own module-level
// refreshInFlight. No window/sessionStorage stub is needed here: every path
// exercised below stays inside the 2xx/4xx happy path (no 401 retry), and
// getSecretariaHubToken/getSession are already defensive about a missing
// `window` (see manage-api.ts).
// ---------------------------------------------------------------------------

type HubModule = typeof import("../secretaria-hub");

let hub: HubModule;
let fetchMock: ReturnType<typeof vi.fn>;

function mockResponse(status: number, body: unknown, statusText = ""): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    json: async () => body,
  } as unknown as Response;
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    token: "tok1",
    tenantId: "t1",
    email: "doc@clinic.com",
    role: "doctor",
    ...overrides,
  };
}

// Every hubFetch call first mints a hub token via brain-api
// (POST /doctor/secretaria/hub-token), THEN calls the hub itself — queue the
// mint response so it's consumed as the FIRST fetch call in a test.
function mockHubTokenMint() {
  fetchMock.mockResolvedValueOnce(
    mockResponse(200, { hub_token: "hub-tok", token_type: "bearer", expires_in: 600 }),
  );
}

async function expectHubError(
  promise: Promise<unknown>,
  status: number,
  message?: string,
  code?: string,
) {
  let threw = false;
  try {
    await promise;
  } catch (err) {
    threw = true;
    expect(err).toBeInstanceOf(hub.HubApiError);
    const e = err as InstanceType<HubModule["HubApiError"]>;
    expect(e.status).toBe(status);
    if (message !== undefined) expect(e.message).toBe(message);
    expect(e.code).toBe(code);
  }
  expect(threw).toBe(true);
}

beforeEach(async () => {
  vi.resetModules();
  fetchMock = vi.fn();
  (globalThis as any).fetch = fetchMock;
  hub = await import("../secretaria-hub");
});

// ---------------------------------------------------------------------------
// HubApiError / parseHubResponse — detail: string | {code, message}
// ---------------------------------------------------------------------------

describe("hub error parsing (detail: string | {code, message})", () => {
  it("plain string detail -> .message set, .code undefined (existing behavior unchanged)", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce(mockResponse(422, { detail: "some_plain_error" }));

    await expectHubError(hub.getTenantConfig(makeSession()), 422, "some_plain_error", undefined);
  });

  it("structured {code, message} detail -> both surfaced on HubApiError", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce(
      mockResponse(409, {
        detail: {
          code: "google_reconnect_required",
          message: "A conexão da clínica com o Google Calendar não tem mais a permissão necessária.",
        },
      }),
    );

    await expectHubError(
      hub.createProfessionalCalendar(makeSession(), "prof-1"),
      409,
      "A conexão da clínica com o Google Calendar não tem mais a permissão necessária.",
      hub.HUB_ERROR_GOOGLE_RECONNECT_REQUIRED,
    );
  });

  it("malformed detail (neither string nor {message}) falls back to statusText, no code", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce(mockResponse(500, {}, "Internal Server Error"));

    await expectHubError(hub.getTenantConfig(makeSession()), 500, "Internal Server Error", undefined);
  });

  it("missing body entirely (json() throws) falls back to statusText", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      json: async () => {
        throw new Error("not json");
      },
    } as unknown as Response);

    await expectHubError(hub.getTenantConfig(makeSession()), 503, "Service Unavailable", undefined);
  });
});

// ---------------------------------------------------------------------------
// createProfessionalCalendar — POST /tenants/me/professionals/{id}/calendar
// ---------------------------------------------------------------------------

describe("createProfessionalCalendar", () => {
  it("200 created:true -> resolves the wire shape, POSTs with no body", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { professional_id: "prof-1", google_calendar_id: "cal-abc", created: true }),
    );

    const result = await hub.createProfessionalCalendar(makeSession(), "prof-1");

    expect(result).toEqual({ professional_id: "prof-1", google_calendar_id: "cal-abc", created: true });
    const [url, opts] = fetchMock.mock.calls[1];
    expect(url).toBe("/tenants/me/professionals/prof-1/calendar");
    expect(opts.method).toBe("POST");
    expect(opts.body).toBeUndefined();
  });

  it("200 created:false -> still resolves (idempotent replay, already existed)", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce(
      mockResponse(200, { professional_id: "prof-1", google_calendar_id: "cal-abc", created: false }),
    );

    const result = await hub.createProfessionalCalendar(makeSession(), "prof-1");
    expect(result.created).toBe(false);
  });

  it("422 clinic_calendar_not_connected -> HubApiError with that code", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce(
      mockResponse(422, {
        detail: { code: "clinic_calendar_not_connected", message: "Conecte a clínica primeiro." },
      }),
    );

    await expectHubError(
      hub.createProfessionalCalendar(makeSession(), "prof-1"),
      422,
      "Conecte a clínica primeiro.",
      hub.HUB_ERROR_CLINIC_CALENDAR_NOT_CONNECTED,
    );
  });
});

// ---------------------------------------------------------------------------
// google_calendar_mode round-trips through the existing config wrappers
// untouched (no new endpoint — same GET/PUT /tenants/me/config as always).
// ---------------------------------------------------------------------------

describe("google_calendar_mode on TenantConfigWire", () => {
  it("getTenantConfig passes google_calendar_mode through as-is", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce(mockResponse(200, { google_calendar_mode: "shared_account" }));

    const cfg = await hub.getTenantConfig(makeSession());
    expect(cfg.google_calendar_mode).toBe("shared_account");
  });

  it("updateTenantConfig sends google_calendar_mode in the PUT body", async () => {
    mockHubTokenMint();
    fetchMock.mockResolvedValueOnce(mockResponse(200, { google_calendar_mode: "per_professional" }));

    await hub.updateTenantConfig(makeSession(), { google_calendar_mode: "per_professional" });

    const [, opts] = fetchMock.mock.calls[1];
    expect(JSON.parse(opts.body)).toEqual({ google_calendar_mode: "per_professional" });
  });
});
