// BrandGlyph — the neural-node SVG glyph that appears in header, footer, login panel.
// Markup copied verbatim from login.html; CSS classes (.gbg, .gs, .gf, .on-dark)
// are defined in brand-ds.css and control fill/stroke via CSS variables.

type BrandGlyphProps = {
  size?: number;
  onDark?: boolean;
};

// Pure server component — no client JS needed.
export function BrandGlyph({ size = 32, onDark = false }: BrandGlyphProps) {
  const className = "brand-glyph" + (onDark ? " on-dark" : "");

  return (
    <svg
      className={className}
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* Background rounded rect — fill & stroke driven by .gbg CSS class */}
      <rect
        className="gbg"
        x="1.3"
        y="1.3"
        width="29.4"
        height="29.4"
        rx="9"
        strokeWidth="1.4"
      />

      {/* Connector strokes — .gs class applies stroke color */}
      <g className="gs" strokeWidth="1.5" strokeLinecap="round" fill="none">
        <path d="M11 10.4V21.6" />
        <path d="M11 13.2L16 16" />
        <path d="M16 16L21 12" />
        <path d="M16 16L21 20" />
        <path d="M11 18.8L16 16" />
      </g>

      {/* Node circles — .gf class applies fill color */}
      <g className="gf">
        <circle cx="11" cy="10.4" r="2.1" />
        <circle cx="11" cy="21.6" r="2.1" />
        {/* Centre node is slightly larger — intentional design detail */}
        <circle cx="16" cy="16" r="2.5" />
        <circle cx="21" cy="12" r="2.1" />
        <circle cx="21" cy="20" r="2.1" />
      </g>
    </svg>
  );
}
