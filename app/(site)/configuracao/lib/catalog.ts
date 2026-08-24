// catalog.ts — the pure rules behind Section 06 "Serviços oferecidos".
//
// WHAT CHANGED, AND WHY
// ---------------------
// A service used to be a free-text string typed once per professional, and the
// section offered a binary choice: inherit the clinic's list wholesale, or type
// your own from scratch. Neither is what a clinic actually does. Dra. Ana and
// Dr. Bruno both do "Limpeza"; Ana also does "Clareamento". "Inherit
// everything" and "type it again" are both wrong, and the second is worse than
// wrong: it created two unrelated services with the same name, so when a
// consult was cancelled the backend could not tell that a colleague offers the
// very same thing (secretarIA services/flow_router.py::rebooking_candidates
// asks the catalog by ID, never by string).
//
// So this section now shows ONE list — the clinic's canonical catalog, every
// service any colleague has added — and the professional ticks the ones they
// also offer, filling in their own price and duration. The name and the
// descriptive copy live on the clinic's row and are edited once, for everyone.
//
// Everything here is a pure function over already-loaded data: the catalog
// rows, this professional's stored entries, and the roster. No fetching and no
// React — those live in the components, so this stays unit-testable.

import { normalizeServiceName } from "./service-name";
import type { CatalogService, Service } from "./types";

// One row of the picker. Exactly one per service the clinic can offer, whether
// or not THIS professional offers it.
export type CatalogRow = {
  // The clinic's canonical row, when there is one.
  catalog: CatalogService | null;
  // This professional's own entry, when they offer it. `null` = unticked.
  service: Service | null;
  // Display name — the catalog's spelling wins, because that is the one
  // patients see, whatever this professional happens to have stored.
  name: string;
  // Stable React key. A catalog id when linked, otherwise the local entry id,
  // prefixed so the two id spaces can never collide.
  key: string;
  // True for a service this professional offers that is NOT in the clinic's
  // catalog yet — every entry written before the catalog existed. Saving
  // publishes it (see `unpublished`), so this state is transient, but it has to
  // be visible while it lasts or the doctor would think the screen had lost
  // their services.
  offCatalog: boolean;
};

/** Rows for the picker: the whole catalog, plus anything off-catalog this
 * professional still offers.
 *
 * ORDER is deliberate. Catalog order first (the clinic's own `sort_order`,
 * already applied by the backend), then the off-catalog leftovers, so the list
 * does not reshuffle as services get published. A RETIRED catalog service is
 * dropped UNLESS this professional still has it ticked: retired means the
 * clinic stopped offering it and it should not be re-offerable by accident,
 * but hiding it from the one doctor who still has it would silently drop their
 * service on the next save.
 */
export function catalogRows(catalog: CatalogService[], services: Service[]): CatalogRow[] {
  const byId = new Map<string, Service>();
  const byName = new Map<string, Service>();
  for (const service of services) {
    if (service.serviceId) byId.set(service.serviceId, service);
    else byName.set(normalizeServiceName(service.name), service);
  }

  const rows: CatalogRow[] = [];
  const claimed = new Set<Service>();

  for (const entry of catalog) {
    // Match by id first, then by normalized name — the same rule the backend
    // resolves with, so a clinic that has not been backfilled sees its own
    // services tick themselves instead of appearing twice.
    const own = byId.get(entry.id) ?? byName.get(normalizeServiceName(entry.name)) ?? null;
    if (own) claimed.add(own);
    if (!entry.active && !own) continue;
    rows.push({
      catalog: entry,
      service: own,
      name: entry.name,
      key: "svc:" + entry.id,
      offCatalog: false,
    });
  }

  for (const service of services) {
    if (claimed.has(service)) continue;
    rows.push({
      catalog: null,
      service,
      name: service.name,
      key: "own:" + service.id,
      offCatalog: true,
    });
  }

  return rows;
}

/** The offered services no catalog row covers yet.
 *
 * These are what the save path publishes into the catalog before writing the
 * config, so every entry ends up carrying a `service_id`. Entries the doctor
 * has turned OFF are excluded: they said they do not offer them, and
 * publishing a service nobody offers would only litter the clinic's list.
 */
export function unpublished(rows: CatalogRow[]): Service[] {
  return rows
    .filter((row) => row.offCatalog && row.service !== null && row.service.active)
    .map((row) => row.service as Service);
}

/** Entries that ALREADY match a catalog row but do not carry its id yet.
 *
 * The quiet half of the linking problem. `catalogRows` matches an unlinked
 * entry to its catalog row by normalized name, so the screen looks right
 * immediately — the service shows as ticked, under the clinic's spelling, not
 * as an off-catalog leftover. But looking right is not being linked: unless the
 * id is stamped onto the entry and saved, the record on the server still says
 * only "Limpeza", and `professionals_offering` still cannot prove that this
 * doctor and their colleague do the same thing.
 *
 * So every save carries these ids too, and one save per professional is what
 * migrates a whole pre-catalog clinic. Without this, the very first doctor to
 * save would get linked (their entry is published) and every colleague whose
 * name merely MATCHED would stay unlinked forever — which is the exact
 * situation, a cancelled consult finding no replacement, that the catalog
 * exists to fix.
 *
 * Returns `local Service id -> catalog service id`, the same shape
 * `buildProfessionalConfigPayload` takes.
 */
export function pendingLinks(rows: CatalogRow[]): Map<number, string> {
  const links = new Map<number, string>();
  for (const row of rows) {
    if (row.catalog && row.service && !row.service.serviceId) {
      links.set(row.service.id, row.catalog.id);
    }
  }
  return links;
}


/** Which OTHER professionals a change to this catalog service would also hit.
 *
 * Renaming or retiring a catalog row changes what every doctor pointing at it
 * offers — there is no per-doctor copy to leave alone. This is what the
 * confirmation dialog names, so the change is made knowingly rather than
 * discovered by a colleague later.
 *
 * `selfId` (the professional being edited) is excluded: warning someone about
 * themselves is noise. Ids missing from the roster are dropped rather than
 * rendered as blank names — a roster that has not loaded yet must not turn into
 * an empty-looking warning that reads as "nobody else".
 */
export function alsoAffected(
  service: CatalogService | null,
  roster: { id: string; name: string }[] | null,
  selfId: string | null,
): { id: string; name: string }[] {
  if (!service || !roster) return [];
  const byId = new Map(roster.map((p) => [p.id, p]));
  return service.professionalIds
    .filter((id) => id !== selfId)
    .map((id) => byId.get(id))
    .filter((p): p is { id: string; name: string } => Boolean(p));
}

/** Ticking a catalog service on: this professional's new entry for it.
 *
 * Duration is seeded from the CLINIC's default rather than a hardcoded number,
 * so a clinic whose consults run 20 minutes is not offered 50 every time.
 * Price starts empty — no colleague's price is a sensible guess for this
 * doctor, and a wrong one shown to a patient is worse than a blank.
 */
export function offerService(
  entry: CatalogService,
  defaultDuration: number,
  localId: number,
): Service {
  return {
    id: localId,
    serviceId: entry.id,
    name: entry.name,
    dur: defaultDuration,
    price: "",
    active: true,
    // Owned by the catalog once linked — see hub-mapping's
    // toWireAppointmentTypes for why they are not re-sent from here.
    requirements: [],
  };
}
