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
  buildProfessionalPatch: () => ProfessionalConfigUpdatePayload;
  /**
   * "Is this error a missing route, rather than a real failure?" Injected so
   * the fallback rule is testable without constructing HubApiError, and so it
   * stays a single, explicit decision instead of a scattered status check.
   */
  isLegacyBackend: (error: unknown) => boolean;
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

  const tenantPatch = deps.buildTenantPatch();
  const professionalPatch = professionalId ? deps.buildProfessionalPatch() : null;

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
    return { status: "saved", mode: "legacy", tenant, professional: null };
  }

  try {
    const wire = await deps.putProfessional(professionalId, professionalPatch);
    return {
      status: "saved",
      mode: "legacy",
      tenant,
      professional: { id: professionalId, wire },
    };
  } catch (cause) {
    // The tenant is already committed on the server. Saying "não foi possível
    // salvar" here would be a lie the user acts on.
    return { status: "partial", mode: "legacy", tenant, professionalId, cause };
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
