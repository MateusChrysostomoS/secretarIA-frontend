"use client";

// SiteHeader — the landing's sticky header: brand, section anchors, "Falar com a
// equipe" and "Entrar".
//
// "Entrar" opens the clinic PLATFORM's login (PLATFORM_LOGIN_HREF — the
// Brain-Message console where doctors and secretaries work), not this app's own
// /entrar. It is a plain <a>, not next/link: the target is usually another
// origin, and even the fallback (/entrar) is a different design system that
// should load as a fresh document.
//
// The only client state is the small-screen menu. Below 1121px the anchors
// collapse behind a disclosure button (aria-expanded + aria-controls); the panel
// closes on Escape, on choosing a link, and when the viewport grows back past the
// breakpoint (CSS hides it there, but the state should not linger open).

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { BrandGlyph } from "@/app/(site)/_components/BrandGlyph";
import { BrandIcon } from "@/app/(site)/_components/BrandIcon";

export type SiteNavLink = { href: string; label: string };

type SiteHeaderProps = {
  links: SiteNavLink[];
  platformHref: string;
};

export function SiteHeader({ links, platformHref }: SiteHeaderProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const wide = window.matchMedia("(min-width: 1121px)");
    const onWide = () => {
      if (wide.matches) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    wide.addEventListener("change", onWide);
    return () => {
      window.removeEventListener("keydown", onKey);
      wide.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <header className="lp-header">
      <div className="lp-wrap lp-nav">
        <Link href="/" className="lp-brand" aria-label="secretarIA, um produto Brain — início" prefetch={false}>
          <BrandGlyph size={28} />
          <span className="lp-brand__word" aria-hidden="true">
            secretar<em>IA</em>
          </span>
          <span className="lp-brand__by" aria-hidden="true">
            por Brain
          </span>
        </Link>

        <nav aria-label="Seções da página" className="lp-navlinks">
          <ul>
            {links.map((l) => (
              <li key={l.href}>
                <a href={l.href}>{l.label}</a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="lp-navactions">
          <a href="#contato" className="btn btn--outline btn--sm lp-hide-xs">
            Falar com a equipe
          </a>
          <a
            href={platformHref}
            className="btn btn--primary btn--sm"
            aria-label="Entrar na plataforma da clínica"
          >
            Entrar
          </a>
          <button
            ref={buttonRef}
            type="button"
            className="lp-menu-btn"
            aria-expanded={open}
            aria-controls="lp-mnav"
            aria-label={open ? "Fechar menu" : "Abrir menu"}
            onClick={() => setOpen((v) => !v)}
          >
            <BrandIcon name={open ? "x" : "menu"} />
          </button>
        </div>
      </div>

      <nav id="lp-mnav" className="lp-mnav" aria-label="Seções da página" hidden={!open}>
        <ul className="lp-wrap">
          {links.map((l) => (
            <li key={l.href}>
              <a href={l.href} onClick={() => setOpen(false)}>
                {l.label}
              </a>
            </li>
          ))}
          <li>
            <a href="#contato" onClick={() => setOpen(false)}>
              Falar com a equipe
            </a>
          </li>
        </ul>
      </nav>
    </header>
  );
}
