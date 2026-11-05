# CHECKPOINT — Landing como demonstração guiada (TASK-078, 2026-11-05)

Estado: **commitado na branch `task/TASK-078-landing-demo`, não mesclado em `main`, sem push, sem deploy.**
Mesmo módulo em `brain-frontend` e `PreCheck/frontend`; registro cross-repo em
`BRAIN/tasks/TASK-078/TASK.md`; detalhes técnicos do módulo em
`brain-frontend/docs/CHECKPOINT_landing_demo_guiada.md`.

## O que mudou em "/"

- **Hero:** mesmo título e o mesmo "Em piloto" e "WhatsApp em breve". O CTA principal virou
  "Agendar demonstração"; o segundo botão virou um link discreto "Veja na prática".
- **Ato secretarIA (fixado):** pedido de horário no chat da clínica, horários livres, código por
  e-mail, a consulta entra na agenda da semana, lembrete por e-mail e passagem para a equipe.
  CTA: Quero participar do piloto.
- **Fechamento:** como funciona (3 passos), "O que ela faz / não faz" com a regra do 192,
  condições do piloto (sem preço, como antes), segurança e LGPD (inalterada), perguntas e contato.
- **Saíram** a seção de 5 passos e a seção "Plataforma" (Conversas, Agenda, Contexto): o ato
  fixado e o "como funciona" contam isso agora. As figuras de `Figures.tsx` continuam no arquivo;
  só a `HeroFigure` segue em uso.
- **Identidade âmbar** (pedido do dono): fundo #f6ead2 / #352b12, texto #946420 / #e0b45a, borda
  #e2c993 / #534219. `--brand` e os tokens das figuras (`--v-brand*`) são reapontados só nesta
  página; texto pequeno em âmbar usa #845a1c (contraste 4,5:1+).

As regras de texto de `app/__tests__/landing-page.test.ts` continuam valendo e passam (623/623).

## Onde está

`app/(marketing)/_components/demo/` (`PinnedAct`, `SecretariaDemo`, `SmoothScroll`, `MotionReveal`,
`guided-demo.css`). Sem JS ou com "reduzir movimento", o ato aparece completo e estático.

## Validação (2026-11-05)

- `tsc --noEmit` ok, `npm test` 623/623, `next build` ok (JS de "/" na abertura 9,3 kB).
- Playwright em 1440 e 390, claro e escuro: ato fixa, sem rolagem lateral, sem erro.
- Lighthouse (servidor local sem gzip): computador 96/100/100/100; celular 67/100/100/100.
  A versão anterior marcava 65 no celular.

## Pendências

Mesclar em `main`, rodar `graphify update .`, deploy só com autorização do dono.
