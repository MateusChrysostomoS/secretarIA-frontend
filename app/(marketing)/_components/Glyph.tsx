// Glyph — the few line icons the landing needs that the portal's BrandIcon map
// does not have (mail, link, chevron, code). Same 24px grid, same 1.7 stroke and
// round caps as BrandIcon, so the two sets sit side by side without a seam.
// Decorative everywhere it is used: the adjacent text carries the meaning.

export type GlyphName = "mail" | "link" | "chevronDown" | "key" | "globe" | "inbox";

const PATHS: Record<GlyphName, string> = {
  mail: "M4 6h16a1 1 0 011 1v10a1 1 0 01-1 1H4a1 1 0 01-1-1V7a1 1 0 011-1zM3.5 7l8.5 6 8.5-6",
  link: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1",
  chevronDown: "M6 9l6 6 6-6",
  key: "M15 9a3 3 0 11-6 0 3 3 0 016 0zM12 12v8M12 16h3M12 19h2",
  globe: "M12 3a9 9 0 100 18 9 9 0 000-18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z",
  inbox: "M4 13l2-8h12l2 8M4 13v6h16v-6M4 13h5l1 2h4l1-2h5",
};

export function Glyph({ name, size = 24 }: { name: GlyphName; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
