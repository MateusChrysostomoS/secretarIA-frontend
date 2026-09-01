# CHECKPOINT — Sessão fora do storage: cookie httpOnly first-party (SEC-2)

**Estado:** BUILT, TESTADO e COMMITADO em 2026-09-01 nos **3 repositórios**.
**NÃO deployado** — ver §7 (ordem de deploy) e §8 (o que ainda não dá pra provar daqui).

Origem: achado **SEC-2 (alta)** da auditoria de produção de 30/08/2026, prompt
`z_prompts/PROMPT_AUDIT_FRONTEND_SEC_TOKEN_STORAGE.md`. O prompt original pedia uma decisão
de escopo antes de qualquer código; o usuário autorizou em 2026-09-01 a opção mais segura,
"mesmo que a sessão mexa em todos repositórios".

Commits: `brain-api` 80989fa · `secretarIA-frontend` 50e4de5 · `brain-frontend` 22c74c4.

---

## 1. O que estava errado

`lib/manage-api.ts` guardava as **duas** pernas da sessão em `sessionStorage`, sob
`brain.session`:

```json
{ "token": "<jwt 30min>", "refreshToken": "<opaco, 14 dias>", "tenantId": "…", "role": "…" }
```

`sessionStorage` é legível por **qualquer script da página**. O access token de 30 minutos ao
lado dele é o prêmio pequeno; o refresh token é o grande — ele é re-mintável, dura 14 dias, e
um XSS em **qualquer** tela (inclusive as públicas, alcançáveis por paciente) o entregava
inteiro. Rotação e hash no servidor não ajudam nisso: protegem a cópia do servidor, não a do
navegador.

Não era descuido: a skill `front-brain` §4 prescrevia explicitamente "sessão vive em
`sessionStorage` … **nunca em cookie**". Essa linha foi reescrita nesta rodada.

## 2. Por que NÃO foi a "Opção B" que a auditoria sugeria

A auditoria propunha cookie httpOnly **cross-origin** com `SameSite=None`. Isso teria sido
**pior do que não fazer nada**:

1. **ITP/ETP.** Safari e Firefox tratam cookie de terceiro como descartável a qualquer
   momento. O refresh silencioso quebraria de forma intermitente, só pra uma fatia dos
   pacientes e médicos reais (boa parte do tráfego desta clínica é mobile), sem erro nenhum
   em lugar nenhum.
2. **CSRF.** `SameSite=None` abre superfície que `SameSite=Lax` fecha de graça.

A saída foi **tornar a brain-api first-party**, não aceitar um cookie de terceiro.

## 3. A arquitetura que ficou

| perna | onde vive | script da página lê? |
| --- | --- | --- |
| refresh token | cookie `__Host-refresh_token`, `HttpOnly; Secure; SameSite=Lax; Path=/` | **não** |
| access token | variável de módulo em `lib/manage-api.ts` | sim — e tudo bem, expira em 30 min |

Nada de sessão em `sessionStorage`/`localStorage`. Um teste de fonte trava isso
(`manage-api.ts` não pode conter `sessionStorage.setItem`/`getItem` nem os equivalentes de
`localStorage`).

**O que torna o cookie first-party:** o `nginx.conf` de cada frontend ganhou
`location /api/` fazendo `proxy_pass` pra brain-api, e `NEXT_PUBLIC_MANAGE_API_BASE_URL`
virou **`/api`** — um path, não uma origem. O browser passa a falar com uma origem só.

**O prefixo `__Host-`** prende o cookie a um host só (proíbe `Domain`, exige `Path=/` e
`Secure`). Isso é concreto aqui, não teórico: todo serviço da malha vive sob um
`*.cpux9k.easypanel.host` **compartilhado**, e sem o prefixo um vizinho poderia setar
`Domain=<pai>` e sombrear o cookie (session fixation). O preço é não poder estreitar o
`Path` pra `/api/auth` — o que também é uma vantagem: a brain-api não precisa saber onde foi
montado o proxy.

**A guarda CSRF `X-Brain-Client: web`** é a camada que sustenta, não a reserva. `SameSite`
compara *domínios registráveis*, e não dá pra assumir que `easypanel.host` está na Public
Suffix List — se não estiver, um vizinho sob aquele pai conta como same-site e o `Lax` não
protege de nada. Um `<form>` cross-site não consegue setar header nenhum, e um `fetch()`
cross-site que tente cai no preflight de CORS que a brain-api só responde pras origens de
`CORS_ALLOW_ORIGINS`.

Exigida **só** onde o cookie é a credencial (`POST /auth/refresh`) e **antes** da rotação —
depois já teria queimado o token da vítima. **De propósito ausente no `/auth/logout`:** um
403 ali deixaria o cookie vivo depois do portal já ter largado a sessão em memória, e o
próximo reload religaria o usuário. Uma rota cujo modo de falha é "continua logado" não pode
poder falhar.

## 4. A consequência que mais pega, e o que ela obrigou a mudar

Depois de um **reload**, `getSession()` começa `null` mesmo pra quem está logado — a sessão
existe só como cookie até alguém gastá-lo. Toda tela que decide algo na montagem precisou
aguardar `ensureSession()`:

```tsx
const current = getSession() ?? (await ensureSession());
```

`ensureSession()` é single-flight (uma requisição compartilhada por todos os mounts), sonda o
cookie **no máximo uma vez por page load**, e **nunca redireciona** — metade das telas destes
apps é alcançável deslogado, e ali "sem sessão" é resposta normal, não erro.

O single-flight **não é otimização**. A brain-api rotaciona no uso e trata uma segunda
apresentação do mesmo token como roubo, revogando a família inteira de refresh: dois mounts
concorrentes deslogariam o usuário de tudo. Só aparece em corrida — nunca num teste manual.

Telas convertidas:

| repo | tela |
| --- | --- |
| secretarIA-frontend | `usePortalGuard`, `useSecretariaHub`, `/` (entrada), `/checkout/sucesso`, `SummaryStep` |
| brain-frontend | `usePortalGuard`, `/app`, `/app/billing`, `/checkout/sucesso` (3 pontos, incl. o ramo cortesia), `SummaryStep`, `PlanCheckoutCta` |

O `PlanCheckoutCta` é o que mais dói se esquecido: é página **pública**, então sem consultar o
cookie um visitante **já registrado** lê como anônimo e vai parar no `/cadastro`, onde o
registro falha com `email_already_registered`.

## 5. Armadilhas encontradas que o prompt não previa

**"Modo médico" (impersonation) trocaria de identidade em silêncio.**
`POST /admin/impersonate/token` cunha um access token **sem perna de refresh**. O cookie do
navegador continua sendo o do **admin**. Sem marcar a sessão impersonada como
`refreshable: false`, o primeiro 401 renovaria pelo cookie e devolveria uma sessão de ADMIN
com a identidade do médico — sem nada na tela mudando. Corrigido nos dois lados: a rota do
brain-api não escreve nem herda o cookie, e o cliente marca a sessão.
*Efeito colateral aceito:* o Modo médico **não sobrevive mais a um reload**, porque o stash do
admin (que guardava o access token dele) saiu do `sessionStorage`. Um reload volta pro admin,
e "Modo médico" está a um clique.

**Bug latente corrigido de passagem.** `exchangeOnboardingToken`/`exchangeInviteToken` liam
`email` de uma claim `email` que a `create_access_token` do brain-api **nunca** emitiu — a
sessão trocada sempre ficava com e-mail vazio. Agora vem no corpo (`TokenResponse.email`),
que é o mesmo campo de que uma sessão retomada por cookie depende (nunca houve formulário de
login pra ler o endereço).

**FastAPI descarta o `Response` injetado quando a rota RAISE.** Expirar o cookie num 401 de
refresh rejeitado precisou ir por `HTTPException(headers=...)`, montado a partir de um
`Response` descartável pra manter `core/cookies.py` como fonte única dos atributos — que
precisam bater exatamente, ou o browser trata o delete como outro cookie e mantém o original.

**`proxy_set_header Host $host` quebraria tudo.** O prompt sugeria isso. A ingress do
EasyPanel roteia por Host: mandar o hostname do próprio frontend pra cima cairia no serviço
errado. É `$proxy_host` — que também é o nome contra o qual o certificado é verificado.

## 6. Como foi provado (contra nginx real, não contra o diff)

Imagem Docker de cada frontend, buildada desta branch:

| verificação | secretarIA-frontend | brain-frontend |
| --- | --- | --- |
| `nginx -t` (prova que o `proxy_ssl_trusted_certificate` resolve) | ok | ok |
| `GET /api/health` atravessa o proxy até a brain-api de **produção** (TLS verificado + SNI) | `{"status":"ok"}` | `{"status":"ok"}` |
| `POST /api/auth/token` chega lá com corpo intacto | 422 do Pydantic da brain-api | — |
| os 6 headers de segurança sobrevivem nas respostas `/api/` | sim | n/a (este repo ainda não tem a lista) |
| `/api/` desconhecido dá 404 de verdade | sim | sim (não o catch-all do login) |
| `robots.txt` e 404 do app intactos | sim | n/a |
| origem da brain-api no bundle | **zero ocorrências** | **zero ocorrências** |

Gates: brain-api **534** testes verdes (20 novos em `tests/test_refresh_cookie.py`);
secretarIA-frontend **500** verdes + `tsc --noEmit` limpo + `npm run build`;
brain-frontend **163** verdes + `tsc` limpo + build.

`make lint` da brain-api **não roda nesta máquina** — o binário do `ruff` é bloqueado pelo
Controle de Aplicativos do Windows (mesma classe de
[[graphify-exe-blocked-app-control]]). Comprimento de linha e ordem de import foram
conferidos à mão contra o `pyproject.toml` (`line-length = 100`, isort `known-first-party`).

## 7. Ordem de deploy — não pule, não empurre por cima

A rodada é **aditiva em cada etapa** exatamente pra permitir deploy em série. `refresh_token`
continua no corpo JSON da resposta e continua aceito no corpo das requisições, então um
frontend não migrado segue funcionando intacto.

1. **`brain-api`** (commit 80989fa). Precisa estar no ar e estável **antes** de qualquer
   frontend depender dele. Nada muda pra quem já está no ar: `Set-Cookie` numa resposta
   cross-origin lida com `credentials` != `include` é **ignorada** pelo browser, então os
   dois frontends atuais nem veem o cookie.
2. **`secretarIA-frontend`** (commit 50e4de5). Exige rebuild da imagem — `nginx.conf` e
   `NEXT_PUBLIC_*` só valem no build.
3. **`brain-frontend`** (commit 22c74c4). Só depois do passo 2 confirmado estável.

Se qualquer fase quebrar em produção: **pare**, não empurre a próxima por cima. O rollback de
cada frontend é o deploy anterior; o da brain-api é opcional (ela continua compatível com o
frontend antigo).

## 8. O que ainda NÃO dá pra provar daqui — checklist pós-deploy

- [ ] **Cookie presente e invisível.** Após login: `__Host-refresh_token` em DevTools →
      Application → Cookies, com `HttpOnly` ✓ `Secure` ✓ `SameSite=Lax` ✓ `Path=/`;
      e `document.cookie` no console **não** o mostra.
- [ ] **Storage limpo.** `sessionStorage`/`localStorage` sem nada de sessão
      (`Object.keys(sessionStorage)` → sem `brain.session`).
- [ ] **Reload mantém a sessão.** F5 numa tela autenticada não cai no login. Aba nova
      também entra direto (mudança de comportamento — ver §9).
- [ ] **Logout limpa de verdade.** Depois de "Sair", um reload **não** religa; a resposta do
      `/auth/logout` traz `Set-Cookie` com `Max-Age=0`.
- [ ] **CSRF.** Numa página de outra origem, um `<form method="POST" action=".../api/auth/refresh">`
      submetido deve tomar **403** `missing_client_header` (o cookie viaja, o header não).
- [ ] **Segundo 401 ainda desloga.** Revogue o refresh no banco e force um 401: tem que
      limpar a sessão e ir pro login, sem loop.
- [ ] **Rate limit por IP continua por IP.** ⚠️ O risco operacional desta rodada. A brain-api
      limita `/auth/token` + `/auth/refresh` em 10/min lendo o **primeiro hop** de
      `X-Forwarded-For`. O nginx do frontend faz append (`$proxy_add_x_forwarded_for`), mas a
      requisição passa pela ingress do EasyPanel **duas vezes** — se a segunda passagem
      **sobrescrever** o header em vez de acrescentar, todas as clínicas caem num balde só e
      o login começa a dar 429 sob carga. Teste: 11 logins rápidos de um navegador devem dar
      429; de outra rede, não.
- [ ] **Smoke nas 5 telas autenticadas de cada frontend** (secretarIA: `/inicio`, `/agenda`,
      `/configuracao`, `/app/onboarding`, `/app/reativar`; brain: `/app`, `/app/billing`,
      `/admin/dashboard`, `/admin/tenants`, `/doctor/*`).
- [ ] **Safari e Firefox**, não só Chrome — é a razão de existir do proxy.

## 9. Mudanças de comportamento a comunicar

- **A sessão sobrevive a fechar a aba** (antes o `sessionStorage` morria com ela) e ao
  reabrir o navegador, por `Max-Age` = `REFRESH_TOKEN_EXPIRE_DAYS` (14 dias). Isso é mais
  frouxo do que era. Numa recepção de clínica com máquina compartilhada, setar
  `REFRESH_COOKIE_PERSISTENT=false` na brain-api troca por um **cookie de sessão** (sem
  `Max-Age`), que morre com o navegador. É uma variável de ambiente, sem deploy de código.
- **"Modo médico" não sobrevive a reload** (§5).
- O `/auth/logout` agora é chamado mesmo sem sessão em memória (o navegador pode ter cookie
  vivo e nada em memória — uma sondagem que falhou offline faz exatamente isso).

## 10. Pendências desta rodada

- **Deploy** (§7) e o checklist (§8).
- **Remover a perna do corpo JSON** — `refresh_token` na resposta e nos bodies de
  `/auth/refresh` e `/auth/logout`. **Sessão futura separada**, só depois dos dois frontends
  confirmados estáveis em produção por um tempo.
- **CSP `connect-src`:** a origem `https://secretaria-brain-api.cpux9k.easypanel.host` virou
  permissão morta no `nginx.conf` deste repo. Fica de propósito enquanto a migração está em
  voo (é o caminho de rollback); remover junto com a perna do corpo.
- **`brain-frontend` continua sem hardening de nginx** (headers, 404 real, robots.txt) — foi
  escopado pro `secretarIA-frontend` em 30/08 e segue pendente lá. O bloco `/api/` já está
  preparado (sem `add_header` nenhum) pra quando isso acontecer.
- **`proxy_ssl_verify on`** foi ligado nos dois. Se um dia uma troca de certificado quebrar o
  hop, `proxy_ssl_verify off;` é o rollback de uma palavra — mas aí a perna vira criptografada
  sem ser autenticada, e isso deve voltar como pendência, não ficar assim.

## 11. Skills atualizadas

- **`front-brain` §4** — reescrita. A linha "sessão vive em `sessionStorage` … nunca em
  cookie" era exatamente o padrão que esta rodada inverte.
- **`auth-jwt-multitenant`** — nova seção "Where the browser keeps each leg" + a guarda CSRF
  e as três regras fáceis de errar (só onde o cookie é a credencial; antes de gastar o token;
  nunca no logout), mais o roteiro de migração sem flag day.
- **`static-export-nginx-hardening` §7** (nova) — o padrão `proxy_pass` pra tornar um backend
  first-party, as cinco coisas que decidem se funciona, e o que isso muda no `connect-src`.
