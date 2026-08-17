// hydration.ts — the fail-closed hydration state machine for the Configuração
// screen, plus the selectors that decide what may be edited and whether Save
// is allowed to fire at all.
//
// WHY THIS EXISTS
// ---------------
// The screen used to enable itself on a proxy: a hub token minted + a base URL
// configured. Neither proves a single GET succeeded. So a tenant whose
// GET /tenants/me/config returned 500 kept the sales-demo seed on screen,
// every input stayed editable, and Save would happily PUT those seeds over the
// clinic's real greeting, Pix policy, hours and services.
//
// The rule this module encodes is the opposite: an authenticated session shows
// NOTHING it has not actually read back from the hub, and writes NOTHING until
// the exact tenant (and, when one is selected, the exact professional id) has
// been hydrated successfully. "Still loading" and "failed" are both treated as
// "not allowed to write" — fail closed, never fall back to demo.
//
// Pure and dependency-free on purpose: page.tsx owns the React wiring, this
// owns the rules, and lib/__tests__/hydration.test.ts covers them directly.

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/** Per-source lifecycle. `error` is terminal until a retry starts a new cycle. */
export type LoadPhase = "idle" | "loading" | "loaded" | "error";

/**
 * Which independent source a phase belongs to.
 *  - `tenant`       — GET /tenants/me/config (tenant-level fields)
 *  - `roster`       — the professionals list: brain-api roster + hub configs,
 *                     loaded together because a selection is only usable when
 *                     both the row and its editable config are present
 *  - `professional` — the SELECTED professional's config (hours/services/profile)
 */
export type ConfigScope = "tenant" | "roster" | "professional";

export type ScopeState = {
  phase: LoadPhase;
  /** HTTP status of the last failure, or null when the client reported none. */
  status: number | null;
  /** Load attempts for this scope so far — telemetry only, never a retry gate. */
  attempt: number;
};

/**
 * Who is looking at the screen.
 *  - `unknown`       — session not resolved yet. Fail closed: empty + read-only.
 *  - `visitor`       — no session. The labeled public demo may be seeded.
 *  - `authenticated` — a real session. Demo seeds are FORBIDDEN, entitled or not.
 */
export type ViewerMode = "unknown" | "visitor" | "authenticated";

export type HydrationState = {
  mode: ViewerMode;
  tenant: ScopeState;
  roster: ScopeState;
  /** `id` is the professional this state actually describes — not the selection. */
  professional: ScopeState & { id: string | null };
  /** What the UI currently has selected; may be ahead of `professional.id`. */
  selectedProfessionalId: string | null;
  /**
   * Current TENANT load cycle. Every async completion carries the generation
   * it was issued under; anything older is a superseded response and is
   * dropped.
   */
  generation: number;
  /**
   * Current ROSTER load cycle, counted separately from `generation`.
   *
   * The roster is reloaded on its own after an invite, a self-bind or a
   * calendar connect. Folding those into the tenant cycle would re-GET the
   * tenant config and re-apply it to the form, silently throwing away
   * whatever the user had typed but not yet saved. Two counters keep a roster
   * refresh from touching tenant-level form state at all.
   */
  rosterGeneration: number;
};

const IDLE_SCOPE: ScopeState = { phase: "idle", status: null, attempt: 0 };

export const INITIAL_HYDRATION_STATE: HydrationState = {
  mode: "unknown",
  tenant: IDLE_SCOPE,
  roster: IDLE_SCOPE,
  professional: { ...IDLE_SCOPE, id: null },
  selectedProfessionalId: null,
  generation: 0,
  rosterGeneration: 0,
};

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type HydrationAction =
  /** The session check settled. Switching viewer identity always resets. */
  | { type: "session_resolved"; mode: Exclude<ViewerMode, "unknown"> }
  /** Logout or tenant swap — drops every loaded verdict for both cycles. */
  | { type: "reset" }
  /** A full load cycle began: tenant AND roster, under both new generations. */
  | { type: "hydration_started"; generation: number; rosterGeneration: number }
  /** Roster-only refresh (invite, self-bind, calendar connect). Tenant untouched. */
  | { type: "roster_reload_started"; rosterGeneration: number }
  | { type: "load_succeeded"; scope: "tenant" | "roster"; generation: number }
  | {
      type: "load_failed";
      scope: "tenant" | "roster";
      generation: number;
      status: number | null;
    }
  /** The user picked a professional (or the roster auto-selected one). */
  | { type: "professional_selected"; id: string | null }
  // Professional config is carved out of the roster response, so these two
  // are validated against `rosterGeneration`, not the tenant `generation`.
  | { type: "professional_loaded"; id: string; rosterGeneration: number }
  | {
      type: "professional_failed";
      id: string;
      rosterGeneration: number;
      status: number | null;
    };

// ---------------------------------------------------------------------------
// Reducer
// ---------------------------------------------------------------------------

/**
 * Is this completion still relevant? Three independent staleness tests, and a
 * response failing any of them is discarded with no state change:
 *  - `generation`      — the tenant cycle was superseded (retry, re-login).
 *  - `rosterGeneration`— the roster cycle was superseded (another refresh).
 *  - the professional id — the user moved on while A was still in flight.
 * The last one is what stops "select A, select B, A answers last" from
 * repainting B's form with A's hours.
 */
function isCurrentCycle(
  state: HydrationState,
  scope: "tenant" | "roster",
  generation: number,
): boolean {
  return generation === (scope === "tenant" ? state.generation : state.rosterGeneration);
}

export function hydrationReducer(
  state: HydrationState,
  action: HydrationAction,
): HydrationState {
  switch (action.type) {
    case "session_resolved": {
      if (state.mode === action.mode) return state;
      // A different viewer entirely — never let one identity's verdicts or
      // selection survive into another's screen.
      return {
        ...INITIAL_HYDRATION_STATE,
        mode: action.mode,
        generation: state.generation + 1,
        rosterGeneration: state.rosterGeneration + 1,
      };
    }

    case "reset":
      return {
        ...INITIAL_HYDRATION_STATE,
        mode: state.mode,
        generation: state.generation + 1,
        rosterGeneration: state.rosterGeneration + 1,
      };

    case "hydration_started":
      return {
        ...state,
        generation: action.generation,
        rosterGeneration: action.rosterGeneration,
        tenant: {
          phase: "loading",
          status: null,
          attempt: state.tenant.attempt + 1,
        },
        roster: {
          phase: "loading",
          status: null,
          attempt: state.roster.attempt + 1,
        },
        // Nothing about the previous professional survives a full cycle: the
        // roster response re-picks the selection once it lands.
        professional: { ...IDLE_SCOPE, id: null },
        selectedProfessionalId: null,
      };

    case "roster_reload_started":
      // Deliberately leaves `professional` alone. An already-hydrated
      // selection keeps its unsaved edits through a roster refresh; only a
      // selection that disappears from the new roster gets re-picked, via a
      // `professional_selected` the caller dispatches on completion.
      return {
        ...state,
        rosterGeneration: action.rosterGeneration,
        roster: {
          phase: "loading",
          status: null,
          attempt: state.roster.attempt + 1,
        },
      };

    case "load_succeeded": {
      if (!isCurrentCycle(state, action.scope, action.generation)) return state;
      return {
        ...state,
        [action.scope]: { ...state[action.scope], phase: "loaded", status: null },
      };
    }

    case "load_failed": {
      if (!isCurrentCycle(state, action.scope, action.generation)) return state;
      const next: HydrationState = {
        ...state,
        [action.scope]: {
          ...state[action.scope],
          phase: "error",
          status: action.status,
        },
      };
      // A failed roster invalidates any professional verdict derived from it.
      if (action.scope === "roster") {
        next.professional = { ...IDLE_SCOPE, id: null };
        next.selectedProfessionalId = null;
      }
      return next;
    }

    case "professional_selected": {
      if (action.id === state.selectedProfessionalId) return state;
      // Selection moves first, readiness follows. Between the two, professional
      // scope is not `loaded`: not editable, not savable.
      return {
        ...state,
        selectedProfessionalId: action.id,
        professional: {
          phase: action.id ? "loading" : "idle",
          status: null,
          attempt: action.id ? state.professional.attempt + 1 : 0,
          id: null,
        },
      };
    }

    case "professional_loaded": {
      // Professional config comes out of the roster response, so it is the
      // ROSTER cycle that decides whether this answer is still current.
      if (!isCurrentCycle(state, "roster", action.rosterGeneration)) return state;
      if (action.id !== state.selectedProfessionalId) return state; // stale selection
      return {
        ...state,
        professional: {
          phase: "loaded",
          status: null,
          attempt: state.professional.attempt,
          id: action.id,
        },
      };
    }

    case "professional_failed": {
      if (!isCurrentCycle(state, "roster", action.rosterGeneration)) return state;
      if (action.id !== state.selectedProfessionalId) return state; // stale selection
      return {
        ...state,
        professional: {
          phase: "error",
          status: action.status,
          attempt: state.professional.attempt,
          id: null,
        },
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Selectors — the only sanctioned way to ask "may this be edited/saved?"
// ---------------------------------------------------------------------------

/** True only for a session-less visitor: the one case the demo seed is legal. */
export function isVisitorDemo(state: HydrationState): boolean {
  return state.mode === "visitor";
}

/**
 * Tenant-level inputs (context, messages, post-consult, Pix, Google mode).
 * Authenticated: editable only once the tenant GET actually came back.
 */
export function canEditTenantFields(state: HydrationState): boolean {
  if (state.mode === "visitor") return true;
  return state.mode === "authenticated" && state.tenant.phase === "loaded";
}

/**
 * Professional-scoped inputs (services, weekly hours, specialty/about).
 * Requires the tenant AND the config of the very professional now selected —
 * `professional.id === selectedProfessionalId` is the guard that makes a late
 * response for a previous selection unable to unlock the form.
 */
export function canEditProfessionalFields(state: HydrationState): boolean {
  if (state.mode === "visitor") return true;
  if (state.mode !== "authenticated") return false;
  if (state.tenant.phase !== "loaded") return false;
  if (!state.selectedProfessionalId) return false;
  return (
    state.professional.phase === "loaded" &&
    state.professional.id === state.selectedProfessionalId
  );
}

/** Categorical, PII-free reason Save is refused — safe to log verbatim. */
export type SaveBlockedReason =
  | "no_session"
  | "demo_mode"
  | "tenant_not_loaded"
  | "roster_not_loaded"
  | "professional_not_loaded";

/**
 * Returns null when saving is allowed, or WHY it is not. Save is permitted
 * only for a tenant that hydrated successfully and — when a professional is
 * selected — that same professional's config. A tenant whose roster loaded
 * with zero professionals may still save its tenant-level fields.
 */
export function saveBlockedReason(state: HydrationState): SaveBlockedReason | null {
  if (state.mode === "unknown") return "no_session";
  if (state.mode === "visitor") return "demo_mode";
  if (state.tenant.phase !== "loaded") return "tenant_not_loaded";
  if (state.roster.phase !== "loaded") return "roster_not_loaded";
  if (!state.selectedProfessionalId) return null; // tenant-level save only
  if (
    state.professional.phase !== "loaded" ||
    state.professional.id !== state.selectedProfessionalId
  ) {
    return "professional_not_loaded";
  }
  return null;
}

export function canSave(state: HydrationState): boolean {
  return saveBlockedReason(state) === null;
}

/**
 * True while an authenticated session still has a load in flight — drives the
 * "carregando" affordance so the disabled form reads as pending, not broken.
 */
export function isHydrating(state: HydrationState): boolean {
  if (state.mode !== "authenticated") return false;
  return (
    state.tenant.phase === "loading" ||
    state.roster.phase === "loading" ||
    state.professional.phase === "loading"
  );
}

/** True when an authenticated session has a source that failed and can be retried. */
export function hasLoadError(state: HydrationState): boolean {
  if (state.mode !== "authenticated") return false;
  return (
    state.tenant.phase === "error" ||
    state.roster.phase === "error" ||
    state.professional.phase === "error"
  );
}

// ---------------------------------------------------------------------------
// Telemetry — sanitized, categorical, never carries a payload
// ---------------------------------------------------------------------------

/**
 * Which write path a save took.
 *  - `atomic` — PUT /tenants/me/configuration: one server-side transaction.
 *  - `legacy` — the two-PUT fallback, used ONLY against a backend that has no
 *    aggregate route yet. It can half-succeed, and says so.
 */
export type SaveMode = "atomic" | "legacy";

export type ConfigEvent =
  | {
      event: "config_load_failed";
      scope: ConfigScope;
      status: number | null;
      attempt: number;
    }
  | { event: "config_save_blocked"; reason: SaveBlockedReason }
  | { event: "config_discarded"; sections: string[] }
  | {
      event: "configuration_save_failed";
      mode: SaveMode;
      status: number | null;
      /** Which half was left unwritten — `both` when nothing was written. */
      scope: "tenant" | "professional" | "both";
    }
  | {
      event: "configuration_saved";
      mode: SaveMode;
      /** True only on the legacy path, when the tenant landed and the professional did not. */
      partial: boolean;
    };

/**
 * Extracts an HTTP status from whatever the API clients threw. Both
 * HubApiError and ManageApiError carry `.status`; a network failure carries
 * none, and null is the honest answer there. Deliberately reads nothing else
 * off the error — no message, no body, no ids.
 */
export function statusOf(error: unknown): number | null {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === "number" ? status : null;
}

export function buildLoadFailedEvent(
  scope: ConfigScope,
  error: unknown,
  attempt: number,
): Extract<ConfigEvent, { event: "config_load_failed" }> {
  return { event: "config_load_failed", scope, status: statusOf(error), attempt };
}

/**
 * Emits one structured line. Every field is a fixed enum, an HTTP status, or a
 * counter — no tenant id, professional id, phone number, config value or
 * conversation text can reach this call by construction (the ConfigEvent union
 * has nowhere to put one).
 */
export function emitConfigEvent(event: ConfigEvent): void {
  // console is the transport this app already has; a real analytics sink can
  // subscribe later without changing a single call site.
  console.info("[configuracao]", JSON.stringify(event));
}
