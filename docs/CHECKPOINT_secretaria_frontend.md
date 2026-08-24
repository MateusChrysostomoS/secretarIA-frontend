# CHECKPOINT — secretarIA-frontend (split out of brain-frontend)

**Rodada:** 2026-08-14 · **Estado:** BUILT + validado (`tsc --noEmit` limpo, 128 testes
vitest verdes, `npm run build` gera `/out` com 14 rotas estáticas) · **NÃO deployado, NÃO
pushed** (commits locais na `main`; nada empurrado para o `origin`).

**Atualização mesma rodada:** o fluxo `/esqueci_senha` (recuperação de senha), que a
rodada original tinha deixado de fora, foi portado — ver "O que foi portado" e a nota em
"Lacunas conhecidas". Rotas subiram de 11 para 14; testes de 120 para 128.

**Atualização 2026-08-22 (UNCOMMITTED):** os outros dois campos que viram linha de lista
no WhatsApp ganharam o mesmo tratamento — **nome de serviço** (`ServiceCard.tsx`, com o
`HelpTip` logo após o input já que o card não tem label visível) e **convênio**
(`ContextSection.tsx`, validado **por item** sobre `toWireInsurances`, porque um
`maxLength` no campo proibiria três planos curtos legais). Ao contrário do modal, os dois
**avisam sem bloquear o Save**: esta tela salva oito seções atrás de um botão só. Testes:
242 verdes. Detalhe em `secretarIA/docs/CHECKPOINT_whatsapp_text_limits.md` §4.

**Atualização 2026-08-21 (commit `00f343d`):** o campo "Nome" do `InviteTeamMemberModal`
(variante `professional` apenas) ganhou `maxLength={24}` + erro `role="alert"` + tooltip
"?" — o novo `lib/whatsapp-limits.ts` espelha o cap de linha de lista do WhatsApp que a
secretarIA aplica no backend. Nenhum componente novo: o `Field` do design system já
renderizava o `HelpTip` via a prop `tip`. Testes: 225 verdes. A história completa, os dois
lados, está em `secretarIA/docs/CHECKPOINT_whatsapp_text_limits.md`.

---

> **2026-08-24** — A Seção 06 de `/configuracao` deixou de ter herança e virou o
> catálogo de serviços da clínica (checkbox por serviço, preço/duração por
> profissional), e as telas da secretarIA saíram do `brain-frontend`. Ver
> `docs/CHECKPOINT_catalogo_servicos_ui.md` — inclui a variável de build nova
> `NEXT_PUBLIC_SECRETARIA_APP_BASE_URL`, que o brain-frontend precisa.

## O que é este repo

O frontend dedicado da **secretarIA**, um dos 3 domínios da Brain desde 2026-08-14:

| Domínio | Repo | Papel |
|---|---|---|
| Brain | `brain-frontend` | identidade/login, papéis, gate de pagamento, admin cross-tenant, billing, (futuro) métricas |
| precheck.com.br | `PreCheck` | produto PreCheck — **zero mudanças nesta rodada** |
| **secretarIA** | **este repo** | **só telas de secretarIA: agenda, configuração, ativação do WhatsApp, contratação** |

**A brain-api continua sendo a ÚNICA autoridade de identidade.** Os 3 domínios são uma
mudança de topologia de FRONTEND, não de autenticação: o mesmo e-mail/senha funciona aqui e
no portal Brain, porque ambos chamam `POST /auth/token` na mesma brain-api.

Origem do clone: `brain-frontend` no commit `340908e` **mais** o working tree não commitado
da rodada do papel `secretary` (ver `brain-frontend/docs/CHECKPOINT_secretary_role.md`).
Isso foi deliberado — aquele prompt rodou primeiro, como recomendado, então o clone já
nasce com `InviteTeamMemberModal`, a lista de secretárias e o `Role` de 4 valores.

## Mapa de rotas (14 + `_not-found`, todas estáticas)

| Rota | O que é | Origem no brain-frontend |
|---|---|---|
| `/` | **login + contratar** — única porta de entrada, sem landing | composição NOVA (ver abaixo) |
| `/inicio` | **home do portal** (`PORTAL_HOME`) — nome da clínica + cards pro resto do app | modelada em `(site)/doctor/dashboard`, adicionada em 2026-08-23 (ver decisão nº7) |
| `/cadastro` | wizard de signup de 9 passos | `(site)/cadastro/*` |
| `/checkout/sucesso`, `/checkout/cancelado` | retorno do Stripe | `(site)/checkout/*` |
| `/agenda` | agenda da clínica | `(site)/secretaria/agenda/*` |
| `/configuracao` | configuração da secretarIA | `(site)/secretaria/configuracao/*` |
| `/app/onboarding` | máquina de estado da conexão WhatsApp Coexistence | `(site)/app/onboarding/*` |
| `/app/reativar` | reativação de assinatura pausada | `(site)/app/reativar/*` |
| `/calendar/connected` | callback OAuth do Google Calendar | idem |
| `/convite` | aceite de convite de profissional/secretária | `(site)/convite/*` |
| `/esqueci_senha`, `/esqueci_senha/token`, `/esqueci_senha/atualizar_senha` | recuperação de senha (3 passos) | `(SignOut)/esqueci_senha/*` — portado nesta mesma rodada, ver "O que foi portado" |

O prefixo `/secretaria` foi removido — este app inteiro **é** a secretarIA, então
`/secretaria/agenda` virou `/agenda` e `/secretaria/configuracao` virou `/configuracao`.
`secretaria/_shared/` virou `(site)/_shared/`.

Grupos de rota: `(auth)` (só `/`, carrega `globals.css`) e `(site)` (todo o resto, carrega
`brand-ds.css`). Os dois design systems ficam code-split por rota e nunca colidem na mesma
página — mesma disciplina do brain-frontend.

## A tela `/` — composição nova, não é cópia

No brain-frontend, entrar e contratar são portas separadas: `/login` (alcançada pela home
de marketing) e `/cadastro` (alcançada por um card de preço via `PlanCheckoutCta`). **Nenhuma
das duas existe neste domínio**, então `/` carrega as duas: o formulário de login ocupa o
card e o CTA de contratação fica no slot `belowCard` do `AuthShell`, atrás de um divisor —
o mesmo slot que o `/login` já usava para seu link secundário. Sem conteúdo de marketing.

Três ajustes que a cópia direta exigiu:

- **`AuthShell` renderizava a wordmark "PreCheck" hardcoded.** Não podia ir ao ar na porta
  de entrada da secretarIA — virou `secretar<em>IA</em>` com a linha de papel creditando a
  Brain, espelhando o lockup "Brain │ secretarIA" que o header do portal mostra depois do login.
- O rodapé padrão perdeu `← Voltar ao site`, `#privacidade` e `#suporte`: o primeiro apontava
  para a página em que o visitante já está, e os outros dois são âncoras da home de marketing
  da Brain, que não existe aqui.
- Adicionada uma variante `.btn-secondary` em `auth-shell.css` (o design system só tinha
  `.btn-primary`), construída com os mesmos tokens, para que as duas ações não briguem por
  atenção — e para o bloco dark re-tematizar de graça.

`lib/portal-routes.ts` (novo) concentra a decisão "para onde vai esta sessão?", compartilhada
entre `/` e o `usePortalGuard`, com 11 testes. É lógica pura de propósito: o vitest aqui roda
em `environment: "node"`, sem jsdom, então o que vale testar precisa viver fora da árvore React.

## O que foi portado

- **`lib/manage-api.ts` e `lib/secretaria-hub.ts` INTEIROS**, sem podar call sites de
  admin/PreCheck. São o cliente tipado único por backend; podar tornaria qualquer diff futuro
  contra o brain-frontend ilegível. Por isso `grep precheck lib/manage-api.ts` ainda acha
  coisa — são **endpoints da brain-api**, não rotas de UI deste app.
- `lib/sign-out.ts` + os 3 arquivos de teste correspondentes.
- Design system: `globals.css`, `brand-ds.css`, `brand-pages.css`, `product-tokens.css`,
  `app-shell.css`, `dashboard-shell.css`, `PortalShell.css` e os componentes de marca.
- Todas as telas da tabela de rotas acima, com seus testes existentes
  (`meta-embedded-signup.test.ts` veio junto).
- **`app/(SignOut)/esqueci_senha/*` + `StepIndicator`** (rodada de 2026-08-14, depois da
  divisão inicial): as 3 telas de recuperação de senha, agora apontando para
  **`lib/manage-api.ts`** (`requestPasswordReset`/`verifyResetToken`/`confirmPasswordReset`,
  CALL SITEs #9-#11) em vez de `lib/api.ts` (PreCheck) — brain-api ganhou
  `/auth/password-reset/{request,verify,confirm}` nativos, então o fluxo agora funciona de
  verdade para qualquer clínica, incluindo as que só existem na brain-api (todo signup por
  `/cadastro`). Ajustes feitos ao portar (nenhuma tela é cópia 1:1):
  - Toda checagem de erro trocou de string-match em `err.message` (o original comparava
    `msg.toLowerCase().includes("rate limit")`, que não bate com o texto real da brain-api,
    `"Too many attempts. Try again in a minute."`) para `err.status` via `ManageApiError`
    — mesmo idioma já usado em `RestartButton`/`InviteTeamMemberModal`/etc.
  - Links de volta apontam para `/` (não existe `/login` aqui); o rótulo virou "Entrar"
    (não "Voltar ao login"), e o redirect final de `atualizar_senha` é `/?reset=success`
    em vez de `/login?reset=success` — `/` (agora com Suspense, por causa do
    `useSearchParams`) lê esse parâmetro e mostra o banner de sucesso.
  - Validação de senha nova (`lib/password-policy.ts`, com teste) segue a regra real do
    endpoint de confirm (8-72 caracteres, letra E dígito) em vez do check só-de-tamanho do
    brain-frontend original. Deliberadamente **não** reaproveita
    `(site)/cadastro/lib/password.ts` — aquele helper não tem teto de 72 e serve outro
    endpoint (`/public/signup-intents`).
  - Link "Esqueci minha senha" de volta em `/`, num `.login-row` (só o link, sem o checkbox
    "Lembrar de mim" que este app não tem) alinhado à direita.

## O que ficou de fora — e por quê

| Deixado de fora | Motivo |
|---|---|
| `app/(SignIn)/*` (dashboard, inbound, metrics, summary, users) | painel legado standalone do PreCheck; autentica por `localStorage["precheck_token"]` direto no PreCheck, sem passar pela brain-api |
| `lib/api.ts`, `lib/auth.ts`, `lib/types.ts` | cliente da API do **PreCheck** (`NEXT_PUBLIC_API_URL`) — não portado; o único consumidor que existia (`esqueci_senha/*`) foi reapontado para `lib/manage-api.ts`, ver "O que foi portado" |
| `lib/useAuthGuard.ts` | superseded pelo `usePortalGuard` |
| `(site)/admin/*`, `(site)/app/page.tsx`, `(site)/app/billing/*` | domínio Brain |
| `(site)/doctor/*` | domínio Brain — **parcialmente revertido em 2026-08-23**: nenhum arquivo foi portado, mas `doctor/dashboard` era a única tela de "home que aponta pro resto do app" e a falta dela deixou `/agenda` e `/configuracao` sem ligação. `/inicio` reconstrói esse *formato* (`.portal-links`/`.portal-link-card`, `getDoctorMe`) sem trazer o *conteúdo* do domínio Brain: nada de anamneses, PreCheck ou billing. O resto de `doctor/*` (`anamneses`, `perfil`) segue de fora. Ver decisão nº7 |
| `(site)/page.tsx`, `(site)/secretaria/page.tsx`, `app/precheck/page.tsx`, `components/landing/*`, `app/landing.css` | landing/marketing — "sem landing page por enquanto" |
| `BackToAdminButton`, `useImpersonation` | o "Modo médico" começa e termina no portal Brain; este app não tem superfície de admin |
| `PreCheckWordmark` (+ css) | `ProductLockup` só monta a marca da secretarIA aqui |
| `_lib/pricing.ts`, `PlanCheckoutCta`, `LaunchWaitlistModal`, `PriceCard`, `BrandHeader/Footer`, `Faq`, `Phone`, `Reveal`, `StatusBadge`, `Notice`, `PortalShell.tsx` | não alcançados por nenhuma tela portada (a lista veio do fecho transitivo de imports, não de palpite) |
| `lib/{constants,currency,format,pageSize,seen,theme}.ts` | idem |

**Como a lista foi montada:** por **fecho transitivo de imports** a partir das telas em
escopo, resolvendo cada specifier contra o disco — não por leitura manual. Resultado: 101
arquivos, zero imports não resolvidos, e exatamente 5 referências pendentes, todas as
exclusões deliberadas acima.

## Decisões tomadas nesta rodada

1. **Gate de compra ABERTO.** `SECRETARIA_PURCHASE_OPEN = true` em `app/(site)/_lib/launch.ts`
   — decisão do dono do produto em 2026-08-14. Checkout real, Stripe real, sem lista de espera.
   Uma linha para reverter. O código da lista de espera **não foi apagado**: continua em
   `cadastro/page.tsx` atrás do `isPurchaseGated()`, inerte. O hack local
   `TEMP-LOCAL-TEST 2026-08-13` do working tree do brain-frontend **não** foi copiado.
2. **`usePortalGuard` ganhou `accessDenied`.** O brain-frontend sempre tem para onde mandar
   alguém (`/admin/dashboard`, `/doctor/dashboard`). Aqui só existe `/agenda`, então um admin
   de plataforma não pode ser redirecionado para lugar nenhum — mandá-lo para `/` o traria de
   volta, porque a sessão dele é válida. Agora o hook devolve a mensagem e a tela renderiza
   `PortalAccessNotice` (mesmo padrão de alerta inline que o `PlanCheckoutCta` usa lá para a
   mesma situação). `isSamePath` fecha o mesmo laço para qualquer papel desconhecido.

   > **Atualizado em 2026-08-23.** A premissa "aqui só existe `/agenda`" caiu — `PORTAL_HOME`
   > agora é `/inicio` (decisão nº7). O `accessDenied` **continua**, e pelo mesmo motivo de
   > fundo: este domínio não tem superfície de admin nenhuma, então um admin de plataforma
   > segue sem destino aqui. O que mudou é a razão de haver uma home só: não é mais "existe
   > uma tela só", é "todo papel de clínica pode abrir toda tela — o que muda entre eles é o
   > que a tela *oferece*, nunca em qual tela pousam". `resolvePostLogin` continua com uma
   > única resposta navegável.
3. **`/agenda` e `/configuracao` seguem SEM `usePortalGuard`**, como no brain-frontend: elas
   caem no modo demo do `HubNotice` quando não há sessão/hub. É comportamento intencional
   herdado, não uma lacuna — não foi alterado.
4. **Links de billing viraram texto sem link.** `/app/billing` fica no domínio Brain, então
   os dois pontos que apontavam para lá (aviso de forma de pagamento em `/app/reativar` e o
   `checkout_required` do `RestartButton`) agora nomeiam a tela "Assinatura, no portal Brain"
   em vez de virarem links mortos.
5. **Chave de tema renomeada** `precheck_theme` → `secretaria_theme` (domínio separado, sem
   migração a fazer). Definida em `app/layout.tsx` e `useBrandTheme.ts` — os dois têm que
   andar juntos.
6. **Checkbox "Lembrar de mim" removido** do login: no brain-frontend ele guarda estado que
   nada lê. UI que promete o que não entrega é pior que UI ausente.

7. **`PORTAL_HOME` virou `/inicio` (2026-08-23) — reverte a decisão de "uma tela é a home".**
   A separação elegeu `/agenda` como home porque este domínio vende um produto só. Uma semana
   depois o custo apareceu: `/agenda` e `/configuracao` não tinham ligação nenhuma entre si —
   os únicos `Link href="/configuracao"` do repo eram CTAs de fluxo (`app/reativar`,
   `app/onboarding`, `calendar/connected`), nunca um menu — então quem logava chegava em
   `/agenda` e só alcançava a configuração digitando a URL. "Um produto só" nunca implicou
   "uma porta só". `/inicio` é uma home de verdade: nome da clínica + `.portal-links` com
   Agenda, Configurações e Convidar equipe, guardada em exatamente `PORTAL_ROLES`.
   Detalhes que valem a pena não redescobrir:
   - **O link da marca no `PortalHeader` apontava para `/`** — que aqui é a tela de LOGIN, e
     que **não** redireciona uma sessão existente (o `resolvePostLogin` da tela `/` roda
     dentro do `handleSubmit`, não no mount). Ou seja: clicar na marca dentro de `/agenda`
     largava um usuário logado no formulário de login. Agora aponta para `PORTAL_HOME`. É o
     único caminho de volta — nada de breadcrumb ou menu redundante em cima.
   - **`canManageClinic(session)` em `lib/portal-routes.ts`** passou a ser a grafia única de
     "é o titular?" (`is_owner` OU o legado `role === "tenant_owner"`), consumida por
     `/inicio` e pelos dois pontos de `configuracao/page.tsx` que repetiam a expressão
     inline. Módulo puro de propósito: é o que o deixa testável no vitest node-only.
   - **O card "Convidar equipe" NÃO é owner-gated**, e isso foi verificado, não suposto:
     `invite_professional`/`invite_secretary` no brain-api usam `require_doctor`, e a
     docstring registra que eram `require_owner` até a rodada de correções de 2026-07-22;
     `ProfessionalsSection` renderiza os dois botões atrás de um `session &&` simples pelo
     mesmo motivo. Em todo o brain-api só `pause_onboarding` é owner-only (e ainda aceita
     `secretary`). O elemento que depende de permissão de gestão é o selo "Titular da
     clínica" + a copy do subtítulo — afirmação de fato, não bloqueio inventado.
   - **`/agenda` e `/configuracao` seguem SEM guard** (decisão nº3 intacta) e o modo demo do
     `HubNotice` continua valendo. Consequência aceita: um visitante sem sessão que clique na
     marca faz um salto a mais (`/inicio` → guard → `/`) e chega no mesmo lugar de antes.
   - **`/configuracao` aprendeu `?secao=<NavId>`** para o card cair direto na seção
     Profissionais. Lê `window.location.search` num efeito, e não `useSearchParams()`, que
     sob `output: "export"` exigiria um `Suspense` em volta da tela inteira. O pulo só é
     dado quando a seção está de fato alcançável (`scrollTo` satura em
     `scrollHeight - clientHeight`, e as seções abaixo de `prof` ainda estão vazias logo após
     o tenant chegar) ou quando nada mais está carregando.
   - **Teste que fecha o buraco:** `portal-routes.test.ts` fixa o literal `/inicio` **e**
     confere com `existsSync` que a rota existe em disco. Sem isso as asserções comparavam
     `PORTAL_HOME` contra `PORTAL_HOME` e passariam com qualquer valor, inclusive com typo —
     e um typo aqui é um 404 em produção para 100% dos logins.

   O padrão genérico saiu deste repo e virou a skill `portal-role-home` em
   `TECH/.claude/skills/`, para brain-frontend e para qualquer app nova da família.

## Papel `secretary` — verificação da TAREFA 4 neste repo (2026-08-14)

O prompt do papel `secretary` mandava replicar aqui as mudanças de frontend **se** este repo
já existisse. Ele rodou primeiro, então o clone (ver "O que é este repo") já trouxe tudo —
esta seção registra o que foi **conferido**, não o que foi reescrito. Contrato completo:
`brain-api/docs/CHECKPOINT_secretary_role.md`.

| Item | Estado |
|---|---|
| `Role` de 4 valores + `getDoctorSecretaries`/`createSecretaryInvite` em `lib/manage-api.ts` | ✅ veio no clone |
| `InviteTeamMemberModal` (prop `kind`) + lista "SECRETÁRIAS (RECEPÇÃO)" + 2 botões em `ProfessionalsSection` | ✅ veio no clone |
| `usePortalGuard([... "secretary" ...])` em `/app/onboarding` e `/app/reativar` | ✅ (são os 2 únicos call sites; `/agenda` e `/configuracao` não usam guard de papel — dependem da sessão/hub) |
| `PORTAL_ROLES` inclui `secretary`, com teste (`portal-routes.test.ts`, "sends every clinic role to the agenda") | ✅ |
| 4 testes de `getDoctorSecretaries`/`createSecretaryInvite` | ✅ dentro dos 77 de `manage-api.test.ts` |
| Prompt de auto-vínculo escondido pra `secretary` | ✅ (`session?.role !== "secretary"`) |

**Billing não se aplica aqui.** O bullet de billing da TAREFA 4 (achar uma checagem
client-side de `is_owner` escondendo "Gerenciar assinatura") não tem alvo neste repo: não
existe tela de gestão de assinatura aqui — `createPortalSession` não é chamado em nenhuma
página. Billing é do domínio Brain. O que existe é `/app/reativar` (reativar assinatura
pausada), que já aceita `secretary` no guard.

**Anamneses não se aplicam aqui.** Não há rota clínica neste repo, então as 2 exclusões de
anamnese do brain-frontend não têm equivalente. Único ponto que encosta no assunto: a
agenda mostra um selo de status de pré-consulta (`appt.anamnese`) — **não é conteúdo
clínico**, e o mapeamento real do hub (`agenda/lib/hub-mapping.ts`) sempre grava `"—"`; só
dado de demonstração produz `"recebida"`/`"pendente"`. Ver a lacuna do "Ver resumo" abaixo.

Gates locais rodados: `tsc.cmd --noEmit` limpo, **120 testes verdes**, `npm run build` limpo.

## Lacunas conhecidas (nada disto bloqueia o build)

- [x] ~~Não existe recuperação de senha.~~ **Resolvido em 2026-08-14** (mesma rodada): a
      brain-api ganhou `POST /auth/password-reset/{request,verify,confirm}` nativos, e as 3
      telas `esqueci_senha/*` foram portadas apontando para eles — ver "O que foi portado" e
      o mapa de rotas. Link "Esqueci minha senha" de volta em `/`.
      *(O bug irmão continua existindo no brain-frontend — lá "Esqueci a senha" ainda chama a
      API do PreCheck, não a identidade Brain. Fora do escopo deste repo.)*
- [ ] **Migração `0012_role_taxonomy` ainda não rodou em produção** na brain-api. Até rodar,
      a brain-api pode emitir os papéis legados `tenant_owner`/`tenant_staff` — por isso eles
      continuam aceitos em `PORTAL_ROLES` (com teste cobrindo).
- [ ] **Papel `secretary` ainda não deployado.** O trabalho está BUILT nos três repos mas não
      commitado/deployado no brain-api — ver `brain-api/docs/CHECKPOINT_secretary_role.md`.
      Este app já aceita o papel (verificação na seção acima).
- [ ] **"Ver resumo" na gaveta da agenda é uma armadilha futura.** `agenda/drawer.tsx` renderiza
      um link "Ver resumo" quando `appt.anamnese === "recebida"`. Hoje é **UI morta e
      inalcançável**: o `<span>` não tem `onClick`, e `mapHubEventToAppt` grava `anamnese: "—"`
      em todo evento real (só `modals.tsx` produz outro valor, em dado local). Quando alguém
      ligar isso a conteúdo de anamnese de verdade, vira **superfície clínica do PreCheck
      dentro de um app que a secretária alcança** — e o papel é explicitamente proibido de ver
      anamnese (`403 secretary_precheck_not_allowed` na brain-api). Quem for implementar:
      esconda de `role === "secretary"`, do mesmo jeito que `/doctor/anamneses` é escondido no
      brain-frontend.
- [ ] **Decidir para qual domínio o link de convite aponta.** A brain-api monta
      `{FRONTEND_BASE_URL}/convite?token=…` com uma única env var, e **os dois** frontends têm
      `/convite` (ambos role-agnósticos, ambos funcionam). Onde a var apontar é onde toda
      pessoa convidada — médico e secretária — cai: no Brain vai parar em `/doctor/dashboard`,
      aqui vai parar em `/agenda`. Não é bug, é uma decisão de deploy que ainda não foi tomada.
- [ ] **Token da WABA expira em 60 dias e nada renova** (pendência antiga, de plataforma, não
      deste repo) — não bloqueia teste, bloqueia lançamento.
- [ ] **O nome do profissional tem uma segunda porta de entrada, ainda sem cap.**
      Os três campos digitados NESTE hub estão cobertos (profissional, serviço, convênio),
      mas `POST /doctor/professionals/self` (chamado por `ProfessionalsSection` com payload
      vazio) deriva o nome do usuário da brain-api — que vem do `/cadastro` daqui e do
      "Meu Perfil" no `brain-frontend`, nenhum dos dois com limite. Esse caminho só é
      coberto pela rede de segurança do backend, e fechá-lo é trabalho no `brain-frontend`.
      Ver `secretarIA/docs/CHECKPOINT_whatsapp_text_limits.md`.
- [ ] **O `ServiceCard` novo não foi visto rodando.** Coberto por teste e o `HelpTip` tem
      precedente idêntico em `AvailabilitySection` ("Horário semanal"), mas offline o botão
      "Adicionar serviço" fica desabilitado pela guarda fail-closed de hidratação, então
      nenhum card renderiza — falta um olhar num hub com backend de verdade.
- [ ] Sem deploy no EasyPanel e sem `git push` — nada foi empurrado para o `origin`.

## Deploy no EasyPanel (guia — nada disto foi executado)

O app é **static export servido por nginx**, então `NEXT_PUBLIC_*` são assadas na imagem
**no build**, pelos pares `ARG`/`ENV` do `Dockerfile`. **Configurar a variável só no painel
de Environment do EasyPanel NÃO tem efeito nenhum** — isso já quebrou uma integração real antes.

1. EasyPanel → **Create Service** → App, apontando para o repo `secretarIA-frontend`, branch `main`.
2. **Source → Build** → Method: `Dockerfile`, Path: `Dockerfile`.
3. **Build Args** (é aqui que os valores entram de verdade, não em Environment):
   - `NEXT_PUBLIC_MANAGE_API_BASE_URL` = origem pública da brain-api
     (hoje `https://secretaria-brain-api.cpux9k.easypanel.host`)
   - `NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL` = origem **pública** do serviço secretarIA
     (EasyPanel → serviço secretarIA → Domains). Esquema + host, **sem barra final, sem path,
     sem porta**. Não use o `SECRETARIA_BASE_URL` da brain-api — aquele pode ser endereço de
     rede interna, que o navegador do médico não alcança.
   - Os defaults do `Dockerfile` já apontam para os hosts atuais; passe Build Args só para
     sobrescrever.
4. **Domains** → adicione o domínio do produto, porta `80`.
5. Depois de subir, confirme no serviço **secretarIA** que `CORS_ALLOW_ORIGINS` inclui a
   origem nova **sem barra final** — uma barra sobrando produz `400 Disallowed CORS origin`.
6. Se o banner "conexão com os dados da sua clínica não está configurada" aparecer em
   produção, é sinal de que `NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL` ficou vazia no **build**.

## Rodar local

```
npm install
npm run dev     # http://localhost:3000
npm test        # vitest, 128 testes
npm run build   # gera /out
```

Gotchas desta máquina, herdados do brain-frontend:
- `next dev`/`next build` só funcionam com o path do projeto em **`C:` maiúsculo**.
- `npx tsc` é um pacote errado aqui — use `.\node_modules\.bin\tsc.cmd --noEmit`.
- Não existe config de ESLint; os gates reais são `tsc --noEmit` + `npm test` + `npm run build`.
