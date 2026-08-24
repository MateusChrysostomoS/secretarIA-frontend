// snapshot.ts — the last AUTHORITATIVE view of the configuration, and the
// pure comparison behind "Descartar".
//
// WHY THIS EXISTS
// ---------------
// "Descartar" used to fire a toast saying "Alterações descartadas." and change
// nothing at all: every edit stayed on screen, and the next Save wrote them.
// A discard that lies is worse than no discard, because it invites the user to
// walk away believing the form is back to normal.
//
// The snapshot deliberately stores the SERVER's wire objects, not a copy of
// the local form state. Two consequences worth keeping:
//   1. It is inherently deep and immutable — a wire object came out of JSON
//      and nothing on the page holds a reference into it.
//   2. Restoring runs the very same applyWire* mappers hydration runs, so
//      "discard" and "reload the page" cannot drift apart.
//
// A snapshot is only ever written from a real 2xx (GET on hydration, or the
// body a PUT echoed back). Demo seeds and local form state never become one.

import type {
  AppointmentTypeWire,
  ProfessionalWire,
  TenantConfigWire,
} from "@/lib/secretaria-hub";
import {
  applyWireAddress,
  applyWireAppointmentTypes,
  applyWireBusinessHours,
  applyWireGcal,
  applyWireInsurances,
  applyWireMessages,
  applyWirePixDeposit,
  applyWirePostConsult,
  applyWireProfessionalProfile,
} from "./hub-mapping";
import {
  closedWeek,
  DEFAULT_PIX_DEPOSIT,
  EMPTY_CLINIC_CTX,
  EMPTY_GCAL,
  EMPTY_MESSAGES,
  EMPTY_POST_CONSULT,
  EMPTY_PREFS,
  EMPTY_PROFESSIONAL_PROFILE,
  inheritanceFromWire,
  type ClinicCtx,
  type ConfigInheritance,
  type DayConfig,
  type GcalState,
  type Messages,
  type PixDeposit,
  type PostConsult,
  type Prefs,
  type ProfessionalProfile,
  type Service,
} from "./types";

// ---------------------------------------------------------------------------
// Snapshot shape
// ---------------------------------------------------------------------------

export type AuthoritativeSnapshot = {
  /**
   * Which tenant this snapshot belongs to. Carried so a snapshot can never
   * outlive the session that produced it: on logout or a tenant swap the id
   * stops matching and the whole snapshot is dropped rather than restored
   * into somebody else's clinic.
   */
  tenantId: string | null;
  /** null until GET /tenants/me/config has returned 2xx at least once. */
  tenant: TenantConfigWire | null;
  /** Only ids whose config actually came back; a failed load leaves a hole. */
  professionalsById: Record<string, ProfessionalWire>;
};

export const EMPTY_SNAPSHOT: AuthoritativeSnapshot = {
  tenantId: null,
  tenant: null,
  professionalsById: {},
};

/**
 * The snapshot, but only if it belongs to `tenantId`. Every read goes through
 * here so "restore the last confirmed state" can never resurrect another
 * tenant's configuration.
 */
export function snapshotForTenant(
  snapshot: AuthoritativeSnapshot,
  tenantId: string | null,
): AuthoritativeSnapshot {
  if (!tenantId || snapshot.tenantId !== tenantId) return EMPTY_SNAPSHOT;
  return snapshot;
}

/** Tenant-level form state, exactly as the page holds it. */
export type TenantSlices = {
  ctx: ClinicCtx;
  messages: Messages;
  postConsult: PostConsult;
  pixDeposit: PixDeposit;
  prefs: Prefs;
  gcal: GcalState;
  /**
   * The CLINIC's own weekly schedule (`tenants.business_hours`).
   *
   * It was always on the wire and always had consumers — the human-backup
   * plugin decides "fora do horário" from it, and the agent's prompt states it
   * to patients — but this screen had no field for it. The only way to reach
   * it was sideways, as the thing a professional "inherited", so a clinic
   * could never state its own opening hours; it could only be read back.
   */
  clinicDays: DayConfig[];
};

/** Professional-scoped form state, exactly as the page holds it. */
export type ProfessionalSlices = {
  services: Service[];
  days: DayConfig[];
  profile: ProfessionalProfile;
  /**
   * Whether `days` / `services` are this professional's OWN config or the
   * clinic's, inherited. Carried as state rather than derived from emptiness,
   * because emptiness is exactly what cannot tell the two apart: an inheriting
   * professional and one who closed every day both arrive as a closed week.
   *
   * They live here, next to the values they describe, so Descartar restores
   * them together with the values and a save can send `null` (inherit) instead
   * of `{}` (empty override) — the difference between "the clinic's hours
   * apply" and "this doctor is unbookable".
   */
  hoursSource: ConfigInheritance;

};

// ---------------------------------------------------------------------------
// wire -> form state
// ---------------------------------------------------------------------------

/**
 * The single place a TenantConfigWire becomes form state. Used by hydration,
 * by the post-save refresh (so the form shows what was persisted, not what was
 * typed), and by Descartar.
 */
export function tenantSlicesFromWire(cfg: TenantConfigWire): TenantSlices {
  return {
    ctx: {
      clinicName: cfg.clinic_name ?? "",
      ...applyWireAddress(cfg.address),
      insurances: applyWireInsurances(cfg.insurances),
      collectInsurance: cfg.collect_insurance,
    },
    messages: applyWireMessages(cfg),
    postConsult: applyWirePostConsult(cfg),
    pixDeposit: applyWirePixDeposit(cfg),
    prefs: { defaultDur: cfg.appointment_duration_min },
    gcal: applyWireGcal(cfg),
    clinicDays: applyWireBusinessHours(cfg.business_hours, closedWeek()),
  };
}

/** The single place a ProfessionalWire becomes form state.
 *
 * `clinicTypes` is the clinic's legacy `appointment_types` column, and it is
 * load-bearing for one case: a professional who still INHERITS services sends
 * `appointment_types: []` on the wire (the field carries their own value,
 * flattened to empty when they have none). Section 06 no longer offers
 * inheritance — it asks which services this professional offers — so seeding
 * from `[]` would open the screen showing nothing ticked and turn "offers
 * everything the clinic does" into "offers nothing" on the next save.
 *
 * Seeding from the clinic's list instead means the screen opens showing what
 * this professional ACTUALLY offers today, and saving preserves it. The one
 * real change is that the list stops tracking the clinic's automatically,
 * which is the point of the redesign: from here on a service is a shared
 * object each professional opts into, not a list inherited wholesale.
 */
export function professionalSlicesFromWire(
  p: ProfessionalWire,
  clinicTypes: AppointmentTypeWire[] = [],
): ProfessionalSlices {
  const inheritsServices = inheritanceFromWire(p.appointment_types_inherited) === "inherit";
  const effectiveTypes =
    p.appointment_types.length > 0
      ? p.appointment_types
      : inheritsServices
        ? clinicTypes
        : [];
  return {
    services: applyWireAppointmentTypes(effectiveTypes),
    days: applyWireBusinessHours(p.business_hours, closedWeek()),
    profile: applyWireProfessionalProfile(p),
    // The flag is read, never inferred from the (identical-looking) values.
    // A backend that does not send it yields "unknown", which the save path
    // treats as "do not claim inheritance you cannot verify". Hours still have
    // the inherit/own choice; services no longer do.
    hoursSource: inheritanceFromWire(p.business_hours_inherited),
  };
}

/** What a professional-scoped form looks like with nothing hydrated. */
export function emptyProfessionalSlices(): ProfessionalSlices {
  return {
    services: [],
    days: closedWeek(),
    profile: EMPTY_PROFESSIONAL_PROFILE,
    // Nothing has been read back, so the honest answer is "we don't know" —
    // and the form is read-only in this state anyway (see lib/hydration.ts).
    hoursSource: "unknown",
  };
}

/**
 * What a tenant-level form looks like with nothing hydrated — the state an
 * authenticated session starts in, and falls back to when a load fails with
 * no confirmed snapshot to restore. Deliberately NOT the demo seed.
 */
export function emptyTenantSlices(): TenantSlices {
  return {
    ctx: EMPTY_CLINIC_CTX,
    messages: EMPTY_MESSAGES,
    postConsult: EMPTY_POST_CONSULT,
    pixDeposit: DEFAULT_PIX_DEPOSIT,
    prefs: EMPTY_PREFS,
    gcal: EMPTY_GCAL,
    clinicDays: closedWeek(),
  };
}

// ---------------------------------------------------------------------------
// Dirty detection — section ids only, never values
// ---------------------------------------------------------------------------

/** Section ids, matching the SideNav anchors in page.tsx. */
export type SectionId = "ctx" | "msg" | "pos" | "pix" | "prof" | "srv" | "disp" | "gcal";

// Normalizes away everything that is NOT user-editable configuration, so a
// plain hydrate -> discard round trip reports zero dirty sections:
//  - `clinicName` is read-only on this screen (never in a PUT body).
//  - Service/requirement `id` is a local React key — position-based after a
//    hydrate, Date.now() after an add. Comparing it would call every form
//    dirty for free.
//  - `pixDeposit.asaasConnected` and `gcal.connected` are backend-derived.

function comparableServices(services: Service[]): unknown {
  return services.map((s) => ({
    // The catalog link is compared: two entries with the same name but
    // different `serviceId` are different services, and that difference is the
    // whole point of the catalog.
    serviceId: s.serviceId,
    name: s.name,
    dur: s.dur,
    price: s.price,
    active: s.active,
    requirements: s.requirements.map((r) => r.text),
  }));
}

function comparableCtx(ctx: ClinicCtx): unknown {
  const { clinicName: _readOnly, ...editable } = ctx;
  return editable;
}

function comparablePix(pix: PixDeposit): unknown {
  const { asaasConnected: _readOnly, ...editable } = pix;
  return editable;
}

function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Which sections currently differ from the authoritative baseline. Returns
 * section ids and nothing else — this feeds the `config_discarded` event, and
 * a config value must never reach telemetry.
 *
 * `professional` may be null on both sides when none is selected; the caller
 * passes matched pairs so a missing baseline never reads as "dirty".
 */
export function dirtySections(
  current: { tenant: TenantSlices; professional: ProfessionalSlices | null },
  baseline: { tenant: TenantSlices; professional: ProfessionalSlices | null },
): SectionId[] {
  const sections: SectionId[] = [];

  if (!same(comparableCtx(current.tenant.ctx), comparableCtx(baseline.tenant.ctx))) {
    sections.push("ctx");
  }
  if (!same(current.tenant.messages, baseline.tenant.messages)) sections.push("msg");
  if (!same(current.tenant.postConsult, baseline.tenant.postConsult)) sections.push("pos");
  if (
    !same(comparablePix(current.tenant.pixDeposit), comparablePix(baseline.tenant.pixDeposit))
  ) {
    sections.push("pix");
  }

  if (current.professional && baseline.professional) {
    if (!same(current.professional.profile, baseline.professional.profile)) {
      sections.push("prof");
    }
    // Services are a plain list comparison now: Section 06 no longer has an
    // inherit/own switch whose position could differ while the values match.
    // Hours still do, which is why the block below compares both.
    if (
      !same(
        comparableServices(current.professional.services),
        comparableServices(baseline.professional.services),
      )
    ) {
      sections.push("srv");
    }
    // Switching between "herdar" and "configuração própria" IS a change, even
    // when the values on screen look identical — it is precisely the case where
    // they do (an inherited week and an empty own week both render closed).
    // Leaving it out would let Descartar claim there was nothing to discard.
    if (
      !same(current.professional.days, baseline.professional.days) ||
      current.professional.hoursSource !== baseline.professional.hoursSource
    ) {
      sections.push("disp");
    }
  }

  // `disp` also owns the two tenant-level fields the hours section edits: the
  // default duration and the clinic's own weekly schedule.
  if (
    (current.tenant.prefs.defaultDur !== baseline.tenant.prefs.defaultDur ||
      !same(current.tenant.clinicDays, baseline.tenant.clinicDays)) &&
    !sections.includes("disp")
  ) {
    sections.push("disp");
  }
  if (current.tenant.gcal.mode !== baseline.tenant.gcal.mode) sections.push("gcal");

  return sections;
}
