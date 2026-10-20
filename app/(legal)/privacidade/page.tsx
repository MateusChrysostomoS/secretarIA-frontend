// /privacidade/ — Política de Privacidade da secretarIA.
// The text is docs/legal/politica-de-privacidade.md, rendered at build time; edit it there.
import type { Metadata } from "next";

import { LegalDocumentPage } from "../_components/LegalDocument";
import { LEGAL_DOCUMENTS, loadLegalDocument } from "../_content/documents";

export const metadata: Metadata = {
  title: "Política de Privacidade — secretarIA",
  description: LEGAL_DOCUMENTS.privacidade.description,
};

export default function PrivacidadePage() {
  return <LegalDocumentPage docKey="privacidade" doc={loadLegalDocument("privacidade")} />;
}
