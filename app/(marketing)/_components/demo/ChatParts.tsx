// ChatParts — the conversation pieces of the demo mock-ups, drawn the way the
// real Brain patient Portal draws them (Brain-Message-Frontend
// components/console/MessageBubble.tsx + ReplyButtons.tsx, patient side):
//   - the product speaks on the LEFT, in its own tint, with its wordmark and a
//     sparkle on the bubble's first line (PreCheck teal, secretarIA yellow);
//   - a person from the clinic speaks in the green "human" tint with
//     "Name · role" on the first line;
//   - the patient speaks on the RIGHT, on a plain surface, with the time and the
//     double tick inside the bubble's bottom-right corner;
//   - a tapped option comes back as the patient's bubble with "Opção escolhida";
//   - reply buttons sit INSIDE the product's bubble, stacked, full width; the
//     chosen one turns green with a check.
// Server component, pure markup: the animation contract (data-beat / data-fx)
// is the one PinnedAct reads. The chosen state of a button is a layer revealed
// at `chooseBeat` (the beat of the patient's answer), so the static picture —
// no JavaScript, reduced motion — shows the finished conversation.

import type { ReactNode } from "react";

export type Voice = "pc" | "sa" | "team" | "patient";

export type ReplyButton = {
  label: string;
  /** The emoji the real flows put before the label (✅, ❌, ⬅️, 🗓️). */
  icon?: string;
  chosen?: boolean;
};

type BubbleProps = {
  voice: Voice;
  /** Beat at which the bubble slides in (omit: always shown). */
  beat?: number;
  /** Clock shown in the corner, e.g. "09:12". */
  time: string;
  /** The patient's bubble is the echo of a tapped option. */
  echo?: boolean;
  /** "Maria · recepção" for the team voice. */
  author?: string;
  buttons?: ReplyButton[];
  /** Beat at which the chosen button lights up (the patient's answer). */
  chooseBeat?: number;
  children: ReactNode;
};

function Sparkle() {
  return (
    <svg className="gd-pb__spark" viewBox="0 0 16 16" width="12" height="12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.5c.3 2.6 1.9 4.2 4.5 4.5-2.6.3-4.2 1.9-4.5 4.5-.3-2.6-1.9-4.2-4.5-4.5C6.1 5.7 7.7 4.1 8 1.5Zm4.6 8.3c.15 1.2.85 1.9 2.05 2.05-1.2.15-1.9.85-2.05 2.05-.15-1.2-.85-1.9-2.05-2.05 1.2-.15 1.9-.85 2.05-2.05Z"
      />
    </svg>
  );
}

function Check({ size = 12 }: { size?: number }) {
  return (
    <svg viewBox="0 0 16 16" width={size} height={size} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3.5 8.5 3 3 6-7" />
    </svg>
  );
}

function Ticks() {
  return (
    <svg className="gd-pb__ticks" viewBox="0 0 18 12" width="16" height="11" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="m1.5 6.5 3 3 6.5-7.5" />
      <path d="m7.2 8.7.8.8 6.5-7.5" />
    </svg>
  );
}

/** "PreCheck" / "secretarIA" written the way the products write it. */
export function Wordmark({ product }: { product: "pc" | "sa" }) {
  return product === "pc" ? (
    <span className="gd-wm">
      Pre<i>Check</i>
    </span>
  ) : (
    <span className="gd-wm">
      secretar<i>IA</i>
    </span>
  );
}

export function Bubble({ voice, beat, time, echo, author, buttons, chooseBeat, children }: BubbleProps) {
  const side = voice === "patient" ? "out" : "in";
  const label =
    voice === "patient"
      ? echo
        ? "Opção escolhida pelo paciente"
        : "Mensagem do paciente"
      : voice === "team"
        ? `Mensagem de ${author ?? "alguém da equipe"}`
        : voice === "pc"
          ? "Mensagem do PreCheck"
          : "Mensagem da secretarIA";
  return (
    <div className="gd-msg" data-beat={beat} data-fx={beat === undefined ? undefined : "msg"}>
      <div className={`gd-pb gd-pb--${voice} gd-pb--${side}${buttons ? " gd-pb--card" : ""}`} aria-label={label}>
        {(voice === "pc" || voice === "sa") && (
          <span className="gd-pb__from">
            <Sparkle />
            <Wordmark product={voice} />
          </span>
        )}
        {voice === "team" && author && <span className="gd-pb__from">{author}</span>}
        {echo && (
          <span className="gd-pb__echo">
            <Check size={11} />
            Opção escolhida
          </span>
        )}
        <span className="gd-pb__text">
          {children}
          <span className={`gd-pb__sp gd-pb__sp--${side}`} aria-hidden="true" />
          <span className="gd-pb__meta">
            {time}
            {side === "out" && <Ticks />}
          </span>
        </span>
        {buttons && (
          <span className="gd-rb" role="group" aria-label="Opções de resposta">
            {buttons.map((b) => (
              <span key={b.label} className="gd-rb__b">
                <span className="gd-rb__face">
                  {b.icon && <span aria-hidden="true">{b.icon}</span>}
                  {b.label}
                </span>
                {b.chosen && (
                  <span className="gd-rb__on" data-beat={chooseBeat} data-fx={chooseBeat === undefined ? undefined : "pop"}>
                    <Check size={13} />
                    {b.icon && <span aria-hidden="true">{b.icon}</span>}
                    {b.label}
                    <span className="gd-sr"> (escolhida)</span>
                  </span>
                )}
              </span>
            ))}
          </span>
        )}
      </div>
    </div>
  );
}

/** A centred line from the system ("Maria, da recepção, assumiu a conversa."). */
export function SystemLine({ beat, children }: { beat?: number; children: ReactNode }) {
  return (
    <div className="gd-msg" data-beat={beat} data-fx={beat === undefined ? undefined : "msg"}>
      <p className="gd-sys">{children}</p>
    </div>
  );
}

/** The day pill at the top of a thread. */
export function DayPill({ children }: { children: ReactNode }) {
  return (
    <div className="gd-day" aria-hidden="true">
      <span>{children}</span>
    </div>
  );
}

/** The Portal's composer line at the bottom of a thread. */
export function Composer({ placeholder = "Escreva uma mensagem…" }: { placeholder?: string }) {
  return (
    <div className="gd-compose" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="m21 11.5-8.6 8.6a5.5 5.5 0 0 1-7.8-7.8l8.6-8.6a3.7 3.7 0 0 1 5.2 5.2l-8.6 8.6a1.8 1.8 0 0 1-2.6-2.6l7.9-7.9" />
      </svg>
      <span>{placeholder}</span>
      <svg className="gd-compose__send" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h13M12 5l7 7-7 7" />
      </svg>
    </div>
  );
}

/** The Portal's conversation header: clinic + which product is answering. */
export function ThreadHead({ product, aside }: { product: "pc" | "sa"; aside?: ReactNode }) {
  return (
    <div className="gd-thead">
      <span className="gd-thead__back" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6" />
        </svg>
      </span>
      <span className="gd-thead__ava" aria-hidden="true">
        CV
      </span>
      <span className="gd-thead__who">
        <strong>Clínica Vale Verde</strong>
        <small>
          {/* the secretarIA's face (her logo) next to her name — decorative,
              the name beside it already says who answers */}
          {product === "sa" ? (
            <img className="gd-thead__face" src="/brand/mascots/secretaria-head.webp" width={13} height={15} alt="" />
          ) : null}
          <Wordmark product={product} /> responde
        </small>
      </span>
      {aside}
    </div>
  );
}
