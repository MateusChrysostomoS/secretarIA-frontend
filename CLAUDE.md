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

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
