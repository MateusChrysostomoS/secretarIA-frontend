// BrandGlyph — the Brain mark: a lobed brain whose bottom drops into a solid
// speech-bubble tail, with the neural nodes the previous glyph was built from
// kept as the three dots on its folds. Appears in header, footer, login panel,
// wizard shells and every checkout/invite screen.
//
// WHY THE SHAPE IS SPLIT IN THREE PATHS
// -------------------------------------
// The outline closes across the BOTTOM (the `A9 9` arc between the two tail
// base points) and the tail is a separate filled shape hung underneath, whose
// top edge is that exact same arc traced backwards. The two therefore coincide
// exactly, so the tail reads as part of the silhouette with no visible seam —
// which a single stroked path could not do, because a stroked tail reads as a
// thin stem rather than a speech bubble.
//
// CSS classes (.gs stroke, .gf fill, .gt fill+stroke, .on-dark) live in
// brand-ds.css and drive every colour from the brand tokens, so the mark
// follows light/dark on its own. Sized down to 20px it still resolves: the
// silhouette and the tail carry it, the folds and nodes only add texture.

type BrandGlyphProps = {
  size?: number;
  onDark?: boolean;
};

// Where the tail meets the brain. Named because three different path strings
// have to agree on them to the decimal, or the seam shows.
const TAIL_RIGHT = "20.8 20.4";
const TAIL_LEFT = "14.4 20.6";

// The silhouette, clockwise from top centre: scalloped arcs around the lobes,
// then the shallow arc that closes the bottom between the tail's base points.
const OUTLINE =
  "M16 4.4" +
  "A3.6 3.6 0 0 1 22.2 5.6" +
  "A3.3 3.3 0 0 1 26.6 9.2" +
  "A2.8 2.8 0 0 1 28.4 13.6" +
  "A2.8 2.8 0 0 1 26.4 17.8" +
  `A3.5 3.5 0 0 1 ${TAIL_RIGHT}` +
  `A9 9 0 0 1 ${TAIL_LEFT}` +
  "A2.7 2.7 0 0 1 9.8 19.6" +
  "A2.9 2.9 0 0 1 5.8 16.6" +
  "A2.7 2.7 0 0 1 3.6 12.6" +
  "A3.1 3.1 0 0 1 6 7.8" +
  "A3.1 3.1 0 0 1 10.6 5" +
  "A3.1 3.1 0 0 1 16 4.4" +
  "Z";

// The tail: down the right edge, a rounded tip, up the left edge, then back
// along the outline's own bottom arc (sweep flipped to trace it in reverse).
const TAIL =
  `M${TAIL_RIGHT}` +
  "L19.3 26" +
  "Q17.6 28.6 15.9 26.3" +
  `L${TAIL_LEFT}` +
  `A9 9 0 0 0 ${TAIL_RIGHT}` +
  "Z";

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
      {/* Silhouette — .gs applies the stroke colour */}
      <path
        className="gs"
        d={OUTLINE}
        fill="none"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />

      {/* Speech-bubble tail — .gt fills AND strokes, so it matches the
          silhouette's optical weight instead of sitting a stroke inside it */}
      <path className="gt" d={TAIL} strokeWidth="1.7" strokeLinejoin="round" />

      {/* Cortical folds — central fissure plus one per side */}
      <g className="gs" fill="none" strokeWidth="1.45" strokeLinecap="round">
        <path d="M16 5.1C14.2 8.4 17.4 9.8 15.6 12.7" />
        <path d="M9.8 10.6C12.2 10.2 12.7 12.6 11.3 14.6" />
        <path d="M22.2 10.2C20 11 20.3 13.2 21.6 14.8" />
      </g>

      {/* Neural nodes at the end of each fold — the one motif carried over
          from the previous glyph. Centre node is larger on purpose. */}
      <g className="gf">
        <circle cx="15.6" cy="12.7" r="1.5" />
        <circle cx="11.3" cy="14.6" r="1.15" />
        <circle cx="21.6" cy="14.8" r="1.15" />
      </g>
    </svg>
  );
}
