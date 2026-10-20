// /termos/ — Termos de Uso da secretarIA.
// The text is docs/legal/termos-de-uso.md, rendered at build time; edit it there.
import type { Metadata } from "next";

import { LegalDocumentPage } from "../_components/LegalDocument";
import { LEGAL_DOCUMENTS, loadLegalDocument } from "../_content/documents";

export const metadata: Metadata = {
  title: "Termos de Uso — secretarIA",
  description: LEGAL_DOCUMENTS.termos.description,
};

export default function TermosPage() {
  return <LegalDocumentPage docKey="termos" doc={loadLegalDocument("termos")} />;
}
