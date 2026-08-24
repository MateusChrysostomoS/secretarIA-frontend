// demo-seed.ts — the sales showcase shown to a SESSION-LESS VISITOR, and to
// nobody else.
//
// These values used to be the initial useState arguments in page.tsx, which
// made them the pre-hydration placeholder for every viewer — including a
// logged-in clinic whose GET had failed. That is exactly the bug FIX 07
// closes, so the seed is quarantined here behind `visitorDemo()`: the payload
// is only reachable through `.forVisitor`, a name you cannot type by accident
// and can grep for in one command.
//
// The rule: `.forVisitor` may only be dereferenced under
// `isVisitorDemo(hydration)`. An authenticated session starts from the
// EMPTY_* constants in ./types and moves only when a real GET answers.

import type { DoctorProfessional } from "@/lib/manage-api";
import {
  closedWeek,
  type ClinicCtx,
  type DayConfig,
  type CatalogService,
  type ProfessionalProfile,
  type Service,
} from "./types";

/**
 * Wrapper marking a value as public-demo-only. It carries no behaviour — its
 * whole job is to make the unwrap an explicit, searchable act rather than a
 * silent default. (A TS brand would not work: structural typing lets a
 * branded object flow into a plain slot unnoticed, which is precisely the
 * mistake being prevented.)
 */
export type VisitorDemo<T> = { readonly forVisitor: T };

function visitorDemo<T>(value: T): VisitorDemo<T> {
  return { forVisitor: value };
}

/** Synthetic id for the single showcase row — never a real professional. */
export const DEMO_PROFESSIONAL_ID = "demo";
// A second professional exists in the showcase so Section 06 can demonstrate
// what it is actually for: picking a service a COLLEAGUE already added. With a
// one-doctor roster the catalog would read as "your own list under a new
// layout", which is the misunderstanding the redesign exists to correct.
export const DEMO_COLLEAGUE_ID = "demo-colega";

export const DEMO_ROSTER: VisitorDemo<DoctorProfessional[]> = visitorDemo([
  {
    id: DEMO_PROFESSIONAL_ID,
    name: "Consultório Dr. Aurélio Lima",
    is_active: true,
    has_calendar: false,
    has_hours: true,
    has_services: true,
    complete: false,
    linked_user_email: null,
    invite_pending: false,
  },
  {
    id: DEMO_COLLEAGUE_ID,
    name: "Dra. Helena Prado",
    is_active: true,
    has_calendar: false,
    has_hours: true,
    has_services: true,
    complete: false,
    linked_user_email: null,
    invite_pending: false,
  },
]);

export const DEMO_CTX: VisitorDemo<ClinicCtx> = visitorDemo({
  clinicName: "Consultório Dr. Aurélio Lima",
  addressLine: "Av. Paulista, 1000",
  addressComplement: "Sala 302",
  neighborhood: "Bela Vista",
  city: "São Paulo",
  state: "SP",
  postalCode: "01310-100",
  insurances: "Unimed, Bradesco Saúde, SulAmérica",
  collectInsurance: true,
});

export const DEMO_PROFILE: VisitorDemo<ProfessionalProfile> = visitorDemo({
  specialty: "Clínica geral",
  about: "",
  contextDoctorMessage: "",
});

// Demo service ids are stable, fake catalog uuids: the showcase renders the
// SAME picker a real clinic sees, and the picker matches a professional's
// entries to catalog rows by id.
const DEMO_SERVICE_IDS = {
  first: "00000000-0000-4000-8000-000000000001",
  followUp: "00000000-0000-4000-8000-000000000002",
  remote: "00000000-0000-4000-8000-000000000003",
  surgical: "00000000-0000-4000-8000-000000000004",
} as const;

export const DEMO_SERVICES: VisitorDemo<Service[]> = visitorDemo([
  {
    id: 1,
    serviceId: DEMO_SERVICE_IDS.first,
    name: "Primeira consulta",
    dur: 60,
    price: "R$ 450",
    active: true,
    requirements: [
      { id: 11, text: "Trazer documento com foto e carteirinha do convênio" },
      { id: 12, text: "Chegar 15 minutos antes para o cadastro" },
    ],
  },
  {
    id: 2,
    serviceId: DEMO_SERVICE_IDS.followUp,
    name: "Retorno",
    dur: 30,
    price: "",
    active: true,
    requirements: [{ id: 21, text: "Trazer exames solicitados na consulta anterior" }],
  },
  {
    id: 3,
    serviceId: DEMO_SERVICE_IDS.remote,
    name: "Teleconsulta",
    dur: 40,
    price: "R$ 350",
    active: true,
    requirements: [],
  },
]);

// The clinic's catalog as a visitor sees it: everything the demo professional
// offers, PLUS one service only a colleague does — without that fourth row the
// showcase could not show the actual point of the screen, which is ticking a
// service someone else already added.
export const DEMO_CATALOG: VisitorDemo<CatalogService[]> = visitorDemo([
  {
    id: DEMO_SERVICE_IDS.first,
    name: "Primeira consulta",
    description: "Avaliação inicial completa",
    longDescription: "",
    requirements: [
      { id: 11, text: "Trazer documento com foto e carteirinha do convênio" },
      { id: 12, text: "Chegar 15 minutos antes para o cadastro" },
    ],
    active: true,
    sortOrder: 0,
    professionalIds: [DEMO_PROFESSIONAL_ID, DEMO_COLLEAGUE_ID],
  },
  {
    id: DEMO_SERVICE_IDS.followUp,
    name: "Retorno",
    description: "Reavaliação de um tratamento em andamento",
    longDescription: "",
    requirements: [{ id: 21, text: "Trazer exames solicitados na consulta anterior" }],
    active: true,
    sortOrder: 1,
    professionalIds: [DEMO_PROFESSIONAL_ID],
  },
  {
    id: DEMO_SERVICE_IDS.remote,
    name: "Teleconsulta",
    description: "Atendimento por vídeo",
    longDescription: "",
    requirements: [],
    active: true,
    sortOrder: 2,
    professionalIds: [DEMO_PROFESSIONAL_ID],
  },
  {
    id: DEMO_SERVICE_IDS.surgical,
    name: "Avaliação pré-operatória",
    description: "Liberação para procedimento cirúrgico",
    longDescription: "",
    requirements: [],
    active: true,
    sortOrder: 3,
    // Offered only by the colleague — the row a visitor can see is tickable.
    professionalIds: [DEMO_COLLEAGUE_ID],
  },
]);

/** Mon–Fri open with a lunch break, weekend closed — showcase shape only. */
export function demoWeek(): DayConfig[] {
  return closedWeek().map((day, i) =>
    i < 5
      ? {
          ...day,
          on: true,
          ranges: [
            { start: 8 * 60, end: 12 * 60 },
            { start: 14 * 60, end: 18 * 60 },
          ],
        }
      : day,
  );
}
