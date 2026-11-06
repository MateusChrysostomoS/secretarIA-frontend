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

## Rodada 2 (2026-11-06) — responsividade e conversas com a cara do Portal

Pedido do dono, a partir de prints numa tela de 1920×1080 com Windows em 125% (a página vê
~1536×729 em pixels CSS):

- **Botão do ato cortado:** a coluna de texto e a cena dos atos fixados agora medem pela ALTURA da
  tela também (título, passos e frase de valor em `clamp(... vh ...)`; a grade do ato tem uma linha
  `minmax(0, 1fr)` e a cena `min-height: 0`, então o celular/agenda encolhem em vez de passar da borda).
  Medido com Playwright: botão e cena dentro da tela em 1536×729, 1366×657, 1280×600, 1440×900 e
  1920×911. Em telas muito baixas (≤620 px) só o passo atual fica na lista.
- **Conversas iguais ao produto:** `ChatParts.tsx` desenha as bolhas como o Portal do paciente
  (Brain-Message-Frontend `MessageBubble`/`ReplyButtons`, lado do paciente): produto à esquerda com a
  marca e o brilho, botões dentro da bolha (o escolhido fica verde com ✓), "Opção escolhida" na
  resposta, hora e ✓✓ no canto, pessoa da clínica em verde ("Maria · recepção"). Os roteiros seguem o
  fluxo real (PreCheck: "✅ Concordo", Sim/Não/Voltar; secretarIA: "O que você precisa?" → "🗓️ Agendar",
  horários como botões, código mascarado "••••••"). Conteúdo continua fictício. Cores das bolhas = cores
  de produto dos sites (PreCheck azul, secretarIA âmbar, equipe verde), não o teal/amarelo do Portal.
- **Celular:** durante o ato, a barra de digitar e a barra de endereço somem para a conversa ter espaço;
  no resumo, as linhas secundárias saem para "Quem avalia e decide é o médico" aparecer sempre.
  Sem JavaScript ou com "reduzir movimento", tudo continua visível e estático.- **Hero da secretarIA:** o chat do topo usa as mesmas bolhas, e o conjunto chat + cartão da agenda
  fica dentro da primeira tela (palco limitado à altura visível; mensagens antigas saem por cima).

## Rodada 3 (2026-11-06) — roteiros reais e seta para baixo

- **PreCheck em 4 etapas, como o produto funciona:** termos (LGPD) com "✅ Concordo" → perguntas padrão
  do fluxo, iguais para todos (primeira consulta, idade, remédio de uso diário, motivo da consulta) →
  perguntas aprofundadas que a IA escreve para a queixa daquele paciente → resumo para o médico (linhas
  "Queixa principal", "Aprofundamento", "Perguntas padrão"). O passo antigo "conta o motivo com as
  próprias palavras" saiu da lista (o motivo é uma das perguntas padrão). Fonte: `docs/flow_adulto_v1.json`
  e o simulador do `/comecar` do PreCheck ("aprofundaria sua queixa com perguntas geradas por IA").
  O "Como funciona" passou a dizer o mesmo.
- **secretarIA em dois celulares:** à esquerda, paciente novo na ordem real do primeiro contato no Portal
  (e-mail → nome → termos LGPD "✅ Concordo / ✏️ Mudar nome" → "O que você precisa?" "🗓️ Agendar" →
  "Essa consulta é pra você? 😊" "✅ Sim, é pra mim" → horários → código → marcado, com aviso "Na Google
  Agenda"). Convênio e profissional, que o fluxo real pergunta, foram pulados na demonstração. À direita,
  paciente que já é da clínica: endereço, a própria consulta e a anterior (histórico), o que levar; a
  pergunta de saúde não é respondida — vai para a equipe e a Maria assume. No celular, o segundo cobre o
  primeiro quando a história dele começa. A semana da agenda saiu do ato (ficou o aviso).
- **Seta "Role para ver"** no pé do topo dos três sites (`ScrollCue.tsx`); no computador fica no fim da
  primeira tela, mesmo quando o topo é um pouco mais alto que a tela.
- Sem JavaScript / reduzir movimento: conversas longas rolam dentro do celular; nada escondido.
- Validação: tsc, vitest (295 / 623 / 20) e build verdes; Playwright em 1536×729, 1366×657, 1280×600,
  1440×900 e 390×664 (botão e cena dentro da tela), reduzir movimento sem nada oculto.
- Afirmações novas a pedido do dono: a secretarIA responde endereço, preparo e a consulta atual/anterior do
  paciente. Dados (endereço, datas) são fictícios.

- **Movimento mais suave (rodada 3b):** as mensagens não animam mais a altura (o que recalculava a conversa
  inteira a cada quadro e dava solavancos). A conversa fica num trilho que desliza para cima (só
  `transform`), e cada bolha surge com fade + leve subida. Rolagem com `scrub: 1`.
- **Ainda mais suave (rodada 3c):** roda do mouse amortecida (Lenis `lerp` 0.075, passo 0.8), animação
  segue a rolagem com `scrub: 1.4`, trilho com `sine.inOut` (1.2) e bolhas em 1.1, e mais rolagem por
  mensagem (PreCheck 22, secretarIA 20 / 18 no site do PreCheck). Medido com a roda: no máximo ~10 px por
  quadro, mediana ~1 px.

- **Rodada 4 (2026-11-06) — mascotes e cabeçalho:** o site do PreCheck não tem mais o ato fixado da
  secretarIA; no lugar, uma seção curta e estática ("Da mesma empresa · secretarIA", em piloto, WhatsApp em
  breve) com a mascote do celular e o botão "Conhecer a secretarIA" → https://secretariabrainai.com.br/.
  O site da secretarIA ganhou a seção espelho para o PreCheck (mascote azul do tablet, "Conhecer o
  PreCheck" → https://precheck.com.br/, sem citar WhatsApp nessa seção). Componente compartilhado
  `ProductPromo` (sincronizado de brain-frontend; o botão usa a cor do OUTRO produto). Cabeçalho da
  secretarIA no padrão do PreCheck: "Brain │ [rosto] secretarIA" (no celular saem a palavra Brain e o
  traço). Rosto dela também no cabeçalho das conversas simuladas, na linha do ato da secretarIA (Brain e
  secretarIA) e no rodapé do site da secretarIA; mascote em pé ao lado de "Limites claros" e no notebook
  ao lado do formulário. Imagens em `public/brand/mascots/` (WebP recortado, gerado dos PNG do dono).
  Validação: tsc, vitest (295 / 623 / 20) e build verdes; Playwright claro/escuro, 1366×768 e 390×760;
  atos fixados continuam cabendo em 1366×657, 1280×600 e 390×664.

- **Rodada 5 (2026-11-06) — Agendar completo:** o celular do paciente novo agora mostra o fluxo inteiro do
  Agendar, com os textos e botões reais da secretarIA (lidos no código em 2026-11-06): convênio
  ("Particular"), profissional (linha com a especialidade), serviço + cartão de preço, dia, horário,
  resumo com "✅ Confirmar", código do e-mail, CPF (mascarado), Pix do sinal (no modo da clínica que cobra
  antes de confirmar) e "Pagamento recebido! Seu agendamento está confirmado. ✅". O sinal é opção da
  clínica (desligado por padrão); a etapa na coluna diz "Se a clínica cobra sinal…". Ato da secretarIA:
  41 passos, 16% da tela por passo. Botões ganharam uma segunda linha opcional (descrição da linha da
  lista). Logo do cabeçalho do site da secretarIA subida (espaço embaixo) para os olhos ficarem na altura
  do topo das letras. Validação: tsc, vitest (295 / 623 / 20) e build verdes; atos cabem em 1366×657,
  1280×600 e 390×664.
