import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Session } from "../manage-api";

// ---------------------------------------------------------------------------
// signOut(navigate) backs the secretarIA product Header's "Sair" button. Same
// harness rules as manage-api.test.ts: fake window/sessionStorage installed
// before the module loads, fresh module per test via vi.resetModules().
// ---------------------------------------------------------------------------

type ManageApiModule = typeof import("../manage-api");
type SignOutModule = typeof import("../sign-out");

let api: ManageApiModule;
let signOutMod: SignOutModule;
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

  fetchMock = vi.fn();
  (globalThis as any).fetch = fetchMock;

  api = await import("../manage-api");
  signOutMod = await import("../sign-out");
});

function seedSession(overrides: Partial<Session> = {}): Session {
  const session: Session = {
    token: "tok",
    tenantId: "t1",
    email: "doc@clinic.com",
    role: "doctor",
    refreshToken: "r1",
    ...overrides,
  };
  api.saveSession(session);
  return session;
}

describe("signOut (secretarIA Header 'Sair')", () => {
  it("clears the session synchronously, revokes the refresh token, and routes to /login", async () => {
    seedSession();
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    const navigate = vi.fn();

    signOutMod.signOut(navigate);

    // Local clear + navigation happen before any network settles.
    expect(api.getSession()).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/");

    // Best-effort revocation fired with the refresh token.
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/auth/logout");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      refresh_token: "r1",
    });
  });

  it("still clears and routes when the revocation network call fails", async () => {
    seedSession();
    fetchMock.mockRejectedValue(new TypeError("network down"));
    const navigate = vi.fn();

    signOutMod.signOut(navigate);

    expect(api.getSession()).toBeNull();
    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("routes to /login without a network call when no session exists (demo mode)", async () => {
    const navigate = vi.fn();

    signOutMod.signOut(navigate);
    await Promise.resolve();

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

