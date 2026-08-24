// catalog.test.ts - the rules behind the new Section 06.
//
// The bug class these pin down is not cosmetic. A service that fails to match
// its catalog row silently becomes a second, unrelated service with the same
// name - and then a patient whose consult was cancelled is told no colleague
// offers it, because the backend compares catalog ids, not strings.

import { describe, expect, it } from "vitest";

import {
  alsoAffected,
  catalogRows,
  offerService,
  pendingLinks,
  unpublished,
} from "../catalog";
import { nearDuplicateNames, normalizeServiceName } from "../service-name";
import type { CatalogService, Service } from "../types";

function catalogEntry(over: Partial<CatalogService> = {}): CatalogService {
  return {
    id: "svc-1",
    name: "Limpeza",
    description: "",
    longDescription: "",
    requirements: [],
    active: true,
    sortOrder: 0,
    professionalIds: [],
    ...over,
  };
}

function offered(over: Partial<Service> = {}): Service {
  return {
    id: 1,
    serviceId: "svc-1",
    name: "Limpeza",
    dur: 30,
    price: "",
    active: true,
    requirements: [],
    ...over,
  };
}

describe("normalizeServiceName", () => {
  it("treats spelling variants of one service as the same service", () => {
    const forms = ["Limpeza", " limpeza ", "LIMPEZA", "limpeza"];
    expect(new Set(forms.map(normalizeServiceName)).size).toBe(1);
  });

  it("folds accents, so Avaliacao and Avaliação are one service", () => {
    expect(normalizeServiceName("Avaliação")).toBe(normalizeServiceName("Avaliacao"));
  });

  it("collapses internal whitespace", () => {
    expect(normalizeServiceName("Limpeza   Dental")).toBe("limpeza dental");
  });

  it("does NOT merge a longer name into a shorter one", () => {
    // "Limpeza" and "Limpeza Dental" may well be two real services. Deciding
    // that is a human call - see nearDuplicateNames, which only warns.
    expect(normalizeServiceName("Limpeza")).not.toBe(normalizeServiceName("Limpeza Dental"));
  });
});

describe("nearDuplicateNames", () => {
  it("flags a prefix relationship in either direction", () => {
    expect(nearDuplicateNames("Limpeza", ["Limpeza Dental"])).toEqual(["Limpeza Dental"]);
    expect(nearDuplicateNames("Limpeza Dental", ["Limpeza"])).toEqual(["Limpeza"]);
  });

  it("does not flag the exact same service - that is not a near-duplicate", () => {
    expect(nearDuplicateNames("Limpeza", ["  limpeza  "])).toEqual([]);
  });

  it("does not flag an unrelated name", () => {
    expect(nearDuplicateNames("Limpeza", ["Clareamento"])).toEqual([]);
  });
});

describe("catalogRows", () => {
  it("shows every catalog service, ticked or not", () => {
    const rows = catalogRows(
      [catalogEntry(), catalogEntry({ id: "svc-2", name: "Clareamento", sortOrder: 1 })],
      [offered()],
    );

    expect(rows.map((r) => r.name)).toEqual(["Limpeza", "Clareamento"]);
    expect(rows[0].service).not.toBeNull();
    expect(rows[1].service).toBeNull();
  });

  it("matches an entry to its catalog row by id", () => {
    const rows = catalogRows(
      [catalogEntry({ id: "svc-9", name: "Nome novo do catalogo" })],
      [offered({ serviceId: "svc-9", name: "nome antigo guardado" })],
    );

    expect(rows).toHaveLength(1);
    // The CLINIC spelling wins - that is the one patients see.
    expect(rows[0].name).toBe("Nome novo do catalogo");
    expect(rows[0].offCatalog).toBe(false);
  });

  it("matches an UNLINKED entry by normalized name, so a pre-backfill clinic sees its services ticked", () => {
    const rows = catalogRows(
      [catalogEntry({ name: "Limpeza" })],
      [offered({ serviceId: null, name: "  LIMPEZA " })],
    );

    // One row, already ticked - not two rows that look like duplicates.
    expect(rows).toHaveLength(1);
    expect(rows[0].service).not.toBeNull();
    expect(rows[0].offCatalog).toBe(false);
  });

  it("keeps an off-catalog service visible instead of dropping it", () => {
    const rows = catalogRows([catalogEntry()], [offered(), offered({ id: 2, serviceId: null, name: "Servico legado" })]);

    const legacy = rows.find((r) => r.name === "Servico legado");
    expect(legacy?.offCatalog).toBe(true);
    expect(legacy?.service).not.toBeNull();
  });

  it("hides a retired service nobody offers", () => {
    const rows = catalogRows([catalogEntry({ active: false })], []);
    expect(rows).toEqual([]);
  });

  it("still shows a retired service the professional has NOT untucked", () => {
    // Hiding it would silently drop their service on the next save.
    const rows = catalogRows([catalogEntry({ active: false })], [offered()]);
    expect(rows).toHaveLength(1);
    expect(rows[0].service).not.toBeNull();
  });

  it("an empty catalog with no entries produces no rows", () => {
    expect(catalogRows([], [])).toEqual([]);
  });

  it("gives every row a distinct key, across both id spaces", () => {
    const rows = catalogRows(
      [catalogEntry({ id: "1" })],
      [offered({ serviceId: "1" }), offered({ id: 1, serviceId: null, name: "Outro" })],
    );
    expect(new Set(rows.map((r) => r.key)).size).toBe(rows.length);
  });
});

describe("unpublished", () => {
  it("returns exactly the off-catalog services the professional offers", () => {
    const rows = catalogRows(
      [catalogEntry()],
      [offered(), offered({ id: 2, serviceId: null, name: "Legado" })],
    );

    expect(unpublished(rows).map((s) => s.name)).toEqual(["Legado"]);
  });

  it("does not publish a service nobody offers", () => {
    const rows = catalogRows([catalogEntry({ id: "svc-2", name: "Clareamento" })], []);
    expect(unpublished(rows)).toEqual([]);
  });

  it("is empty once everything is linked", () => {
    expect(unpublished(catalogRows([catalogEntry()], [offered()]))).toEqual([]);
  });
});

describe("alsoAffected", () => {
  const roster = [
    { id: "p1", name: "Dra. Ana" },
    { id: "p2", name: "Dr. Bruno" },
    { id: "p3", name: "Dra. Carla" },
  ];

  it("names the colleagues a rename would also change", () => {
    const service = catalogEntry({ professionalIds: ["p1", "p2", "p3"] });
    expect(alsoAffected(service, roster, "p1").map((p) => p.name)).toEqual([
      "Dr. Bruno",
      "Dra. Carla",
    ]);
  });

  it("never warns someone about themselves", () => {
    const service = catalogEntry({ professionalIds: ["p1"] });
    expect(alsoAffected(service, roster, "p1")).toEqual([]);
  });

  it("drops ids the roster does not know, rather than rendering a blank name", () => {
    const service = catalogEntry({ professionalIds: ["p2", "ghost"] });
    expect(alsoAffected(service, roster, "p1").map((p) => p.id)).toEqual(["p2"]);
  });

  it("says nothing at all while the roster is still loading", () => {
    // The one claim this must never make falsely is "nobody else offers this".
    const service = catalogEntry({ professionalIds: ["p2"] });
    expect(alsoAffected(service, null, "p1")).toEqual([]);
  });
});

describe("offerService", () => {
  it("seeds the clinic default duration, not a hardcoded one", () => {
    expect(offerService(catalogEntry(), 20, 7).dur).toBe(20);
  });

  it("links to the catalog row and starts with no price", () => {
    const entry = offerService(catalogEntry({ id: "svc-42" }), 30, 7);
    expect(entry.serviceId).toBe("svc-42");
    expect(entry.price).toBe("");
    expect(entry.active).toBe(true);
  });
});

describe("pendingLinks", () => {
  it("stamps the catalog id onto an entry matched only by name", () => {
    // The quiet half of the linking problem: the screen already SHOWS this as
    // ticked (catalogRows matched it), but the stored record still says only
    // "Limpeza". Without this pass the second doctor never gets linked, and a
    // cancelled consult still finds no replacement.
    const rows = catalogRows(
      [catalogEntry({ id: "svc-1", name: "Limpeza" })],
      [offered({ id: 5, serviceId: null, name: "  limpeza " })],
    );

    expect([...pendingLinks(rows)]).toEqual([[5, "svc-1"]]);
  });

  it("leaves an already-linked entry alone", () => {
    const rows = catalogRows([catalogEntry({ id: "svc-1" })], [offered({ serviceId: "svc-1" })]);
    expect(pendingLinks(rows).size).toBe(0);
  });

  it("claims nothing for an off-catalog entry - that one needs a POST first", () => {
    const rows = catalogRows([], [offered({ id: 5, serviceId: null, name: "Legado" })]);
    expect(pendingLinks(rows).size).toBe(0);
    expect(unpublished(rows).map((s) => s.id)).toEqual([5]);
  });

  it("claims nothing for a catalog row the professional does not offer", () => {
    const rows = catalogRows([catalogEntry({ id: "svc-2", name: "Clareamento" })], []);
    expect(pendingLinks(rows).size).toBe(0);
  });
});

