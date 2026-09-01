# CHECKPOINT — chamadas duplicadas e prefetch desperdiçado (PERF-4 / PERF-2 / PERF-3)

**Estado:** implementado, commitado, **deployado e provado ao vivo em produção**. Data:
2026-08-31.

Corrige os achados **PERF-4** (média), **PERF-2** (baixa) e **PERF-3** (baixa — diagnóstico
corrigido, nenhum código) da auditoria de 30/08/2026
(`z_prompts/PROMPT_AUDIT_FRONTEND_REQUISICOES_DUPLICADAS.md`). Rodou em paralelo com A11Y-2/3
(`docs/CHECKPOINT_a11y_contraste_landmarks.md`) na mesma working tree, sem colisão real em
`configuracao/page.tsx`, e foi deployado no mesmo lote.

---

## 1. O que mudou

| arquivo | mudança |
|---|---|
| `lib/manage-api.ts` | `getDoctorProfessionals` ganhou cache em memória de módulo + single-flight por sessão (chave `${tenantId}:${token}`), TTL de 5s, e `invalidateDoctorProfessionals(session)` chamado no topo de `reloadRoster()`. Molde copiado de `getHubToken` (`lib/secretaria-hub.ts`) |
| `lib/__tests__/manage-api.test.ts` | testes novos para as 4 propriedades do cache (mutation-tested, não só green) |
| `app/(auth)/page.tsx` | `prefetch={false}` nos 2 `<Link>` (`SIGNUP_HREF` e `/esqueci_senha`) |

---

## 2. O achado que a auditoria errou: era 1 tela, não 3

Medido ao vivo em produção **antes do fix**, sessão real de médico, Resource Timing API:

| tela | `GET /doctor/professionals` por mount |
|---|---|
| `/inicio` | **1** |
| `/agenda` | **1** |
| `/configuracao` | **2** (t=306ms e t=325ms, 19ms de intervalo) |

`getDoctorProfessionals` tem 3 call sites no repo inteiro (`hydrate()`, `ConfigGapBanner`,
`reloadRoster()`). `/agenda` e `/inicio` renderizam o `ConfigGapBanner`, mas **não têm
nenhum segundo consumidor** — nunca houve o que deduplicar ali. A inferência da auditoria
original ("o banner busca sozinho, logo duplica em toda tela que o renderiza") estava
errada: duplica só onde a página host **também** busca, e isso só acontece em
`/configuracao`.

---

## 3. O bug que só mutation test achou: derrubar o in-flight não basta

Invalidar o cache sozinho deixa `reloadRoster()` entrar de carona numa request que já
estava em voo **antes** da mutação. Mesmo derrubando o in-flight, sobra o pior caso: essa
request antiga resolve **depois** da nova e sobrescreve o roster fresco no cache pelo resto
do TTL — o usuário vê dado velho depois de convidar alguém, vincular-se, ou conectar a
agenda.

A correção usa o mesmo `generationRef`/epoch que `hydrate()` e `useSecretariaHub` já usam
neste repo: um `professionalsEpoch` por chave, conferido **antes do `cache.set`**, não só
antes do `return`. Provado por mutation test — remover o guard faz o teste falhar com
`expected […1 row] to have a length of 2`, confirmando que sem ele o teste passaria por
coincidência.

**Por que TTL curto, não só single-flight.** O intervalo medido entre as duas chamadas
(19ms) contra a duração da primeira (25ms) é o que justifica manter o TTL: as duas se
sobrepõem por pouco. Num par mais rápido (resposta quente de ~10ms) elas não se
sobreporiam, e single-flight sozinho perderia o caso — só o cache com TTL cobre os dois
regimes.

---

## 4. PERF-3 — duas correções ao relatório original, nenhum código aqui

- **O exemplo numérico não tinha relação com o hub token.** A auditoria citou um cold start
  de 1327ms→111ms em `/doctor/onboarding` como efeito da cascata de mint do hub token.
  `/doctor/onboarding` é buscado por `getDoctorOnboarding` → `manageFetch` **direto** no
  brain-api; `getHubToken` só é alcançável por `lib/secretaria-hub.ts` e
  `useSecretariaHub.ts`. Não há token nenhum sendo mintado nesse caminho — o número é cold
  start genérico de infraestrutura, não relacionado ao que o achado descrevia.
- **`Access-Control-Max-Age: 600` já estava setado** no brain-api — a ideia de "subir o
  Max-Age" da auditoria já não é um item aberto.

Nenhuma mudança de backend foi feita (fora de escopo deste repositório).

---

## 5. Prova pós-deploy, em produção real (clínica "Chrysostomo For Eyes")

| tela | antes do deploy | depois |
|---|---|---|
| `/inicio` | 1 | 1 |
| `/agenda` | 1 | 1 |
| `/configuracao` | 2 (t=306ms, t=325ms) | **1** |

`/configuracao` foi de **8 para 7** chamadas de API por mount. Confirmado tanto em load
duro quanto em navegação client-side a partir de `/inicio`; sem regressão nas outras duas
telas.

**PERF-2 confirmado no chunk deployado**: `page-ddc5137d0677687d.js` contém
`{href:"/esqueci_senha",prefetch:!1,…}` (o chunk pré-deploy não tinha a prop). Build local
equivalente produz `rscPayloadFetches: []`.

**As 4 propriedades do cache foram exercitadas contra o código deployado e a API real, só
com GET**, sem tocar em nenhum dado da clínica:

| fase | teste | resultado |
|---|---|---|
| A | 2 leituras concorrentes (página + banner) | 1 request; mesmo conteúdo, arrays distintos |
| B | 3ª leitura dentro do TTL | 0 requests — servida da memória |
| C | `invalidateDoctorProfessionals` + leitura | 1 request — o caminho do `reloadRoster` fura o cache |
| D | chamador reverte o array recebido; próximo chamador lê | ordem intacta, 0 requests — contrato de array próprio se sustenta |

A fase C é a que mais importava: é exatamente a falha que a §3 acima descreve, e não
ocorre. A fiação (`reloadRoster` chamando o invalidator de verdade) também foi confirmada
lendo o bundle minificado: os dois `Promise.all(` do chunk de `/configuracao` têm
argumentos idênticos, e só o do `reloadRoster` tem a chamada de invalidação
imediatamente antes — exatamente a assimetria que o design pede (o mount inicial
deliberadamente NÃO invalida, para compartilhar a leitura com o banner).

Um teste de mutação real (disparar um convite/self-bind/conexão de agenda pela UI) foi
**deliberadamente evitado**, mesmo autorizado: a prova acima isola o mecanismo do cache
diretamente contra o código e a API de produção, cobre o mesmo caminho (mecanismo +
fiação), e não deixa e-mail de convite nem linha de profissional órfã para limpar depois.

---

## 6. Instrumentos — 2 armadilhas para não repetir

- `mcp__claude-in-chrome__read_network_requests` **perde requests ao navegar** (devolveu 1
  de ~20 numa navegação same-origin). Use `performance.getEntriesByType('resource')` via
  `javascript_tool` — sobrevive à navegação e foi o que a auditoria original usou.
- **Aba em background estrangula `setTimeout`**: um `await setTimeout(2500)` dentro do
  `javascript_tool` consumiu 14,9s de relógio real numa medição. Qualquer teste de janela
  curta (como este TTL de 5s) precisa confirmar com `performance.now()`, não confiar no
  sleep pedido — senão dá falso negativo (parece que o TTL não segurou, quando na verdade
  ele só expirou de verdade).

Ver [[chrome-cdp-fallback-sem-mcp]].

---

## 7. Gates

`tsc --noEmit` limpo, `npm test` 484/484, `npm run build` OK.

---

## 8. Pendências

- **Nenhuma pendência de código.** PERF-4, PERF-2 e PERF-3 estão fechados e provados no ar.
- O padrão de cache+single-flight por sessão virou convenção documentada em `front-brain`
  §4 (2ª instância do padrão, ao lado de `getHubToken`) — releia antes de implementar um
  cache parecido em outro lugar deste repo ou do `brain-frontend`.
- Se algum dia quiser prova UI-level da invalidação (convite real disparando roster
  fresco), é opcional — a cobertura mecanismo+fiação acima já é equivalente e mais barata.
