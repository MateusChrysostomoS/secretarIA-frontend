# secretarIA-frontend

Frontend dedicado da **secretarIA** — um dos 3 domínios da Brain (Brain / precheck.com.br /
secretarIA), separado do `brain-frontend` em 2026-08-14. A **brain-api continua sendo a única
autoridade de identidade**: o mesmo login funciona aqui e no portal Brain.

Comece por `docs/CHECKPOINT_secretaria_frontend.md` — mapa de rotas, o que foi portado do
`brain-frontend` e o que ficou de fora (com o porquê), decisões da separação, lacunas
conhecidas e o guia de deploy no EasyPanel.

## Documentação — manter em dia (obrigatório)

Os arquivos em `docs/` são a **fonte de verdade pra entender o projeto** — o objetivo é que uma
sessão nova do Claude Code (ou qualquer pessoa) entenda tudo, profundamente, só lendo `docs/`.
Por isso eles **têm que refletir o estado real** do projeto.

**Quando atualizar:** ao fazer mudanças numa sessão, atualize os docs afetados — **não
necessariamente na hora de cada mudança, mas no FIM da sessão**, depois que tudo foi **validado e
verificado** (testes passando, deploy/migração confirmados). Documentar antes de validar gera doc
errado; documentar depois garante que o doc descreve o que realmente está no ar.

**Regras:**
- Feature grande/multi-camada → um `docs/CHECKPOINT_<FEATURE>.md` (estado, o que entrou onde,
  deployado/testado, pendências) + 1 linha de ponteiro nos docs relevantes.
- Cite âncoras estáveis (nome de função/componente), não números de linha frágeis, quando possível.
- Mantenha o `CHECKPOINT_*` da feature em dia até ela ser 100% concluída/encerrada; aí vira histórico.

## Convenções deste repo

A skill `front-brain` (`TECH/.claude/skills/front-brain/`) cobre as convenções desta família
de repos e **substitui** a skill genérica `frontend` aqui. Em resumo:

- **Static export** (`output: "export"` → `/out`, servido por nginx). Sem SSR, sem
  `middleware.ts`, sem Server Actions, sem rota dinâmica — estado de "qual item abrir" vai
  por **query param** (`?id=`), nunca por `[id]/page.tsx`.
- **CSS puro escrito à mão**, sem Tailwind e sem lib de utility classes. Reutilize o
  vocabulário existente (`.btn--*`, `.pfield`, `.portal-toolbar`, `.ptable`, `.pbadge--*`).
- **Um cliente tipado por backend**: `lib/manage-api.ts` (brain-api) e `lib/secretaria-hub.ts`
  (hub da secretarIA). Não crie `fetch` solto fora deles. Ao adicionar uma chamada nova em
  `manage-api.ts`, siga o padrão de comentário `// MANAGE-API CALL SITE #N`.
- **`NEXT_PUBLIC_*` são assadas no build** pelos pares `ARG`/`ENV` do `Dockerfile` — setar só
  no painel do EasyPanel não tem efeito. Toda variável nova precisa do par na mesma tarefa.
- Texto de UI em **português**; nomes de componente/variável e comentários em **inglês**.
- Gates reais: `.\node_modules\.bin\tsc.cmd --noEmit` + `npm test` + `npm run build`
  (não existe config de ESLint; `npx tsc` é um pacote errado nesta máquina).

## Prompts prontos para rodar

Prompts de feature já roteirizados (contexto investigado, decisões de escopo já confirmadas
com o usuário) ficam em `TECH/BRAIN/z_prompts/` — convenção compartilhada entre os repos da
Brain, não uma pasta deste repo. Cole o conteúdo inteiro numa sessão nova quando for a hora
de executar:

- `z_prompts/PROMPT_FABLE_secretaria_frontend_home_inicio.md` — cria a rota `/inicio` como
  nova home única do app (troca `/agenda` no papel de `PORTAL_HOME`), com cards de navegação
  pro resto do site (Agenda, Configuração) e ao menos um elemento de conteúdo liberado por
  `isOwner`. Resolve a lacuna: hoje não existe navegação persistente entre `/agenda` e
  `/configuracao` — um usuário só alcança a segunda digitando a URL. Reverte deliberadamente
  a decisão de "uma home só" tomada na separação de 2026-08-14 (decisão nº2 do CHECKPOINT) —
  use quando quiser essa reversão.
- `PROMPT_FEAT_42_...BANNER_FRONTENDS.md` foi **executado em 2026-08-29** — ver
  `docs/CHECKPOINT_config_gap_banner.md`. O prompt afirmava que o sinal viria de
  `GET /config`; ele vive em `GET /tenants/me/professionals`, e este app o lê pelo
  brain-api (`getDoctorProfessionals`), a MESMA fonte que o `brain-frontend` — por isso
  `lib/config-gap.ts` e `_components/ConfigGapBanner.tsx` são idênticos nos dois repos.

### Auditoria de rotas & requisições — 30/08/2026

Ordem de execução por onda (dependência por colisão de arquivo, não por tema):
`z_prompts/PLANO_EXECUCAO_AUDIT_FRONTEND.md`.

11 prompts gerados a partir de uma auditoria completa de produção (15 rotas sem sessão + 5
telas autenticadas, clínica real). Cada prompt já inclui uma investigação de confirmação
read-only feita em cima do achado original — vários números/causas do relatório original
estavam imprecisos ou errados, e cada prompt documenta a correção antes da tarefa. Ordem de
prioridade sugerida (impacto ÷ esforço, não gravidade pura): agenda → A11Y de componentes →
headers de nginx → guarda de sessão → o resto.

- `PROMPT_AUDIT_FRONTEND_AGENDA_DATAS_ERRADAS.md` — **crítico, comece por aqui.** A agenda
  mostra (e o WhatsApp de confirmação ao paciente cita) datas fixas de junho/2026; o raio do
  bug é maior do que a auditoria percebeu (`dayFull()`, `NowLine`, `MonthView` também
  hardcoded) e o mecanismo do bug de domingo é diferente do relatado (evento é buscado e
  descartado no mapeamento, não excluído da janela de busca).
- `PROMPT_AUDIT_FRONTEND_A11Y_CTOGGLE_CSELECT.md` — `CToggle`/`CSelect` sem nome acessível;
  existem 4 implementações independentes do mesmo controle de toggle sem label no repo.
  `CToggle` e `CSelect` têm causas raiz diferentes (só um dos dois pode ser resolvido por
  `<label>` envolvendo).
- `PROMPT_AUDIT_FRONTEND_A11Y_CONTRASTE_LANDMARKS.md` — contraste insuficiente (3 tokens/CSS
  diferentes, não 1 como a hipótese original) e landmarks ausentes em `/configuracao`; a
  alegação sobre o progressbar do cadastro estava desatualizada (os `aria-value*` já
  existem).
- `PROMPT_AUDIT_FRONTEND_SEC_NGINX_HEADERS.md` — `nginx.conf` sem nenhum header de
  segurança, 404 que nunca é servido, sem `robots.txt`. Pede decisão do usuário sobre
  estratégia de CSP (os payloads de hidratação RSC mudam de hash a cada build).
- `PROMPT_AUDIT_FRONTEND_SEC_TOKEN_STORAGE.md` — `refreshToken` em `sessionStorage` é
  arquitetura **documentada** pela skill `front-brain` ("nunca em cookie"), não descuido.
  Prompt pede decisão de escopo antes de qualquer mudança — migrar para cookie httpOnly é
  cross-repo (brain-api + brain-frontend), não um patch local.
- `PROMPT_AUDIT_FRONTEND_GUARDA_SESSAO.md` — botão "Sair" aparece sem sessão no modo demo de
  `/agenda`/`/configuracao` (bug real) + `/` não redireciona sessão já autenticada. **NÃO**
  unificar as 5 telas sob guard único — a skill `portal-role-home` documenta a demo como
  decisão de produto deliberada, não bug.
- `PROMPT_AUDIT_FRONTEND_API_CLIENTS_DIVERGENTES.md` — `manage-api.ts`/`secretaria-hub.ts`
  divergem de `brain-frontend`; a divergência real de `secretaria-hub.ts` é ~161 linhas, não
  as "1739" da auditoria (era mismatch de line-ending LF/CRLF entre os repos). Pede decisão
  de escopo (normalizar encoding vs. extrair pacote compartilhado).
- `PROMPT_AUDIT_FRONTEND_BUILD_HIGIENE.md` — `next lint` sem o pacote ESLint sequer
  instalado; Next 15.1.6 desatualizado. Os números de `npm audit` da auditoria original
  ("27 critical") estavam errados — corrigidos no prompt (na verdade 2 critical em `next`).
- `PROMPT_AUDIT_FRONTEND_FONTES_LGPD.md` — 7 famílias de fonte do Google carregadas sem
  gate de consentimento (ponto de LGPD num app de saúde); migrar para `next/font/google`.
- `PROMPT_AUDIT_FRONTEND_REQUISICOES_DUPLICADAS.md` — `GET /doctor/professionals` duplicado
  em `/configuracao` (e provavelmente também em `/agenda`/`/inicio` via `ConfigGapBanner`,
  não confirmado pela auditoria original). Corrige também uma causa errada que a auditoria
  atribuiu à lentidão de `/doctor/onboarding` (não tem relação com o cache de hub token).
- `PROMPT_AUDIT_FRONTEND_UX_ONBOARDING.md` — código de erro cru da Meta em
  `/app/onboarding` (ex.: "auth_cancelled"); `/app/reativar` não mostra dias restantes,
  só total e prazo final.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
