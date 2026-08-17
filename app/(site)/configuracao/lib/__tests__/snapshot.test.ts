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
import { PROF_A, PROF_B, TENANT_ID, professionalWire, tenantWire } from "./fixtures";

describe("wire → form state", () => {
  it("maps every tenant-level field the form owns", () => {
    const slices = tenantSlicesFromWire(tenantWire());
    expect(slices.ctx.clinicName).toBe("Clínica Exemplo");
    expect(slices.ctx.addressLine).toBe("Rua Exemplo, 1");
    expect(slices.ctx.insurances).toBe("Convênio Exemplo");
    expect(slices.ctx.collectInsurance).toBe(true);
    expect(slices.messages.greetingMessage).toBe("Olá! Como posso ajudar?");
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
    expect(tenant.messages.greetingMessage).toBe("");

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

  it("names each edited section, and only section ids", () => {
    const current = {
      tenant: {
        ...baseline.tenant,
        ctx: { ...baseline.tenant.ctx, city: "Campinas" },
        messages: { ...baseline.tenant.messages, greetingMessage: "novo texto" },
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
  const { ctx, messages, postConsult, pixDeposit } = tenantSlicesFromWire(tenantWire());

  const payload = buildConfigUpdatePayload(
    ctx,
    messages,
    postConsult,
    pixDeposit,
    45,
    "per_professional",
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
    expect(payload.greeting_message).toBe("Olá! Como posso ajudar?");
    expect(payload.appointment_duration_min).toBe(45);
    expect(payload.google_calendar_mode).toBe("per_professional");
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
    const body = buildProfessionalConfigPayload(slices.days, slices.services, slices.profile);
    expect(body.business_hours).toEqual({ monday: [{ start: "08:00", end: "12:00" }] });
    expect(body.appointment_types?.map((t) => t.name)).toEqual(["Consulta prof-a"]);
    expect(body.specialty).toBe("Especialidade prof-a");
  });
});
