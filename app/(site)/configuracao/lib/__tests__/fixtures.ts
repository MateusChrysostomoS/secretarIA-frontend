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

export function professionalWire(
  id: string,
  overrides: Partial<ProfessionalWire> = {},
): ProfessionalWire {
  return {
    id,
    name: `Profissional ${id}`,
    is_active: true,
    specialty: "Especialidade " + id,
    about: null,
    context_doctor_message: null,
    business_hours: { monday: [{ start: "08:00", end: "12:00" }] },
    appointment_types: [
      {
        name: "Consulta " + id,
        description: null,
        duration_min: 30,
        is_active: true,
        sort_order: 0,
        price: null,
        long_description: null,
        requirements: [],
      },
    ],
    google_calendar_id: null,
    calendar_connected: false,
    ...overrides,
  };
}
