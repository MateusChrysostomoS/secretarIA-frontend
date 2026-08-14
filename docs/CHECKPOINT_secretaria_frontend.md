# CHECKPOINT — secretarIA-frontend (split out of brain-frontend)

**Rodada:** 2026-08-14 · **Estado:** BUILT + validado (`tsc --noEmit` limpo, 120 testes
vitest verdes, `npm run build` gera `/out` com 11 rotas estáticas) · **NÃO deployado, NÃO
pushed** (4 commits locais na `main`).

---

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

## Mapa de rotas (11, todas estáticas)

| Rota | O que é | Origem no brain-frontend |
|---|---|---|
| `/` | **login + contratar** — única porta de entrada, sem landing | composição NOVA (ver abaixo) |
| `/cadastro` | wizard de signup de 9 passos | `(site)/cadastro/*` |
| `/checkout/sucesso`, `/checkout/cancelado` | retorno do Stripe | `(site)/checkout/*` |
| `/agenda` | agenda da clínica | `(site)/secretaria/agenda/*` |
| `/configuracao` | configuração da secretarIA | `(site)/secretaria/configuracao/*` |
| `/app/onboarding` | máquina de estado da conexão WhatsApp Coexistence | `(site)/app/onboarding/*` |
| `/app/reativar` | reativação de assinatura pausada | `(site)/app/reativar/*` |
| `/calendar/connected` | callback OAuth do Google Calendar | idem |
| `/convite` | aceite de convite de profissional/secretária | `(site)/convite/*` |

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

## O que ficou de fora — e por quê

| Deixado de fora | Motivo |
|---|---|
| `app/(SignIn)/*` (dashboard, inbound, metrics, summary, users) | painel legado standalone do PreCheck; autentica por `localStorage["precheck_token"]` direto no PreCheck, sem passar pela brain-api |
| `lib/api.ts`, `lib/auth.ts`, `lib/types.ts` | cliente da API do **PreCheck** (`NEXT_PUBLIC_API_URL`) — ver "Lacunas" |
| `lib/useAuthGuard.ts` | superseded pelo `usePortalGuard` |
| `app/(SignOut)/esqueci_senha/*` + `StepIndicator` | fluxo de reset de senha — ver "Lacunas" |
| `(site)/admin/*`, `(site)/doctor/*`, `(site)/app/page.tsx`, `(site)/app/billing/*` | domínio Brain |
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

## Lacunas conhecidas (nada disto bloqueia o build)

- [ ] **Não existe recuperação de senha.** O fluxo `esqueci_senha/*` do brain-frontend chama
      a **API do PreCheck** (`lib/api.ts` → `NEXT_PUBLIC_API_URL` → `/auth/password-reset/*`).
      **A brain-api não tem nenhum endpoint de reset** — sua superfície de auth é `/token`,
      `/refresh`, `/logout`, `/me`, `/exchange-onboarding-token`, `/exchange-invite-token`,
      `/set-password`. Pior: uma clínica que nasceu pelo `/cadastro` existe só na brain-api,
      não no banco do PreCheck — o reset responderia "enviamos o e-mail" e nunca enviaria nada.
      Decisão do usuário em 2026-08-14: **omitir por enquanto**. Para existir de verdade,
      a brain-api precisa de `POST /auth/password-reset/{request,verify,confirm}`; aí as 3
      telas voltam. Hoje, quem esquece a senha depende de suporte.
      *(Isto também é um bug latente no brain-frontend: o link "Esqueci a senha" de lá reseta
      a senha do PreCheck, não a identidade Brain.)*
- [ ] **Migração `0012_role_taxonomy` ainda não rodou em produção** na brain-api. Até rodar,
      a brain-api pode emitir os papéis legados `tenant_owner`/`tenant_staff` — por isso eles
      continuam aceitos em `PORTAL_ROLES` (com teste cobrindo).
- [ ] **Papel `secretary` ainda não deployado.** O trabalho está BUILT nos dois repos mas não
      commitado/deployado no brain-api — ver `brain-api/docs/CHECKPOINT_secretary_role.md`.
      Este app já aceita o papel.
- [ ] **Token da WABA expira em 60 dias e nada renova** (pendência antiga, de plataforma, não
      deste repo) — não bloqueia teste, bloqueia lançamento.
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
npm test        # vitest, 120 testes
npm run build   # gera /out
```

Gotchas desta máquina, herdados do brain-frontend:
- `next dev`/`next build` só funcionam com o path do projeto em **`C:` maiúsculo**.
- `npx tsc` é um pacote errado aqui — use `.\node_modules\.bin\tsc.cmd --noEmit`.
- Não existe config de ESLint; os gates reais são `tsc --noEmit` + `npm test` + `npm run build`.
