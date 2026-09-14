import { describe, expect, it } from "vitest";
import {
  HUB_ERROR_GOOGLE_RECONNECT_REQUIRED,
  type CalendarCredentialStatus,
  type CalendarHealthWire,
} from "@/lib/secretaria-hub";
import {
  LABEL_CONNECT_CALENDAR,
  LABEL_RECONNECT_CALENDAR,
  RECONNECT_REQUIRED_CODE,
  clinicNeedsReconnect,
  effectiveClinicStatus,
  normalizeCalendarHealth,
  ownStatusByProfessional,
  professionalRowAgenda,
  sharedAccountRosterNotice,
} from "../calendar-health";

// The screen used to read only PRESENCE flags for Google Calendar. On
// 2026-09-12 a "Conta única" clinic whose refresh token Google had revoked sat
// on "Conectado", with no row able to act, while no patient could book with any
// doctor. These tests pin what the screen may claim once it knows the live
// status — and, just as important, what it must NOT take away when it does not.

type RowInput = Parameters<typeof professionalRowAgenda>[0];

const ANY_STATUS: (CalendarCredentialStatus | undefined)[] = [
  "ok",
  "disconnected",
  "reconnect_required",
  "unavailable",
  undefined,
];

const HEALTH: CalendarHealthWire = {
  clinic: "ok",
  professionals: [
    { professional_id: "prof-1", status: "ok" },
    { professional_id: "prof-2", status: "reconnect_required" },
  ],
};

describe("normalizeCalendarHealth", () => {
  it("passes a well-formed payload through unchanged", () => {
    expect(normalizeCalendarHealth(HEALTH)).toEqual(HEALTH);
  });

  it("is null — 'cannot tell' — without a known clinic category", () => {
    for (const raw of [null, undefined, "ok", 42, [], {}, { clinic: "maybe" }, { clinic: null }]) {
      expect(normalizeCalendarHealth(raw)).toBeNull();
    }
  });

  it("keeps the clinic status when professionals is missing or not a list", () => {
    expect(normalizeCalendarHealth({ clinic: "reconnect_required" })).toEqual({
      clinic: "reconnect_required",
      professionals: [],
    });
    expect(normalizeCalendarHealth({ clinic: "ok", professionals: "nope" })).toEqual({
      clinic: "ok",
      professionals: [],
    });
  });

  it("drops malformed rows and a 'disconnected' professional, keeps the rest", () => {
    const raw = {
      clinic: "ok",
      professionals: [
        { professional_id: "prof-1", status: "ok" },
        { professional_id: "", status: "ok" },
        { professional_id: "prof-3", status: "weird" },
        { professional_id: "prof-4", status: "disconnected" },
        null,
        "prof-5",
        { status: "reconnect_required" },
        { professional_id: "prof-6", status: "unavailable" },
      ],
    };
    expect(normalizeCalendarHealth(raw)).toEqual({
      clinic: "ok",
      professionals: [
        { professional_id: "prof-1", status: "ok" },
        { professional_id: "prof-6", status: "unavailable" },
      ],
    });
  });
});

describe("ownStatusByProfessional", () => {
  it("maps the checked professionals by id", () => {
    expect(ownStatusByProfessional(HEALTH)).toEqual({
      "prof-1": "ok",
      "prof-2": "reconnect_required",
    });
  });

  it("is empty without a health payload", () => {
    expect(ownStatusByProfessional(null)).toEqual({});
  });
});

describe("effectiveClinicStatus", () => {
  it("is unknown until the config GET has landed, whatever the live check says", () => {
    expect(effectiveClinicStatus({ connected: undefined, health: HEALTH })).toBeUndefined();
  });

  it("no stored token is 'disconnected', even over a stale live 'ok'", () => {
    expect(effectiveClinicStatus({ connected: false, health: HEALTH })).toBe("disconnected");
    expect(effectiveClinicStatus({ connected: false, health: null })).toBe("disconnected");
  });

  it("with a token stored, the live check decides", () => {
    for (const clinic of ["ok", "reconnect_required", "unavailable"] as const) {
      expect(effectiveClinicStatus({ connected: true, health: { ...HEALTH, clinic } })).toBe(
        clinic,
      );
    }
  });

  it("with a token stored and no live answer, it stays unknown", () => {
    expect(effectiveClinicStatus({ connected: true, health: null })).toBeUndefined();
  });

  it("a live 'disconnected' contradicting a stored token is treated as unknown", () => {
    expect(
      effectiveClinicStatus({ connected: true, health: { ...HEALTH, clinic: "disconnected" } }),
    ).toBeUndefined();
  });
});

describe("clinicNeedsReconnect", () => {
  it("asks when Google refused the clinic's token", () => {
    expect(
      clinicNeedsReconnect({ connected: true, clinicStatus: "reconnect_required", blockedCode: null }),
    ).toBe(true);
  });

  it("asks when the last save's calendar run was refused for a reconnect", () => {
    expect(
      clinicNeedsReconnect({
        connected: true,
        clinicStatus: "ok",
        blockedCode: RECONNECT_REQUIRED_CODE,
      }),
    ).toBe(true);
  });

  it("never asks with nothing stored — the connect card already does", () => {
    expect(
      clinicNeedsReconnect({
        connected: false,
        clinicStatus: "reconnect_required",
        blockedCode: RECONNECT_REQUIRED_CODE,
      }),
    ).toBe(false);
  });

  it("does not ask over an outage, an unknown status, or a different refusal", () => {
    for (const clinicStatus of ["ok", "unavailable", undefined] as const) {
      expect(clinicNeedsReconnect({ connected: true, clinicStatus, blockedCode: null })).toBe(false);
    }
    expect(
      clinicNeedsReconnect({
        connected: true,
        clinicStatus: "ok",
        blockedCode: "clinic_calendar_not_connected",
      }),
    ).toBe(false);
  });

  it("uses the hub client's own error code", () => {
    expect(RECONNECT_REQUIRED_CODE).toBe(HUB_ERROR_GOOGLE_RECONNECT_REQUIRED);
  });
});

describe("sharedAccountRosterNotice", () => {
  it("says nothing outside shared_account — each doctor's own connect is on their row", () => {
    for (const clinicStatus of ANY_STATUS) {
      expect(sharedAccountRosterNotice({ mode: "per_professional", clinicStatus })).toBeNull();
    }
  });

  it("names the reconnect when Google refused the clinic's account", () => {
    const notice = sharedAccountRosterNotice({
      mode: "shared_account",
      clinicStatus: "reconnect_required",
    });
    expect(notice?.tone).toBe("error");
    expect(notice?.message).toMatch(/Reconecte/);
  });

  it("names the connect when the clinic's account is not connected", () => {
    const notice = sharedAccountRosterNotice({ mode: "shared_account", clinicStatus: "disconnected" });
    expect(notice?.tone).toBe("warn");
    expect(notice?.message).toMatch(/Conecte/);
  });

  it("stays quiet when the account works, or when nobody can tell", () => {
    for (const clinicStatus of ["ok", "unavailable", undefined] as const) {
      expect(sharedAccountRosterNotice({ mode: "shared_account", clinicStatus })).toBeNull();
    }
  });
});

describe("professionalRowAgenda — shared_account", () => {
  const shared: RowInput = {
    mode: "shared_account",
    hasCalendar: true,
    googleCalendarId: "ana@group.calendar.google.com",
    calendarSource: "tenant",
    clinicStatus: "ok",
    ownStatus: undefined,
  };

  it("the 2026-09-12 case: the agenda exists but the clinic's token is dead — not ok", () => {
    expect(professionalRowAgenda({ ...shared, clinicStatus: "reconnect_required" })).toEqual({
      ok: false,
      note: null,
      action: { kind: "none" },
    });
  });

  it("no clinic account connected: nothing can serve the agenda", () => {
    expect(professionalRowAgenda({ ...shared, clinicStatus: "disconnected" }).ok).toBe(false);
  });

  it("clinic account works and the dedicated agenda exists: ok", () => {
    expect(professionalRowAgenda(shared)).toEqual({
      ok: true,
      note: null,
      action: { kind: "none" },
    });
  });

  it("an unknown or unavailable clinic status does not take the chip away", () => {
    expect(professionalRowAgenda({ ...shared, clinicStatus: undefined }).ok).toBe(true);
    expect(professionalRowAgenda({ ...shared, clinicStatus: "unavailable" }).ok).toBe(true);
  });

  it("no dedicated agenda yet: not ok, and the row says how it gets one", () => {
    const agenda = professionalRowAgenda({ ...shared, googleCalendarId: null });
    expect(agenda.ok).toBe(false);
    expect(agenda.note?.tone).toBe("warn");
    expect(agenda.note?.message).toMatch(/salva/);
  });

  it("never offers a per-row action, in any state — even over a dead own token", () => {
    for (const clinicStatus of ANY_STATUS) {
      for (const calendarSource of ["professional", "tenant", "none", undefined] as const) {
        const agenda = professionalRowAgenda({
          ...shared,
          clinicStatus,
          calendarSource,
          ownStatus: "reconnect_required",
        });
        expect(agenda.action).toEqual({ kind: "none" });
      }
    }
  });
});

describe("professionalRowAgenda — per_professional", () => {
  const own: RowInput = {
    mode: "per_professional",
    hasCalendar: true,
    googleCalendarId: null,
    calendarSource: "professional",
    clinicStatus: "ok",
    ownStatus: "ok",
  };

  it("own account connected and accepted: Conectado", () => {
    expect(professionalRowAgenda(own)).toEqual({
      ok: true,
      note: null,
      action: { kind: "connected" },
    });
  });

  it("own account refused by Google: a Reconectar button, never Conectado", () => {
    const agenda = professionalRowAgenda({ ...own, ownStatus: "reconnect_required" });
    expect(agenda.ok).toBe(false);
    expect(agenda.action).toEqual({ kind: "connect", label: LABEL_RECONNECT_CALENDAR });
    expect(agenda.note?.tone).toBe("error");
  });

  it("own account not checked, or Google unreachable: stays Conectado", () => {
    expect(professionalRowAgenda({ ...own, ownStatus: undefined }).action).toEqual({
      kind: "connected",
    });
    expect(professionalRowAgenda({ ...own, ownStatus: "unavailable" }).action).toEqual({
      kind: "connected",
    });
  });

  it("covered only by the clinic's fallback: offers the doctor's own connect; the chip follows the fallback", () => {
    const covered: RowInput = { ...own, calendarSource: "tenant", ownStatus: undefined };
    expect(professionalRowAgenda(covered)).toEqual({
      ok: true,
      note: null,
      action: { kind: "connect", label: LABEL_CONNECT_CALENDAR },
    });
    expect(professionalRowAgenda({ ...covered, clinicStatus: "reconnect_required" }).ok).toBe(false);
  });

  it("nothing connected: not ok, Conectar", () => {
    expect(
      professionalRowAgenda({ ...own, hasCalendar: false, calendarSource: "none", ownStatus: undefined }),
    ).toEqual({ ok: false, note: null, action: { kind: "connect", label: LABEL_CONNECT_CALENDAR } });
  });

  it("a backend without calendar_source keeps the old has_calendar label", () => {
    const legacy: RowInput = { ...own, calendarSource: undefined, ownStatus: undefined };
    expect(professionalRowAgenda(legacy).action).toEqual({
      kind: "connect",
      label: LABEL_RECONNECT_CALENDAR,
    });
    expect(professionalRowAgenda({ ...legacy, hasCalendar: false }).action).toEqual({
      kind: "connect",
      label: LABEL_CONNECT_CALENDAR,
    });
  });
});
