"use client";

// SmoothScroll — Lenis smooth scrolling for the public landing, driven by the
// GSAP ticker so the pinned acts (PinnedAct) and Lenis share one clock.
//
// Loaded lazily, on the first wheel or keyboard input: Lenis only smooths wheel
// and keyboard scrolling (touch stays native), so a phone never downloads it and
// a page load spends no main-thread time on it. Nothing here touches React
// state: Lenis owns the scroll position and pushes every frame straight into
// ScrollTrigger.update. Under prefers-reduced-motion it never starts.
// Renders nothing.

import { useEffect } from "react";

const START_EVENTS = ["wheel", "keydown"] as const;

export function SmoothScroll() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let stop: (() => void) | undefined;

    const start = async () => {
      START_EVENTS.forEach((e) => window.removeEventListener(e, start));
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }] = await Promise.all([
        import("lenis"),
        import("gsap"),
        import("gsap/ScrollTrigger"),
      ]);
      if (cancelled) return;

      gsap.registerPlugin(ScrollTrigger);
      const lenis = new Lenis({ autoRaf: false, lerp: 0.12, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      const tick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      stop = () => {
        gsap.ticker.remove(tick);
        lenis.destroy();
      };
    };

    START_EVENTS.forEach((e) => window.addEventListener(e, start, { passive: true }));
    return () => {
      cancelled = true;
      START_EVENTS.forEach((e) => window.removeEventListener(e, start));
      stop?.();
    };
  }, []);

  return null;
}
