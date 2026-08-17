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

import type { ProfessionalWire, TenantConfigWire } from "@/lib/secretaria-hub";
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
  type ClinicCtx,
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
};

/** Professional-scoped form state, exactly as the page holds it. */
export type ProfessionalSlices = {
  services: Service[];
  days: DayConfig[];
  profile: ProfessionalProfile;
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
  };
}

/** The single place a ProfessionalWire becomes form state. */
export function professionalSlicesFromWire(p: ProfessionalWire): ProfessionalSlices {
  return {
    services:
      p.appointment_types.length > 0 ? applyWireAppointmentTypes(p.appointment_types) : [],
    days: applyWireBusinessHours(p.business_hours, closedWeek()),
    profile: applyWireProfessionalProfile(p),
  };
}

/** What a professional-scoped form looks like with nothing hydrated. */
export function emptyProfessionalSlices(): ProfessionalSlices {
  return { services: [], days: closedWeek(), profile: EMPTY_PROFESSIONAL_PROFILE };
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
    if (
      !same(
        comparableServices(current.professional.services),
        comparableServices(baseline.professional.services),
      )
    ) {
      sections.push("srv");
    }
    if (!same(current.professional.days, baseline.professional.days)) sections.push("disp");
  }

  // `disp` also owns the tenant-level default duration.
  if (
    current.tenant.prefs.defaultDur !== baseline.tenant.prefs.defaultDur &&
    !sections.includes("disp")
  ) {
    sections.push("disp");
  }
  if (current.tenant.gcal.mode !== baseline.tenant.gcal.mode) sections.push("gcal");

  return sections;
}
