"use client";

// PinnedAct — one "act" of the guided demo: the section pins while the visitor
// scrolls, and the scroll position scrubs a GSAP timeline that reveals the
// mock-up beat by beat.
//
// The markup is declarative and lives in the server components that render the
// act (PreCheckDemo, SecretariaDemo). They tag elements with:
//   data-beat="n"        — revealed at beat n (beats run in numeric order)
//   data-fx="msg|pop|drop|cover|alarm|rise"  — how it is revealed (default rise)
//   data-only="wide|narrow" — beat only applies at that width
//   data-out="n" / data-out-narrow="n" — hidden again at beat n (narrow: only ≤860px)
//   data-at="n"          — a step of the narrative list; becomes "current" at beat n
//
// No scroll listener writes React state: ScrollTrigger drives the timeline and
// the step classes are toggled on the DOM directly.
//
// Without JavaScript, or under prefers-reduced-motion, nothing is pinned and
// nothing is hidden: the section renders as a static, complete illustration.
// The `is-live` class (added only when the animation is built) is what switches
// the CSS to the pinned layout.
//
// GSAP is loaded and the timeline built only when the act comes within ~1.5
// screens of the viewport, so the page load pays nothing for it (the act is
// still off-screen when its layout switches to the pinned one).

import { useEffect, useRef, type ReactNode } from "react";

type Timeline = ReturnType<typeof import("gsap").gsap.timeline>;

type Tone = "pc" | "sa";

type PinnedActProps = {
  id: string;
  tone: Tone;
  labelledBy: string;
  /** Scroll distance per beat, in viewport heights (%). */
  beatVh?: number;
  children: ReactNode;
};

const NARROW = "(max-width: 860px)";

function revealInto(tl: Timeline, el: HTMLElement, at: string) {
  switch (el.dataset.fx) {
    case "msg": {
      // the conversation slides up first (chatTracks), then the bubble rises
      // into the room it opened — transform + opacity only, no layout per frame
      const out = el.querySelector(".gd-pb--out") !== null;
      tl.fromTo(
        el,
        { autoAlpha: 0, y: 16, scale: 0.96, transformOrigin: out ? "100% 100%" : "0% 100%" },
        { autoAlpha: 1, y: 0, scale: 1, duration: 1.1, ease: "power2.out" },
        `${at}+=0.25`,
      );
      break;
    }
    case "pop":
      tl.fromTo(el, { autoAlpha: 0, scale: 0.9, y: 6 }, { autoAlpha: 1, scale: 1, y: 0, ease: "back.out(1.6)" }, at);
      break;
    case "drop":
      tl.fromTo(
        el,
        { autoAlpha: 0, scaleY: 0.3, transformOrigin: "50% 0%" },
        { autoAlpha: 1, scaleY: 1, ease: "power3.out" },
        at,
      );
      break;
    case "cover":
      tl.fromTo(el, { autoAlpha: 0, y: 28 }, { autoAlpha: 1, y: 0, ease: "power3.out" }, at);
      break;
    case "alarm": {
      tl.fromTo(el, { autoAlpha: 0, x: -12 }, { autoAlpha: 1, x: 0, ease: "power2.out" }, at);
      const ring = el.querySelector<HTMLElement>("[data-ring]");
      if (ring) {
        tl.fromTo(ring, { autoAlpha: 0.85, scale: 0.6 }, { autoAlpha: 0, scale: 2.4, duration: 0.9, ease: "power1.out" }, `${at}+=0.55`);
      }
      break;
    }
    default:
      tl.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, ease: "power2.out" }, at);
  }
}

export function PinnedAct({ id, tone, labelledBy, beatVh = 22, children }: PinnedActProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage || typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    let revert: (() => void) | undefined;

    const build = async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      // the mobile address bar showing/hiding is a resize; re-measuring every
      // pin on it makes the acts jump
      ScrollTrigger.config({ ignoreMobileResize: true });

      // built while the visitor is BELOW the act (a reload deep in the page):
      // the pin spacer grows the page above them, so the scroll is compensated
      const wasAbove = section.getBoundingClientRect().bottom < 0;
      const heightBefore = section.offsetHeight;

      const mm = gsap.matchMedia();
      revert = () => mm.revert();

      mm.add(
        { live: "(prefers-reduced-motion: no-preference)", narrow: NARROW },
        (ctx) => {
          const { live, narrow } = ctx.conditions as { live: boolean; narrow: boolean };
          if (!live) return;

          section.classList.add("is-live");

          const beats = Array.from(
            new Set(
              Array.from(stage.querySelectorAll<HTMLElement>("[data-beat]")).map((el) => Number(el.dataset.beat)),
            ),
          ).sort((a, b) => a - b);

          const tl = gsap.timeline({ defaults: { duration: 1 } });

          // Each conversation is a track inside its chat window. Every message
          // keeps its place in the layout from the start (hidden), and the
          // track is translated so the window ends at the latest message shown:
          // like a real chat scrolling, smooth because only a transform moves.
          // Measured lazily, so a resize (ScrollTrigger refresh) re-measures.
          const tracks = Array.from(stage.querySelectorAll<HTMLElement>(".gd-chat__track"));
          const shownBottom = (track: HTMLElement, n: number) => {
            const chat = track.parentElement as HTMLElement;
            const cs = getComputedStyle(chat);
            const view = chat.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
            let bottom = 0;
            for (const child of Array.from(track.children) as HTMLElement[]) {
              const b = child.dataset.beat;
              if (b !== undefined && Number(b) > n) continue;
              bottom = Math.max(bottom, child.offsetTop + child.offsetHeight);
            }
            return Math.round(view - bottom);
          };
          const lastBeat = new Map<HTMLElement, number>();
          tracks.forEach((t) => tl.set(t, { y: () => shownBottom(t, 0) }, 0));

          for (const n of beats) {
            const at = `b${n}`;
            tl.addLabel(at);
            tracks.forEach((t) => {
              if (!t.querySelector(`:scope > [data-beat="${n}"]`)) return;
              const prev = lastBeat.get(t) ?? 0;
              lastBeat.set(t, n);
              tl.fromTo(
                t,
                { y: () => shownBottom(t, prev) },
                { y: () => shownBottom(t, n), duration: 1.2, ease: "sine.inOut", immediateRender: false },
                at,
              );
            });
            stage.querySelectorAll<HTMLElement>(`[data-beat="${n}"]`).forEach((el) => {
              if (el.dataset.only === (narrow ? "wide" : "narrow")) return;
              revealInto(tl, el, at);
            });
            const outs = narrow ? `[data-out="${n}"],[data-out-narrow="${n}"]` : `[data-out="${n}"]`;
            stage.querySelectorAll<HTMLElement>(outs).forEach((el) => {
              tl.to(el, { autoAlpha: 0, y: -18, duration: 0.8, ease: "power2.in" }, at);
            });
            // breathing room between beats, so each one reads on its own
            tl.to({}, { duration: 0.4 });
          }
          // hold the finished picture before the pin releases
          tl.to({}, { duration: 1.4 });

          const labelTimes = beats.map((n) => tl.labels[`b${n}`]);
          const steps = Array.from(stage.querySelectorAll<HTMLElement>("[data-at]"));
          let current = -2;
          const syncSteps = (time: number) => {
            let reached = 0;
            beats.forEach((n, i) => {
              if (time >= labelTimes[i] + 0.15) reached = n;
            });
            let idx = -1;
            steps.forEach((el, i) => {
              if (Number(el.dataset.at) <= reached) idx = i;
            });
            if (idx === current) return;
            current = idx;
            steps.forEach((el, i) => {
              el.classList.toggle("is-current", i === idx);
              el.classList.toggle("is-done", i < idx);
            });
          };
          syncSteps(0);

          ScrollTrigger.create({
            trigger: section,
            start: "top top",
            end: () => `+=${Math.round(((beats.length * beatVh) / 100) * window.innerHeight)}`,
            pin: stage,
            pinSpacing: true,
            scrub: 1.4,
            animation: tl,
            invalidateOnRefresh: true,
            onUpdate: () => syncSteps(tl.time()),
          });

          return () => {
            section.classList.remove("is-live");
            steps.forEach((el) => el.classList.remove("is-current", "is-done"));
          };
        },
      );

      // later triggers (the next act) start where this act's spacer now ends
      ScrollTrigger.refresh();
      if (wasAbove) window.scrollBy(0, section.offsetHeight - heightBefore);
    };

    // Built on the visitor's first scroll (the act is still a screen away), or
    // when the act is about to show without a scroll (a hash jump, a short
    // hero). A one-shot DOM listener, no React state.
    let started = false;
    const kick = () => {
      if (started) return;
      started = true;
      window.removeEventListener("scroll", kick);
      io.disconnect();
      void build();
    };
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting || e.boundingClientRect.bottom < 0)) kick();
      },
      { rootMargin: "0px" },
    );
    io.observe(section);
    window.addEventListener("scroll", kick, { passive: true });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", kick);
      io.disconnect();
      revert?.();
    };
  }, [beatVh]);

  return (
    <section id={id} ref={sectionRef} className={`gd-act gd-tone--${tone}`} aria-labelledby={labelledBy}>
      <div ref={stageRef} className="gd-stage">
        {children}
      </div>
    </section>
  );
}
