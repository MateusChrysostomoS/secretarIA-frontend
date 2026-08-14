import type { Metadata } from "next";

// RootLayout — the single <html>/<body> shell for the whole secretarIA app.
// It deliberately imports NO component CSS: each route group imports its own
// stylesheet (the public entry screen → globals.css in the (auth) group;
// the portal → brand-ds.css in the (site) group), so the two design systems are
// code-split per route and can never collide on the same page.

export const metadata: Metadata = {
  title: "secretarIA — a secretária da sua clínica no WhatsApp",
  description:
    "A secretarIA atende os pacientes da sua clínica no WhatsApp: responde, agenda, remarca e cuida da agenda de todos os profissionais.",
};

// Fonts for BOTH design systems: the ported PreCheck auth chrome (Space Grotesk /
// DM Sans / Instrument Serif / Inter / JetBrains Mono) used by the entry screen,
// and the Brain brand-ds (Newsreader / Hanken Grotesk) used by every portal screen.
const FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;0,6..72,600;1,6..72,400;1,6..72,500;1,6..72,600&family=Hanken+Grotesk:wght@400;500;600;700&display=swap";

// Path-aware theme bootstrap, applied before first paint to avoid a theme flash.
// localStorage key `secretaria_theme` — must stay in sync with STORAGE_KEY in
// app/(site)/_components/useBrandTheme.ts. Default with no stored value: dark on
// the entry screen (the auth chrome's original default, which its cream + teal
// artwork is drawn for), light on the portal screens (the brand design's default).
const THEME_INIT_SCRIPT =
  "(function(){try{var t=localStorage.getItem('secretaria_theme');if(t!=='light'&&t!=='dark'){t=location.pathname==='/'?'dark':'light';}document.documentElement.setAttribute('data-theme',t);}catch(e){document.documentElement.setAttribute('data-theme','light');}})();";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href={FONTS_HREF} rel="stylesheet" />
        {/* Applies the stored / path-default theme before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
