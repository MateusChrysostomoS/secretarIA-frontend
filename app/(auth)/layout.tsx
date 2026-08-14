// AuthLayout — wraps the public entry screen (/).
//
// Imports the ported PreCheck global stylesheet here so it is route-scoped to
// this one page: AuthShell overrides several globals.css rules, so globals.css
// must be present, and scoping it here keeps it off the (site) portal routes,
// which run on the Brain brand-ds design system instead. The two never load on
// the same page.
import "../globals.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
