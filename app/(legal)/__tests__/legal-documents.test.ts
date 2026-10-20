import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { LEGAL_DOCUMENTS, loadLegalDocument, readLegalSource, type LegalDocumentKey } from "../_content/documents";
import { fillTokens, isAllowedHref, type Block, type LegalDocument } from "../_lib/legal-markdown";

// Guards the published legal texts in docs/legal/*.md, which the /termos/ and
// /privacidade/ pages render at build time. These are STRUCTURAL checks — they
// never pin the wording, so the legal reviewers can edit freely; they only catch
// edits that would publish a broken page (dead anchor, skipped section number,
// stray HTML, a malformed blank).

const KEYS = Object.keys(LEGAL_DOCUMENTS) as LegalDocumentKey[];
const repoRoot = process.cwd();

function allText(doc: LegalDocument): string[] {
  const out: string[] = [];
  const walk = (blocks: Block[]) => {
    for (const b of blocks) {
      if (b.type === "paragraph") out.push(b.text);
      else if (b.type === "list") out.push(...b.items);
      else if (b.type === "table") out.push(...b.header, ...b.rows.flat());
      else if (b.type === "callout") walk(b.blocks);
      else if (b.type === "subheading") out.push(b.text);
    }
  };
  walk(doc.preamble);
  for (const s of doc.sections) {
    out.push(s.title);
    walk(s.blocks);
  }
  return out;
}

function ids(doc: LegalDocument): Set<string> {
  const set = new Set<string>(["conteudo"]);
  for (const s of doc.sections) {
    set.add(s.id);
    for (const b of s.blocks) if (b.type === "subheading") set.add(b.id);
  }
  return set;
}

describe.each(KEYS)("legal document %s", (key) => {
  const entry = LEGAL_DOCUMENTS[key];
  const source = readLegalSource(key);
  const doc = loadLegalDocument(key);
  const text = allText(doc);
  const links = text.flatMap((t) => Array.from(t.matchAll(/\]\(([^)\s]+)\)/g), (m) => m[1]));

  it("has a page route under app/(legal)", () => {
    const route = entry.href.replace(/^\/|\/$/g, "");
    expect(existsSync(path.join(repoRoot, "app/(legal)", route, "page.tsx"))).toBe(true);
  });

  it("states its last update date", () => {
    expect(doc.updatedAt).toBe("19 de outubro de 2026");
  });

  it("numbers its sections 1..N with no gap or repeat", () => {
    const numbers = doc.sections
      .filter((s) => s.kind === "section")
      .map((s) => Number(/^(\d+)\./.exec(s.title)?.[1]));
    expect(numbers).toEqual(numbers.map((_, i) => i + 1));
  });

  it("links only to allowed targets, and every in-page anchor exists", () => {
    const known = ids(doc);
    for (const href of links) {
      expect(isAllowedHref(href), href).toBe(true);
      if (href.startsWith("#")) expect(known.has(href.slice(1)), href).toBe(true);
    }
  });

  it("links to the other legal document by its real route", () => {
    const routes = KEYS.map((k) => LEGAL_DOCUMENTS[k].href);
    for (const href of links.filter((h) => h.startsWith("/"))) {
      expect(routes, href).toContain(href);
    }
  });

  it("contains no raw HTML outside editor comments", () => {
    const visible = source.replace(/<!--[\s\S]*?-->/g, "");
    expect(visible).not.toMatch(/<\/?[a-z][^>]*>/i);
  });

  it("writes every blank as a well-formed [PREENCHER: …] token", () => {
    for (const token of fillTokens(source)) {
      expect(token).toMatch(/^\[PREENCHER: [^\]]{3,}\]$/);
    }
    // A blank with the wrong spelling would render as plain text and slip through.
    expect(source.replace(/<!--[\s\S]*?-->/g, "")).not.toMatch(/\[(?!PREENCHER: )[A-ZÇ ]{5,}:/);
  });

  it("is read from docs/legal, the single source the reviewers edit", () => {
    expect(entry.file.startsWith("docs/legal/")).toBe(true);
    expect(readFileSync(path.join(repoRoot, entry.file), "utf8")).toBe(source);
  });
});

describe("content anchors the product depends on", () => {
  it("the Terms keep the emergency and no-medical-advice notice", () => {
    const terms = allText(loadLegalDocument("termos")).join(" ");
    expect(terms).toContain("192");
    expect(terms).toMatch(/não presta atendimento médico/i);
  });

  it("the Policy names the controller/operator split and the data-subject rights", () => {
    const policy = allText(loadLegalDocument("privacidade")).join(" ");
    expect(policy).toMatch(/controladora/);
    expect(policy).toMatch(/operadora/);
    expect(policy).toContain("art. 18");
    expect(policy).toMatch(/Encarregado/);
  });
});
