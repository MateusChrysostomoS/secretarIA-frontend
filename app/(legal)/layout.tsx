// LegalLayout — wraps the public legal documents (/termos/, /privacidade/).
//
// A route group of its own so these pages get the Brain brand design system
// (brand-ds.css: tokens, both themes, typography) WITHOUT inheriting the
// (site) group's page chrome or the (auth) group's PreCheck stylesheet. CSS is
// code-split per segment, so importing brand-ds.css here only adds it to these
// two routes. legal.css carries the long-form reading layout on top of it.
import "../(site)/brand-ds.css";
import "./legal.css";

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
