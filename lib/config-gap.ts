// config-gap — decides whether the "configure sua secretarIA" notice is due,
// what it says, and whether this session already dismissed it (FEAT 42).
//
// PURE on purpose: no React, no API client, no DOM beyond the guarded
// sessionStorage helpers at the bottom. The vitest setup in both repos is
// node-only (see vitest.config.ts — no jsdom, no testing-library), so a React
// component is not testable there and anything worth a test has to live outside
// the component tree.
//
// WHERE THE SIGNAL COMES FROM. `complete` is FEAT 41's per-professional
// completeness, served by brain-api's GET /doctor/professionals
// (getDoctorProfessionals in lib/manage-api.ts), which proxies secretarIA's
// /internal config-status. It is deliberately NOT recomputed here: over in
// secretarIA it is one value from services/tenant_config.py::
// professional_completeness — the same computation the go-live activation rule
// and the bot's own booking refusal read — so the banner cannot tell a clinic
// something the bot disagrees with. Recomputing `has_hours && has_services &&
// has_calendar` on this side would be a second source, and two sources of the
// same rule is how they drift.
//
// This file is duplicated in brain-frontend and secretarIA-frontend and must
// stay identical: both consume the SAME brain-api endpoint, so there is no
// per-repo logic to justify a divergence. Verify with
// `diff --strip-trailing-cr` (the two repos differ in line endings only).

/**
 * One roster row, structurally — only the fields this module reads.
 *
 * Structural rather than an import of `DoctorProfessional` (lib/manage-api.ts)
 * so this module never pulls in the API client: that import is what would drag
 * `fetch` into a node-only test and force every caller to stub it.
 */
export type ConfigGapProfessional = {
  id: string;
  name: string;
  is_active: boolean;
  complete: boolean;
};

/** The part of `Session` (lib/manage-api.ts) that decides who the notice addresses. */
export type ConfigGapSession = {
  /**
   * Decoded from the JWT `professional_id` claim — set when this user is bound
   * to a secretarIA professional. Absent/null for an owner who only
   * administers, and for a `secretary`, who never has one.
   */
  professionalId?: string | null;
};

export type ConfigGapNotice = {
  /**
   * "self" — the signed-in user IS one of the incomplete professionals.
   * "colleague" — exactly one OTHER professional is incomplete, named.
   * "several" — more than one other professional is incomplete.
   */
  kind: "self" | "colleague" | "several";
  message: string;
  /**
   * Identity of THIS situation, for the session-scoped dismissal below. It
   * carries the kind plus the sorted ids, so dismissing does not also swallow a
   * DIFFERENT gap that appears later in the same session: a new professional
   * breaking, or the user fixing their own row and the colleagues' notice
   * surfacing behind it, both produce a new key and the notice returns.
   */
  dismissKey: string;
};

// The user's own words, kept verbatim for the case they were written for: the
// signed-in doctor is the one who cannot be booked.
const SELF_MESSAGE =
  "Configure sua secretarIA para que seus pacientes consigam marcar consultas com você.";

// Named, because an owner should not have to guess WHICH of their doctors is
// the one patients are bouncing off.
function colleagueMessage(name: string): string {
  return `Configure a secretarIA de ${name} para que os pacientes consigam marcar consultas.`;
}

// `name` is NOT NULL in secretarIA, but brain-api's proxy defaults it to "" when
// the key is missing (api/onboarding.py::list_professionals), so a blank name is
// reachable without the backend being broken. Say the true thing generically
// rather than render "Configure a secretarIA de ." at a clinic.
const UNNAMED_COLLEAGUE_MESSAGE =
  "Um profissional da clínica está sem configuração na secretarIA — os pacientes não conseguem marcar consultas.";

function severalMessage(count: number): string {
  return `${count} profissionais estão sem configuração na secretarIA — os pacientes não conseguem marcar consultas com eles.`;
}

/**
 * The incomplete, still-active professionals in a roster payload, sorted by id.
 *
 * Every read here is defensive, and each guard answers a specific way the wire
 * can differ from the TypeScript type (which is erased at build time — see the
 * `production-only-crash` skill, §4):
 *
 * - `rows` not an array: returns empty, never throws. The same hazard is already
 *   documented on `getDoctorProfessionals`, where a non-array reaching a
 *   setState updater blanked the whole page.
 * - `complete` not exactly `false`: treated as UNKNOWN, not as a gap. Missing
 *   means "this backend cannot tell me" — same rule as the `*_inherited` flags —
 *   and inventing a gap would tell a correctly-configured doctor to go fix
 *   nothing. Fail-closed here is silence, and FEAT 41's email is the backstop.
 * - `is_active` absent: counted as active, matching brain-api's own
 *   `bool(prof.get("is_active", True))`. Only an explicit `false` excludes a row.
 *   The brain-api endpoint already returns active rows only (secretarIA's
 *   config-status filters them), so this guard is what keeps the module correct
 *   if it is ever fed the hub's GET /tenants/me/professionals instead, which
 *   returns inactive rows too.
 */
export function findConfigGaps(rows: unknown): ConfigGapProfessional[] {
  if (!Array.isArray(rows)) return [];

  const gaps: ConfigGapProfessional[] = [];
  for (const row of rows) {
    if (!row || typeof row !== "object") continue;
    const candidate = row as Partial<ConfigGapProfessional>;
    if (typeof candidate.id !== "string" || candidate.id.length === 0) continue;
    if (candidate.is_active === false) continue;
    if (candidate.complete !== false) continue;
    gaps.push({
      id: candidate.id,
      name: typeof candidate.name === "string" ? candidate.name.trim() : "",
      is_active: true,
      complete: false,
    });
  }

  // Sorted so the dismissKey is stable: the roster arrives ordered by name, and
  // renaming a doctor must not resurrect a notice the user already dismissed.
  return gaps.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * The notice due for this roster and this session, or `null` when there is none.
 *
 * When the signed-in user is themselves incomplete AND colleagues are too, the
 * message is the SELF one. That is deliberate: their own gap is the one they can
 * fix from where they are standing, and the colleagues' notice is not lost — the
 * moment their own row goes complete the kind changes, the dismissKey with it,
 * and the notice comes back naming whoever is still broken.
 *
 * No role/ownership gate. The roster endpoint is `require_doctor`, open to every
 * clinic role, and /configuracao already lets any of them edit any professional's
 * hours and services — so hiding a colleague's gap from a non-owner would invent
 * a permission the backend does not have (`portal-role-home`, §4).
 */
export function resolveConfigGapNotice(
  rows: unknown,
  session: ConfigGapSession | null | undefined,
): ConfigGapNotice | null {
  const gaps = findConfigGaps(rows);
  if (gaps.length === 0) return null;

  const signature = gaps.map((p) => p.id).join(",");
  const mine = session?.professionalId
    ? gaps.find((p) => p.id === session.professionalId)
    : undefined;

  if (mine) {
    return { kind: "self", message: SELF_MESSAGE, dismissKey: `self:${signature}` };
  }

  if (gaps.length === 1) {
    const only = gaps[0];
    return {
      kind: "colleague",
      message: only.name ? colleagueMessage(only.name) : UNNAMED_COLLEAGUE_MESSAGE,
      dismissKey: `colleague:${signature}`,
    };
  }

  return {
    kind: "several",
    message: severalMessage(gaps.length),
    dismissKey: `several:${signature}`,
  };
}

// ---------------------------------------------------------------------------
// Dismissal — sessionStorage, one key
// ---------------------------------------------------------------------------

// sessionStorage, not localStorage, and that is the whole decision: dismissing
// silences THIS tab's session, and the notice comes back at the next sign-in for
// as long as the professional stays unbookable. A permanent dismissal would let
// one click hide, forever, the fact that patients are still failing to book.
//
// One key holding the current dismissKey (not a growing set): a stale value
// simply stops matching, so there is nothing to expire or clean up when the
// clinic fixes its configuration.
const DISMISS_STORAGE_KEY = "secretaria_config_gap_dismissed";

/** Whether THIS exact notice was already dismissed in this session. */
export function isConfigGapDismissed(dismissKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === dismissKey;
  } catch {
    // Storage can be blocked outright by privacy settings (same fail-silent
    // shape as useBrandTheme). "Not dismissed" is the safe answer: the notice
    // shows, and the "×" still removes it from the current mount.
    return false;
  }
}

/** Remember that this notice was dismissed, for this session only. */
export function dismissConfigGap(dismissKey: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(DISMISS_STORAGE_KEY, dismissKey);
  } catch {
    // Blocked storage: the "×" still hides the notice for this mount (the
    // component drops it from state); it just will not survive a navigation.
  }
}
