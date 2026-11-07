// "/" — the public landing page of the secretarIA product, told as a guided
// demo (TASK-078, 2026-11-05): hero → the secretarIA act (pinned: a slot is
// booked in the clinic chat, lands on the agenda, the e-mail reminder goes out,
// a question is handed to the team) → closing (how it works, what the AI does
// and does not do, conditions, the PreCheck as the sister product,
// security, FAQ, contact). Her mascot (owner, 2026-11-06) is the header logo
// (her face), stands beside "Limites claros", works at the laptop next to the
// contact form and signs the footer.
//
// Until 2026-10-19 "/" was the login form of the old hub; that screen moved,
// unchanged, to /entrar (LOGIN_ROUTE).
//
// A SERVER component on purpose: with `output: "export"` the whole page is in
// the prerendered index.html — copy, figures, FAQ — so it reads (and indexes)
// without JavaScript. The client islands are the header's small-screen menu,
// the contact form, the theme toggle and the demo's motion (smooth scroll, the
// pinned act, the reveals), all of which leave the static HTML complete.
//
// It does NOT look for a session. A signed-in doctor who lands here clicks
// "Entrar" like anyone else.
//
// COPY RULES (the founder's, 2026-10-19 and 2026-11-05). State only what the
// product does today and what the repos confirm: patients talk through the
// clinic's chat link (WhatsApp: "em breve"), the agenda is each doctor's Google
// Agenda, reminders and confirmations go by e-mail, the AI hands over to a
// person and never gives medical advice. No numbers, logos, testimonials,
// certifications, "WhatsApp oficial", encryption-at-rest or data-residency
// claims, and no naming of the model provider. Status (owner, 2026-11-06): the
// secretarIA is READY in the clinic's chat (Portal Brain) — "disponível", not a
// pilot; only WhatsApp is "em breve". app/__tests__/landing-page.test.ts pins the riskiest of these.
// Colour: the secretarIA amber palette (guided-demo.css).

import type { Metadata } from "next";

import { BrandIcon, type IconName } from "@/app/(site)/_components/BrandIcon";
import { ThemeToggle } from "@/app/(site)/_components/ThemeToggle";
import { PLATFORM_LOGIN_HREF, PRIVACY_HREF, SITE_URL, TERMS_HREF } from "@/lib/platform-links";

import { ContactForm } from "./_components/ContactForm";
import { MotionReveal } from "./_components/demo/MotionReveal";
import { ProductPromo } from "./_components/demo/ProductPromo";
import { ScrollCue } from "./_components/demo/ScrollCue";
import { SecretariaDemo } from "./_components/demo/SecretariaDemo";
import { SmoothScroll } from "./_components/demo/SmoothScroll";
import { HeroFigure } from "./_components/Figures";
import { SiteHeader, type SiteNavLink } from "./_components/SiteHeader";
import "./_components/demo/guided-demo.css";

// ── Metadata ────────────────────────────────────────────────────────────────

const TITLE = "secretarIA — secretária virtual para clínicas";
const DESCRIPTION =
  "A secretarIA atende os pacientes da sua clínica pelo chat: tira dúvidas e agenda, remarca e cancela consultas na agenda de cada médico. Sem orientação médica.";
// public/og-secretaria.png — 1200×630. Only advertised when SITE_URL is set:
// link previews ignore a relative og:image, and Next would otherwise resolve it
// against http://localhost:3000.
const OG_IMAGE = "/og-secretaria.png";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  ...(SITE_URL ? { alternates: { canonical: "/" } } : {}),
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "secretarIA",
    title: TITLE,
    description: DESCRIPTION,
    ...(SITE_URL
      ? {
          url: "/",
          images: [
            {
              url: OG_IMAGE,
              width: 1200,
              height: 630,
              alt: "secretarIA — secretária virtual para clínicas, por Brain",
            },
          ],
        }
      : {}),
  },
  twitter: {
    card: SITE_URL ? "summary_large_image" : "summary",
    title: TITLE,
    description: DESCRIPTION,
  },
};

// ── Content ─────────────────────────────────────────────────────────────────

// The PreCheck's public site — the sister product the page recommends.
const PRECHECK_SITE = "https://precheck.com.br/";

const NAV: SiteNavLink[] = [
  { href: "#secretaria", label: "Na prática" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#limites", label: "O que a IA faz" },
  { href: "#seguranca", label: "Segurança" },
  { href: "#perguntas", label: "Perguntas" },
];

const HOW: { title: string; text: string; points: string[] }[] = [
  {
    title: "Link ou QR code",
    text: "A clínica divulga um link ou QR code no site, nas redes sociais ou na recepção. Ele abre direto no navegador do celular ou do computador, sem instalar aplicativo.",
    points: ["Chat da clínica, no navegador", "WhatsApp em breve"],
  },
  {
    title: "A clínica configura",
    text: "A secretarIA responde com base no que a clínica cadastra. Mudou um horário, um serviço ou um convênio? Atualize e é isso que ela passa a usar.",
    points: ["Profissionais e horários de cada um", "Serviços, duração e convênios aceitos"],
  },
  {
    title: "Acompanhamento no portal",
    text: "Médicos e secretárias entram com login próprio e veem as conversas e a agenda de cada médico. Com um clique, alguém da equipe assume e responde direto ao paciente.",
    points: ["Conversas com o estado de cada atendimento", "Agenda em visão de dia, semana ou mês"],
  },
];

const DOES: { strong: string; rest: string }[] = [
  { strong: "Tira dúvidas sobre a clínica", rest: " com as informações que a equipe cadastrou." },
  { strong: "Agenda, remarca e cancela", rest: " consultas na agenda de cada médico." },
  { strong: "Confirma o e-mail do paciente", rest: " com um código antes de marcar." },
  { strong: "Envia confirmação e lembrete", rest: " da consulta por e-mail." },
  {
    strong: "Passa para a equipe",
    rest: " quando o paciente pede para falar com uma pessoa, e oferece essa opção quando não tem a resposta.",
  },
];

const DOES_NOT: { strong: string; rest: string }[] = [
  {
    strong: "Não dá orientação médica.",
    rest: " Não faz diagnóstico, não interpreta exames, não indica remédio e não promete resultado de tratamento. Essa avaliação cabe ao médico, em consulta.",
  },
  {
    strong: "Não vai além do que a clínica cadastrou.",
    rest: " Se a resposta não está lá, ela oferece chamar alguém da equipe.",
  },
  {
    strong: "Não tira a recepção do circuito.",
    rest: " A equipe vê todas as conversas e pode assumir qualquer uma, a qualquer momento.",
  },
];

const SAFETY: { icon: IconName; title: string; text: string }[] = [
  {
    icon: "users",
    title: "Login individual",
    text: "Cada médico e cada secretária entra com o próprio e-mail e senha. O que cada pessoa vê na plataforma depende do papel dela na clínica.",
  },
  {
    icon: "checkCircle",
    title: "Paciente identificado",
    text: "Antes de marcar, o paciente confirma o próprio e-mail com um código enviado para ele.",
  },
  {
    icon: "chat",
    title: "A clínica acompanha tudo",
    text: "Todas as conversas ficam visíveis para a equipe da clínica, que pode assumir o atendimento quando quiser.",
  },
  {
    icon: "shield",
    title: "IA que se apresenta",
    text: "A conversa começa avisando que o paciente fala com um assistente virtual e que ali não se dá orientação médica.",
  },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "O paciente precisa instalar algum aplicativo?",
    a: (
      <p>
        Não. A clínica divulga um link (ou um QR code) e a conversa abre direto no navegador, no
        celular ou no computador.
      </p>
    ),
  },
  {
    q: "Funciona no WhatsApp?",
    a: (
      <p>
        Ainda não. Hoje o atendimento acontece no chat da clínica, pelo link. O WhatsApp está em
        preparação e chega em breve.
      </p>
    ),
  },
  {
    q: "Com qual agenda a secretarIA trabalha?",
    a: (
      <p>
        Hoje, com o Google Agenda de cada médico. As consultas marcadas pelos pacientes na
        conversa e as criadas pela equipe na plataforma aparecem na mesma agenda.
      </p>
    ),
  },
  {
    q: "A secretarIA dá orientação médica?",
    a: (
      <>
        <p>
          Não. A conversa já começa avisando que ali não se dá orientação médica. Se o paciente
          pergunta sobre a própria saúde, ela explica que essa avaliação cabe ao profissional, em
          consulta, e ajuda a marcar.
        </p>
        <p>Em caso de emergência, ela orienta procurar o pronto-socorro mais próximo ou ligar 192.</p>
      </>
    ),
  },
  {
    q: "E quando ela não sabe responder?",
    a: (
      <p>
        Ela oferece ao paciente falar com alguém da equipe. Se ele aceitar, ou se pedir uma pessoa
        a qualquer momento, alguém da clínica assume a conversa na tela Conversas e responde
        direto. Depois, a equipe pode devolver o atendimento para a secretarIA.
      </p>
    ),
  },
  {
    q: "Quem da clínica tem acesso à plataforma?",
    a: (
      <p>
        Cada médico e cada secretária recebe um login próprio. O acesso a cada área (Conversas,
        Agenda, Contexto) depende do papel da pessoa na clínica.
      </p>
    ),
  },
  {
    q: "Para qual tipo de clínica a secretarIA faz sentido?",
    a: (
      <p>
        Ela foi pensada para clínicas com dois ou mais médicos, em que a recepção passa boa parte
        do dia respondendo as mesmas perguntas e encaixando horários em várias agendas.
      </p>
    ),
  },
  {
    q: "Quanto custa?",
    a: (
      <p>
        As condições são combinadas diretamente com a equipe, conforme o tamanho da clínica. <a className="lp-link" href="#contato">Fale com a gente</a>.
      </p>
    ),
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="lp gd-page gd-site--secretaria">
      <a className="lp-skip" href="#conteudo">
        Pular para o conteúdo
      </a>
      <SmoothScroll />

      <SiteHeader links={NAV} platformHref={PLATFORM_LOGIN_HREF} />

      <main id="conteudo" tabIndex={-1}>
        {/* ── Ato 1 — Hero ── */}
        <section className="lp-hero" aria-labelledby="hero-title">
          <div className="lp-wrap lp-hero__grid">
            <div className="lp-hero__copy">
              <p className="lp-kicker lp-rise lp-rise--1">Secretária virtual para clínicas</p>
              <h1 id="hero-title" className="lp-display lp-rise lp-rise--2">
                Seus pacientes agendam conversando. <em>Sua equipe acompanha cada passo.</em>
              </h1>
              <p className="lp-lead lp-rise lp-rise--3">
                A secretarIA tira dúvidas com as informações da sua clínica, marca, remarca e
                cancela consultas na agenda de cada médico e envia confirmação e lembrete por{" "}
                <span className="lp-nw">e-mail</span>. Quando não tem a resposta, oferece passar a conversa para alguém da equipe.
              </p>
              <div className="lp-hero__cta lp-rise lp-rise--4">
                <a href="#contato" className="btn btn--primary btn--lg btn--icon-r">
                  Agendar demonstração
                  <BrandIcon name="arrowR" />
                </a>
                <a className="gd-cue" href="#secretaria">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 5v14M6 13l6 6 6-6" />
                  </svg>
                  Veja na prática
                </a>
              </div>
              <p className="lp-hero__status lp-rise lp-rise--4">Disponível no chat da clínica. WhatsApp em breve.</p>

              <ul className="lp-facts lp-rise lp-rise--5" aria-label="Como a secretarIA funciona hoje">
                <li>
                  <span className="k">Canal</span>
                  <p className="v">Chat da clínica, no navegador</p>
                  <span className="lp-soon">WhatsApp em breve</span>
                </li>
                <li>
                  <span className="k">Agenda</span>
                  <p className="v">Google Agenda de cada médico</p>
                </li>
                <li>
                  <span className="k">Avisos</span>
                  <p className="v">Confirmação e lembrete por e-mail</p>
                </li>
              </ul>
            </div>

            <div className="lp-rise lp-rise--3">
              <HeroFigure />
            </div>
          </div>
          <ScrollCue to="secretaria" />
        </section>

        {/* ── Ato 2 — a secretarIA na prática (fixado) ── */}
        <SecretariaDemo
          cta={
            <a href="#contato" className="btn btn--primary btn--lg btn--icon-r">
              Quero a secretarIA na clínica
              <BrandIcon name="arrowR" />
            </a>
          }
        />

        {/* ── Ato 3 — Fechamento ── */}
        <section id="como-funciona" className="gd-how" aria-labelledby="como-title">
          <div className="gd-wrap">
            <MotionReveal className="gd-how__head">
              <p className="lp-label">Como funciona</p>
              <h2 id="como-title" className="gd-h2">
                Três passos para a sua clínica <em>começar</em>.
              </h2>
            </MotionReveal>
            <ol className="gd-how__grid" style={{ listStyle: "none", padding: 0 }}>
              {HOW.map((step, i) => (
                <li key={step.title}>
                  <MotionReveal delay={i} className="gd-how__card gd-tone--sa">
                    <span className="gd-how__n" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{step.title}</h3>
                    <p className="gd-how__text">{step.text}</p>
                    <ul>
                      {step.points.map((p) => (
                        <li key={p}>
                          <span className="gd-chip gd-tone--sa">{p}</span>
                        </li>
                      ))}
                    </ul>
                  </MotionReveal>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ── O que a IA faz / não faz ── */}
        <section id="limites" className="lp-section" aria-labelledby="limites-title">
          <div className="lp-wrap">
            <div className="lp-limits__top">
              <MotionReveal className="lp-head">
                <p className="lp-label">Limites claros</p>
                <h2 id="limites-title" className="lp-h2" style={{ marginTop: 18 }}>
                  Uma secretária, <em>não uma médica.</em>
                </h2>
                <p className="lp-lead">
                  A secretarIA cuida do atendimento e da agenda. Tudo o que é decisão clínica continua
                  com o médico, e tudo o que ela não sabe vai para a equipe.
                </p>
              </MotionReveal>
              {/* her mascot, standing — decorative: the heading carries the message */}
              <img
                className="lp-mascot lp-mascot--limits"
                src="/brand/mascots/secretaria-standing.webp"
                width={560}
                height={1050}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>

            <div className="lp-ledger">
              <MotionReveal className="lp-ledger__col">
                <h3 className="lp-h3">
                  <span className="mark mark--yes" aria-hidden="true">
                    <BrandIcon name="check" />
                  </span>
                  O que ela faz
                </h3>
                <ul>
                  {DOES.map((d) => (
                    <li key={d.strong}>
                      <strong>{d.strong}</strong>
                      {d.rest}
                    </li>
                  ))}
                </ul>
              </MotionReveal>
              <MotionReveal delay={1} className="lp-ledger__col">
                <h3 className="lp-h3">
                  <span className="mark mark--no" aria-hidden="true">
                    <BrandIcon name="x" />
                  </span>
                  O que ela não faz
                </h3>
                <ul>
                  {DOES_NOT.map((d) => (
                    <li key={d.strong}>
                      <strong>{d.strong}</strong>
                      {d.rest}
                    </li>
                  ))}
                </ul>
              </MotionReveal>
            </div>

            <div className="lp-sos">
              <span className="lp-sos__ico" aria-hidden="true">
                <BrandIcon name="phone" />
              </span>
              <p>
                <strong>Em caso de emergência</strong>, a secretarIA não tenta resolver: orienta o
                paciente a procurar o pronto-socorro mais próximo ou ligar <strong>192</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* ── Condições (no price list: conditions are agreed with the team) ── */}
        <section id="condicoes" className="gd-buy" aria-labelledby="condicoes-title">
          <div className="gd-wrap">
            <MotionReveal className="gd-buy__box gd-tone--sa">
              <div>
                <p className="lp-label">Condições</p>
                <h2 id="condicoes-title" className="gd-h2">
                  Pronta para atender <em>a sua clínica.</em>
                </h2>
                <p className="gd-buy__text">
                  As condições são combinadas diretamente com a equipe. Ela foi pensada para
                  clínicas com dois ou mais médicos.
                </p>
              </div>
              <a href="#contato" className="btn btn--primary btn--lg btn--icon-r">
                Quero a secretarIA na clínica
                <BrandIcon name="arrowR" />
              </a>
            </MotionReveal>
          </div>
        </section>

        {/* ── PreCheck — the sister product, linked to its own site (owner,
            2026-11-06). No WhatsApp mention here on purpose: on this page
            WhatsApp is named only as "em breve" (the secretarIA's channel). ── */}
        <ProductPromo
          id="precheck"
          tone="pc"
          product="PreCheck"
          state="em uso"
          title={
            <>
              O PreCheck prepara a consulta <em>antes do paciente chegar.</em>
            </>
          }
          text="Antes da consulta, o PreCheck conversa com o paciente: primeiro as perguntas padrão do tipo de atendimento, depois perguntas sob medida para a queixa dele. O médico recebe um resumo organizado. Quem avalia e decide é o médico."
          points={[
            "Perguntas padrão definidas pelo médico",
            "Perguntas aprofundadas para cada queixa",
            "Resumo com os sinais de alarme em destaque",
          ]}
          art={{
            src: "/brand/mascots/precheck-tablet.webp",
            width: 720,
            height: 654,
            alt: "Mascote do PreCheck segurando um tablet com o resumo do paciente",
          }}
          cta={
            <a href={PRECHECK_SITE} className="btn btn--primary btn--lg btn--icon-r">
              Conhecer o PreCheck
              <BrandIcon name="arrowR" />
            </a>
          }
        />

        {/* ── Segurança e LGPD — unchanged ── */}
        <section id="seguranca" className="lp-section lp-safe" aria-labelledby="seguranca-title">
          <div className="lp-wrap lp-safe__grid">
            <div className="lp-head">
              <p className="lp-label">Segurança e LGPD</p>
              <h2 id="seguranca-title" className="lp-h2" style={{ marginTop: 18 }}>
                Dados de pacientes <em>pedem cuidado.</em>
              </h2>
              <p className="lp-lead">
                A secretarIA conversa com pacientes, então privacidade faz parte do produto. Como os
                dados são tratados está explicado nos documentos abaixo.
              </p>
              <div className="lp-docs">
                <a className="btn btn--outline btn--sm" href={PRIVACY_HREF}>
                  Política de Privacidade
                </a>
                <a className="btn btn--outline btn--sm" href={TERMS_HREF}>
                  Termos de Uso
                </a>
              </div>
            </div>
            <ul className="lp-safe__items">
              {SAFETY.map((s) => (
                <li key={s.title}>
                  <span className="ico" aria-hidden="true">
                    <BrandIcon name={s.icon} />
                  </span>
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ── Perguntas frequentes ── */}
        <section id="perguntas" className="lp-section" aria-labelledby="perguntas-title">
          <div className="lp-wrap lp-faq__grid">
            <div className="lp-head">
              <p className="lp-label">Perguntas frequentes</p>
              <h2 id="perguntas-title" className="lp-h2" style={{ marginTop: 18 }}>
                O que as clínicas <em>costumam perguntar.</em>
              </h2>
            </div>
            <div className="lp-faq">
              {/* The first answer starts open, so the list reads as answers rather
                  than as a wall of toggles. */}
              {FAQ.map((f, i) => (
                <details key={f.q} open={i === 0}>
                  <summary>
                    {f.q}
                    <span className="ico" aria-hidden="true">
                      <BrandIcon name="plus" />
                    </span>
                  </summary>
                  <div className="lp-faq__a">{f.a}</div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Contato — the closing CTA ── */}
        <section id="contato" className="lp-section lp-section--ruled" aria-labelledby="contato-title">
          <div className="lp-wrap lp-contact">
            <div className="lp-contact__copy">
              <p className="lp-label">Agendar demonstração</p>
              <h2 id="contato-title" className="lp-h2" style={{ marginTop: 18 }}>
                Quer a secretarIA <em>na sua clínica?</em>
              </h2>
              <p className="lp-body">
                Conte um pouco sobre a sua clínica e a equipe
                responde pelo <span className="lp-nw">e-mail</span> informado.
              </p>
              <ul className="lp-contact__list">
                <li>
                  <BrandIcon name="users" />
                  Pensada para clínicas com dois ou mais médicos
                </li>
                <li>
                  <BrandIcon name="calendar" />
                  Funciona com o Google Agenda de cada médico
                </li>
                <li>
                  <BrandIcon name="chat" />
                  Atendimento pelo chat da clínica, sem aplicativo
                </li>
              </ul>
              <p className="lp-body" style={{ marginTop: 26, fontSize: 14.5 }}>
                Já usa a secretarIA?{" "}
                <a className="lp-link" href={PLATFORM_LOGIN_HREF}>
                  Entrar na plataforma
                </a>
              </p>
              {/* her mascot at work (laptop + agenda) — decorative */}
              <img
                className="lp-mascot lp-mascot--contact"
                src="/brand/mascots/secretaria-laptop.webp"
                width={600}
                height={813}
                alt=""
                loading="lazy"
                decoding="async"
              />
            </div>
            <ContactForm />
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-wrap">
          <div className="lp-footer__grid">
            <div className="lp-footer__brand">
              <span className="lp-brand" aria-hidden="true">
                <img className="lp-brand__face" src="/brand/mascots/secretaria-head.webp" width={27} height={30} alt="" />
                <span className="lp-brand__word">
                  secretar<em>IA</em>
                </span>
              </span>
              <p className="lp-footer__tag">
                A secretária virtual da clínica: atende pacientes pelo chat e cuida da agenda de cada
                médico. Um produto Brain.
              </p>
            </div>
            <nav aria-labelledby="ft-produto">
              <h2 id="ft-produto">Produto</h2>
              <ul>
                <li>
                  <a href="#secretaria">Na prática</a>
                </li>
                <li>
                  <a href="#como-funciona">Como funciona</a>
                </li>
                <li>
                  <a href="#limites">O que a IA faz</a>
                </li>
                <li>
                  <a href="#perguntas">Perguntas frequentes</a>
                </li>
              </ul>
            </nav>
            <nav aria-labelledby="ft-clinicas">
              <h2 id="ft-clinicas">Clínicas</h2>
              <ul>
                <li>
                  <a href={PLATFORM_LOGIN_HREF}>Entrar na plataforma</a>
                </li>
                <li>
                  <a href="#contato">Falar com a equipe</a>
                </li>
              </ul>
            </nav>
            <nav aria-labelledby="ft-legal">
              <h2 id="ft-legal">Legal</h2>
              <ul>
                <li>
                  <a href={TERMS_HREF}>Termos de Uso</a>
                </li>
                <li>
                  <a href={PRIVACY_HREF}>Política de Privacidade</a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="lp-footer__bottom">
            <span>© {year} Brain. secretarIA é um produto Brain.</span>
            <ThemeToggle />
          </div>
        </div>
      </footer>
    </div>
  );
}
