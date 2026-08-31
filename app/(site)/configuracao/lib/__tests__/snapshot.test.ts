// Tests for the authoritative snapshot, "Descartar", and the honesty of the
// PUT payloads.
//
// Two rules are pinned here:
//  1. Discard restores EXACTLY the last confirmed server state and issues no
//     request. (The old button only fired a toast claiming it had.)
//  2. Nothing that looks editable is silently dropped from the payload, and
//     nothing that has no consumer looks editable. The negative assertions at
//     the bottom are the regression guard for FIX 12.

import { describe, expect, it } from "vitest";
import {
  EMPTY_SNAPSHOT,
  dirtySections,
  emptyProfessionalSlices,
  emptyTenantSlices,
  professionalSlicesFromWire,
  snapshotForTenant,
  tenantSlicesFromWire,
  type AuthoritativeSnapshot,
} from "../snapshot";
import { buildConfigUpdatePayload, buildProfessionalConfigPayload } from "../hub-mapping";
import {
  PROF_A,
  PROF_B,
  TENANT_ID,
  emptiedProfessionalWire,
  inheritingProfessionalWire,
  legacyBackendProfessionalWire,
  professionalWire,
  tenantWire,
} from "./fixtures";

describe("wire → form state", () => {
  it("maps every tenant-level field the form owns", () => {
    const slices = tenantSlicesFromWire(tenantWire());
    expect(slices.ctx.clinicName).toBe("Clínica Exemplo");
    expect(slices.ctx.addressLine).toBe("Rua Exemplo, 1");
    expect(slices.ctx.insurances).toBe("Convênio Exemplo");
    expect(slices.ctx.collectInsurance).toBe(true);
    expect(slices.messages.clinicDescription).toBe("Oftalmologia e cirurgia refrativa.");
    expect(slices.prefs.defaultDur).toBe(30);
    expect(slices.gcal.mode).toBe("per_professional");
  });

  it("maps a professional's hours and services", () => {
    const slices = professionalSlicesFromWire(professionalWire(PROF_A));
    expect(slices.profile.specialty).toBe("Especialidade prof-a");
    expect(slices.services.map((s) => s.name)).toEqual(["Consulta prof-a"]);
    const monday = slices.days.find((d) => d.key === "seg");
    expect(monday?.on).toBe(true);
    expect(monday?.ranges).toEqual([{ start: 480, end: 720 }]);
    // Every other day stays closed rather than inheriting anything.
    expect(slices.days.filter((d) => d.on)).toHaveLength(1);
  });

  it("switching professionals cannot leak A's schedule onto B", () => {
    const a = professionalSlicesFromWire(professionalWire(PROF_A));
    const b = professionalSlicesFromWire(
      professionalWire(PROF_B, { business_hours: {}, appointment_types: [] }),
    );
    expect(a.days.some((d) => d.on)).toBe(true);
    expect(b.days.some((d) => d.on)).toBe(false);
    expect(b.services).toEqual([]);
  });

  it("the empty starting point is genuinely empty, not a demo", () => {
    const tenant = emptyTenantSlices();
    expect(tenant.ctx.clinicName).toBe("");
    expect(tenant.ctx.addressLine).toBe("");
    expect(tenant.ctx.insurances).toBe("");
    expect(tenant.messages.clinicDescription).toBe("");

    const professional = emptyProfessionalSlices();
    expect(professional.services).toEqual([]);
    expect(professional.days.every((d) => !d.on && d.ranges.length === 0)).toBe(true);
  });
});

describe("snapshotForTenant", () => {
  const snapshot: AuthoritativeSnapshot = {
    tenantId: TENANT_ID,
    tenant: tenantWire(),
    professionalsById: { [PROF_A]: professionalWire(PROF_A) },
  };

  it("returns the snapshot for its own tenant", () => {
    expect(snapshotForTenant(snapshot, TENANT_ID)).toBe(snapshot);
  });

  it("refuses to hand a snapshot to a different tenant", () => {
    expect(snapshotForTenant(snapshot, "t-2")).toBe(EMPTY_SNAPSHOT);
  });

  it("refuses after logout, when there is no tenant at all", () => {
    expect(snapshotForTenant(snapshot, null)).toBe(EMPTY_SNAPSHOT);
  });
});

describe("dirtySections (what Descartar reports)", () => {
  const baseline = {
    tenant: tenantSlicesFromWire(tenantWire()),
    professional: professionalSlicesFromWire(professionalWire(PROF_A)),
  };

  it("reports nothing for a straight hydrate → discard round trip", () => {
    const current = {
      tenant: tenantSlicesFromWire(tenantWire()),
      professional: professionalSlicesFromWire(professionalWire(PROF_A)),
    };
    expect(dirtySections(current, baseline)).toEqual([]);
  });

  it("ignores the local React ids on services and requirements", () => {
    // Same content, different local ids (what an add-then-remove cycle leaves).
    const current = {
      ...baseline,
      professional: {
        ...baseline.professional,
        services: baseline.professional.services.map((s) => ({ ...s, id: s.id + 1000 })),
      },
    };
    expect(dirtySections(current, baseline)).toEqual([]);
  });

  it("ignores read-only fields the form can never write", () => {
    const current = {
      tenant: {
        ...baseline.tenant,
        ctx: { ...baseline.tenant.ctx, clinicName: "Outro nome digitado" },
        pixDeposit: { ...baseline.tenant.pixDeposit, asaasConnected: true },
        gcal: { ...baseline.tenant.gcal, connected: true },
      },
      professional: baseline.professional,
    };
    expect(dirtySections(current, baseline)).toEqual([]);
  });

  // The clinic's own opening hours are tenant-level but edited inside Section
  // 07, so they must dirty `disp` — otherwise Descartar would report nothing
  // to discard right after someone typed the clinic's week.
  it("marks disp dirty when only the clinic's opening hours changed", () => {
    const current = {
      tenant: {
        ...baseline.tenant,
        clinicDays: baseline.tenant.clinicDays.map((d, i) =>
          i === 0 ? { ...d, on: true, ranges: [{ start: 540, end: 720 }] } : d,
        ),
      },
      professional: baseline.professional,
    };
    expect(dirtySections(current, baseline)).toEqual(["disp"]);
  });

  it("names each edited section, and only section ids", () => {
    const current = {
      tenant: {
        ...baseline.tenant,
        ctx: { ...baseline.tenant.ctx, city: "Campinas" },
        messages: { ...baseline.tenant.messages, clinicDescription: "novo texto" },
        prefs: { defaultDur: 60 },
        gcal: { ...baseline.tenant.gcal, mode: "shared_account" as const },
      },
      professional: {
        ...baseline.professional,
        services: [],
        profile: { ...baseline.professional.profile, about: "novo" },
      },
    };
    const sections = dirtySections(current, baseline);
    expect([...sections].sort()).toEqual(["ctx", "disp", "gcal", "msg", "prof", "srv"]);
    // Section ids only — a config value must never ride along to telemetry.
    for (const s of sections) expect(s).toMatch(/^[a-z]{3,4}$/);
  });

  it("reports no professional sections when none is selected on either side", () => {
    const current = { tenant: baseline.tenant, professional: null };
    expect(dirtySections(current, { tenant: baseline.tenant, professional: null })).toEqual([]);
  });
});

describe("payload honesty — no visible control is silently dropped", () => {
  const { ctx, messages, postConsult, pixDeposit, clinicDays } = tenantSlicesFromWire(
    tenantWire({ business_hours: { monday: [{ start: "09:00", end: "12:00" }] } }),
  );

  const payload = buildConfigUpdatePayload(
    ctx,
    messages,
    postConsult,
    pixDeposit,
    45,
    "per_professional",
    clinicDays,
  );

  it("sends every field the form still lets you edit", () => {
    expect(payload.address).toEqual({
      line: "Rua Exemplo, 1",
      complement: null,
      neighborhood: null,
      city: "São Paulo",
      state: "SP",
      postal_code: null,
    });
    expect(payload.insurances).toEqual(["Convênio Exemplo"]);
    expect(payload.collect_insurance).toBe(true);
    expect(payload.clinic_description).toBe("Oftalmologia e cirurgia refrativa.");
    expect(payload.appointment_duration_min).toBe(45);
    expect(payload.google_calendar_mode).toBe("per_professional");
    // The clinic's own opening hours. They were always on the wire and always
    // had consumers (the human-backup plugin, the agent's prompt), but no
    // field on this screen ever set them — Section 07 does now.
    expect(payload.business_hours).toEqual({
      monday: [{ start: "09:00", end: "12:00" }],
    });
  });

  // The FIX 12 regression guards. Each of these WAS a visible, editable
  // control that never reached the wire.
  it("does not send clinic_name — the field is read-only on screen for this reason", () => {
    expect("clinic_name" in payload).toBe(false);
  });

  it("does not send a clinic phone — the control was removed, not just ignored", () => {
    expect("phone" in payload).toBe(false);
    expect("clinic_phone" in payload).toBe(false);
    // And the form state has nowhere to hold one anymore.
    expect("phone" in ctx).toBe(false);
  });

  it("does not send an inter-appointment gap or a minimum lead time", () => {
    expect("gap" in payload).toBe(false);
    expect("gap_min" in payload).toBe(false);
    expect("lead" in payload).toBe(false);
    expect("min_lead_hours" in payload).toBe(false);
  });

  it("never sends the read-only asaas_connected flag", () => {
    expect("asaas_connected" in payload).toBe(false);
  });

  it("sends a professional's hours and services under their own scope", () => {
    const slices = professionalSlicesFromWire(professionalWire(PROF_A));
    const body = buildProfessionalConfigPayload(
      slices.days,
      slices.services,
      slices.profile,
      slices.hoursSource,
    );
    expect(body.business_hours).toEqual({ monday: [{ start: "08:00", end: "12:00" }] });
    expect(body.appointment_types?.map((t) => t.name)).toEqual(["Consulta prof-a"]);
    expect(body.specialty).toBe("Especialidade prof-a");
  });
});

// ---------------------------------------------------------------------------
// Inheritance — null vs empty, the distinction the payload has to carry
// ---------------------------------------------------------------------------
//
// The failure this pins down: a professional inheriting the clinic's config
// hydrated as an empty form, every save sent `{}` / `[]`, and the backend now
// reads that as "an own config that offers nothing". So changing the greeting
// silently took a doctor off the clinic's hours and the bot went quiet.

const CLINIC_TYPES = [
  {
    name: "Limpeza",
    service_id: null,
    description: null,
    duration_min: 30,
    is_active: true,
    sort_order: 0,
    price: null,
    long_description: null,
    requirements: [],
  },
];

describe("inheritance state", () => {
  it("reads inheritance from the flags, not from the values being empty", () => {
    const inheriting = professionalSlicesFromWire(inheritingProfessionalWire(PROF_A));
    const emptied = professionalSlicesFromWire(emptiedProfessionalWire(PROF_B));

    // The two wires carry the SAME empty hours and services...
    expect(inheriting.days.some((d) => d.on)).toBe(false);
    expect(emptied.days.some((d) => d.on)).toBe(false);
    expect(inheriting.services).toEqual([]);
    expect(emptied.services).toEqual([]);
    // ...and are still not the same state.
    expect(inheriting.hoursSource).toBe("inherit");
    expect(emptied.hoursSource).toBe("own");
  });

  it("seeds an inheriting professional's services from the clinic list", () => {
    // Section 06 has no inherit/own switch any more, so an inheriting
    // professional MUST open with what they actually offer today ticked.
    // Reading their (empty) own list would show nothing, and the next save
    // would persist "offers nothing" - silently taking a working doctor off
    // the bot.
    const clinic = CLINIC_TYPES;
    const slices = professionalSlicesFromWire(inheritingProfessionalWire(PROF_A), clinic);

    expect(slices.services.map((x) => x.name)).toEqual(clinic.map((t) => t.name));
  });

  it("does NOT seed a professional with an own, deliberately empty list", () => {
    // An own empty list is a real answer ("this doctor offers nothing right
    // now"). Seeding it from the clinic would silently re-enable services
    // someone removed on purpose.
    const clinic = CLINIC_TYPES;
    const slices = professionalSlicesFromWire(emptiedProfessionalWire(PROF_A), clinic);

    expect(slices.services).toEqual([]);
  });

  it("sends null — not {} — for a professional who inherits", () => {
    const slices = professionalSlicesFromWire(inheritingProfessionalWire(PROF_A));
    const body = buildProfessionalConfigPayload(
      slices.days,
      slices.services,
      slices.profile,
      slices.hoursSource,
    );

    // null is "go on inheriting". `{}` would mean "own config, closed always".
    expect(body.business_hours).toBeNull();
  });

  it("always sends services as an ARRAY, never null", () => {
    // Services stopped being inheritable: the professional picks from the
    // clinic catalog, so what they picked is what gets written. A null would
    // reinstate a wholesale inheritance the screen no longer offers.
    const clinic = CLINIC_TYPES;
    const slices = professionalSlicesFromWire(inheritingProfessionalWire(PROF_A), clinic);
    const body = buildProfessionalConfigPayload(
      slices.days,
      slices.services,
      slices.profile,
      slices.hoursSource,
    );

    expect(Array.isArray(body.appointment_types)).toBe(true);
    expect(body.appointment_types?.map((t) => t.name)).toEqual(clinic.map((t) => t.name));
  });

  it("a save that only changes the greeting leaves inheritance intact", () => {
    // The regression, at the payload level: nothing about the professional was
    // touched, so nothing about the professional may change.
    const slices = professionalSlicesFromWire(inheritingProfessionalWire(PROF_A));
    const body = buildProfessionalConfigPayload(
      slices.days,
      slices.services,
      { ...slices.profile },
      slices.hoursSource,
    );

    expect(body.business_hours).toBeNull();
  });

  it("a greeting-only save does not empty the services of an inheriting doctor", () => {
    // The services counterpart of the regression above, under the new model:
    // the clinic-list seed is what keeps this honest.
    const clinic = CLINIC_TYPES;
    const slices = professionalSlicesFromWire(inheritingProfessionalWire(PROF_A), clinic);
    const body = buildProfessionalConfigPayload(
      slices.days,
      slices.services,
      { ...slices.profile },
      slices.hoursSource,
    );

    expect(body.appointment_types).not.toEqual([]);
  });

  it("sends an explicitly emptied own config as {} / [], and means it", () => {
    const slices = professionalSlicesFromWire(emptiedProfessionalWire(PROF_A));
    const body = buildProfessionalConfigPayload(
      slices.days,
      slices.services,
      slices.profile,
      slices.hoursSource,
    );

    expect(body.business_hours).toEqual({});
    expect(body.appointment_types).toEqual([]);
  });

  it("closing every day of an OWN schedule stays empty — it does not become inheritance", () => {
    const slices = professionalSlicesFromWire(professionalWire(PROF_A));
    const allClosed = slices.days.map((d) => ({ ...d, on: false, ranges: [] }));
    const body = buildProfessionalConfigPayload(
      allClosed,
      slices.services,
      slices.profile,
      slices.hoursSource,
    );

    expect(body.business_hours).toEqual({});
  });

  it("degrades to 'unknown' against a backend that does not send the flags", () => {
    const slices = professionalSlicesFromWire(legacyBackendProfessionalWire(PROF_A));

    // Not "own" — we were never told, and guessing is what breaks a clinic.
    expect(slices.hoursSource).toBe("unknown");
  });

  it("an unknown state sends values, never a null it cannot justify", () => {
    const slices = professionalSlicesFromWire(legacyBackendProfessionalWire(PROF_A));
    const body = buildProfessionalConfigPayload(
      slices.days,
      slices.services,
      slices.profile,
      slices.hoursSource,
    );

    // Exactly the pre-flag behaviour: send what is on screen. Sending null
    // would assert an inheritance this backend never confirmed.
    expect(body.business_hours).not.toBeNull();
    expect(body.appointment_types).not.toBeNull();
  });

  it("switching to 'configuração própria' is a change Descartar can see", () => {
    // Values identical on both sides — only the source differs. Without this,
    // Descartar would say "nada para descartar" over a real pending change.
    const baselineProfessional = professionalSlicesFromWire(inheritingProfessionalWire(PROF_A));
    const currentProfessional = { ...baselineProfessional, hoursSource: "own" as const };
    const tenant = tenantSlicesFromWire(tenantWire());

    const sections = dirtySections(
      { tenant, professional: currentProfessional },
      { tenant, professional: baselineProfessional },
    );

    expect(sections).toContain("disp");
  });

  it("ticking a catalog service is a change Descartar can see", () => {
    const baselineProfessional = professionalSlicesFromWire(professionalWire(PROF_A));
    const currentProfessional = {
      ...baselineProfessional,
      services: [
        ...baselineProfessional.services,
        {
          id: 99,
          serviceId: "11111111-1111-4111-8111-111111111111",
          name: "Limpeza",
          dur: 30,
          price: "",
          active: true,
          requirements: [],
        },
      ],
    };
    const tenant = tenantSlicesFromWire(tenantWire());

    const sections = dirtySections(
      { tenant, professional: currentProfessional },
      { tenant, professional: baselineProfessional },
    );

    expect(sections).toContain("srv");
  });

  it("same name, different catalog id, is NOT the same service", () => {
    // The whole point of the catalog: identity is the id, not the string.
    const baselineProfessional = professionalSlicesFromWire(professionalWire(PROF_A));
    const relinked = {
      ...baselineProfessional,
      services: baselineProfessional.services.map((x) => ({
        ...x,
        serviceId: "22222222-2222-4222-8222-222222222222",
      })),
    };
    const tenant = tenantSlicesFromWire(tenantWire());

    expect(
      dirtySections(
        { tenant, professional: relinked },
        { tenant, professional: baselineProfessional },
      ),
    ).toContain("srv");
  });

  it("an unhydrated professional form claims nothing about inheritance", () => {
    const empty = emptyProfessionalSlices();
    expect(empty.hoursSource).toBe("unknown");
    expect(empty.services).toEqual([]);
  });
});
