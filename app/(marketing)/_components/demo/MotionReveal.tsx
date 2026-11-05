"use client";

// MotionReveal — fades a block up the first time it enters the viewport
// (motion/react, the "mini" build: WAAPI-backed, a few kB). Safe by
// construction:
//   - the server HTML is fully visible (no inline opacity:0), so the page reads
//     without JavaScript;
//   - only blocks that start BELOW the fold are armed (hidden), decided from
//     the IntersectionObserver's first report — no layout read on mount;
//   - under prefers-reduced-motion nothing is ever hidden or moved.
// No scroll listener and no React state: one observer per block, disconnected
// as soon as the block has been shown.

import { useEffect, type ReactNode } from "react";
import { useAnimate } from "motion/react-mini";

type MotionRevealProps = {
  children: ReactNode;
  /** Stagger index: each step adds 90 ms. */
  delay?: number;
  className?: string;
};

export function MotionReveal({ children, delay = 0, className }: MotionRevealProps) {
  const [scope, animate] = useAnimate<HTMLDivElement>();

  useEffect(() => {
    const el = scope.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let armed = false;
    let first = true;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (first) {
            first = false;
            // already on screen (or above it): leave it alone
            if (entry.boundingClientRect.top <= window.innerHeight) {
              io.disconnect();
              return;
            }
            armed = true;
            el.style.opacity = "0";
            el.style.transform = "translateY(18px)";
            continue;
          }
          if (armed && entry.isIntersecting) {
            io.disconnect();
            const done = () => {
              el.style.opacity = "";
              el.style.transform = "";
            };
            animate(
              el,
              { opacity: [0, 1], transform: ["translateY(18px)", "translateY(0px)"] },
              { duration: 0.6, ease: [0.22, 0.61, 0.36, 1], delay: delay * 0.09 },
            ).then(done, done);
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [animate, delay, scope]);

  return (
    <div ref={scope} className={className}>
      {children}
    </div>
  );
}
