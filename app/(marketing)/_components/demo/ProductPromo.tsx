// ProductPromo — a short "from the same company" section that points a visitor
// to the OTHER product's own site, with that product's mascot (owner,
// 2026-11-06). The PreCheck landing uses it for the secretarIA (replacing the
// pinned secretarIA act it used to carry) and the secretarIA landing uses it
// for the PreCheck. The Brain landing tells both products in full and does not
// need it; this file lives here only because brain-frontend is the source the
// guided-demo module is synced from.
//
// Static on purpose: no scroll effects, so it reads the same with or without
// JavaScript. The only motion is the mascot's slow float, which stops under
// prefers-reduced-motion (guided-demo.css).
//
// Copy rules still apply to what callers pass in: status labels are fixed
// (PreCheck em uso · secretarIA em piloto · WhatsApp em breve) and nothing here
// may suggest the AI diagnoses.

import type { ReactNode } from "react";

import { MotionReveal } from "./MotionReveal";

type PromoArt = {
  /** Public path of the mascot picture (transparent WebP). */
  src: string;
  /** Intrinsic size, so the browser reserves the space before it loads. */
  width: number;
  height: number;
  alt: string;
};

type ProductPromoProps = {
  /** Section id — kept stable so menu links (#secretaria, #precheck) still land here. */
  id: string;
  tone: "pc" | "sa";
  /** Product name shown in the tag line ("secretarIA", "PreCheck"). */
  product: ReactNode;
  /** Fixed status label: "em uso" for PreCheck, "em piloto" for secretarIA. */
  state: string;
  /** Optional dashed "coming soon" chip (secretarIA: "WhatsApp em breve"). */
  soon?: string;
  title: ReactNode;
  text: ReactNode;
  /** Two or three short facts, each one the current site already states. */
  points: string[];
  art: PromoArt;
  /** The call to action — a link to the other product's site. */
  cta: ReactNode;
};

export function ProductPromo({ id, tone, product, state, soon, title, text, points, art, cta }: ProductPromoProps) {
  const titleId = `${id}-promo-title`;

  return (
    <section id={id} className={`gd-promo gd-tone--${tone}`} aria-labelledby={titleId}>
      <div className="gd-wrap">
        <MotionReveal className="gd-promo__box">
          <figure className="gd-promo__art">
            {/* Plain <img>: the sites are static exports (no image optimizer),
                and the WebP is already sized for a 2x screen. */}
            <img
              className="gd-promo__img"
              src={art.src}
              width={art.width}
              height={art.height}
              alt={art.alt}
              loading="lazy"
              decoding="async"
            />
          </figure>

          <div className="gd-promo__copy">
            <p className="gd-tag">
              <span className="gd-tag__dot" aria-hidden="true" />
              Da mesma empresa · {product} <span className="gd-tag__state">{state}</span>
              {soon ? <span className="gd-soon">{soon}</span> : null}
            </p>
            <h2 id={titleId} className="gd-h2">
              {title}
            </h2>
            <p className="gd-promo__text">{text}</p>
            <ul className="gd-promo__points">
              {points.map((p) => (
                <li key={p}>
                  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12.5 4.5 4.5L19 7.5" />
                  </svg>
                  {p}
                </li>
              ))}
            </ul>
            <div className="gd-promo__cta">{cta}</div>
          </div>
        </MotionReveal>
      </div>
    </section>
  );
}
