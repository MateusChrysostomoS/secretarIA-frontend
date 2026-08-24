// service-name.ts — service-name identity, mirroring the backend's rule.
//
// The clinic's catalog treats two spellings of one service as the SAME service
// (secretarIA services/service_catalog.py::normalize): trim, collapse internal
// whitespace, strip accents, casefold. "Limpeza", " limpeza " and "LIMPEZA" are
// one thing; "Limpeza" and "Limpeza Dental" are two, and neither side will ever
// claim otherwise — telling those apart is a human's call.
//
// This exists as its own module for one reason: it is duplicated logic, and
// duplicated logic that drifts is worse than none. Keeping it in one named file
// with this note makes the pairing findable from either side. The frontend
// needs it only to match a not-yet-linked local entry to a catalog row while
// the clinic is still being backfilled; the SERVER remains the authority on
// identity, and the database's UNIQUE constraint is what actually enforces it.

/** The identity key for a service name. Mirrors the backend's `normalize`. */
export function normalizeServiceName(name: string | null | undefined): string {
  return (name ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFKD")
    // Strip combining marks — the JS counterpart of Python's
    // `unicodedata.combining` filter, so "Avaliação" and "Avaliacao" match.
    .replace(/\p{M}/gu, "")
    .toLowerCase();
}

/** Existing names suspiciously close to `candidate`. ADVISORY ONLY.
 *
 * Same shape as the backend's `find_near_duplicates`, and used for the same
 * thing: asking "did you mean 'Limpeza Dental'?" BEFORE a second, near-identical
 * service is created. Nothing merges on this signal, here or there. Two names
 * are close when one starts with the other, excluding the exact match — which
 * is not a near-duplicate but the same service.
 *
 * The server checks this too and answers 409 `similar_service_exists`; doing it
 * here as well is what lets the dialog warn while the user is still typing,
 * rather than only after a failed round-trip.
 */
export function nearDuplicateNames(candidate: string, existing: string[]): string[] {
  const target = normalizeServiceName(candidate);
  if (!target) return [];
  return existing.filter((name) => {
    const other = normalizeServiceName(name);
    if (!other || other === target) return false;
    return other.startsWith(target) || target.startsWith(other);
  });
}
