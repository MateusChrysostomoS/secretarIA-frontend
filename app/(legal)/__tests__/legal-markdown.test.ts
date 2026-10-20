import { describe, it, expect } from "vitest";

import {
  fillTokens,
  isAllowedHref,
  parseInline,
  parseLegalDocument,
  slugify,
} from "../_lib/legal-markdown";

const SAMPLE = `<!-- editor note: never rendered -->
# Termos de Teste

Última atualização: 19 de outubro de 2026

Intro com **negrito** e [link](/privacidade/).

> **Atenção:** em emergência ligue 192.
>
> - item do destaque

## Parte I — Para todos

## 1. Primeira seção

**1.1.** Cláusula um,
continuada na linha seguinte.

- item A
- item B
  continuação do B
- item C

### 1.2 Subtítulo

| Coluna A | Coluna B |
|---|---|
| a1 | b1 |
| a2 |

## Parte II — Para pacientes

## 2. Segunda seção

1. primeiro
2. segundo
`;

describe("parseLegalDocument", () => {
  const doc = parseLegalDocument(SAMPLE);

  it("reads the title and lifts the update date out of the preamble", () => {
    expect(doc.title).toBe("Termos de Teste");
    expect(doc.updatedAt).toBe("19 de outubro de 2026");
    const preambleText = JSON.stringify(doc.preamble);
    expect(preambleText).not.toContain("Última atualização");
  });

  it("drops HTML comments", () => {
    expect(JSON.stringify(doc)).not.toContain("editor note");
  });

  it("keeps the preamble paragraph and the callout with its own blocks", () => {
    expect(doc.preamble[0]).toEqual({
      type: "paragraph",
      text: "Intro com **negrito** e [link](/privacidade/).",
    });
    const callout = doc.preamble[1];
    expect(callout.type).toBe("callout");
    if (callout.type !== "callout") throw new Error("unreachable");
    expect(callout.blocks.map((b) => b.type)).toEqual(["paragraph", "list"]);
  });

  it("splits sections, marks part dividers and slugs anchors", () => {
    expect(doc.sections.map((s) => [s.kind, s.id])).toEqual([
      ["part", "parte-i-para-todos"],
      ["section", "1-primeira-secao"],
      ["part", "parte-ii-para-pacientes"],
      ["section", "2-segunda-secao"],
    ]);
  });

  it("joins paragraph lines and list continuation lines", () => {
    const [para, list] = doc.sections[1].blocks;
    expect(para).toEqual({
      type: "paragraph",
      text: "**1.1.** Cláusula um, continuada na linha seguinte.",
    });
    expect(list).toEqual({
      type: "list",
      ordered: false,
      items: ["item A", "item B continuação do B", "item C"],
    });
  });

  it("parses sub-headings with their own anchor", () => {
    const sub = doc.sections[1].blocks[2];
    expect(sub).toEqual({ type: "subheading", id: "1-2-subtitulo", text: "1.2 Subtítulo" });
  });

  it("parses tables and pads ragged rows to the header width", () => {
    const table = doc.sections[1].blocks[3];
    expect(table).toEqual({
      type: "table",
      header: ["Coluna A", "Coluna B"],
      rows: [
        ["a1", "b1"],
        ["a2", ""],
      ],
    });
  });

  it("parses ordered lists", () => {
    expect(doc.sections[3].blocks[0]).toEqual({
      type: "list",
      ordered: true,
      items: ["primeiro", "segundo"],
    });
  });

  it("de-duplicates repeated anchors", () => {
    const d = parseLegalDocument("# T\n\n## Igual\n\ntexto\n\n## Igual\n\ntexto\n");
    expect(d.sections.map((s) => s.id)).toEqual(["igual", "igual-2"]);
  });

  it("fails loudly on a file with no title or no sections", () => {
    expect(() => parseLegalDocument("## 1. Sem título\n\ntexto")).toThrow(/title/);
    expect(() => parseLegalDocument("# Só título\n\ntexto")).toThrow(/sections/);
  });
});

describe("parseInline", () => {
  it("parses bold, italic, links and fill-in tokens", () => {
    expect(parseInline("a **b** *c* [d](/termos/) [PREENCHER: e] f")).toEqual([
      { type: "text", text: "a " },
      { type: "strong", children: [{ type: "text", text: "b" }] },
      { type: "text", text: " " },
      { type: "em", children: [{ type: "text", text: "c" }] },
      { type: "text", text: " " },
      { type: "link", href: "/termos/", children: [{ type: "text", text: "d" }] },
      { type: "text", text: " " },
      { type: "fill", text: "PREENCHER: e" },
      { type: "text", text: " f" },
    ]);
  });

  it("keeps code spans literal", () => {
    expect(parseInline("cookie `__Host-x` e `**y**`")).toEqual([
      { type: "text", text: "cookie " },
      { type: "code", text: "__Host-x" },
      { type: "text", text: " e " },
      { type: "code", text: "**y**" },
    ]);
  });

  it("nests markup inside bold and links", () => {
    expect(parseInline("**x [PREENCHER: y]**")).toEqual([
      {
        type: "strong",
        children: [
          { type: "text", text: "x " },
          { type: "fill", text: "PREENCHER: y" },
        ],
      },
    ]);
  });

  it("never turns raw HTML into markup", () => {
    expect(parseInline("<script>alert(1)</script>")).toEqual([
      { type: "text", text: "<script>alert(1)</script>" },
    ]);
  });
});

describe("helpers", () => {
  it("slugify strips accents, punctuation and fill-in tokens", () => {
    expect(slugify("4. Para que usamos os dados e com qual base legal")).toBe(
      "4-para-que-usamos-os-dados-e-com-qual-base-legal",
    );
    expect(slugify("Encarregado [PREENCHER: nome]")).toBe("encarregado");
  });

  it("fillTokens lists each blank once and ignores comments", () => {
    expect(fillTokens("[PREENCHER: a] x [PREENCHER: a] <!-- [PREENCHER: b] --> [PREENCHER: c]")).toEqual([
      "[PREENCHER: a]",
      "[PREENCHER: c]",
    ]);
  });

  it("isAllowedHref only accepts site paths, anchors, mail, phone and https", () => {
    expect(isAllowedHref("/termos/")).toBe(true);
    expect(isAllowedHref("#secao")).toBe(true);
    expect(isAllowedHref("mailto:x@y.z")).toBe(true);
    expect(isAllowedHref("https://www.gov.br/anpd")).toBe(true);
    expect(isAllowedHref("http://exemplo.com")).toBe(false);
    expect(isAllowedHref("javascript:alert(1)")).toBe(false);
  });
});
