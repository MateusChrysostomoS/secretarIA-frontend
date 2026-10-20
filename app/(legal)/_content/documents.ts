// The legal documents' content registry.
//
// THE TEXT IS NOT HERE. It lives in docs/legal/*.md — plain Markdown, the single
// source of truth, edited by the legal reviewers without touching any component.
// This module only says which file backs which page and reads it at build time:
// the export is static, so the Markdown is parsed once by `next build` and baked
// into out/termos/index.html and out/privacidade/index.html. Nothing is fetched
// at runtime, and editing a .md file needs a rebuild to reach production.
//
// The Dockerfile's `COPY . .` puts docs/ in the build context, which is what makes
// reading it from here safe in the EasyPanel build too.

import { readFileSync } from "node:fs";
import path from "node:path";

import { parseLegalDocument, type LegalDocument } from "../_lib/legal-markdown";

export type LegalDocumentKey = "termos" | "privacidade";

export interface LegalDocumentEntry {
  /** Markdown source, relative to the repository root. */
  file: string;
  /** Public route (trailingSlash: true in next.config.mjs). */
  href: string;
  /** Short label for the cross-links between the two documents. */
  label: string;
  /** <meta name="description">. */
  description: string;
}

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocumentEntry> = {
  termos: {
    file: "docs/legal/termos-de-uso.md",
    href: "/termos/",
    label: "Termos de Uso",
    description:
      "Regras de uso da secretarIA, a secretária virtual que agenda consultas para clínicas: o que o serviço faz e não faz, responsabilidades de pacientes, clínicas e da Brain.",
  },
  privacidade: {
    file: "docs/legal/politica-de-privacidade.md",
    href: "/privacidade/",
    label: "Política de Privacidade",
    description:
      "Como a secretarIA trata dados pessoais de pacientes, clínicas e visitantes, com base na LGPD: papéis, finalidades, bases legais, compartilhamento, retenção e direitos do titular.",
  },
};

export function readLegalSource(key: LegalDocumentKey): string {
  return readFileSync(path.join(process.cwd(), LEGAL_DOCUMENTS[key].file), "utf8");
}

export function loadLegalDocument(key: LegalDocumentKey): LegalDocument {
  return parseLegalDocument(readLegalSource(key));
}
