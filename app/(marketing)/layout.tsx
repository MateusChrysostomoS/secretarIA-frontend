// MarketingLayout — wraps the product's public landing page ("/").
//
// Its own route group so the landing loads exactly what it uses: the Brain
// brand design system (brand-ds.css — tokens, type, buttons, light + dark) and
// its own landing.css on top. The (site) group would also pull brand-pages.css
// (Brain-home leftovers) and is documented as the signed-in surface; the (auth)
// group loads the ported PreCheck globals.css, a different design system. Next
// code-splits CSS per segment, so none of those reach this page.
import "../(site)/brand-ds.css";
import "./landing.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
