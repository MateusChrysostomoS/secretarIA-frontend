# CHECKPOINT — Banner "configure sua secretarIA" (FEAT 42)

**Estado:** BUILT e verificado 2026-08-29 nos dois frontends. Gates verdes.
**NÃO commitado, NÃO deployado** — ver "Pendências".

Arquivo duplicado, byte a byte, em `brain-frontend/docs/` e `secretarIA-frontend/docs/`,
porque a implementação também é: os dois repos consomem o MESMO endpoint e rodam o MESMO
código. Uma edição aqui vale para as duas cópias.

Parte 2 de 3 do trio de alerta de config incompleta:
FEAT 41 (backend secretarIA, e-mail reativo — já pushed) → **FEAT 42 (este)** →
FEAT 43 (PreCheck, opcional, ainda não feito).

---

## 1. O que é

Um aviso dispensável no **canto superior direito** de toda tela logada, enquanto pelo menos
um profissional ATIVO da clínica não pode ser agendado. Pedido do usuário, verbatim:

> "uma notificação com um 'x' para fechar no canto direito superior da tela falando algo
> como: 'Configure sua secretarIA para que seus pacientes consigam marcar consultas com
> você.'"

É o aviso **proativo**, visto a cada login. O reativo (e-mail para a clínica E para o médico,
quando um paciente de fato esbarra na lacuna) é o FEAT 41 e continua sendo a rede de
segurança — este banner nunca é a única forma de saber.

Copy por caso, decidida por quem está logado:

| caso | mensagem |
|---|---|
| o logado É o profissional incompleto | a frase do usuário, verbatim |
| exatamente um OUTRO profissional | "Configure a secretarIA de {nome}…" — nomeado, para o dono não ter que adivinhar |
| mais de um outro | "{n} profissionais estão sem configuração…" |

Quando o logado e colegas estão incompletos, ganha a mensagem "self": é a lacuna que ele
consegue resolver de onde está. A dos colegas não se perde — assim que a própria linha fica
completa, o `dismissKey` muda e o aviso volta nomeando quem sobrou.

---

## 2. De onde vem o sinal — e a correção ao prompt

`PROMPT_FEAT_42_...md` §3.3 diz para ler o campo de completude em `GET /config` do hub.
**Está errado, e o `PROMPT_FEAT_41` também.** O que o FEAT 41 realmente entregou
(`secretarIA/docs/CHECKPOINT_professional_config_gap_alert.md` §6) foi completude por
profissional em `GET /tenants/me/professionals`, e aquele checkpoint **proíbe explicitamente**
mover isso para `GET /config` — `TenantConfigRead` é escopo de clínica, e duplicar o cálculo
é exatamente como duas fontes divergem.

Além disso, o §1.1 do prompt afirma que `brain-frontend` "não tem NENHUM cliente HTTP
apontando pra secretarIA". Também falso: tem dois, órfãos desde 2026-08-24 mas intactos —
`lib/secretaria-hub.ts` (com `getProfessionals()`) e `getDoctorProfessionals()` em
`lib/manage-api.ts`.

**O que os dois frontends usam, e é o mesmo:**

```
GET /doctor/professionals   (brain-api, require_doctor, Bearer do brain JWT)
  -> getDoctorProfessionals() em lib/manage-api.ts, JÁ existente nos dois repos
```

`brain-api/src/brain_api/api/onboarding.py::list_professionals` já proxia o config-status da
secretarIA e devolve `has_calendar` / `has_hours` / `has_services` / `complete` por
profissional. **Nenhuma linha de backend foi escrita nesta fatia** — a "mediação via
brain-api" que o prompt §3.2 recomendava construir já estava construída desde o contrato de
multi-professional.

Duas propriedades do caminho que importam:

- O pull do config-status é **throttled** (`CONFIG_STATUS_PULL_TTL_SECONDS = 60`, cache
  em processo) e **fail-soft** — `refresh_config_status` nunca levanta. Chamar isso a cada
  carga de portal é barato.
- O endpoint devolve **só profissionais ATIVOS** (`professional_completeness` filtra
  `is_active`). O hub (`GET /tenants/me/professionals`) devolve inativos também. Por isso o
  módulo puro filtra `is_active` por conta própria: se um dia alguém trocar a fonte, os dois
  frontends continuam concordando.

---

## 3. As três decisões, confirmadas pelo usuário antes do código

1. **Como o brain-frontend aprende o sinal** (§3.2 do prompt, estava em aberto) →
   **usar `GET /doctor/professionals`, que já existe.** Zero mudança de backend, zero deploy
   do brain-api, nenhuma credencial cross-service nova. As alternativas registradas e
   descartadas: campo novo em `GET /doctor/me` (evitaria uma request, mas exigiria mudar e
   deployar o brain-api para responder o que um endpoint existente já responde) e chamada
   direta ao hub pelo browser (exigiria `NEXT_PUBLIC_SECRETARIA_HUB_BASE_URL` assada no build
   do brain-frontend + CORS).
2. **Semântica do "fechar"** (§3.4) → **só nesta sessão** (`sessionStorage`). Reaparece no
   próximo login enquanto o profissional seguir inagendável. Um fechamento permanente
   deixaria um dono esconder para sempre o fato de que pacientes continuam falhando.
3. **Qual lacuna dispara** → **`!complete`**, ou seja tudo que bloqueia agendamento,
   incluindo agenda Google não coberta. Escolha do usuário sobre a alternativa mais estreita
   (só `hours`/`services`, que é o que o bot recusa e o FEAT 41 e-mailia). Consequência
   aceita: uma clínica sem Calendar conectado vê ESTE aviso além do alerta de calendário que
   já existe (`_handle_calendar_unavailable`).

---

## 4. Arquivos

Idênticos nos dois repos (confira com `diff --strip-trailing-cr`; os repos divergem só em
fim de linha):

| arquivo | papel |
|---|---|
| `lib/config-gap.ts` | módulo PURO: decide se há aviso, qual a copy, e a dispensa por sessão |
| `lib/__tests__/config-gap.test.ts` | 19 casos |
| `app/(site)/_components/ConfigGapBanner.tsx` | o componente, auto-suficiente (faz o próprio fetch) |
| bloco `.config-gap-toast` em `app/(site)/brand-ds.css` | só POSICIONAMENTO |

**Por que a lógica mora fora do componente:** o vitest destes repos é node-only (sem jsdom,
sem testing-library), então componente React não é testável aqui. É o que decide o que tem
teste e o que não tem — mesmo motivo de `lib/portal-routes.ts`.

**Por que quase não há CSS novo:** o design system já tinha `.alert-line`,
`.alert-line--amber` (com tokens `--al-amber-*` definidos em light E dark),
`.alert-line__text`, `.alert-line__close` e `.alert-line--enter` (com
`prefers-reduced-motion` já tratado). O bloco novo só fixa o conjunto no canto. Note que
`OnboardingBanner.tsx` usa `var(--st-pending-bg, #fff6e5)` — esses tokens `--st-pending-*`
**não existem em lugar nenhum**, então aquele banner é sempre claro, inclusive no tema
escuro. Não copie aquele padrão; use os `--al-*`.

**z-index 58**, escolhido de propósito: acima de `.portal-banner` (55), abaixo de
`.portal-header` (60) para o header nunca ser coberto, e muito abaixo de
`.portal-modal-overlay` (100) para nunca flutuar sobre um diálogo.

### Onde monta

- **brain-frontend:** `app/(site)/doctor/layout.tsx`, cobrindo todo `/doctor/*` de uma vez.
  Renderizado FORA do `PortalShell` (não na prop `banner` dele, que é uma faixa
  full-width sob o header — não foi o que se pediu), para que nenhum `transform` futuro num
  container do portal transforme o `position: fixed` em `absolute` sem avisar.
- **secretarIA-frontend:** nas três telas que renderizam `PortalHeader` — `/inicio`,
  `/agenda`, `/configuracao`. Não no `(site)/layout.tsx`: ele também embrulha `/cadastro`,
  `/convite` e as telas de checkout, e avisar sobre config no meio de um cadastro é errado.

### Gates por papel

| onde | `enabled` | por quê |
|---|---|---|
| brain-frontend `/doctor/*` | `products.secretaria === true` | fail-CLOSED, ao contrário do filtro de nav logo acima que é fail-open: esconder um item de nav num fetch que falhou só arrisca um clique morto, mas este aviso mandaria uma clínica só-PreCheck configurar produto que não comprou |
| secretarIA-frontend `/inicio` | `me?.entitlements.products.secretaria === true` | reusa o `getDoctorMe` que a tela já faz — nenhuma request a mais |
| secretarIA-frontend `/agenda`, `/configuracao` | `hubCheckReady && !notEntitled` | essas telas atendem visitante sem sessão em modo demo; espera a checagem de direito ASSENTAR antes de dizer qualquer coisa |

**Não há gate por papel ou por `is_owner`.** O roster é `require_doctor` (aberto a
`doctor|manager|secretary`, e só `bind_self_professional` chama `deny_secretary` naquele
arquivo), e `/configuracao` já deixa qualquer um deles editar qualquer profissional.
Esconder a lacuna de um colega do não-dono inventaria uma permissão que o backend não tem —
ver `portal-role-home` §4.

---

## 5. Armadilhas registradas

- **`complete` ausente ≠ `false`.** Tipo TypeScript é apagado no build; se o payload não
  trouxer o campo, isso significa "este backend não sabe me dizer", nunca "está incompleto".
  Só `complete === false` conta como lacuna. Inventar lacuna manda uma clínica correta ir
  consertar coisa nenhuma.
- **Todo caminho de falha termina em silêncio.** Fetch que falhou, payload que não é array,
  401 — nada disso vira aviso. O banner é a metade proativa do par; o e-mail do FEAT 41 é a
  rede.
- **Nada no `.then()` pode lançar.** `resolveConfigGapNotice` é puro e guarda cada leitura de
  wire; `isConfigGapDismissed` engole storage bloqueado. Numa app `output: "export"` um throw
  ali não vira toast, vira tela branca sem rota de volta.
- **O `dismissKey` carrega os ids ordenados.** Renomear um médico não ressuscita um aviso já
  dispensado; um profissional NOVO quebrar, sim.
- **A checagem de paridade §7 da skill `production-only-crash` está obsoleta.** Ela manda
  rodar `diff -q` em `app/(site)/secretaria/configuracao/lib/*` entre os dois repos — esses
  arquivos não existem mais no `brain-frontend` desde 2026-08-24. Para esta feature, a
  paridade a conferir é a dos quatro arquivos da tabela acima.

---

## 6. Gates (rodados 2026-08-29)

| repo | `npm test` | `tsc --noEmit` | `npm run build` |
|---|---|---|---|
| brain-frontend | 149 passed (6 arquivos) | limpo | 33 rotas estáticas |
| secretarIA-frontend | 318 passed (13 arquivos) | limpo | 20 rotas estáticas |

`tsc` sempre via `.\node_modules\.bin\tsc.cmd` — `npx tsc` é outro pacote nesta máquina.

---

## 7. Pendências

- [ ] Commit + push nos dois repos.
- [ ] **Deploy manual no EasyPanel dos dois frontends.** Commitar não coloca no ar; nesta
      família de apps é assim que incidentes nasceram.
- [x] ~~`NEXT_PUBLIC_SECRETARIA_APP_BASE_URL` vazia no brain-frontend~~ — **RESOLVIDO
      2026-08-29.** O `ARG` no `Dockerfile` agora tem a origem real
      (`https://secretaria-secretaria-frontend.cpux9k.easypanel.host`, confirmada pelo
      usuário), mesmo padrão que resolveu o `..._HUB_BASE_URL` em 2026-07-29. Não confunda
      as duas: HUB é a **API** da secretarIA, APP é o **site**. Provado localmente que assa
      no bundle — a origem e `configuracao?secao=prof` aparecem no chunk
      `app/(site)/doctor/layout-*.js`, então o link resolve para
      `.../configuracao?secao=prof`. Como é export estático, **só entra num rebuild**;
      trocar no painel do EasyPanel sem rebuild não faz nada.
- [x] ~~Conferir o `CORS_ALLOW_ORIGINS` do brain-api antes de confiar no link~~ —
      **CONFIRMADO AO VIVO 2026-08-29.** Preflight `OPTIONS` em
      `secretaria-brain-api.cpux9k.easypanel.host/auth/token` com
      `Origin: https://secretaria-secretaria-frontend.cpux9k.easypanel.host` devolve **200**
      com o `Access-Control-Allow-Origin` correto. O bloqueio de 2026-08-21 (preflight 400,
      que derrubava TODO login vindo daquele domínio) foi corrigido. Guarde o comando: é o
      diagnóstico certo pra "erro genérico ao conectar" vindo de um domínio irmão, e essa
      falha já foi misdiagnosticada uma vez como problema de senha.
- [ ] Verificação ao vivo depois do deploy: o modo demo é estruturalmente incapaz de
      reproduzir este caminho (o seed nunca manda um profissional incompleto), então "no demo
      não aparece" não é evidência de nada.
- [ ] FEAT 43 (banner no PreCheck) segue opcional e não iniciado.
