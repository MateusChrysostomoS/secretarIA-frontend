# CHECKPOINT — Hardening do nginx: headers, 404 e robots.txt (SEC-1 / SEC-3 / SEC-4)

**Estado:** BUILT e VERIFICADO 2026-08-30 contra um nginx real (container `nginx:1.27-alpine`
servindo o `out/` deste build). Gates verdes.
**NÃO commitado, NÃO deployado** — ver "Pendências".

Origem: auditoria de segurança em produção de 30/08/2026, prompt
`z_prompts/PROMPT_AUDIT_FRONTEND_SEC_NGINX_HEADERS.md`. Os três achados foram agrupados
porque se resolvem no mesmo arquivo.

O padrão de deploy (static export + nginx puro) é compartilhado com o `brain-frontend`, então
o que foi aprendido aqui virou a skill `TECH/.claude/skills/static-export-nginx-hardening/`.
**O `brain-frontend` NÃO foi corrigido nesta sessão** — decisão de escopo do prompt.

---

## 1. O que estava errado, medido em produção

`curl` contra `https://secretaria-secretaria-frontend.cpux9k.easypanel.host` em 30/08:

| Verificação | Antes |
| --- | --- |
| `HEAD /` e `HEAD /inicio/` | **zero** headers de segurança; `Server: nginx/1.27.5` expondo a versão exata |
| `GET /rota-que-nao-existe-xyz` | **200**, 20118 bytes — byte a byte o mesmo tamanho de `/`: a tela de login |
| `GET /robots.txt` | **200 `text/html`**, 20118 bytes — o robots.txt servia o HTML do login |

Nenhum proxy à frente injetava headers, então o `nginx.conf` era mesmo o único lugar
possível: este app é `output: "export"` servido por nginx puro, sem processo Node em
produção (`Dockerfile`, stage final `nginx:1.27-alpine`).

---

## 2. A armadilha que quase anulou a correção

`add_header` do nginx **substitui, não soma, entre níveis**: um `location` que declara
qualquer `add_header` próprio **não herda nenhum** do `server`. O arquivo antigo tinha
`add_header Cache-Control` dentro de `location /` e de `location /_next/static/` — ou seja,
headers de segurança postos no nível `server` sumiriam exatamente das respostas HTML.
`nginx -t` passa, nenhum log reclama, e o único sinal seria um `curl -I`.

Por isso o `Cache-Control` (e o `Referrer-Policy`, ver §4) viraram **`map`s por `$uri`**, e
`location /_next/static/` deixou de existir: com o valor resolvido por variável, a lista de
headers vive num lugar só, no `server`, e todo `location` — presente ou futuro — mais a
página de 404 herdam tudo. `always` em cada um estende os headers às respostas de erro.

Invariante travada em teste: `app/__tests__/nginx-hardening.test.ts` falha se qualquer
`add_header` reaparecer dentro de um `location`.

---

## 3. CSP — a decisão e por que ela é essa

Decisão do usuário (30/08): **política permissiva com `'unsafe-inline'`**, não hash.

O prompt original supunha que a única armadilha eram os payloads de hidratação. A medição
mostrou mais:

- **43 blocos inline distintos em 16 páginas** (110 no total). Um é o script de tema
  (`app/layout.tsx:41`); os outros são os payloads RSC `self.__next_f.push([...])`, que
  variam por rota **e** carregam um build id (`"b":"CcAGLi-..."`) que muda a cada
  `next build`. Uma lista de hashes fica velha no próximo build — e hash velho é tela branca
  para uma clínica pagante, sem nada falhar no build para avisar.
- **`/app/onboarding` injeta um script de terceiro em runtime**:
  `app/(site)/app/onboarding/lib/meta-embedded-signup.ts:17` carrega
  `https://connect.facebook.net/en_US/sdk.js` (Embedded Signup do WhatsApp). Hash nenhum
  cobre um SDK que carrega mais código próprio.

Contrapeso que tornou a opção permissiva defensável: o repo tem **exatamente um**
`dangerouslySetInnerHTML` (o script de tema), zero `innerHTML`, zero `eval`, zero
`new Function` — nenhuma string do usuário é interpretada como HTML.

As demais diretivas seguem valendo e são a maior parte do ganho: `default-src 'self'`,
`object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'` e um
`connect-src` restrito.

**Acoplamento a vigiar:** os dois origins de `connect-src` são os `ARG
NEXT_PUBLIC_MANAGE_API_BASE_URL` / `NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL` do `Dockerfile`.
Mudar lá sem mudar aqui bloqueia toda chamada de API no navegador, sem deixar rastro no
servidor. Há teste que compara os dois arquivos.

**Rollback de um passo:** renomear o header para `Content-Security-Policy-Report-Only`. O
browser passa a só reportar no console e não bloqueia nada. Não precisa rebuild.

---

## 4. Referrer-Policy e os tokens na URL (SEC-3)

O achado original citava 2 telas com token na URL; são **3**:
`esqueci_senha/token`, `esqueci_senha/atualizar_senha` e `convite` (token de convite de
equipe, endpoint separado). Nenhuma limpava a URL — `grep replaceState` no repo dava zero.

Duas metades, porque uma não cobre a outra:

- **Header.** `strict-origin-when-cross-origin` é o padrão do app, mas ele ainda manda a URL
  **inteira** como Referer nas requisições **same-origin** da própria página — o JS e o CSS
  dela, que saem antes de qualquer código do cliente rodar. O token acabaria no access log
  do nginx. Por isso o `map` dá **`no-referrer`** em `~^/(esqueci_senha|convite)/`.
- **Cliente.** `lib/url-token.ts` (novo) tira o `?token=` da barra com
  `history.replaceState`, e as 3 telas capturam o token **uma vez** via inicializador de
  `useState` antes de limpar.

A ordem importa e é o tipo de coisa que se erra: se a tela continuasse lendo
`search.get("token")` de forma reativa, o valor viraria vazio logo após a limpeza — o efeito
re-rodaria, cancelaria a verificação em voo (`cancelled = true`) e deixaria o usuário preso
na etapa 2. `replaceState` recebe `history.state` em vez de `null` porque o App Router
guarda o estado de rota ali.

**Mudança de comportamento a saber:** recarregar `/esqueci_senha/atualizar_senha` agora não
traz mais token, então volta para a etapa 2 — o mesmo caminho que a ausência de token já
tinha. O link do e-mail não é afetado: ele aponta para a etapa 2, que revalida e encaminha.
Em `/convite`, um reload cai em "Link de convite incompleto" (o token já foi gasto no
exchange de qualquer forma).

**Não foi feito:** fundir as etapas 2 e 3 do reset para o token existir em uma URL só. É
viável (a etapa 2 poderia renderizar o formulário de senha após validar) mas é redesenho de
fluxo e de `StepIndicator`, fora do escopo de uma correção de segurança. Fica registrado
como opção.

---

## 5. 404 e robots.txt (SEC-4)

`try_files $uri $uri.html $uri/ /index.html` era um fallback de SPA — mas um static export
não tem roteador de cliente para receber caminhos desconhecidos, então ele só respondia 200
com a tela de login para qualquer URL. Virou `=404` + `error_page 404 /404.html`.

Seguro porque **todas as 14 rotas são pré-renderizadas em arquivo** e não existe rota
dinâmica `[param]` (verificado). O `next build` já emitia `out/404.html` e
`out/404/index.html`; só o nginx nunca chegava lá.

`public/` não existia neste repo — foi criada com `public/robots.txt`, que o Next copia para
`out/`. Com o catch-all removido, ele é servido por `try_files $uri` como `text/plain`, sem
`location` especial. Escopo escolhido pelo usuário: indexar só `/` e `/cadastro`, bloquear o
resto (painel logado, convite, reset, onboarding, retornos de checkout/OAuth).

---

## 6. Arquivos

| Arquivo | O quê |
| --- | --- |
| `nginx.conf` | reescrito: 2 `map`s, 6 headers no `server`, `server_tokens off`, `try_files … =404`, `error_page`, `gzip_types` sem o `text/html` duplicado |
| `public/robots.txt` | **novo** (pasta `public/` criada) |
| `lib/url-token.ts` | **novo** — `urlWithoutParam` (puro) + `stripQueryParamFromUrl` |
| `app/(auth)/esqueci_senha/token/page.tsx` | captura o token uma vez, limpa a URL antes do round trip |
| `app/(auth)/esqueci_senha/atualizar_senha/page.tsx` | idem |
| `app/(site)/convite/page.tsx` | idem |
| `lib/__tests__/url-token.test.ts` | **novo** — 10 testes |
| `app/__tests__/nginx-hardening.test.ts` | **novo** — 18 testes sobre `nginx.conf`, `Dockerfile`, `robots.txt` e as 3 telas |

---

## 7. Como foi verificado

Gates: `tsc --noEmit` OK, `npm test` **348/348**, `npm run build` OK.

Estes três rodaram numa cópia isolada (`git archive HEAD` + só os arquivos desta tarefa),
porque a working tree tinha, ao mesmo tempo, o trabalho em andamento de outra sessão na
agenda deixando 20 erros de tipo em `app/(site)/agenda/*`. Nenhum erro em arquivo desta
tarefa, nem na árvore compartilhada nem na cópia.

Contra um nginx de verdade (container servindo o `out/` deste build):

- `/` e `/inicio/` → os 6 headers presentes; `Server: nginx` sem versão.
- `/_next/static/chunks/*.js` → `Cache-Control: …immutable` **e** todos os headers de
  segurança. Este é o caso que a correção ingênua perderia.
- URL inexistente → **404**, 8573 bytes, `<title>404: This page could not be found.</title>`,
  com os headers presentes (efeito do `always`).
- `/robots.txt` → **200 `text/plain`**, o arquivo real.
- `Referrer-Policy`: `no-referrer` nas 3 rotas de token, `strict-origin-when-cross-origin`
  em `/`, `/inicio/`, `/cadastro/`.
- `/inicio` (sem barra) → 301, como antes.

No navegador, com DevTools: zero violações de CSP em `/`, `/agenda`, `/configuracao`,
`/cadastro`, `/convite`, `/esqueci_senha/token`. `/convite/?token=X` e
`/esqueci_senha/token/?token=X` terminaram com a URL limpa e o token preservado em estado
(o campo mostrava o valor e a validação completou, provando que o efeito não foi cancelado).

O SDK da Meta foi carregado à mão numa página servida por esse container
(`window.FB` virou objeto) — a rota `/app/onboarding` exige sessão e não dava para exercitar
localmente.

Controle negativo, para provar que a política é **aplicada** e não ignorada: script de
`cdn.jsdelivr.net` recusado, `fetch` para `example.com` recusado, e
`<base href="https://evil.example/">` injetado sem efeito (`document.baseURI` seguiu na
origem do app).

---

## 8. Pendências

1. **Commit + push + redeploy no EasyPanel.** Nada disto está no ar. O `nginx.conf` só passa
   a valer num **rebuild da imagem** (ele é copiado no `Dockerfile`), não num restart.
2. **Reconferir em produção depois do deploy** — o mesmo `curl -I` da §1, mais
   `/rota-que-nao-existe` (quer 404) e `/robots.txt` (quer `text/plain`).
3. **`brain-frontend` tem o mesmo padrão e não foi tocado.** Confirmar com o usuário antes de
   portar; a skill `static-export-nginx-hardening` cobre o procedimento, incluindo o que muda
   entre os repos (origins de `connect-src`, scripts de terceiro).
4. **SEC-2 (tokens em `sessionStorage`) segue aberto** — escopo próprio em
   `z_prompts/PROMPT_AUDIT_FRONTEND_SEC_TOKEN_STORAGE.md`, não tocado aqui.
5. Opcional: fundir as etapas 2 e 3 do reset de senha (§4) para o token nunca aparecer numa
   segunda URL.
