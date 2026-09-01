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

    // Best-effort revocation fired. No body: the refresh token lives in the
    // HttpOnly cookie, so `credentials: "include"` is what carries it, and
    // brain-api both revokes it and expires it in the browser.
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/auth/logout");
    expect((init as RequestInit).body).toBeUndefined();
    expect((init as RequestInit).credentials).toBe("include");
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

  it("still calls the server with no session in memory", async () => {
    // CHANGED with the cookie migration, on purpose. There is no local refresh
    // token left to decide on, and the browser can be holding a live cookie with
    // nothing in memory to show for it — a probe that failed offline does exactly
    // that. A logout has to be thorough, so it always asks; brain-api answers 204
    // either way (no token-existence oracle). The cost is one wasted request in
    // demo mode, where the "Sair" button is not even rendered (ARQ-2).
    fetchMock.mockResolvedValue({ ok: true, status: 204, json: async () => ({}) });
    const navigate = vi.fn();

    signOutMod.signOut(navigate);

    expect(navigate).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith("/");
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock.mock.calls[0][0]).toBe("/auth/logout");
  });
});

