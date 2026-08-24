// InlineNote — one inline explanatory box, in brand tint, used by the sections
// that need to say something about what the form in front of you means.
//
// It was born as `InheritedNote`, the companion to an "Herdar da clínica /
// Configuração própria" radio group that lived in this file. That control is
// gone: Section 06 replaced it with per-service ticks, and Section 07 replaced
// it with a clinic schedule plus a "preencher com o horário da clínica" button
// (see AvailabilitySection's header note for why). The note outlived it,
// because saying WHY a form looks the way it does is still the job.
import type { ReactNode } from "react";

export function InlineNote({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 12.5,
        color: "var(--ink-soft)",
        background: "var(--brand-tint)",
        border: "1px solid var(--line)",
        borderRadius: 10,
        padding: "10px 12px",
        marginBottom: 14,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
