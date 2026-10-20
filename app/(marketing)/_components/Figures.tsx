// Figures — the product, drawn in HTML/CSS for the landing.
//
// Every figure here is an ILLUSTRATION with made-up data, and says so in its
// caption. They are not screenshots and do not render real components: the
// clinic platform (Conversas, Agenda, Contexto) lives in the Brain-Message
// console, on another domain and another design system. What they DO keep is the
// real structure and wording of those screens, checked against that repo, so a
// doctor who signs in recognises what the page promised:
//
//   - Conversas: attendance states "Aguardando resposta" / "IA conduzindo" /
//     "Respondida", and the handover switch whose two states read
//     "secretarIA conduz" / "Recepção conduz" (Brain-Message lib/text.ts).
//   - Agenda: Dia / Semana / Mês, "Bloquear", "Nova consulta", and the status
//     set Agendado · Confirmou · Compareceu · Faltou · Bloqueio
//     (Brain-Message lib/agenda/types.ts STATUS_META).
//   - Contexto: the section list of the "Contexto secretarIA" module.
//
// Accessibility: the drawn UI is aria-hidden and contains nothing focusable (no
// <button>, no <input> — spans styled to look like them). Each <figure> is named
// by its <figcaption>, which says in words what the drawing shows.
//
// Pure server components: no state, no client JS.

import type { CSSProperties, ReactNode } from "react";

import { BrandGlyph } from "@/app/(site)/_components/BrandGlyph";
import { BrandIcon } from "@/app/(site)/_components/BrandIcon";

import { Glyph } from "./Glyph";

function Caption({ n, children }: { n: number; children: ReactNode }) {
  return (
    <figcaption className="lp-figcap">
      <b>Figura {n}</b>
      {children}
    </figcaption>
  );
}

function BrowserBar({ label }: { label: string }) {
  return (
    <div className="lp-vig__bar">
      <span className="lp-vig__dots">
        <i />
        <i />
        <i />
      </span>
      <span className="lp-vig__url">
        <BrandIcon name="lock" />
        {label}
      </span>
    </div>
  );
}

// ── Hero: the patient's chat, and the same booking on the doctor's day ──────

export function HeroFigure() {
  return (
    <figure className="lp-figure lp-hero__figure">
      <div className="lp-stage" aria-hidden="true">
        <div className="lp-vig lp-chat">
          <BrowserBar label="Chat da Clínica Vale Verde" />
          <div className="lp-chat__head">
            <span className="lp-ava">s</span>
            <span>
              <span className="lp-chat__name">secretarIA</span>
              <span className="lp-chat__sub" style={{ display: "block" }}>
                Clínica Vale Verde
              </span>
            </span>
          </div>
          <div className="lp-chat__body">
            <div className="v-msg v-msg--in">
              Olá! Bem-vinda à Clínica Vale Verde. Sou a secretária virtual e cuido dos
              agendamentos por aqui.
            </div>
            <div className="v-msg v-msg--out">Quero marcar com a Dra. Helena, na quinta de manhã.</div>
            <div className="v-msg v-msg--in">
              Na quinta, a Dra. Helena Prado tem estes horários livres:
              <span className="v-slots">
                <span className="v-slot">09:00</span>
                <span className="v-slot v-slot--on">10:00</span>
                <span className="v-slot">11:00</span>
              </span>
            </div>
            <div className="v-msg v-msg--out">10:00, por favor.</div>
            <div className="v-msg v-msg--in">
              Para confirmar, enviei um código para o seu e-mail. É só digitar aqui na conversa.
            </div>
          </div>
          <div className="lp-chat__compose">
            <span>Digite sua mensagem</span>
            <i>
              <BrandIcon name="send" />
            </i>
          </div>
        </div>

        <div className="lp-vig lp-daycard">
          <div className="lp-daycard__head">
            <span className="lp-daycard__t">Agenda · Dra. Helena Prado</span>
            <span className="lp-daycard__d">Quinta</span>
          </div>
          <ol>
            <li className="v-row">
              <span className="v-row__h">08:30</span>
              <span className="v-row__n">
                Paula Ribeiro<small>Consulta</small>
              </span>
              <span className="v-status v-status--confirm">Confirmou</span>
            </li>
            <li className="v-row v-row--new">
              <span className="v-row__h">10:00</span>
              <span className="v-row__n">
                Mariana Costa<small>Consulta · marcada no chat</small>
              </span>
              <span className="v-status v-status--pending">Agendado</span>
            </li>
            <li className="v-row">
              <span className="v-row__h">11:30</span>
              <span className="v-row__n">
                Thiago Moura<small>Retorno</small>
              </span>
              <span className="v-status v-status--confirm">Confirmou</span>
            </li>
          </ol>
        </div>
      </div>
      <Caption n={1}>
        Ilustração com dados fictícios. No alto, o chat que o paciente abre pelo link da clínica;
        embaixo, a mesma consulta já na agenda da médica.
      </Caption>
    </figure>
  );
}

// ── Patient steps: one small artefact per step ───────────────────────────────

export function StepLinkArt() {
  return (
    <div className="lp-art" aria-hidden="true">
      <span className="lp-art__link">
        <Glyph name="link" />
        Link ou QR code da clínica
      </span>
      <span className="lp-art__arrow">
        <BrandIcon name="arrowR" />
      </span>
      <span className="lp-art__link">
        <Glyph name="globe" />
        Abre no navegador
      </span>
    </div>
  );
}

export function StepAskArt() {
  return (
    <div className="lp-art" aria-hidden="true">
      <div className="lp-vig lp-art__thread">
        <div className="v-msg v-msg--out">Vocês aceitam o plano Vida Plena?</div>
        <div className="v-msg v-msg--in">Aceitamos, sim. Quer que eu veja os horários disponíveis?</div>
      </div>
    </div>
  );
}

export function StepPickArt() {
  return (
    <div className="lp-art" aria-hidden="true">
      <div className="lp-vig lp-art__thread">
        <div className="v-msg v-msg--in">
          Dra. Helena Prado · quinta
          <span className="v-slots">
            <span className="v-slot">09:00</span>
            <span className="v-slot v-slot--on">10:00</span>
            <span className="v-slot">11:00</span>
            <span className="v-slot">14:30</span>
          </span>
        </div>
      </div>
    </div>
  );
}

export function StepCodeArt() {
  return (
    <div className="lp-art" aria-hidden="true">
      <span className="lp-code">
        <span>4</span>
        <span>8</span>
        <span>2</span>
        <span>9</span>
        <span>1</span>
        <span className="on">3</span>
      </span>
    </div>
  );
}

export function StepMailArt() {
  return (
    <div className="lp-art" aria-hidden="true">
      <div className="lp-vig lp-mail">
        <div className="lp-mail__row">
          <Glyph name="mail" />
          <span className="lp-mail__s">
            Consulta confirmada
            <small>Quinta, 10:00 · Dra. Helena Prado</small>
          </span>
          <span className="lp-mail__t">agora</span>
        </div>
        <div className="lp-mail__row">
          <BrandIcon name="bell" />
          <span className="lp-mail__s">
            Lembrete: sua consulta está chegando
            <small>Quinta, 10:00 · Clínica Vale Verde</small>
          </span>
          <span className="lp-mail__t">qua</span>
        </div>
      </div>
    </div>
  );
}

// ── Platform: console frame shared by the three screens ─────────────────────

type RailItem = "chat" | "calendar" | "sliders";

function ConsoleFrame({ active, children }: { active: RailItem; children: ReactNode }) {
  const items: RailItem[] = ["chat", "calendar", "sliders"];
  return (
    <div className="lp-vig">
      <div className="v-app">
        <div className="v-rail">
          <span className="v-rail__logo">
            <BrandGlyph size={26} />
          </span>
          {items.map((it) => (
            <i key={it} className={it === active ? "on" : undefined}>
              <BrandIcon name={it} />
            </i>
          ))}
        </div>
        <div className="v-main">{children}</div>
      </div>
    </div>
  );
}

type ConvRow = {
  initials: string;
  name: string;
  time: string;
  preview: string;
  state: "wait" | "ia" | "human" | "done";
  label: string;
  on?: boolean;
};

const CONVERSATIONS: ConvRow[] = [
  {
    initials: "CM",
    name: "Carlos Melo",
    time: "10:41",
    preview: "Oi, Carlos! Emitimos sim, é só pedir no balcão.",
    state: "human",
    label: "Respondida",
    on: true,
  },
  {
    initials: "MC",
    name: "Mariana Costa",
    time: "10:36",
    preview: "Pronto! Sua consulta está confirmada para quinta.",
    state: "ia",
    label: "IA conduzindo",
  },
  {
    initials: "FA",
    name: "Fernanda Alves",
    time: "10:29",
    preview: "Vocês atendem aos sábados?",
    state: "wait",
    label: "Aguardando resposta",
  },
  {
    initials: "JL",
    name: "João Pedro Lima",
    time: "10:12",
    preview: "Quero remarcar para a semana que vem.",
    state: "ia",
    label: "IA conduzindo",
  },
  {
    initials: "AR",
    name: "Ana Beatriz Rocha",
    time: "ontem",
    preview: "Obrigada, até lá!",
    state: "done",
    label: "Respondida",
  },
];

export function ConversasFigure() {
  return (
    <figure className="lp-figure">
      <div aria-hidden="true">
        <ConsoleFrame active="chat">
          <div className="v-top">
            <span className="v-top__t">Conversas</span>
            <span className="v-top__sp" />
            <span className="v-chip v-chip--ia v-hide-sm">Automação ativa</span>
          </div>
          <div className="v-conv">
            <div className="v-list">
              <div className="v-filters">
                <span className="on">Todas</span>
                <span>Aguardando</span>
              </div>
              {CONVERSATIONS.map((c) => (
                <div key={c.name} className={"v-item" + (c.on ? " on" : "")}>
                  <span className="v-item__av">{c.initials}</span>
                  <span className="v-item__n">{c.name}</span>
                  <span className="v-item__t">{c.time}</span>
                  <span className="v-item__p">{c.preview}</span>
                  <span className={`v-chip v-chip--${c.state}`}>{c.label}</span>
                </div>
              ))}
            </div>
            <div className="v-thread">
              <div className="v-thread__head">
                <span className="v-item__av">CM</span>
                <span className="v-thread__who">
                  <b>Carlos Melo</b>
                  <small>Chat da clínica</small>
                </span>
                <span className="v-switch">
                  <BrandIcon name="user" />
                  Recepção conduz
                  <span className="v-switch__track" />
                </span>
              </div>
              <div className="v-thread__body">
                <div className="v-msg v-msg--in">
                  Vocês emitem declaração de comparecimento para o trabalho?
                  <span className="v-msg__time">10:38</span>
                </div>
                <div className="v-msg v-msg--out">
                  <span className="v-msg__who">secretarIA</span>
                  Não tenho essa informação por aqui. Quer falar com alguém da recepção?
                  <span className="v-msg__time">10:38</span>
                </div>
                <div className="v-msg v-msg--in">
                  Quero, sim.
                  <span className="v-msg__time">10:39</span>
                </div>
                <span className="v-sys">Júlia, da recepção, assumiu a conversa · 10:41</span>
                <div className="v-msg v-msg--human">
                  <span className="v-msg__who">Júlia · Recepção</span>
                  Oi, Carlos! Emitimos sim, é só pedir no balcão no dia da consulta.
                  <span className="v-msg__time">10:41</span>
                </div>
              </div>
              <div className="v-compose">
                Responder como Júlia…
                <BrandIcon name="send" />
              </div>
            </div>
          </div>
        </ConsoleFrame>
      </div>
      <Caption n={2}>
        Ilustração com dados fictícios da tela Conversas. A secretarIA não tinha a resposta,
        ofereceu falar com a recepção, e a Júlia assumiu a conversa. Enquanto a recepção conduz, a
        IA não responde esse paciente; quando a equipe devolve, ela volta a atender.
      </Caption>
    </figure>
  );
}

// ── Agenda ──────────────────────────────────────────────────────────────────

type Tone = "pending" | "confirm" | "attend" | "miss" | "block";
type Ev = { start: string; slots: number; name: string; detail: string; tone: Tone };

const HOURS = ["08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30"];

function rowOf(time: string): number {
  return HOURS.indexOf(time) + 1;
}

const WEEK: { label: string; day: number; today?: boolean; wide?: boolean; events: Ev[] }[] = [
  {
    label: "Seg",
    day: 19,
    wide: true,
    events: [
      { start: "08:00", slots: 1, name: "Ana B. Rocha", detail: "08:00 · Consulta", tone: "attend" },
      { start: "09:30", slots: 1, name: "Pedro Henrique", detail: "09:30 · Retorno", tone: "miss" },
      { start: "11:00", slots: 2, name: "Lívia Martins", detail: "11:00 · Consulta", tone: "attend" },
    ],
  },
  {
    label: "Ter",
    day: 20,
    events: [
      { start: "08:30", slots: 1, name: "Juliana Ramos", detail: "08:30 · Consulta", tone: "attend" },
      { start: "09:30", slots: 3, name: "Bloqueio", detail: "Congresso", tone: "block" },
      { start: "12:00", slots: 1, name: "Rui Carvalho", detail: "12:00 · Retorno", tone: "attend" },
    ],
  },
  {
    label: "Qua",
    day: 21,
    today: true,
    events: [
      { start: "08:00", slots: 1, name: "Rafaela Lins", detail: "08:00 · Consulta", tone: "attend" },
      { start: "09:00", slots: 1, name: "Lucas Andrade", detail: "09:00 · Consulta", tone: "confirm" },
      { start: "10:30", slots: 2, name: "Beatriz Souza", detail: "10:30 · Consulta", tone: "pending" },
    ],
  },
  {
    label: "Qui",
    day: 22,
    events: [
      { start: "08:30", slots: 1, name: "Paula Ribeiro", detail: "08:30 · Consulta", tone: "confirm" },
      { start: "10:00", slots: 1, name: "Mariana Costa", detail: "10:00 · Consulta", tone: "pending" },
      { start: "11:30", slots: 1, name: "Thiago Moura", detail: "11:30 · Retorno", tone: "confirm" },
    ],
  },
  {
    label: "Sex",
    day: 23,
    wide: true,
    events: [
      { start: "08:00", slots: 2, name: "Bloqueio", detail: "Horário administrativo", tone: "block" },
      { start: "11:00", slots: 1, name: "Fernanda Alves", detail: "11:00 · Consulta", tone: "pending" },
    ],
  },
];

const LEGEND: { tone: Tone; label: string }[] = [
  { tone: "pending", label: "Agendado" },
  { tone: "confirm", label: "Confirmou" },
  { tone: "attend", label: "Compareceu" },
  { tone: "miss", label: "Faltou" },
  { tone: "block", label: "Bloqueio" },
];

// "Now" on the highlighted day: 09:40 → 100 minutes past 08:00, 34px per 30 min.
const NOW_TOP = Math.round((100 / 30) * 34);

export function AgendaFigure() {
  return (
    <figure className="lp-figure">
      <div aria-hidden="true">
        <ConsoleFrame active="calendar">
          <div className="v-top">
            <span className="v-select">
              Dra. Helena Prado
              <Glyph name="chevronDown" />
            </span>
            <span className="v-top__sp" />
            <span className="v-seg v-hide-sm">
              <span>Dia</span>
              <span className="on">Semana</span>
              <span>Mês</span>
            </span>
            <span className="v-btn v-hide-sm">
              <BrandIcon name="ban" />
              Bloquear
            </span>
            <span className="v-btn v-btn--primary">
              <BrandIcon name="plus" />
              Nova consulta
            </span>
          </div>
          <div className="v-cal">
            <span className="v-cal__corner" />
            {WEEK.map((d) => (
              <span
                key={d.label}
                className={"v-cal__dh" + (d.today ? " today" : "") + (d.wide ? " is-wide" : "")}
              >
                {d.label}
                <b>{d.day}</b>
              </span>
            ))}
            <span className="v-cal__hours">
              {HOURS.map((h) => (
                <span key={h}>{h.endsWith(":00") ? h : ""}</span>
              ))}
            </span>
            {WEEK.map((d) => (
              <span
                key={d.label}
                className={"v-cal__day" + (d.today ? " today" : "") + (d.wide ? " is-wide" : "")}
              >
                {d.events.map((ev) => {
                  const style: CSSProperties = {
                    gridRow: `${rowOf(ev.start)} / span ${ev.slots}`,
                  };
                  return (
                    <span key={ev.start} className={`v-ev v-ev--${ev.tone}`} style={style}>
                      <b>{ev.name}</b>
                      <small>{ev.detail}</small>
                    </span>
                  );
                })}
                {d.today && <span className="v-now" style={{ top: NOW_TOP }} />}
              </span>
            ))}
          </div>
          <div className="v-legend">
            {LEGEND.map((l) => (
              <span key={l.tone}>
                <i className={`v-ev--${l.tone}`} />
                {l.label}
              </span>
            ))}
          </div>
        </ConsoleFrame>
      </div>
      <Caption n={3}>
        Ilustração com dados fictícios da tela Agenda, em visão de semana: as consultas marcadas
        pelos pacientes no chat e as criadas pela equipe ficam na mesma agenda da médica, com o
        status de cada uma e os horários bloqueados.
      </Caption>
    </figure>
  );
}

// ── Contexto ────────────────────────────────────────────────────────────────

const CONTEXT_NAV = [
  "Profissionais",
  "Google Agenda",
  "Contexto da clínica",
  "Serviços",
  "Horários",
  "Convênios",
  "Mensagens",
  "Lembretes e avisos",
];

export function ContextoFigure() {
  return (
    <figure className="lp-figure">
      <div aria-hidden="true">
        <ConsoleFrame active="sliders">
          <div className="v-top">
            <span className="v-top__t">Contexto secretarIA</span>
          </div>
          <div className="v-ctx">
            <ul className="v-ctx__nav">
              {CONTEXT_NAV.map((s) => (
                <li key={s} className={s === "Contexto da clínica" ? "on" : undefined}>
                  {s}
                </li>
              ))}
            </ul>
            <div className="v-ctx__panel">
              <span className="v-ctx__h">Contexto da clínica</span>
              <span className="v-ctx__hint">O que a secretarIA usa para responder sobre a clínica.</span>
              <span className="v-field">
                <span className="v-field__l">Endereço</span>
                <span className="v-input">Rua das Acácias, 120, sala 304 · Centro</span>
              </span>
              <span className="v-ctx__grid">
                <span className="v-field">
                  <span className="v-field__l">Formas de pagamento</span>
                  <span className="v-input">Pix, crédito e débito</span>
                </span>
                <span className="v-field">
                  <span className="v-field__l">Estacionamento</span>
                  <span className="v-input">Conveniado, no subsolo</span>
                </span>
              </span>
              <span className="v-field">
                <span className="v-field__l">Convênios aceitos</span>
                <span className="v-pills">
                  <span>Plano Saúde Mais</span>
                  <span>Vida Plena</span>
                  <span>Particular</span>
                  <span className="add">+ Adicionar</span>
                </span>
              </span>
              <span className="v-preview">
                <span className="v-preview__l">Na conversa</span>
                <span className="v-msg v-msg--out">
                  Vocês têm estacionamento?
                </span>
                <span className="v-msg v-msg--in">
                  Temos, sim: estacionamento conveniado no subsolo do prédio, na Rua das Acácias,
                  120.
                </span>
              </span>
            </div>
          </div>
          <div className="v-savebar">
            <span className="v-btn">Descartar</span>
            <span className="v-btn v-btn--primary">Salvar configuração</span>
          </div>
        </ConsoleFrame>
      </div>
      <Caption n={4}>
        Ilustração com dados fictícios da tela Contexto: endereço, formas de pagamento,
        estacionamento e convênios cadastrados pela clínica, e como a secretarIA usa essa
        informação para responder a um paciente.
      </Caption>
    </figure>
  );
}
