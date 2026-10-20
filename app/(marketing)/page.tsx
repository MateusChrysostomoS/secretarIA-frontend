// "/" — the public landing page of the secretarIA product.
//
// Until 2026-10-19 "/" was the login form of the old hub; that screen moved,
// unchanged, to /entrar (LOGIN_ROUTE). This page replaces it as the front door.
//
// A SERVER component on purpose: with `output: "export"` the whole page is in
// the prerendered index.html — copy, figures, FAQ — so it reads (and indexes)
// without JavaScript. The only client islands are the header's small-screen
// menu, the contact form and the theme toggle.
//
// It does NOT look for a session. A signed-in doctor who lands here clicks
// "Entrar" like anyone else; probing the refresh cookie on every public visit
// would cost a POST /api/auth/refresh per stranger for no visible gain.
//
// COPY RULES (the founder's, 2026-10-19). State only what the product does
// today and what the repos confirm: patients talk through the clinic's chat link
// (WhatsApp: "em breve"), the agenda is each doctor's Google Agenda, reminders
// and confirmations go by e-mail, the AI hands over to a person and never gives
// medical advice. No numbers, logos, testimonials, certifications, "WhatsApp
// oficial", encryption-at-rest or data-residency claims, and no naming of the
// model provider. app/__tests__/landing-page.test.ts pins the riskiest of these.

import type { Metadata } from "next";

import { BrandGlyph } from "@/app/(site)/_components/BrandGlyph";
import { BrandIcon, type IconName } from "@/app/(site)/_components/BrandIcon";
import { ThemeToggle } from "@/app/(site)/_components/ThemeToggle";
import { PLATFORM_LOGIN_HREF, PRIVACY_HREF, SITE_URL, TERMS_HREF } from "@/lib/platform-links";

import { ContactForm } from "./_components/ContactForm";
import {
  AgendaFigure,
  ContextoFigure,
  ConversasFigure,
  HeroFigure,
  StepAskArt,
  StepCodeArt,
  StepLinkArt,
  StepMailArt,
  StepPickArt,
} from "./_components/Figures";
import { SiteHeader, type SiteNavLink } from "./_components/SiteHeader";

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

const NAV: SiteNavLink[] = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#plataforma", label: "Plataforma" },
  { href: "#limites", label: "O que a IA faz" },
  { href: "#seguranca", label: "Segurança" },
  { href: "#perguntas", label: "Perguntas" },
];

const STEPS: { title: string; text: string; art: () => React.ReactElement }[] = [
  {
    title: "Abre o link da clínica",
    text: "A clínica divulga um link ou QR code no site, nas redes sociais ou na recepção. Ele abre direto no navegador do celular ou do computador, sem instalar aplicativo.",
    art: StepLinkArt,
  },
  {
    title: "Conversa com a secretarIA",
    text: "O paciente pergunta do jeito dele. A secretarIA responde com o que a clínica cadastrou: endereço, horários, serviços e preparo.",
    art: StepAskArt,
  },
  {
    title: "Escolhe médico, dia e horário",
    text: "Ela mostra os horários livres na agenda de cada profissional. Também é na conversa que o paciente remarca ou cancela, quando precisar.",
    art: StepPickArt,
  },
  {
    title: "Confirma com um código no e-mail",
    text: "Antes de marcar, o paciente recebe um código no e-mail e digita na conversa. É assim que a clínica sabe com quem está falando.",
    art: StepCodeArt,
  },
  {
    title: "Recebe a confirmação e o lembrete",
    text: "A confirmação chega por e-mail, e um lembrete antes da consulta. Na agenda da clínica, a marcação já aparece para a equipe.",
    art: StepMailArt,
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
        A secretarIA está em piloto com as primeiras clínicas, e as condições são combinadas
        diretamente com a equipe. <a className="lp-link" href="#contato">Fale com a gente</a>.
      </p>
    ),
  },
];

// ── Page ────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const year = new Date().getFullYear();

  return (
    <div className="lp">
      <a className="lp-skip" href="#conteudo">
        Pular para o conteúdo
      </a>

      <SiteHeader links={NAV} platformHref={PLATFORM_LOGIN_HREF} />

      <main id="conteudo" tabIndex={-1}>
        {/* ── Hero ── */}
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
                  Falar com a equipe
                  <BrandIcon name="arrowR" />
                </a>
                <a href="#como-funciona" className="btn btn--outline btn--lg">
                  Ver como funciona
                </a>
              </div>
              <p className="lp-hero__status lp-rise lp-rise--4">Em piloto com as primeiras clínicas.</p>

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
        </section>

        {/* ── Como funciona (paciente) ── */}
        <section id="como-funciona" className="lp-section lp-section--ruled" aria-labelledby="como-title">
          <div className="lp-wrap lp-how">
            <div className="lp-how__aside">
              <p className="lp-label">
                Para o paciente
              </p>
              <h2 id="como-title" className="lp-h2" style={{ marginTop: 18 }}>
                Da primeira pergunta à <em>consulta marcada</em>, numa conversa só.
              </h2>
              <p className="lp-body">
                Sem precisar ligar e esperar alguém da recepção ficar livre. O paciente resolve no
                tempo dele, e a clínica recebe a marcação pronta.
              </p>
              <p className="lp-note">
                <strong>Hoje, o atendimento é pelo chat da clínica.</strong> O WhatsApp está em
                preparação e chega em breve.
              </p>
            </div>

            <ol className="lp-steps">
              {STEPS.map((s, i) => {
                const Art = s.art;
                return (
                  <li key={s.title} className="lp-step">
                    <span className="lp-step__n lp-num" aria-hidden="true">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <h3>{s.title}</h3>
                    <p>{s.text}</p>
                    <Art />
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* ── Plataforma da clínica ── */}
        <section id="plataforma" className="lp-section lp-band band-dark" aria-labelledby="plataforma-title">
          <div className="lp-wrap">
            <div className="lp-platform__intro">
              <div className="lp-head">
                <p className="lp-label">
                  Para a clínica
                </p>
                <h2 id="plataforma-title" className="lp-h2" style={{ marginTop: 18 }}>
                  Tudo o que a secretarIA faz, <em>a sua equipe vê e pode assumir.</em>
                </h2>
              </div>
              <div>
                <p className="lp-lead">
                  Médicos e secretárias entram na plataforma da clínica com login próprio. Lá estão
                  as conversas com os pacientes, a agenda de cada médico e tudo o que a IA sabe
                  sobre a clínica.
                </p>
                <ul className="lp-roles" aria-label="Quem usa a plataforma">
                  <li>
                    <BrandIcon name="user" />
                    Médicos
                  </li>
                  <li>
                    <BrandIcon name="users" />
                    Secretárias e recepção
                  </li>
                  <li>
                    <BrandIcon name="sliders" />
                    Gestão da clínica
                  </li>
                </ul>
              </div>
            </div>

            <div className="lp-feature">
              <div className="lp-feature__copy">
                <p className="lp-label">Conversas</p>
                <h3 className="lp-h3">
                  Toda conversa à vista. <em>Assuma quando quiser.</em>
                </h3>
                <p className="lp-body">
                  Cada conversa aparece com o estado do atendimento. Com um clique, alguém da equipe
                  assume e responde direto ao paciente; quando terminar, devolve para a secretarIA.
                </p>
                <ul className="lp-ticks">
                  <li>
                    <BrandIcon name="check" />
                    Estados claros: aguardando resposta, IA conduzindo, respondida
                  </li>
                  <li>
                    <BrandIcon name="check" />
                    Filtro para ver só quem está esperando resposta
                  </li>
                  <li>
                    <BrandIcon name="check" />
                    Enquanto a equipe conduz, a IA não responde aquele paciente
                  </li>
                </ul>
              </div>
              <ConversasFigure />
            </div>

            <div className="lp-feature lp-feature--flip">
              <div className="lp-feature__copy">
                <p className="lp-label">Agenda</p>
                <h3 className="lp-h3">
                  A agenda de cada médico, <em>com todas as marcações.</em>
                </h3>
                <p className="lp-body">
                  O que o paciente marcou na conversa e o que a equipe marcou na plataforma ficam na
                  mesma agenda, em visão de dia, semana ou mês.
                </p>
                <ul className="lp-ticks">
                  <li>
                    <BrandIcon name="check" />
                    Nova consulta e bloqueio de horário pela equipe
                  </li>
                  <li>
                    <BrandIcon name="check" />
                    Remarcar e cancelar, com aviso ao paciente no cancelamento
                  </li>
                  <li>
                    <BrandIcon name="check" />
                    Status de cada consulta: agendado, confirmou, compareceu, faltou
                  </li>
                </ul>
              </div>
              <AgendaFigure />
            </div>

            <div className="lp-feature">
              <div className="lp-feature__copy">
                <p className="lp-label">Contexto</p>
                <h3 className="lp-h3">
                  Você decide <em>o que a IA sabe.</em>
                </h3>
                <p className="lp-body">
                  A secretarIA responde com base no que a clínica cadastra aqui. Mudou um horário,
                  um serviço ou um convênio? Atualize e é isso que ela passa a usar.
                </p>
                <ul className="lp-ticks">
                  <li>
                    <BrandIcon name="check" />
                    Profissionais e os horários de atendimento de cada um
                  </li>
                  <li>
                    <BrandIcon name="check" />
                    Serviços, duração e convênios aceitos
                  </li>
                  <li>
                    <BrandIcon name="check" />
                    Informações da clínica, mensagens e lembretes
                  </li>
                </ul>
              </div>
              <ContextoFigure />
            </div>
          </div>
        </section>

        {/* ── O que a IA faz / não faz ── */}
        <section id="limites" className="lp-section" aria-labelledby="limites-title">
          <div className="lp-wrap">
            <div className="lp-head">
              <p className="lp-label">
                Limites claros
              </p>
              <h2 id="limites-title" className="lp-h2" style={{ marginTop: 18 }}>
                Uma secretária, <em>não uma médica.</em>
              </h2>
              <p className="lp-lead">
                A secretarIA cuida do atendimento e da agenda. Tudo o que é decisão clínica continua
                com o médico, e tudo o que ela não sabe vai para a equipe.
              </p>
            </div>

            <div className="lp-ledger">
              <div className="lp-ledger__col">
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
              </div>
              <div className="lp-ledger__col">
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
              </div>
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

        {/* ── Segurança e LGPD ── */}
        <section id="seguranca" className="lp-section lp-safe" aria-labelledby="seguranca-title">
          <div className="lp-wrap lp-safe__grid">
            <div className="lp-head">
              <p className="lp-label">
                Segurança e LGPD
              </p>
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
              <p className="lp-label">
                Perguntas frequentes
              </p>
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

        {/* ── Contato ── */}
        <section id="contato" className="lp-section lp-section--ruled" aria-labelledby="contato-title">
          <div className="lp-wrap lp-contact">
            <div className="lp-contact__copy">
              <p className="lp-label">
                Contato
              </p>
              <h2 id="contato-title" className="lp-h2" style={{ marginTop: 18 }}>
                Quer a secretarIA <em>na sua clínica?</em>
              </h2>
              <p className="lp-body">
                Estamos em piloto com as primeiras clínicas. Conte um pouco sobre a sua e a equipe
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
                <BrandGlyph size={26} />
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
                  <a href="#como-funciona">Como funciona</a>
                </li>
                <li>
                  <a href="#plataforma">Plataforma da clínica</a>
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
