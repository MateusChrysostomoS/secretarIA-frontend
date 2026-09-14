// calendar-health — what the Configuração screen may claim about a Google
// connection, now that it can know whether the stored credential still WORKS.
//
// PURE on purpose, like save.ts next door and lib/config-gap.ts: no React and
// no API client at runtime (the imports below are type-only and erased at
// build), because this repo's vitest runs in node without jsdom — a rule buried
// in a component could not be tested at all.
//
// WHY THIS EXISTS. Every Calendar flag the config wires carry is a PRESENCE
// flag: `calendar_connected`, `has_calendar`, `calendar_source` and
// `google_calendar_id` all answer "is something stored?". On 2026-09-12 a
// clinic in "Conta única" had every one of them green while Google rejected its
// refresh token (`invalid_grant`): Section 08 said "Conectado" and offered only
// "Desconectar" (which also takes the bot offline), no professional row offered
// anything (that mode has no per-row action, by design), and no patient could
// book with any doctor. The live check (lib/secretaria-hub.ts::
// getCalendarHealth) is what lets the screen stop asserting a connection Google
// no longer honours, and name the one action that fixes it.
//
// UNKNOWN IS NOT BROKEN. `undefined` (not checked yet, or a backend that
// predates the route) and "unavailable" (Google could not be asked right now)
// keep the screen's previous, presence-based answers. Only "reconnect_required"
// — Google itself refusing the grant — may take a green state away, and only
// "disconnected" — nothing stored — may say there is nothing to use.

import type {
  CalendarCredentialStatus,
  CalendarHealthWire,
  ProfessionalCalendarSource,
} from "@/lib/secretaria-hub";
import type { GoogleCalendarMode } from "./types";

// Mirrors HUB_ERROR_GOOGLE_RECONNECT_REQUIRED (lib/secretaria-hub.ts) without
// importing the client at runtime; __tests__/calendar-health.test.ts pins the
// two equal.
export const RECONNECT_REQUIRED_CODE = "google_reconnect_required";

export const LABEL_CONNECT_CALENDAR = "Conectar Google Calendar";
export const LABEL_RECONNECT_CALENDAR = "Reconectar agenda";

const STATUSES: readonly string[] = ["ok", "disconnected", "reconnect_required", "unavailable"];

function isStatus(value: unknown): value is CalendarCredentialStatus {
  return typeof value === "string" && STATUSES.includes(value);
}

/**
 * The health payload as the screen may use it, or null when it cannot be
 * trusted at all.
 *
 * A TypeScript type is erased at runtime, so the wire is re-checked instead of
 * assumed: without a known `clinic` category the whole payload is unusable
 * (null = "cannot tell"), while a malformed professional row only drops that
 * row. "disconnected" is dropped for professionals, because the backend only
 * ever checks one who HAS a token.
 */
export function normalizeCalendarHealth(raw: unknown): CalendarHealthWire | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const candidate = raw as { clinic?: unknown; professionals?: unknown };
  const clinic = candidate.clinic;
  if (!isStatus(clinic)) return null;

  const professionals: CalendarHealthWire["professionals"] = [];
  if (Array.isArray(candidate.professionals)) {
    for (const row of candidate.professionals) {
      if (!row || typeof row !== "object") continue;
      const { professional_id: id, status } = row as {
        professional_id?: unknown;
        status?: unknown;
      };
      if (typeof id !== "string" || id.length === 0) continue;
      if (!isStatus(status) || status === "disconnected") continue;
      professionals.push({ professional_id: id, status });
    }
  }
  return { clinic, professionals };
}

/** professional id -> the live status of their OWN credential, for the ids that were checked. */
export function ownStatusByProfessional(
  health: CalendarHealthWire | null,
): Record<string, CalendarCredentialStatus> {
  const byId: Record<string, CalendarCredentialStatus> = {};
  for (const row of health?.professionals ?? []) byId[row.professional_id] = row.status;
  return byId;
}

/**
 * The clinic's status as the screen should act on it.
 *
 * `connected` is the stored-token flag from the config GET — `undefined` until
 * that GET has landed, and until then nothing is known. With no token stored
 * the answer is "disconnected" whatever an older live check said (it may
 * predate a disconnect). With a token stored only the live check can say more,
 * and a live "disconnected" would contradict the fresher config read, so it
 * counts as unknown rather than winning.
 */
export function effectiveClinicStatus(input: {
  connected: boolean | undefined;
  health: CalendarHealthWire | null;
}): CalendarCredentialStatus | undefined {
  if (input.connected === undefined) return undefined;
  if (!input.connected) return "disconnected";
  const live = input.health?.clinic;
  return live === "disconnected" ? undefined : live;
}

/**
 * Whether Section 08 must ask the clinic to reconnect its Google account.
 *
 * Two independent signals, either is enough: the live check, and the last
 * save's calendar run refused with `google_reconnect_required`. Only while a
 * token is stored — with none, the connect card already asks for that action.
 */
export function clinicNeedsReconnect(input: {
  connected: boolean;
  clinicStatus: CalendarCredentialStatus | undefined;
  blockedCode: string | null;
}): boolean {
  if (!input.connected) return false;
  return (
    input.clinicStatus === "reconnect_required" || input.blockedCode === RECONNECT_REQUIRED_CODE
  );
}

export type CalendarNotice = { tone: "error" | "warn"; message: string };

const SHARED_RECONNECT_NOTICE =
  "O Google não aceita mais a conexão da conta da clínica (o acesso expirou ou foi revogado), e é nela que ficam as agendas dos profissionais abaixo — enquanto isso, nenhum paciente consegue marcar. Reconecte a conta na seção 08.";

const SHARED_DISCONNECTED_NOTICE =
  "Neste modo as agendas dos profissionais ficam na conta do Google da clínica, que não está conectada — os pacientes não conseguem marcar. Conecte a conta na seção 08.";

/**
 * Section 05's clinic-wide notice in shared_account mode, or null.
 *
 * In that mode every professional's agenda lives inside the CLINIC's Google
 * account, and a row has no calendar action on purpose. So when the clinic's
 * account is what blocks booking, the fix has to be named where the unbookable
 * doctors are listed: a column of red chips with nothing to press, and the
 * answer three sections further down, is the exact dead end this module removes.
 */
export function sharedAccountRosterNotice(input: {
  mode: GoogleCalendarMode;
  clinicStatus: CalendarCredentialStatus | undefined;
}): CalendarNotice | null {
  if (input.mode !== "shared_account") return null;
  if (input.clinicStatus === "reconnect_required") {
    return { tone: "error", message: SHARED_RECONNECT_NOTICE };
  }
  if (input.clinicStatus === "disconnected") {
    return { tone: "warn", message: SHARED_DISCONNECTED_NOTICE };
  }
  return null;
}

export type RowAgendaAction =
  | { kind: "none" }
  | { kind: "connected" }
  | { kind: "connect"; label: string };

export type RowAgenda = {
  /** The row's "Agenda" completeness chip. */
  ok: boolean;
  /** One line under the row, when its agenda needs something the chip cannot say. */
  note: CalendarNotice | null;
  action: RowAgendaAction;
};

const SHARED_PENDING_NOTE =
  "A agenda deste profissional é criada na conta do Google da clínica quando você salva a configuração.";

const OWN_RECONNECT_NOTE =
  "O Google não aceita mais a conexão desta agenda — os pacientes não conseguem marcar com este profissional até reconectar.";

const NO_ACTION: RowAgendaAction = { kind: "none" };

/**
 * What one roster row shows about its agenda: the "Agenda" chip, an optional
 * line of explanation, and its calendar action, if any.
 *
 * shared_account — never an action: the clinic's single account holds every
 * agenda and its connect/reconnect lives in Section 08 (named above the roster
 * by `sharedAccountRosterNotice`). The chip is green only while that account is
 * not known to be broken AND this professional's dedicated agenda exists.
 *
 * per_professional — the doctor's own OAuth is the action. "Conectado" means
 * THEIR account (`calendar_source === "professional"`, never `has_calendar`,
 * which the clinic's fallback also satisfies) and Google has not refused it; a
 * refused own token turns back into a button, "Reconectar agenda".
 */
export function professionalRowAgenda(input: {
  mode: GoogleCalendarMode;
  hasCalendar: boolean;
  googleCalendarId: string | null;
  calendarSource: ProfessionalCalendarSource | undefined;
  clinicStatus: CalendarCredentialStatus | undefined;
  ownStatus: CalendarCredentialStatus | undefined;
}): RowAgenda {
  if (input.mode === "shared_account") {
    if (input.clinicStatus === "reconnect_required" || input.clinicStatus === "disconnected") {
      return { ok: false, note: null, action: NO_ACTION };
    }
    if (input.googleCalendarId == null) {
      return { ok: false, note: { tone: "warn", message: SHARED_PENDING_NOTE }, action: NO_ACTION };
    }
    return { ok: true, note: null, action: NO_ACTION };
  }

  if (input.calendarSource === "professional") {
    if (input.ownStatus === "reconnect_required") {
      return {
        ok: false,
        note: { tone: "error", message: OWN_RECONNECT_NOTE },
        action: { kind: "connect", label: LABEL_RECONNECT_CALENDAR },
      };
    }
    return { ok: input.hasCalendar, note: null, action: { kind: "connected" } };
  }

  // Not connected by this doctor: covered by the clinic's fallback, or by nothing.
  const fallbackRefused =
    input.calendarSource === "tenant" && input.clinicStatus === "reconnect_required";
  return {
    ok: input.hasCalendar && !fallbackRefused,
    note: null,
    action: {
      kind: "connect",
      // `calendar_source` undefined is a backend that predates the field: keep
      // the old has_calendar-based label rather than guess whose account it is.
      label:
        input.calendarSource === undefined && input.hasCalendar
          ? LABEL_RECONNECT_CALENDAR
          : LABEL_CONNECT_CALENDAR,
    },
  };
}
