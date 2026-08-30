// Synthetic wire fixtures for the Configuração tests.
//
// Everything here is invented: ids are `t-1` / `prof-a` / `prof-b`, the clinic
// name is a placeholder, and there is no phone number, no patient data and no
// real tenant anywhere. That is a rule, not an accident — test fixtures get
// pasted into issues and CI logs, so they must never carry production values.

import type { ProfessionalWire, TenantConfigWire } from "@/lib/secretaria-hub";

export const TENANT_ID = "t-1";
export const PROF_A = "prof-a";
export const PROF_B = "prof-b";

export function tenantWire(overrides: Partial<TenantConfigWire> = {}): TenantConfigWire {
  return {
    clinic_name: "Clínica Exemplo",
    greeting_message: "Olá! Como posso ajudar?",
    returning_greeting_message: null,
    post_consult_message: null,
    post_consult_knowledge: null,
    language: "pt-BR",
    timezone: "America/Sao_Paulo",
    google_calendar_id: "",
    appointment_duration_min: 30,
    business_hours: {},
    appointment_types: [],
    initial_flows: {},
    is_active: true,
    calendar_connected: false,
    google_calendar_mode: "per_professional",
    address: { line: "Rua Exemplo, 1", city: "São Paulo", state: "SP" },
    insurances: ["Convênio Exemplo"],
    collect_insurance: true,
    pix_deposit_enabled: false,
    pix_deposit_percent: 30,
    pix_refund_window_hours: 24,
    pix_retention_policy: "total",
    pix_partial_refund_percent: 50,
    pix_reschedule_limit: 2,
    asaas_connected: false,
    ...overrides,
  };
}

// Key-for-key what GET /tenants/me/professionals returns (backend:
// ProfessionalListItem, whose key set is pinned by
// test_list_shape_is_whitelisted). Keeping the fixture complete is deliberate:
// the `calendar_connected` bug survived because a fixture invented a key the
// backend never sends, so the tests agreed with the type instead of the server.
//
// Defaults describe a professional with their OWN config — the flags say so —
// because that is the state most tests reason about. Inheritance is opted into
// per test via the factories below, never implied by emptiness.
export function professionalWire(
  id: string,
  overrides: Partial<ProfessionalWire> = {},
): ProfessionalWire {
  return {
    id,
    name: `Profissional ${id}`,
    google_calendar_id: null,
    is_active: true,
    created_at: "2026-01-01T00:00:00Z",
    specialty: "Especialidade " + id,
    about: null,
    context_doctor_message: null,
    business_hours: { monday: [{ start: "08:00", end: "12:00" }] },
    appointment_types: [
      {
        name: "Consulta " + id,
        service_id: null,
        description: null,
        duration_min: 30,
        is_active: true,
        sort_order: 0,
        price: null,
        long_description: null,
        requirements: [],
      },
    ],
    has_calendar: false,
    calendar_source: "none",
    has_hours: true,
    has_services: true,
    complete: false,
    business_hours_inherited: false,
    appointment_types_inherited: false,
    ...overrides,
  };
}

/** A professional with NO config of their own — the clinic's applies. */
export function inheritingProfessionalWire(
  id: string,
  overrides: Partial<ProfessionalWire> = {},
): ProfessionalWire {
  return professionalWire(id, {
    business_hours: {},
    appointment_types: [],
    business_hours_inherited: true,
    appointment_types_inherited: true,
    ...overrides,
  });
}

/**
 * The SAME empty payload as `inheritingProfessionalWire`, but as an own,
 * deliberately empty override. Byte-identical except for the two flags — which
 * is exactly why the flags had to exist.
 */
export function emptiedProfessionalWire(
  id: string,
  overrides: Partial<ProfessionalWire> = {},
): ProfessionalWire {
  return professionalWire(id, {
    business_hours: {},
    appointment_types: [],
    business_hours_inherited: false,
    appointment_types_inherited: false,
    has_hours: false,
    has_services: false,
    ...overrides,
  });
}

/**
 * What an OLDER backend returns: no `*_inherited`, no `calendar_source`. Used
 * to prove this bundle degrades explicitly instead of reading the missing flags
 * as `false` and converting somebody's inheritance into an empty override.
 */
export function legacyBackendProfessionalWire(
  id: string,
  overrides: Partial<ProfessionalWire> = {},
): ProfessionalWire {
  const wire = professionalWire(id, { business_hours: {}, appointment_types: [], ...overrides });
  delete wire.business_hours_inherited;
  delete wire.appointment_types_inherited;
  delete wire.calendar_source;
  return wire;
}
