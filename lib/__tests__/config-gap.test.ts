import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  dismissConfigGap,
  findConfigGaps,
  isConfigGapDismissed,
  resolveConfigGapNotice,
} from "../config-gap";

// ---------------------------------------------------------------------------
// config-gap.ts is pure, so most of this needs no harness at all. Only the
// dismissal helpers touch storage, and they read `window.sessionStorage` at CALL
// time (not at module load), so a fake installed in beforeEach is enough — no
// vi.resetModules()/dynamic import dance like manage-api.test.ts needs.
//
// This file must stay identical to its twin in the other frontend.
// ---------------------------------------------------------------------------

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

const ANA = "00000000-0000-4000-8000-00000000000a";
const BRUNO = "00000000-0000-4000-8000-00000000000b";
const CARLA = "00000000-0000-4000-8000-00000000000c";

function row(over: Record<string, unknown> = {}) {
  return {
    id: ANA,
    name: "Dra. Ana",
    is_active: true,
    has_calendar: true,
    has_hours: true,
    has_services: true,
    complete: true,
    linked_user_email: null,
    invite_pending: false,
    ...over,
  };
}

beforeEach(() => {
  const storage = makeSessionStorage();
  (globalThis as any).sessionStorage = storage;
  (globalThis as any).window = { sessionStorage: storage };
});

afterEach(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).sessionStorage;
});

// --- the notice appears / does not appear -----------------------------------

describe("resolveConfigGapNotice — when a notice is due", () => {
  it("returns null when every professional is complete", () => {
    expect(resolveConfigGapNotice([row(), row({ id: BRUNO })], null)).toBeNull();
  });

  it("returns null for an empty roster", () => {
    expect(resolveConfigGapNotice([], { professionalId: ANA })).toBeNull();
  });

  it("speaks to the signed-in professional when THEY are the incomplete one", () => {
    const notice = resolveConfigGapNotice(
      [row({ complete: false }), row({ id: BRUNO })],
      { professionalId: ANA },
    );
    expect(notice?.kind).toBe("self");
    // The user's own wording, pinned as a literal: this is the one string the
    // feature was asked for, and paraphrasing it later should fail here.
    expect(notice?.message).toBe(
      "Configure sua secretarIA para que seus pacientes consigam marcar consultas com você.",
    );
  });

  it("names the colleague when exactly one OTHER professional is incomplete", () => {
    const notice = resolveConfigGapNotice(
      [row(), row({ id: BRUNO, name: "Dr. Bruno", complete: false })],
      { professionalId: ANA },
    );
    expect(notice?.kind).toBe("colleague");
    expect(notice?.message).toContain("Dr. Bruno");
  });

  it("counts them when more than one other professional is incomplete", () => {
    const notice = resolveConfigGapNotice(
      [
        row(),
        row({ id: BRUNO, name: "Dr. Bruno", complete: false }),
        row({ id: CARLA, name: "Dra. Carla", complete: false }),
      ],
      { professionalId: ANA },
    );
    expect(notice?.kind).toBe("several");
    expect(notice?.message).toContain("2 profissionais");
  });

  it("prefers the SELF message when the user and a colleague are both incomplete", () => {
    // Their own gap is the one they can fix from where they are standing; the
    // colleague's notice is not lost, it surfaces once this one is fixed.
    const notice = resolveConfigGapNotice(
      [
        row({ complete: false }),
        row({ id: BRUNO, name: "Dr. Bruno", complete: false }),
      ],
      { professionalId: ANA },
    );
    expect(notice?.kind).toBe("self");
  });

  it("still reports a colleague to a user with no professional of their own", () => {
    // An owner who only administers, or a secretary — neither has a
    // professional_id claim, and both can fix the configuration.
    const notice = resolveConfigGapNotice(
      [row({ name: "Dra. Ana", complete: false })],
      { professionalId: null },
    );
    expect(notice?.kind).toBe("colleague");
    expect(notice?.message).toContain("Dra. Ana");
  });

  it("falls back to generic copy when the incomplete professional has no name", () => {
    const notice = resolveConfigGapNotice([row({ name: "  ", complete: false })], null);
    expect(notice?.kind).toBe("colleague");
    expect(notice?.message).toBe(
      "Um profissional da clínica está sem configuração na secretarIA — os pacientes não conseguem marcar consultas.",
    );
  });
});

// --- shapes the wire can actually produce -----------------------------------

describe("findConfigGaps — degenerate payloads never throw", () => {
  it("treats a non-array payload as no gaps", () => {
    // getDoctorProfessionals already unwraps the { items: [...] } envelope, but
    // a non-array reaching render is exactly what blanked this page before.
    for (const bad of [null, undefined, {}, "", 0, { items: [] }]) {
      expect(findConfigGaps(bad)).toEqual([]);
      expect(resolveConfigGapNotice(bad, { professionalId: ANA })).toBeNull();
    }
  });

  it("ignores rows that are not objects, or carry no usable id", () => {
    expect(
      findConfigGaps([null, 7, "x", { complete: false }, { id: "", complete: false }]),
    ).toEqual([]);
  });

  it("treats a MISSING completeness flag as unknown, never as a gap", () => {
    // Absent means "this backend cannot tell me" — same rule as the *_inherited
    // flags. Inventing a gap would nag a correctly-configured clinic.
    const { complete: _drop, ...withoutComplete } = row();
    expect(findConfigGaps([withoutComplete])).toEqual([]);
    expect(findConfigGaps([row({ complete: null })])).toEqual([]);
    expect(findConfigGaps([row({ complete: "false" })])).toEqual([]);
  });

  it("excludes an explicitly inactive professional, but keeps one with the flag absent", () => {
    expect(findConfigGaps([row({ complete: false, is_active: false })])).toEqual([]);

    const { is_active: _drop, ...withoutFlag } = row({ complete: false });
    expect(findConfigGaps([withoutFlag])).toHaveLength(1);
  });
});

// --- the dismissKey ---------------------------------------------------------

describe("dismissKey identity", () => {
  it("is stable when only the row ORDER changes", () => {
    const a = row({ id: BRUNO, complete: false });
    const b = row({ id: CARLA, complete: false });
    const first = resolveConfigGapNotice([a, b], null);
    const second = resolveConfigGapNotice([b, a], null);
    expect(first?.dismissKey).toBe(second?.dismissKey);
  });

  it("changes when a DIFFERENT professional becomes the incomplete one", () => {
    const first = resolveConfigGapNotice([row({ complete: false })], null);
    const second = resolveConfigGapNotice([row({ id: BRUNO, complete: false })], null);
    expect(first?.dismissKey).not.toBe(second?.dismissKey);
  });

  it("changes when the user fixes their own row and a colleague is still broken", () => {
    const session = { professionalId: ANA };
    const before = resolveConfigGapNotice(
      [row({ complete: false }), row({ id: BRUNO, complete: false })],
      session,
    );
    const after = resolveConfigGapNotice(
      [row(), row({ id: BRUNO, complete: false })],
      session,
    );
    expect(before?.dismissKey).not.toBe(after?.dismissKey);
  });
});

// --- dismissal is session-scoped -------------------------------------------

describe("dismissal", () => {
  it("hides the notice it was dismissed for, and only that one", () => {
    const notice = resolveConfigGapNotice([row({ complete: false })], null)!;
    expect(isConfigGapDismissed(notice.dismissKey)).toBe(false);

    dismissConfigGap(notice.dismissKey);
    expect(isConfigGapDismissed(notice.dismissKey)).toBe(true);

    const other = resolveConfigGapNotice([row({ id: BRUNO, complete: false })], null)!;
    expect(isConfigGapDismissed(other.dismissKey)).toBe(false);
  });

  it("writes exactly one key, so nothing accumulates across a session", () => {
    dismissConfigGap("self:one");
    dismissConfigGap("several:two,three");
    expect((globalThis as any).sessionStorage.length).toBe(1);
    expect(isConfigGapDismissed("self:one")).toBe(false);
    expect(isConfigGapDismissed("several:two,three")).toBe(true);
  });

  it("reports 'not dismissed' and never throws when storage is blocked", () => {
    // Privacy settings can make the accessor itself throw, not just return null.
    (globalThis as any).window = {
      get sessionStorage(): Storage {
        throw new Error("blocked");
      },
    };
    expect(() => dismissConfigGap("self:one")).not.toThrow();
    expect(isConfigGapDismissed("self:one")).toBe(false);
  });

  it("is inert without a window, so nothing breaks outside the browser", () => {
    delete (globalThis as any).window;
    expect(() => dismissConfigGap("self:one")).not.toThrow();
    expect(isConfigGapDismissed("self:one")).toBe(false);
  });
});
