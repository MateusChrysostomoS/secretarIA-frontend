"use client";
// Section — numbered card wrapper for each config section.
// Renders the section icon chip, two-line heading, description paragraph,
// and a card surface (border-radius 18, shadow-sm) that wraps children.
// The id + scrollMarginTop wires up the SideNav scrollspy.

import type { ReactNode } from "react";
import { Icon } from "../../_shared/ui";
import type { IconName } from "../../_shared/ui";

type SectionProps = {
  id: string;
  num: string;   // display ordinal, e.g. "01"
  icon: IconName;
  title: string;
  desc: string;
  children: ReactNode;
};

// Wraps a config section with icon header, title/desc, and a card surface.
export function Section({ id, num, icon, title, desc, children }: SectionProps) {
  return (
    <section id={id} style={{ scrollMarginTop: 20 }}>
      {/* section header row: icon chip + title + description */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 13, marginBottom: 16 }}>
        <span style={{
          width: 38, height: 38, borderRadius: 11, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: "var(--brand-tint)", color: "var(--brand)",
        }}>
          <Icon name={icon} size={20} />
        </span>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <span style={{
              fontSize: 12, fontWeight: 700,
              color: "var(--ink-faint)", letterSpacing: ".08em",
            }}>{num}</span>
            <h2 style={{
              fontSize: 21, fontWeight: 600,
              fontFamily: "var(--font-serif)", color: "var(--ink)", lineHeight: 1.15,
              margin: 0,
            }}>{title}</h2>
          </div>
          <p style={{
            fontSize: 13.5, color: "var(--ink-soft)",
            marginTop: 3, maxWidth: 560, lineHeight: 1.45, margin: "3px 0 0",
          }}>{desc}</p>
        </div>
      </div>

      {/* card surface */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 18,
        padding: 24,
        boxShadow: "var(--shadow-sm)",
      }}>
        {children}
      </div>
    </section>
  );
}
