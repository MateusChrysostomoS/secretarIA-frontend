// plans.ts — resolves the `?plan=` / `?catalog=` query params the /cadastro
// wizard is opened with. This app sells secretarIA only — `/cadastro` is
// reached directly from the `/` entry screen with `?plan=...&catalog=...`
// already attached, there is no separate pricing page or CTA component here.
// Display-only labels; the commercial source of truth stays brain-api's
// catalog (services/catalog.py).

import type { CatalogPlanId } from "@/lib/manage-api";

// Plans this wizard can actually check out. Deliberately excludes the combo
// (`complete_clinic_combo`, catalogIds: null in _lib/pricing.ts) — Phase 2
// (combo Stripe Prices) is out of scope, so combo stays unpurchasable even if
// a stray `?plan=complete_clinic_combo` link is ever created.
const PURCHASABLE_PLANS: Record<string, { label: string; tagline: string }> = {
  secretaria_basico: {
    label: "secretarIA Básico",
    tagline: "Converse e agende no WhatsApp — pague só pelo que usar",
  },
};

export type ResolvedPlan = {
  planId: CatalogPlanId | string;
  label: string;
  tagline: string;
  catalogIds: string[];
};

// Resolves the plan + catalog_ids to submit from the wizard's query params.
// Returns null when `plan` is missing or not a known purchasable id — the page
// shows an inline error instead of guessing.
export function resolvePlan(searchParams: URLSearchParams): ResolvedPlan | null {
  const planId = searchParams.get("plan");
  if (!planId) return null;
  const meta = PURCHASABLE_PLANS[planId];
  if (!meta) return null;

  const catalogParam = searchParams.get("catalog");
  const catalogIds = catalogParam
    ? catalogParam.split(",").map((s) => s.trim()).filter(Boolean)
    : [planId];

  return { planId, label: meta.label, tagline: meta.tagline, catalogIds };
}
