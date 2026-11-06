// SecretariaDemo — act 3 of the guided demo: the patient asks for a slot in the
// clinic's chat, the secretarIA offers the doctor's free times, the visit lands
// on the week view of the agenda, the e-mail reminder goes out, and a question
// it cannot answer is handed to the team. Scroll-scrubbed by PinnedAct.
//
// Copy rules (owner, 2026-10-19 and 2026-11-05): the channel TODAY is the
// clinic's chat link in the browser — WhatsApp only as "em breve"; agenda is
// each doctor's Google Agenda; confirmation and reminder go by e-mail; status
// label "em piloto" is fixed; no medical advice; made-up data, labelled.

import type { ReactNode } from "react";
import { Bubble, Composer, DayPill, SystemLine, ThreadHead, type ReplyButton } from "./ChatParts";
import { PinnedAct } from "./PinnedAct";

// The conversation follows the shape of the real secretarIA flow in the
// Portal: "O que você precisa?" with "🗓️ Agendar", the free times offered as
// buttons, the e-mail code typed in the chat (masked "••••••", as the Portal
// masks it), and, for what it cannot answer, the offer to call the team — a
// person then answers in the clinic's green. Content is invented.
type Msg = {
  beat: number;
  voice: "sa" | "patient" | "team";
  time: string;
  text: ReactNode;
  echo?: boolean;
  buttons?: ReplyButton[];
  author?: string;
  /** dropped from the compact version (shown on the PreCheck site) */
  full?: boolean;
};

const CHAT: Msg[] = [
  {
    beat: 1,
    voice: "sa",
    time: "14:02",
    text: "Olá! Sou a secretária virtual da Clínica Vale Verde. O que você precisa?",
    buttons: [{ label: "Agendar", icon: "🗓️", chosen: true }, { label: "Outro" }],
  },
  { beat: 2, voice: "patient", time: "14:02", echo: true, text: <>🗓️ Agendar</> },
  {
    beat: 3,
    voice: "sa",
    time: "14:02",
    text: "Estes são os próximos horários livres da Dra. Helena:",
    buttons: [{ label: "Qui, 14:00", chosen: true }, { label: "Qui, 16:00" }, { label: "Sex, 09:00" }],
  },
  { beat: 4, voice: "patient", time: "14:03", echo: true, text: "Qui, 14:00" },
  { beat: 5, voice: "sa", time: "14:03", text: "Para confirmar, digite o código que enviei para o seu e-mail.", full: true },
  { beat: 6, voice: "patient", time: "14:04", text: "••••••", full: true },
  { beat: 7, voice: "sa", time: "14:04", text: "Pronto! Consulta marcada para quinta, 14:00. A confirmação foi para o seu e-mail." },
  { beat: 10, voice: "patient", time: "14:05", text: "Vocês têm estacionamento para pacientes?" },
  {
    beat: 11,
    voice: "sa",
    time: "14:05",
    text: "Não tenho essa informação. Quer que eu chame alguém da equipe?",
    buttons: [{ label: "Sim, por favor", chosen: true }, { label: "Não, obrigado" }],
  },
  { beat: 12, voice: "patient", time: "14:05", echo: true, text: "Sim, por favor" },
];

const STEPS: { at: number; text: string; full?: boolean }[] = [
  { at: 1, text: "O paciente pede um horário no chat da clínica." },
  { at: 3, text: "A secretarIA mostra os horários livres na agenda do médico." },
  { at: 5, text: "O paciente confirma o e-mail com um código.", full: true },
  { at: 8, text: "A consulta entra na agenda e o lembrete sai por e-mail." },
  { at: 10, text: "Quando não sabe a resposta, ela chama alguém da equipe." },
];

const DAYS = ["Seg", "Ter", "Qua", "Qui", "Sex"];
const HOURS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];

type Slot = { day: number; hour: number; label: string; kind: "visit" | "return" | "block" };
const BOOKED: Slot[] = [
  { day: 1, hour: 9, label: "Consulta", kind: "visit" },
  { day: 1, hour: 14, label: "Retorno", kind: "return" },
  { day: 2, hour: 10, label: "Consulta", kind: "visit" },
  { day: 2, hour: 15, label: "Bloqueado", kind: "block" },
  { day: 3, hour: 8, label: "Consulta", kind: "visit" },
  { day: 3, hour: 11, label: "Retorno", kind: "return" },
  { day: 4, hour: 10, label: "Consulta", kind: "visit" },
  { day: 4, hour: 11, label: "Retorno", kind: "return" },
  { day: 5, hour: 10, label: "Consulta", kind: "visit" },
  { day: 5, hour: 15, label: "Bloqueado", kind: "block" },
];

const cell = (day: number, hour: number) => ({ gridColumn: day + 1, gridRow: hour - HOURS[0] + 2 });

type SecretariaDemoProps = {
  cta: ReactNode;
  /** Shorter version (no e-mail code beat) for the PreCheck site. */
  compact?: boolean;
  /** Text before the status label (defaults to the product name). */
  eyebrow?: ReactNode;
};

export function SecretariaDemo({ cta, compact = false, eyebrow }: SecretariaDemoProps) {
  const chat = CHAT.filter((m) => !(compact && m.full));
  const steps = STEPS.filter((s) => !(compact && s.full));

  return (
    <PinnedAct id="secretaria" tone="sa" labelledBy="gd-sa-title" beatVh={compact ? 20 : 22}>
      <div className="gd-wrap gd-act__grid">
        <div className="gd-act__copy">
          <p className="gd-tag">
            <span className="gd-tag__dot" aria-hidden="true" />
            {eyebrow ?? "secretarIA"} <span className="gd-tag__state">em piloto</span>
            <span className="gd-soon">WhatsApp em breve</span>
          </p>
          <h2 id="gd-sa-title" className="gd-h2">
            O paciente marca, remarca e tira dúvidas <em>no chat da clínica.</em>
          </h2>
          <ol className="gd-steps">
            {steps.map((s, i) => (
              <li key={s.at} data-at={s.at}>
                <span className="gd-steps__n" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{s.text}</span>
              </li>
            ))}
          </ol>
          <p className="gd-value" data-beat="13">
            As perguntas de sempre e a marcação de horários ficam com a secretarIA. A equipe vê tudo
            e assume quando quiser.
          </p>
          <div className="gd-act__cta">{cta}</div>
        </div>

        <figure className="gd-scene gd-scene--sa">
          <figcaption className="gd-fict">Ilustração com dados fictícios</figcaption>

          <div className="gd-web">
            <div className="gd-web__bar" aria-hidden="true">
              <span className="gd-web__dots">
                <i />
                <i />
                <i />
              </span>
              <span className="gd-web__url">clinica.example/chat</span>
            </div>
            <ThreadHead
              product="sa"
              aside={
                <span className="gd-web__state">
                  <span className="gd-state gd-state--ai" data-out="13">
                    IA conduzindo
                  </span>
                  <span className="gd-state gd-state--team" data-beat="13" data-fx="pop">
                    Com a equipe
                  </span>
                </span>
              }
            />
            <div className="gd-chat">
              <DayPill>Hoje</DayPill>
              {chat.map((m) => (
                <Bubble
                  key={m.beat}
                  voice={m.voice}
                  beat={m.beat}
                  time={m.time}
                  echo={m.echo}
                  author={m.author}
                  buttons={m.buttons}
                  chooseBeat={m.buttons ? m.beat + 1 : undefined}
                >
                  {m.text}
                </Bubble>
              ))}
              <SystemLine beat={13}>Maria, da recepção, assumiu a conversa.</SystemLine>
              <Bubble voice="team" beat={13} time="14:06" author="Maria · recepção">
                Oi! Aqui é a Maria. Já vejo isso para você.
              </Bubble>
            </div>
            <Composer />
          </div>

          <div className="gd-agenda" data-beat="8" data-only="narrow" data-fx="cover" data-out-narrow="10">
            <div className="gd-agenda__head">
              <span>
                <strong>Agenda · Dra. Helena</strong>
                <small>Semana · Google Agenda</small>
              </span>
            </div>
            <div className="gd-agenda__grid">
              <span className="gd-agenda__corner" aria-hidden="true" />
              {DAYS.map((d, i) => (
                <span key={d} className="gd-agenda__day" style={{ gridColumn: i + 2, gridRow: 1 }}>
                  {d}
                </span>
              ))}
              {HOURS.map((h) => (
                <span key={h} className="gd-agenda__hour" style={{ gridColumn: 1, gridRow: h - HOURS[0] + 2 }}>
                  {String(h).padStart(2, "0")}h
                </span>
              ))}
              {/* busy slots are plain blocks: the week reads as "full", the
                  one new visit is the only labelled event */}
              {BOOKED.map((b) => (
                <span
                  key={`${b.day}-${b.hour}`}
                  className={`gd-ev gd-ev--busy gd-ev--${b.kind}`}
                  style={cell(b.day, b.hour)}
                  title={b.label}
                />
              ))}
              <span className="gd-ev gd-ev--new" style={cell(4, 14)} data-beat="8" data-fx="drop">
                <strong>14:00</strong>
                <small>Nova</small>
              </span>
            </div>
            <p className="gd-toast" data-beat="9" data-fx="pop">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              Lembrete da consulta enviado por e-mail
            </p>
          </div>
        </figure>
      </div>
    </PinnedAct>
  );
}
