"use client";
// InheritanceChoice — "Herdar da clínica" versus "Configuração própria", the
// control that makes a professional's hours/services state visible and
// deliberate. Shared by Section 06 (Serviços) and Section 07 (Dias e horários),
// which have the same three states and must not drift into two dialects.
//
// WHY THIS CONTROL EXISTS
// -----------------------
// A professional with no config of their own uses the clinic's. One who closed
// every day, or removed every service, has a config of their own that is empty.
// Both used to render as an empty form, and the screen offered no way to tell
// them apart — or to move between them on purpose. So a save that only touched
// the greeting rewrote inheritance into an empty override, and the clinic's bot
// stopped offering anything without anyone having chosen that.
//
// The "unknown" state is not a design; it is honesty during a deploy where this
// bundle is newer than the backend it talks to. The backend has not sent the
// flag, so we cannot say which of the two states this is — and we say so,
// rather than rendering a toggle whose position would be a guess that the next
// save would then persist.

import type { ReactNode } from "react";
import { RadioPillGroup } from "../../_components/RadioPillGroup";
import type { ConfigInheritance } from "../lib/types";

type InheritanceChoiceProps = {
  /** Radio group name — must be unique per section on the page. */
  name: string;
  source: ConfigInheritance;
  onChange: (next: "inherit" | "own") => void;
  /** What is inherited, in the clinic's words, e.g. "os horários da clínica". */
  inheritHint: string;
  /** What an own config means here, e.g. "horários só deste profissional". */
  ownHint: string;
  readOnly?: boolean;
};

export function InheritanceChoice({
  name,
  source,
  onChange,
  inheritHint,
  ownHint,
  readOnly,
}: InheritanceChoiceProps) {
  if (source === "unknown") {
    return (
      <div
        style={{
          fontSize: 12.5,
          color: "var(--ink-faint)",
          background: "var(--surface-2)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: "10px 12px",
          marginBottom: 16,
          lineHeight: 1.5,
        }}
      >
        Não é possível dizer se esta configuração é própria deste profissional ou herdada da
        clínica — o servidor ainda não informa essa distinção. Salvar mantém exatamente o
        comportamento atual.
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 18 }}>
      <RadioPillGroup
        name={name}
        value={source}
        onChange={onChange}
        disabled={readOnly}
        options={[
          { value: "inherit", label: "Herdar da clínica", hint: inheritHint },
          { value: "own", label: "Configuração própria", hint: ownHint },
        ]}
      />
    </div>
  );
}

// The note shown alongside what is being inherited, so "herdando" displays the
// real values instead of a blank form that reads as "nothing configured".
export function InheritedNote({ children }: { children: ReactNode }) {
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
