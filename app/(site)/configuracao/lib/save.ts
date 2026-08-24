// save.ts — the guarded write path for the Configuração screen.
//
// Extracted out of page.tsx for one reason that matters more than tidiness:
// "an incomplete screen must issue ZERO writes" is the point of the fail-closed
// hydration work, and it can only be *proved* if the decision is callable
// without React. This repo's vitest runs in the node environment (no jsdom, no
// Testing Library), so a guard buried in a component would be untestable by
// construction.
//
// The guard is intentionally redundant with the disabled Save button. The
// button is an affordance; this is the enforcement. A stale render, a keyboard
// activation racing a state change, or a future caller wiring Save somewhere
// else all land here, and here the answer comes from saveBlockedReason() and
// nothing else.
//
// TRANSACTIONAL SAVE
// ------------------
// The screen edits two scopes — the tenant and one professional — and used to
// persist them with two independent PUTs, each committing server-side. A
// failure on the second left the first live: the clinic's greeting and Pix
// policy had changed, the professional's hours had not, and the UI could only
// say "não foi possível salvar". Retrying then re-sent a snapshot that no
// longer matched the database.
//
// The default path is now one request to PUT /tenants/me/configuration, which
// validates and commits both halves in a single server transaction. The old
// two-PUT sequence survives ONLY as a fallback for a backend that predates
// that route — and when it runs, it reports a half-save as a half-save rather
// than claiming an atomicity it does not have.

import type {
  HubConfigurationUpdatePayload,
  HubConfigurationWire,
  ProfessionalConfigUpdatePayload,
  ProfessionalWire,
  TenantConfigUpdatePayload,
  TenantConfigWire,
} from "@/lib/secretaria-hub";
import {
  saveBlockedReason,
  type HydrationState,
  type SaveBlockedReason,
  type SaveMode,
} from "./hydration";

export type SaveDeps = {
  /** The hydration verdict at the moment Save was invoked. */
  state: HydrationState;
  /** PUT /tenants/me/configuration — the transactional path. */
  putConfiguration: (body: HubConfigurationUpdatePayload) => Promise<HubConfigurationWire>;
  /** PUT /tenants/me/config — legacy fallback only. */
  putTenant: (patch: TenantConfigUpdatePayload) => Promise<TenantConfigWire>;
  /** PUT /tenants/me/professionals/{id}/config — legacy fallback only. */
  putProfessional: (
    professionalId: string,
    patch: ProfessionalConfigUpdatePayload,
  ) => Promise<ProfessionalWire>;
  /** Builders, so this module never touches React form state. */
  buildTenantPatch: () => TenantConfigUpdatePayload;
  /**
   * `linked` maps a local Service id to the catalog id it was just published
   * under, so the payload carries `service_id` for entries that did not have
   * one when the user pressed Save. Passed as an argument rather than read
   * from state because React has not re-rendered yet at this point in the
   * click.
   */
  buildProfessionalPatch: (linked?: Map<number, string>) => ProfessionalConfigUpdatePayload;
  /**
   * Publishes the professional's off-catalog services into the clinic catalog
   * and reports the ids they landed on. Runs BEFORE the config write, because
   * the payload needs those ids.
   *
   * MUST NOT THROW — a resolve is the contract even when every publish failed.
   * A transient catalog error must not hold eight unrelated sections hostage,
   * so the save proceeds with whatever was linked and the leftovers stay
   * off-catalog, to be retried by the next save. `failed` is how the UI says
   * so out loud rather than silently.
   */
  publishServices?: () => Promise<PublishResult>;
  /**
   * Creates the missing per-professional Google calendars inside the clinic's
   * account (POST /tenants/me/professionals/calendars). Runs only AFTER a
   * successful save, and only when `shouldEnsureCalendars` is set.
   */
  ensureCalendars?: () => Promise<CalendarEnsureResult>;
  /**
   * Whether this save put the clinic in shared_account mode. Choosing that
   * mode is a decision about the WHOLE clinic, so acting on it is part of
   * saving it — otherwise "Conta única" saves a preference and produces no
   * calendars, which is indistinguishable from the feature being broken.
   */
  shouldEnsureCalendars?: boolean;
  /**
   * "Is this error a missing route, rather than a real failure?" Injected so
   * the fallback rule is testable without constructing HubApiError, and so it
   * stays a single, explicit decision instead of a scattered status check.
   */
  isLegacyBackend: (error: unknown) => boolean;
};

/** Outcome of publishing off-catalog services. Never a thrown error. */
export type PublishResult = {
  /** Local Service id -> catalog service id. */
  linked: Map<number, string>;
  /** How many could not be published. Reported, never silently dropped. */
  failed: number;
};

/** Outcome of the post-save bulk calendar run. `null` = it did not run. */
export type CalendarEnsureResult = {
  created: number;
  already: number;
  failed: number;
  /** A structured backend refusal that stopped the whole run, if any. */
  blockedCode?: string;
  blockedMessage?: string;
};

export type SaveOutcome =
  /** Refused before touching the network. */
  | { status: "blocked"; reason: SaveBlockedReason }
  /** Everything asked for was persisted. */
  | {
      status: "saved";
      mode: SaveMode;
      tenant: TenantConfigWire;
      professional: { id: string; wire: ProfessionalWire } | null;
      /** Off-catalog services that could not be published. 0 in the normal case. */
      servicesNotPublished: number;
      /** Result of the bulk calendar run, or null when it did not run. */
      calendars: CalendarEnsureResult | null;
    }
  /**
   * LEGACY PATH ONLY. The tenant PUT succeeded and the professional PUT did
   * not, so the clinic is in a real half-saved state. Named explicitly so the
   * UI can say which half landed and offer to retry just the other one —
   * rather than showing a generic error over a screen that has already
   * partially changed the WhatsApp behaviour.
   */
  | {
      status: "partial";
      mode: "legacy";
      tenant: TenantConfigWire;
      professionalId: string;
      cause: unknown;
    };

/**
 * Runs the save, or refuses without touching the network.
 *
 * A total failure (nothing written) throws, exactly as before — the caller's
 * catch reports it. Only the genuinely ambiguous case, a legacy half-save, is
 * returned as a value, because it needs different words and a different retry
 * than "it failed".
 */
export async function performSave(deps: SaveDeps): Promise<SaveOutcome> {
  const blocked = saveBlockedReason(deps.state);
  if (blocked) return { status: "blocked", reason: blocked };

  // Captured with the verdict, never re-read later: this is what stops a
  // concurrent selection change from writing professional A's form under
  // professional B's id.
  const professionalId = deps.state.selectedProfessionalId;

  // --- Publish first: a service without a catalog id is not a shared object ---
  // This is the write that gives a service its identity. Doing it before the
  // config PUT is what lets the payload carry `service_id`, which is in turn
  // what lets the backend answer "which other doctor offers this?" when a
  // consult is cancelled. It is deliberately NOT part of the transaction: the
  // catalog row is useful to the whole clinic whether or not this particular
  // professional's save then succeeds.
  const published = professionalId && deps.publishServices ? await deps.publishServices() : null;

  const tenantPatch = deps.buildTenantPatch();
  const professionalPatch = professionalId
    ? deps.buildProfessionalPatch(published?.linked)
    : null;
  const servicesNotPublished = published?.failed ?? 0;

  // --- Preferred: one request, one transaction -------------------------
  try {
    const body: HubConfigurationUpdatePayload = { tenant: tenantPatch };
    if (professionalId && professionalPatch) {
      body.professional_id = professionalId;
      body.professional = professionalPatch;
    }
    const saved = await deps.putConfiguration(body);
    return {
      status: "saved",
      mode: "atomic",
      tenant: saved.tenant,
      professional:
        professionalId && saved.professional
          ? { id: professionalId, wire: saved.professional }
          : null,
      servicesNotPublished,
      calendars: await ensureCalendars(deps),
    };
  } catch (error) {
    // Anything other than "this route does not exist" is a real failure and
    // must surface as one. Falling back on a 5xx would silently re-enable the
    // half-save this endpoint exists to prevent.
    if (!deps.isLegacyBackend(error)) throw error;
  }

  // --- Fallback: pre-aggregate backend, two PUTs, honest about the risk ---
  const tenant = await deps.putTenant(tenantPatch);
  if (!professionalId || !professionalPatch) {
    return {
      status: "saved",
      mode: "legacy",
      tenant,
      professional: null,
      servicesNotPublished,
      calendars: await ensureCalendars(deps),
    };
  }

  try {
    const wire = await deps.putProfessional(professionalId, professionalPatch);
    return {
      status: "saved",
      mode: "legacy",
      tenant,
      professional: { id: professionalId, wire },
      servicesNotPublished,
      calendars: await ensureCalendars(deps),
    };
  } catch (cause) {
    // The tenant is already committed on the server. Saying "não foi possível
    // salvar" here would be a lie the user acts on.
    return { status: "partial", mode: "legacy", tenant, professionalId, cause };
  }
}

/**
 * The post-save calendar run, or null when it does not apply.
 *
 * Runs ONLY after the configuration is persisted: creating calendars for a
 * mode the server rejected would leave the clinic's Google account holding
 * agendas for a setting that never took effect.
 *
 * Never throws. The configuration IS saved by the time this runs, and letting
 * a Google outage turn a successful save into an error message would send the
 * user back to re-save something that is already live. Failures are reported
 * inside the result instead, and the run is idempotent, so the next save (or
 * the per-professional button) retries them for free.
 */
async function ensureCalendars(deps: SaveDeps): Promise<CalendarEnsureResult | null> {
  if (!deps.shouldEnsureCalendars || !deps.ensureCalendars) return null;
  try {
    return await deps.ensureCalendars();
  } catch {
    return null;
  }
}

/**
 * Retries only the professional half after a legacy partial save. Kept
 * separate from performSave so the retry cannot re-send the tenant patch — the
 * tenant is already persisted, and re-sending a now-stale snapshot over it is
 * exactly the second failure mode this whole round is closing.
 */
export function retryProfessionalOnly(
  deps: Pick<SaveDeps, "putProfessional" | "buildProfessionalPatch">,
  professionalId: string,
): Promise<ProfessionalWire> {
  return deps.putProfessional(professionalId, deps.buildProfessionalPatch());
}

/** User-facing copy per refusal reason. Categorical in, prose out. */
export const SAVE_BLOCKED_MESSAGE: Record<SaveBlockedReason, string> = {
  no_session: "Entre na sua conta para salvar a configuração.",
  demo_mode: "Você está vendo dados de demonstração. Entre na sua conta para salvar.",
  tenant_not_loaded:
    "Não foi possível salvar: a configuração da sua clínica ainda não foi carregada. Tente carregar novamente.",
  roster_not_loaded:
    "Não foi possível salvar: a lista de profissionais ainda não foi carregada. Tente carregar novamente.",
  professional_not_loaded:
    "Não foi possível salvar: a configuração do profissional selecionado ainda não foi carregada. Tente carregar novamente.",
};

/**
 * What to tell the user after a legacy half-save. Names both halves, because
 * "part of it saved" without saying which part is not actionable.
 */
export const PARTIAL_SAVE_MESSAGE =
  "As configurações da clínica foram salvas, mas as do profissional selecionado não. " +
  "Tente salvar novamente para concluir.";
