// SecretariaDemo — act 3 of the guided demo, on two phones side by side.
// Phone 1: a NEW patient books, through the whole "Agendar" flow — e-mail and
// name, the terms (LGPD), "Agendar", "é pra você?", insurance, professional,
// service, day, time, the summary, the e-mail code, the deposit (sinal) by Pix
// and the confirmation. Phone 2: a patient the clinic already knows asks free
// questions — the address, their own appointments, what to bring — and a
// health question goes to the team, a person takes over. Scroll-scrubbed by
// PinnedAct.
//
// Copy rules (owner, 2026-10-19, 2026-11-05 and 2026-11-06): the channel
// TODAY is the clinic's chat link in the browser — WhatsApp only as "em
// breve"; agenda is each doctor's Google Agenda; confirmation and reminder go
// by e-mail; status label "em piloto" is fixed; no medical advice (health
// questions are handed to the team); made-up data, labelled; the code and the
// CPF the patient types show masked, as the Portal shows them.

import type { ReactNode } from "react";
import { Bubble, Composer, DayPill, SystemLine, ThreadHead, type ReplyButton } from "./ChatParts";
import { PinnedAct } from "./PinnedAct";

// Phone 1 uses the secretarIA's real texts and buttons (secretarIA repo,
// services/flow_router.py, pending_identity.py, payments/deposit_lifecycle.py,
// read 2026-11-06), in the real order: e-mail → name → LGPD → "O que você
// precisa?" → Agendar → "pra você?" → convênio → profissional → serviço (+ its
// price card) → dia → horário → resumo (Confirmar) → código do e-mail → CPF →
// Pix → "Pagamento recebido!". The deposit is shown in the clinic option that
// charges it BEFORE confirming ("before" timing); a clinic may also charge it
// after, or not at all (it is off until the clinic turns it on). Only a few
// list rows are drawn, and long messages keep their real wording but drop
// optional lines (the doctor's "about" text, the e-mail provider link).
type Msg = {
  beat: number;
  voice: "sa" | "patient" | "team";
  time: string;
  text: ReactNode;
  echo?: boolean;
  buttons?: ReplyButton[];
  author?: string;
};

// Made-up booking used across phone 1.
const DOCTOR = "Dra. Helena Prado";
const WHEN = "12/11/2026 às 14:00";

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
  // convênio — the clinic's plans, then "Particular" and "Outro convênio"
  {
    beat: 11,
    voice: "sa",
    time: "14:46",
    text: "Você vai usar convênio? Escolha uma opção:",
    buttons: [{ label: "Plano Vida" }, { label: "Particular", chosen: true }, { label: "Outro convênio" }],
  },
  { beat: 12, voice: "patient", time: "14:46", echo: true, text: "Particular" },
  // profissional — only on clinics with two or more doctors
  {
    beat: 13,
    voice: "sa",
    time: "14:46",
    text: "Com qual profissional você gostaria de agendar?",
    buttons: [
      { label: DOCTOR, icon: "🥼", note: "Clínica geral", chosen: true },
      { label: "Dr. Rafael Lima", icon: "🥼", note: "Cardiologia" },
      { label: "Não sei", note: "Te ajudo a escolher" },
    ],
  },
  { beat: 14, voice: "patient", time: "14:46", echo: true, text: <>🥼 {DOCTOR}</> },
  // serviço, then the service's card with its price
  {
    beat: 15,
    voice: "sa",
    time: "14:46",
    text: "Qual serviço você gostaria de agendar?",
    buttons: [{ label: "Consulta", icon: "🏥", chosen: true }, { label: "Retorno", icon: "🏥" }, { label: "Não sei" }],
  },
  { beat: 16, voice: "patient", time: "14:47", echo: true, text: <>🏥 Consulta</> },
  {
    beat: 17,
    voice: "sa",
    time: "14:47",
    text: (
      <>
        Consulta R$250
        <br />
        <br />
        Deseja agendar esse serviço?
      </>
    ),
    buttons: [{ label: "Sim", icon: "✅", chosen: true }, { label: "Outro serviço", icon: "❌" }],
  },
  { beat: 18, voice: "patient", time: "14:47", echo: true, text: <>✅ Sim</> },
  // dia e horário — free days of that doctor, then free times of that day
  {
    beat: 19,
    voice: "sa",
    time: "14:47",
    text: "Para quando você gostaria? Escolha um dia:",
    buttons: [
      { label: "Qui, 12/11", icon: "🗓️", chosen: true },
      { label: "Sex, 13/11", icon: "🗓️" },
      { label: "Seg, 16/11", icon: "🗓️" },
    ],
  },
  { beat: 20, voice: "patient", time: "14:47", echo: true, text: <>🗓️ Qui, 12/11</> },
  {
    beat: 21,
    voice: "sa",
    time: "14:47",
    text: "Horários livres em 12/11:",
    buttons: [
      { label: "09:00", icon: "🗓️" },
      { label: "14:00", icon: "🗓️", chosen: true },
      { label: "16:30", icon: "🗓️" },
    ],
  },
  { beat: 22, voice: "patient", time: "14:48", echo: true, text: <>🗓️ 14:00</> },
  // resumo
  {
    beat: 23,
    voice: "sa",
    time: "14:48",
    text: (
      <>
        Consulta
        <br />
        Profissional: {DOCTOR}
        <br />
        {WHEN}
      </>
    ),
    buttons: [{ label: "Confirmar", icon: "✅", chosen: true }, { label: "Cancelar", icon: "❌" }],
  },
  { beat: 24, voice: "patient", time: "14:48", echo: true, text: <>✅ Confirmar</> },
  // código do e-mail — a new patient confirms the e-mail before the booking
  {
    beat: 25,
    voice: "sa",
    time: "14:48",
    text: (
      <>
        Para registrá-lo(a) no sistema e confirmar a sua consulta, verifique o{" "}
        <strong>código de 6 dígitos</strong> que chegou no seu e-mail.
        <br />
        <br />
        📩 Enviei para a***@exemplo.com.
      </>
    ),
    buttons: [{ label: "Reenviar código", icon: "↩️" }, { label: "Mudar e-mail", icon: "📩" }],
  },
  { beat: 26, voice: "patient", time: "14:49", text: "••••••" },
  {
    beat: 27,
    voice: "sa",
    time: "14:49",
    text: "✅ Tudo certo, sua conta está ativa! Esta conversa fica salva para você.",
  },
  // sinal — CPF for the payment provider, then the Pix
  {
    beat: 28,
    voice: "sa",
    time: "14:49",
    text: "Envie seu CPF para que possamos cadastrá-lo no nosso sistema de pagamento para que você consiga marcar a sua consulta.",
  },
  { beat: 29, voice: "patient", time: "14:50", text: "•••.•••.•••-••" },
  {
    beat: 30,
    voice: "sa",
    time: "14:50",
    text: (
      <>
        Para reservar Consulta em {WHEN} na Clínica Vale Verde, pedimos um sinal de R$ 75,00 via Pix.
        <br />
        <br />
        O horário fica reservado para você por 30 minutos (até 15:20). A consulta só é confirmada depois
        que o pagamento for identificado.
        <br />
        <br />
        Pix copia e cola:
        <span className="gd-pix">00020126•••exemplo•••6304</span>
      </>
    ),
  },
  // confirmação
  {
    beat: 31,
    voice: "sa",
    time: "14:53",
    text: (
      <>
        Pagamento recebido! Seu agendamento está confirmado. ✅
        <br />
        <br />
        Consulta
        <br />
        {WHEN}
        <br />
        <br />
        Adicionar à sua agenda:
        <br />
        <span className="gd-pb__link">clinicavaleverde.exemplo/agenda</span>
      </>
    ),
  },
];

const BOOKED = 31;

// Phone 2: free questions, answered with what the clinic registered and with
// the patient's own appointments; a health question is never answered — it is
// offered to the team, and a person (clinic green) takes over.
const KNOWN_PATIENT: Msg[] = [
  { beat: 32, voice: "patient", time: "10:02", text: "Oi! Qual o endereço da clínica?" },
  {
    beat: 33,
    voice: "sa",
    time: "10:02",
    text: "Rua das Palmeiras, 120, sala 304, no Centro. Há estacionamento conveniado no prédio ao lado.",
  },
  { beat: 34, voice: "patient", time: "10:03", text: "Minha consulta é que horas mesmo?" },
  {
    beat: 35,
    voice: "sa",
    time: "10:03",
    text: "Sexta, às 09:00, com a Dra. Helena. A última foi o seu retorno de 12 de agosto.",
  },
  { beat: 36, voice: "patient", time: "10:03", text: "Preciso levar alguma coisa?" },
  {
    beat: 37,
    voice: "sa",
    time: "10:04",
    text: "Traga um documento com foto e a carteirinha do convênio.",
  },
  { beat: 38, voice: "patient", time: "10:04", text: "Posso tomar um remédio para dor antes?" },
  {
    beat: 39,
    voice: "sa",
    time: "10:04",
    text: "Sobre saúde e remédios eu não posso orientar. Quer que eu chame alguém da equipe?",
    buttons: [{ label: "Sim, por favor", chosen: true }, { label: "Não, obrigado" }],
  },
  { beat: 40, voice: "patient", time: "10:05", echo: true, text: "Sim, por favor" },
];

const KNOWN_FROM = 32;
const HANDOFF = 41;

const STEPS: { at: number; text: string }[] = [
  { at: 1, text: "O paciente novo informa e-mail e nome e aceita os termos (LGPD)." },
  { at: 7, text: "Escolhe Agendar, diz para quem é, o convênio, o profissional e o serviço." },
  { at: 19, text: "Escolhe o dia e o horário livre e confirma pelo código do e-mail." },
  { at: 28, text: "Se a clínica cobra sinal, paga por Pix e a consulta é confirmada." },
  { at: KNOWN_FROM, text: "Quem já é paciente pergunta endereço, preparo e a própria consulta." },
  { at: 38, text: "Pergunta de saúde vai para a equipe, que assume a conversa." },
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
};

export function SecretariaDemo({ cta }: SecretariaDemoProps) {
  return (
    // 41 beats: a little less scroll per message than the PreCheck act, so the
    // whole booking still plays in a reasonable scroll
    <PinnedAct id="secretaria" tone="sa" labelledBy="gd-sa-title" beatVh={16}>
      <div className="gd-wrap gd-act__grid">
        <div className="gd-act__copy">
          <p className="gd-tag">
            {/* her face (the secretarIA logo) in place of the tone dot */}
            <img className="gd-tag__face" src="/brand/mascots/secretaria-head.webp" width={25} height={28} alt="" />
            secretarIA <span className="gd-tag__state">em piloto</span>
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
                <span>{s.text}</span>
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
                <div className="gd-chat__track">
                  <DayPill>Hoje</DayPill>
                  <Thread msgs={NEW_PATIENT} />
                </div>
              </div>
              <Composer />
            </div>
            <p className="gd-toast gd-duo__toast" data-beat={BOOKED} data-fx="pop">
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4.5" width="18" height="16" rx="2" />
                <path d="M3 9.5h18M8 2.5v4M16 2.5v4" />
              </svg>
              Na Google Agenda da Dra. Helena · lembrete por e-mail
            </p>
          </div>

          {/* phone 2 — a known patient asks; on a phone screen it covers phone 1 */}
          <div className="gd-duo gd-duo--b" data-beat={KNOWN_FROM} data-only="narrow" data-fx="cover">
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
                <div className="gd-chat__track">
                  {/* the earlier visit, already in the history */}
                  <DayPill>12 de agosto</DayPill>
                  <Bubble voice="sa" time="09:41">
                    Pronto! Seu retorno com a Dra. Helena está marcado para hoje, 11:00.
                  </Bubble>
                  <DayPill>Hoje</DayPill>
                  <Thread msgs={KNOWN_PATIENT} />
                  <SystemLine beat={HANDOFF}>Maria, da recepção, assumiu a conversa.</SystemLine>
                  <Bubble voice="team" beat={HANDOFF} time="10:05" author="Maria · recepção">
                    Oi! Aqui é a Maria. Já vejo isso com a Dra. Helena para você.
                  </Bubble>
                </div>
              </div>
              <Composer />
            </div>
          </div>
        </figure>
      </div>
    </PinnedAct>
  );
}
