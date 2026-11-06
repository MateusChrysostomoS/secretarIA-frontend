// SecretariaDemo — act 3 of the guided demo, on two phones side by side.
// Phone 1: a NEW patient books — e-mail and name, the terms (LGPD), "Agendar",
// "é pra você?", a free time, the e-mail code, the booking on the doctor's
// agenda. Phone 2: a patient the clinic already knows asks free questions —
// the address, their own appointments, what to bring — and a health question
// goes to the team, a person takes over. Scroll-scrubbed by PinnedAct.
//
// Copy rules (owner, 2026-10-19, 2026-11-05 and 2026-11-06): the channel
// TODAY is the clinic's chat link in the browser — WhatsApp only as "em
// breve"; agenda is each doctor's Google Agenda; confirmation and reminder go
// by e-mail; status label "em piloto" is fixed; no medical advice (health
// questions are handed to the team); made-up data, labelled.

import type { ReactNode } from "react";
import { Bubble, Composer, DayPill, SystemLine, ThreadHead, type ReplyButton } from "./ChatParts";
import { PinnedAct } from "./PinnedAct";

// Phone 1 follows the order of the real first contact in the Portal (the
// "Teste Lembrete" conversation the owner pointed to, 2026-11-06): "qual é o
// seu e-mail?", "E-mail anotado! Qual é o seu nome?", the terms with
// "✅ Concordo" / "✏️ Mudar nome", "O que você precisa?" → "🗓️ Agendar",
// "Essa consulta é pra você? 😊" → "✅ Sim, é pra mim". The real flow then
// asks the insurance and the professional; the demo skips to the free times.
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

const NEW_PATIENT: Msg[] = [
  {
    beat: 1,
    voice: "sa",
    time: "14:44",
    text: "📧 Antes de continuarmos, qual é o seu e-mail? Uso ele para guardar esta conversa e te enviar as confirmações do agendamento.",
  },
  { beat: 2, voice: "patient", time: "14:44", text: "ana@exemplo.com" },
  {
    beat: 3,
    voice: "sa",
    time: "14:44",
    text: "✅ E-mail anotado! Prazer! 😊 Qual é o seu nome?",
    buttons: [{ label: "Mudar e-mail", icon: "📩" }],
  },
  { beat: 4, voice: "patient", time: "14:45", text: "Ana Souza" },
  {
    beat: 5,
    voice: "sa",
    time: "14:45",
    text: "Antes de continuarmos, preciso confirmar sua concordância com os Termos de Uso e a Política de Privacidade, conforme a LGPD.",
    buttons: [{ label: "Concordo", icon: "✅", chosen: true }, { label: "Mudar nome", icon: "✏️" }],
  },
  { beat: 6, voice: "patient", time: "14:45", echo: true, text: <>✅ Concordo</> },
  {
    beat: 7,
    voice: "sa",
    time: "14:45",
    text: "Perfeito, obrigado! ✅ Sua concordância foi registrada. O que você precisa?",
    buttons: [{ label: "Agendar", icon: "🗓️", chosen: true }, { label: "Outro" }],
  },
  { beat: 8, voice: "patient", time: "14:45", echo: true, text: <>🗓️ Agendar</> },
  {
    beat: 9,
    voice: "sa",
    time: "14:45",
    text: "Essa consulta é pra você? 😊",
    buttons: [{ label: "Sim, é pra mim", icon: "✅", chosen: true }, { label: "Pra outra pessoa", icon: "👤" }],
  },
  { beat: 10, voice: "patient", time: "14:46", echo: true, text: <>✅ Sim, é pra mim</> },
  {
    beat: 11,
    voice: "sa",
    time: "14:46",
    text: "Estes são os próximos horários livres da Dra. Helena:",
    buttons: [{ label: "Qui, 14:00", chosen: true }, { label: "Qui, 16:00" }, { label: "Sex, 09:00" }],
  },
  { beat: 12, voice: "patient", time: "14:46", echo: true, text: "Qui, 14:00" },
  { beat: 13, voice: "sa", time: "14:46", text: "Para confirmar, digite o código que enviei para o seu e-mail.", full: true },
  { beat: 14, voice: "patient", time: "14:47", text: "••••••", full: true },
  {
    beat: 15,
    voice: "sa",
    time: "14:47",
    text: "Pronto, Ana! Consulta marcada para quinta, 14:00, com a Dra. Helena. A confirmação foi para o seu e-mail.",
  },
];

// Phone 2: free questions, answered with what the clinic registered and with
// the patient's own appointments; a health question is never answered — it is
// offered to the team, and a person (clinic green) takes over.
const KNOWN_PATIENT: Msg[] = [
  { beat: 16, voice: "patient", time: "10:02", text: "Oi! Qual o endereço da clínica?" },
  {
    beat: 17,
    voice: "sa",
    time: "10:02",
    text: "Rua das Palmeiras, 120, sala 304, no Centro. Há estacionamento conveniado no prédio ao lado.",
  },
  { beat: 18, voice: "patient", time: "10:03", text: "Minha consulta é que horas mesmo?" },
  {
    beat: 19,
    voice: "sa",
    time: "10:03",
    text: "Sexta, às 09:00, com a Dra. Helena. A última foi o seu retorno de 12 de agosto.",
  },
  { beat: 20, voice: "patient", time: "10:03", text: "Preciso levar alguma coisa?", full: true },
  {
    beat: 21,
    voice: "sa",
    time: "10:04",
    text: "Traga um documento com foto e a carteirinha do convênio.",
    full: true,
  },
  { beat: 22, voice: "patient", time: "10:04", text: "Posso tomar um remédio para dor antes?" },
  {
    beat: 23,
    voice: "sa",
    time: "10:04",
    text: "Sobre saúde e remédios eu não posso orientar. Quer que eu chame alguém da equipe?",
    buttons: [{ label: "Sim, por favor", chosen: true }, { label: "Não, obrigado" }],
  },
  { beat: 24, voice: "patient", time: "10:05", echo: true, text: "Sim, por favor" },
];

const HANDOFF = 25;

const STEPS: { at: number; text: string; compactText?: string }[] = [
  { at: 1, text: "O paciente novo informa e-mail e nome." },
  { at: 5, text: "Aceita os termos de privacidade (LGPD)." },
  { at: 7, text: "Escolhe Agendar e diz para quem é a consulta." },
  {
    at: 11,
    text: "Marca um horário livre e confirma pelo código do e-mail.",
    compactText: "Marca um horário livre na agenda do médico.",
  },
  { at: 16, text: "Quem já é paciente pergunta endereço, preparo e a própria consulta." },
  { at: 22, text: "Pergunta de saúde vai para a equipe, que assume a conversa." },
];

function Thread({ msgs }: { msgs: Msg[] }) {
  return (
    <>
      {msgs.map((m) => (
        <Bubble
          key={m.beat}
          voice={m.voice}
          beat={m.beat}
          time={m.time}
          echo={m.echo}
          author={m.author}
          buttons={m.buttons}
          chooseBeat={m.buttons?.some((b) => b.chosen) ? m.beat + 1 : undefined}
        >
          {m.text}
        </Bubble>
      ))}
    </>
  );
}

type SecretariaDemoProps = {
  cta: ReactNode;
  /** Shorter version (no e-mail code, no "what to bring") for the PreCheck site. */
  compact?: boolean;
  /** Text before the status label (defaults to the product name). */
  eyebrow?: ReactNode;
};

export function SecretariaDemo({ cta, compact = false, eyebrow }: SecretariaDemoProps) {
  const keep = (m: Msg) => !(compact && m.full);

  return (
    <PinnedAct id="secretaria" tone="sa" labelledBy="gd-sa-title" beatVh={compact ? 15 : 16}>
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
            {STEPS.map((s, i) => (
              <li key={s.at} data-at={s.at}>
                <span className="gd-steps__n" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{compact && s.compactText ? s.compactText : s.text}</span>
              </li>
            ))}
          </ol>
          <p className="gd-value" data-beat={HANDOFF}>
            As perguntas de sempre e a marcação de horários ficam com a secretarIA. A equipe vê tudo
            e assume quando quiser.
          </p>
          <div className="gd-act__cta">{cta}</div>
        </div>

        <figure className="gd-scene gd-scene--sa">
          <figcaption className="gd-fict">Ilustração com dados fictícios</figcaption>

          {/* phone 1 — a new patient books */}
          <div className="gd-duo">
            <p className="gd-duo__cap">Paciente novo marcando consulta</p>
            <div className="gd-phone">
              <ThreadHead
                product="sa"
                aside={
                  <span className="gd-web__state">
                    <span className="gd-state gd-state--ai gd-state--keep">IA conduzindo</span>
                  </span>
                }
              />
              <div className="gd-chat" role="region" aria-label="Conversa de exemplo: paciente novo marcando consulta" tabIndex={0}>
                <DayPill>Hoje</DayPill>
                <Thread msgs={NEW_PATIENT.filter(keep)} />
              </div>
              <Composer />
            </div>
            <p className="gd-toast gd-duo__toast" data-beat="15" data-fx="pop">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4.5" width="18" height="16" rx="2" />
                <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
              </svg>
              Na Google Agenda da Dra. Helena · lembrete por e-mail
            </p>
          </div>

          {/* phone 2 — a known patient asks; on a phone screen it covers phone 1 */}
          <div className="gd-duo gd-duo--b" data-beat="16" data-only="narrow" data-fx="cover">
            <p className="gd-duo__cap">Paciente da clínica tirando dúvidas</p>
            <div className="gd-phone">
              <ThreadHead
                product="sa"
                aside={
                  <span className="gd-web__state">
                    <span className="gd-state gd-state--ai" data-out={HANDOFF}>
                      IA conduzindo
                    </span>
                    <span className="gd-state gd-state--team" data-beat={HANDOFF} data-fx="pop">
                      Com a equipe
                    </span>
                  </span>
                }
              />
              <div className="gd-chat" role="region" aria-label="Conversa de exemplo: paciente tirando dúvidas" tabIndex={0}>
                {/* the earlier visit, already in the history */}
                <DayPill>12 de agosto</DayPill>
                <Bubble voice="sa" time="09:41">
                  Pronto! Seu retorno com a Dra. Helena está marcado para hoje, 11:00.
                </Bubble>
                <DayPill>Hoje</DayPill>
                <Thread msgs={KNOWN_PATIENT.filter(keep)} />
                <SystemLine beat={HANDOFF}>Maria, da recepção, assumiu a conversa.</SystemLine>
                <Bubble voice="team" beat={HANDOFF} time="10:05" author="Maria · recepção">
                  Oi! Aqui é a Maria. Já vejo isso com a Dra. Helena para você.
                </Bubble>
              </div>
              <Composer />
            </div>
          </div>
        </figure>
      </div>
    </PinnedAct>
  );
}
