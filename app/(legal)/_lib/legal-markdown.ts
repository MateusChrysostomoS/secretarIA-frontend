// legal-markdown — the tiny Markdown subset the legal pages are written in.
//
// The Termos de Uso and the Política de Privacidade live as plain Markdown in
// docs/legal/*.md, so a lawyer can edit them without touching a component, and
// the pages under /termos/ and /privacidade/ render those very files at build
// time (static export: the text is baked into the HTML, nothing is fetched at
// runtime). This module turns one file into a typed tree; the React side lives in
// app/(legal)/_components/LegalDocument.tsx.
//
// Deliberately NOT a general Markdown engine (and not a dependency): legal text
// needs headings, paragraphs, lists, tables and a callout — nothing else — and a
// subset we own cannot silently start interpreting raw HTML. Raw HTML is never
// rendered: every string ends up as a React text node.
//
// Supported, block level:
//   # Title                      document title (first one only)
//   ## 1. Section                numbered section — becomes a TOC entry + anchor
//   ## Parte II — Audience       part divider (a "## " heading starting with "Parte"
//                                + a roman numeral): groups the sections after it
//   ### 1.1 Subsection           sub-heading inside a section (anchor, no TOC)
//   blank-line paragraphs        consecutive lines are joined with a space
//   - item / * item              bulleted list (indented lines continue the item)
//   1. item                      numbered list
//   | a | b |  + |---|---|       table (first row is the header)
//   > text                       callout box (its content is parsed recursively)
//   <!-- note -->                editor note, dropped from the page
//   Última atualização: …        lifted out of the preamble into the page header
//
// Supported, inline (see parseInline): **bold**, *italic*, `code`, [text](href)
// and the fill-in token [PREENCHER: …], which the page highlights so an unfilled
// blank can never be published unnoticed.

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "list"; ordered: boolean; items: string[] }
  | { type: "table"; header: string[]; rows: string[][] }
  | { type: "callout"; blocks: Block[] }
  | { type: "subheading"; id: string; text: string };

export interface LegalSection {
  id: string;
  /** "part" groups the sections that follow it ("Parte II — Para pacientes"). */
  kind: "part" | "section";
  title: string;
  blocks: Block[];
}

export interface LegalDocument {
  title: string;
  updatedAt: string | null;
  preamble: Block[];
  sections: LegalSection[];
}

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "link"; href: string; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "fill"; text: string };

const UPDATED_AT_RE = /^\*{0,2}Última atualização:\s*(.+?)\*{0,2}$/;
const BULLET_RE = /^[-*]\s+(.*)$/;
const ORDERED_RE = /^\d+[.)]\s+(.*)$/;
const PART_RE = /^Parte\s+[IVXLC]+\b/;
const TABLE_SEPARATOR_RE = /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?$/;

/** URL-safe, accent-free anchor id: "4. Bases legais" -> "4-bases-legais". */
export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\[preencher:[^\]]*\]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function stripComments(source: string): string {
  return source.replace(/<!--[\s\S]*?-->/g, "");
}

function splitRow(line: string): string[] {
  let row = line.trim();
  if (row.startsWith("|")) row = row.slice(1);
  if (row.endsWith("|")) row = row.slice(0, -1);
  return row.split("|").map((cell) => cell.trim());
}

/** Parse a run of lines (no headings) into blocks. Used for sections and callouts. */
function parseBlocks(lines: string[]): Block[] {
  const blocks: Block[] = [];
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === "") {
      i++;
      continue;
    }

    // Callout: a run of "> " lines, parsed recursively.
    if (line.startsWith(">")) {
      const inner: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        inner.push(lines[i].trim().replace(/^>\s?/, ""));
        i++;
      }
      blocks.push({ type: "callout", blocks: parseBlocks(inner) });
      continue;
    }

    // Table: a header row followed by a |---| separator row.
    if (line.startsWith("|") && i + 1 < lines.length && TABLE_SEPARATOR_RE.test(lines[i + 1].trim())) {
      const header = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = splitRow(lines[i]);
        // Pad or trim to the header width so a ragged row cannot break the grid.
        rows.push(header.map((_, c) => cells[c] ?? ""));
        i++;
      }
      blocks.push({ type: "table", header, rows });
      continue;
    }

    // Lists: consecutive items of the same kind; indented lines continue an item.
    const bullet = BULLET_RE.exec(line);
    const ordered = bullet ? null : ORDERED_RE.exec(line);
    if (bullet || ordered) {
      const isOrdered = Boolean(ordered);
      const itemRe = isOrdered ? ORDERED_RE : BULLET_RE;
      const items: string[] = [];
      while (i < lines.length) {
        const current = lines[i];
        const trimmed = current.trim();
        const match = itemRe.exec(trimmed);
        if (match && !/^\s{2,}/.test(current)) {
          items.push(match[1].trim());
          i++;
          continue;
        }
        if (trimmed !== "" && /^\s{2,}/.test(current) && items.length > 0) {
          items[items.length - 1] += " " + trimmed;
          i++;
          continue;
        }
        break;
      }
      blocks.push({ type: "list", ordered: isOrdered, items });
      continue;
    }

    // Paragraph: everything up to the next blank line or block start.
    const parts: string[] = [];
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        t === "" ||
        t.startsWith(">") ||
        BULLET_RE.test(t) ||
        ORDERED_RE.test(t) ||
        (t.startsWith("|") && i + 1 < lines.length && TABLE_SEPARATOR_RE.test(lines[i + 1].trim()))
      ) {
        break;
      }
      parts.push(t);
      i++;
    }
    blocks.push({ type: "paragraph", text: parts.join(" ") });
  }

  return blocks;
}

/** Parse one legal document. Throws on a structurally broken file (fails the build). */
export function parseLegalDocument(source: string): LegalDocument {
  const lines = stripComments(source.replace(/\r\n?/g, "\n")).split("\n");

  let title = "";
  let updatedAt: string | null = null;
  const preambleLines: string[] = [];
  const sections: { id: string; title: string; lines: string[] }[] = [];
  const usedIds = new Set<string>();

  const uniqueId = (base: string) => {
    let id = base || "secao";
    let n = 2;
    while (usedIds.has(id)) id = `${base}-${n++}`;
    usedIds.add(id);
    return id;
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!title && trimmed.startsWith("# ")) {
      title = trimmed.slice(2).trim();
      continue;
    }
    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3).trim();
      sections.push({ id: uniqueId(slugify(text)), title: text, lines: [] });
      continue;
    }
    if (sections.length === 0) {
      const updated = UPDATED_AT_RE.exec(trimmed);
      if (updated && updatedAt === null) {
        updatedAt = updated[1].trim();
        continue;
      }
      preambleLines.push(line);
    } else {
      sections[sections.length - 1].lines.push(line);
    }
  }

  if (!title) throw new Error("legal document has no '# ' title");
  if (sections.length === 0) throw new Error(`legal document "${title}" has no '## ' sections`);

  const toBlocks = (sectionLines: string[]): Block[] => {
    // Split on "### " so sub-headings become anchored blocks between the runs.
    const out: Block[] = [];
    let run: string[] = [];
    for (const line of sectionLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("### ")) {
        out.push(...parseBlocks(run));
        run = [];
        const text = trimmed.slice(4).trim();
        out.push({ type: "subheading", id: uniqueId(slugify(text)), text });
      } else {
        run.push(line);
      }
    }
    out.push(...parseBlocks(run));
    return out;
  };

  return {
    title,
    updatedAt,
    preamble: parseBlocks(preambleLines),
    sections: sections.map((s) => ({
      id: s.id,
      kind: PART_RE.test(s.title) ? "part" : "section",
      title: s.title,
      blocks: toBlocks(s.lines),
    })),
  };
}

// ── Inline ───────────────────────────────────────────────────────────────────

// Order matters: code spans first (their content is literal), the fill-in token
// before a link (both start with "["), and bold before italic (both start with "*").
const INLINE_RE =
  /`([^`]+)`|(\[PREENCHER:[^\]]*\])|\*\*([\s\S]+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|\*([^*\s][^*]*?)\*/g;

/** Parse inline markup into a small tree. Text is never interpreted as HTML. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  // A fresh regex per call keeps recursion (bold inside a link…) re-entrant:
  // a shared /g regex would carry lastIndex across the nested calls.
  const re = new RegExp(INLINE_RE.source, "g");
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) out.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ type: "code", text: m[1] });
    else if (m[2]) out.push({ type: "fill", text: m[2].slice(1, -1) });
    else if (m[3] !== undefined) out.push({ type: "strong", children: parseInline(m[3]) });
    else if (m[4] !== undefined) out.push({ type: "link", href: m[5], children: parseInline(m[4]) });
    else if (m[6] !== undefined) out.push({ type: "em", children: parseInline(m[6]) });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

/** Every [PREENCHER: …] token in a source, in order, de-duplicated. */
export function fillTokens(source: string): string[] {
  const found = stripComments(source).match(/\[PREENCHER:[^\]]*\]/g) ?? [];
  return Array.from(new Set(found));
}

/** Only these link targets may appear: same-site paths, in-page anchors, mail and https. */
export function isAllowedHref(href: string): boolean {
  return /^(\/|#|mailto:|tel:|https:\/\/)/.test(href);
}
