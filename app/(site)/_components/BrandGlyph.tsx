// BrandGlyph — the Brain mark: the brain-with-circuit-nodes whose lower lobe
// becomes a speech bubble. Appears in header, footer, login panel, wizard
// shells and every checkout/invite screen.
//
// It is the supplied brand artwork, served as a bitmap from
// /brand/brain-logo.png — not a redrawn vector. The source file was a JPEG with
// a transparency CHECKERBOARD baked into its pixels; the shipped PNG has real
// alpha, recovered per-pixel from the green/red channel difference (the
// checkerboard is achromatic, the mark is not), so it composites cleanly on
// both the cream and the navy surfaces without a grey halo.
//
// A plain <img> on purpose: next/image is already unoptimized under
// `output: "export"`, so it would only add markup.
//
// CONSEQUENCE OF BEING A BITMAP: the mark is a fixed green and does NOT follow
// the brand tokens. That is why there is no `onDark` prop any more (nothing
// passed one) and why brand-ds.css no longer carries .gs/.gf/.gt colour rules —
// there is no longer anything in here for CSS to recolour. The green reads on
// both themes; it was checked at 20-64px on light, cream and navy.

// Natural size of the artwork, used to derive the width from the height so the
// mark never squashes and the browser reserves the right box before it loads.
const ASPECT = 512 / 472;

type BrandGlyphProps = {
  /** Rendered HEIGHT in px. Width follows the artwork's aspect ratio. */
  size?: number;
};

// Pure server component — no client JS needed.
export function BrandGlyph({ size = 32 }: BrandGlyphProps) {
  return (
    <img
      className="brand-glyph"
      src="/brand/brain-logo.png"
      // alt="" on purpose: every call site pairs this with the "Brain"
      // wordmark, or sits inside a link that is already labelled.
      alt=""
      height={size}
      width={Math.round(size * ASPECT)}
    />
  );
}
