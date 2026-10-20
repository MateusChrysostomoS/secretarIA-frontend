import type { Metadata } from "next";
import {
  DM_Sans,
  Hanken_Grotesk,
  Instrument_Serif,
  Inter,
  Newsreader,
  Space_Grotesk,
} from "next/font/google";

import { SITE_URL } from "@/lib/platform-links";

// RootLayout — the single <html>/<body> shell for the whole secretarIA app.
// It deliberately imports NO component CSS: each route group imports its own
// stylesheet (the login + password-reset screens → globals.css in the (auth)
// group; the portal → brand-ds.css in the (site) group; the public landing →
// brand-ds.css + landing.css in the (marketing) group), so the design systems
// are code-split per route and can never collide on the same page.

// Defaults for every route. The landing (app/(marketing)/page.tsx) sets its own
// description, canonical and Open Graph tags; the portal screens inherit these.
// No channel is named here on purpose: patients talk to the clinic through the
// clinic's chat link today, and WhatsApp is not live yet.
export const metadata: Metadata = {
  title: {
    default: "secretarIA — secretária virtual para clínicas",
    template: "%s · secretarIA",
  },
  description:
    "A secretarIA atende os pacientes da sua clínica pelo chat: tira dúvidas, agenda, remarca e cancela consultas na agenda de cada médico.",
  applicationName: "secretarIA",
  // Absolute base for canonical / og:url / og:image — only when the build was
  // given NEXT_PUBLIC_SITE_URL. Without it the landing leaves those tags out
  // rather than letting Next resolve them against http://localhost:3000.
  ...(SITE_URL ? { metadataBase: SITE_URL } : {}),
};

// ── Fonts ───────────────────────────────────────────────────────────────────
// Self-hosted through next/font/google: the files are fetched at BUILD time and
// emitted into _next/static/media, so a visitor's browser never contacts
// fonts.googleapis.com or fonts.gstatic.com. That kills two problems at once —
// a render-blocking third-party stylesheet on every page, and the visitor's IP
// reaching Google before any consent. This is a health product whose public
// entry screen ("/") is reachable by patients, so the second one matters most.
// The rule this encodes: no third-party network resource may load
// unconditionally from the root layout.
//
// Fonts for BOTH design systems, which never share a page: the ported PreCheck
// auth chrome (Space Grotesk / DM Sans / Inter / Instrument Serif) used by the
// entry screen, and the Brain brand-ds (Newsreader / Hanken Grotesk) used by
// every portal screen. JetBrains Mono was in the old stylesheet URL but no rule
// ever referenced it — dropped rather than ported.
//
// Each family is exposed only as a CSS variable; the design-system tokens that
// used to name the family literally now point at these (see globals.css,
// auth-shell.css and brand-ds.css). Weights are left unset on the variable
// fonts so the full axis ships in one file per style, a superset of the
// 400/500/600/700 the old URL requested.
//
// preload:false is deliberate, not an oversight. Declaring the fonts here puts
// them on every route, so preloading would pull the OTHER design system's files
// on every page. Left off, the browser fetches a family only when a rule
// actually matches it — the same per-route set of files as before, minus the
// third-party round trip. display:"swap" (matching the old &display=swap) plus
// next/font's size-adjusted fallback keep first paint immediate and CLS at zero.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-space-grotesk",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
  variable: "--font-dm-sans",
});

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-inter",
});

// Instrument Serif is not a variable font: weight and both styles are explicit.
// The italic is real usage — `.topbar-brand em` in globals.css.
const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--font-instrument-serif",
});

// Italic is real usage here too — `.wa-ava` and `.mini-line .mk` in brand-ds.
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap",
  preload: false,
  variable: "--font-newsreader",
});

const hankenGrotesk = Hanken_Grotesk({
  subsets: ["latin"],
  display: "swap",
  preload: false,
  variable: "--font-hanken-grotesk",
});

// Declared on <html> so the variables land on :root, where globals.css and
// brand-ds.css define their font tokens.
const FONT_VARIABLES = [
  spaceGrotesk.variable,
  dmSans.variable,
  inter.variable,
  instrumentSerif.variable,
  newsreader.variable,
  hankenGrotesk.variable,
].join(" ");

// Path-aware theme bootstrap, applied before first paint to avoid a theme flash.
// localStorage key `secretaria_theme` — must stay in sync with STORAGE_KEY in
// app/(site)/_components/useBrandTheme.ts. Default with no stored value: dark on
// the login screen (the auth chrome's original default, which its cream + teal
// artwork is drawn for), light everywhere else — the portal screens and the
// public landing at "/" (light first; it re-themes from the same tokens). The
// login lived at "/" until 2026-10-19 and is /entrar/ now (LOGIN_ROUTE in
// lib/portal-routes.ts); both spellings, with and without the trailing slash, match.
const THEME_INIT_SCRIPT =
  "(function(){try{var t=localStorage.getItem('secretaria_theme');if(t!=='light'&&t!=='dark'){var p=location.pathname;t=(p==='/entrar'||p==='/entrar/')?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={FONT_VARIABLES} suppressHydrationWarning>
      <head>
        {/* Applies the stored / path-default theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
