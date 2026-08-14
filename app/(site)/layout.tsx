// SiteLayout — wraps every signed-in / post-purchase route: the agenda
// (/agenda), the clinic configuration (/configuracao), the signup wizard
// (/cadastro), the checkout return screens, the WhatsApp connection flow
// (/app/onboarding), the subscription restart (/app/reativar), the Google
// Calendar callback (/calendar/connected) and the team invite (/convite).
// The brand design system is imported here so it is route-scoped to these pages
// only (Next.js code-splits CSS per segment) and never mixes with the ported
// PreCheck CSS used by the public entry screen in the (auth) group.
import "./brand-ds.css";
import "./brand-pages.css";

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
