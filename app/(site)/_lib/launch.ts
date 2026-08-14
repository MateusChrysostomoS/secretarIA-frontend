// launch.ts — the buy gate. SINGLE source of truth for "can this purchase
// actually be made yet?".
//
// Deliberately a code-level constant and NOT an env var: the signup flow is
// statically exported, so an env-var read would either be baked in at build time
// anyway (same thing, but invisible in the diff) or need a runtime fetch on a
// page that must not wait on the network to decide whether a button works.
// A constant makes flipping the gate a reviewable one-line commit.
//
// ── STATE ON THIS DOMAIN ──────────────────────────────────────────────────
// OPEN. Decision by the product owner on 2026-08-14, taken when
// secretarIA-frontend was split out of brain-frontend: secretarIA is on sale
// here and a click goes to the real /cadastro wizard and real Stripe Checkout —
// no waiting list.
//
// This is the ONE line to change to close it again. The waiting-list capture it
// used to show was deliberately NOT deleted: it still lives in
// app/(site)/cadastro/page.tsx behind isPurchaseGated(), inert while this is
// true, so closing the gate is a one-line revert rather than a rebuild.
//
// (In brain-frontend the equivalent constant is PRODUCT_LAUNCHED and is `false`.
// The two domains gate independently on purpose — that repo still sells PreCheck
// alongside a not-yet-launched secretarIA, which is the distinction the
// per-catalog test below exists to make.)
export const SECRETARIA_PURCHASE_OPEN = true;

import { catalogRequiresWhatsappCoexistence } from "@/lib/manage-api";

// True when a purchase carrying these catalog ids must be intercepted by the
// waiting list instead of reaching /cadastro or Stripe Checkout.
//
// Kept per-catalog rather than collapsed to `!SECRETARIA_PURCHASE_OPEN` even
// though every PLAN sold on this domain is secretarIA-bearing: the catalog also
// carries ids that are not a secretarIA subscription at all (`reactivation_pack`
// and the other add-ons), and those must stay purchasable even with the gate
// closed. catalogRequiresWhatsappCoexistence is the same test CheckoutTrialNotice
// trusts, mirroring brain-api's catalog semantics.
export function isPurchaseGated(catalogIds: string[]): boolean {
  if (SECRETARIA_PURCHASE_OPEN) return false;
  return catalogRequiresWhatsappCoexistence(catalogIds);
}
