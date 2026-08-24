# CHECKPOINT — Catálogo de serviços na UI + saída da secretarIA do brain-frontend

Feito em 2026-08-24. Entrega 2 do catálogo canônico de serviços (a entrega 1, no
backend, está em `secretarIA/docs/CHECKPOINT_service_catalog.md`), mais a remoção
das telas da secretarIA do `brain-frontend`.

**Gates:** `tsc --noEmit` limpo · `npm test` **296 passed** (baseline 255, +41) ·
`npm run build` verde (17 rotas). No `brain-frontend`: `tsc` limpo ·
**130 passed** · build verde (33 rotas, sem `/secretaria/*`).

**Status: NÃO COMMITADO / NÃO DEPLOYADO.**

---

## 1. O problema

A Seção 06 "Serviços oferecidos" oferecia uma escolha binária: **herdar da
clínica** (pegar a lista inteira) ou **configuração própria** (digitar tudo de
novo). Nenhuma das duas descreve uma clínica real, onde a Dra. Ana e o Dr. Bruno
ambos fazem "Limpeza" e só a Ana faz "Clareamento".

E a segunda é pior que errada. Digitar de novo criava um **segundo serviço, sem
relação nenhuma**, com o mesmo nome. Isso quebra algo que o paciente sente: quando
um médico cancela, o backend procura um colega que ofereça o mesmo serviço **por
id de catálogo** (`services/flow_router.py::rebooking_candidates` →
`professionals_offering`). Duas strings parecidas não acham ninguém, e o paciente
é mandado escolher tudo de novo.

Pedido do usuário, na íntegra:

> "quando o médico quer herdar serviços da clínica - esses serviços não devem ser
> algo configurado pelo gestor da clinica ou algo assim, mas deve aparecer um card
> para selecionar os serviços que outros médicos ja adicionou no seu portfolio e
> que ele tambem oferece o mesmo serviço."

## 2. A tela nova

Uma lista só: o catálogo da clínica, com **checkbox por serviço**. Marcar = "eu
também faço isso". Preço e duração ficam ao lado, por profissional. Nome, descrição
e orientações são da **clínica** e se editam em um lugar só.

O rádio herdar/própria **sumiu** da Seção 06. A Seção 07 (Dias e horários)
**mantém** o rádio — a herança de horários não mudou em nada.

- `components/ServicesSection.tsx` — reescrita. Renderiza `catalogRows()`.
- `components/ServiceEditorModal.tsx` — **novo**. Cria/edita uma linha do catálogo.
- `components/ServiceCard.tsx` — **apagado**. O card por profissional não existe
  mais; a validação de tamanho do nome (`MAX_LIST_ROW_TITLE_CHARS`, que vira
  título de linha de lista no WhatsApp) migrou para o modal.
- `lib/catalog.ts` — **novo**, puro e testado: `catalogRows`, `unpublished`,
  `pendingLinks`, `alsoAffected`, `offerService`.
- `lib/service-name.ts` — **novo**: `normalizeServiceName` / `nearDuplicateNames`,
  espelhando `services/service_catalog.py`. Lógica duplicada de propósito e
  marcada como tal; o servidor continua sendo a autoridade.

### O aviso antes de renomear — a parte que o usuário pediu explicitamente

> "caso tenha algum outro médico que tambem oferece o mesmo serviço que esta sendo
> mudado aparece um popup de aviso que os médicos X e Y tambem oferece esse serviço
> e isso tambem mudará para eles, portanto confira se isso é válido para eles tambem"

Implementado em `ServiceEditorModal`. Renomear **ou aposentar** um serviço que
colegas oferecem exige uma confirmação que **cita os nomes**. Editar só a descrição
não pede nada: muda o texto que o paciente lê, não o que alguém oferece.

Decisão de permissão (confirmada com o usuário): **qualquer médico** pode criar,
renomear e desativar. O que protege é o aviso, não um gate por papel.

## 3. As três armadilhas de migração

Uma clínica que existe hoje tem serviços como strings soltas, sem catálogo. Três
coisas tinham que dar certo para a tela não destruir dados:

1. **Profissional que HERDA abre com nada marcado.** No fio,
   `appointment_types_inherited: true` vem junto com `appointment_types: []` (o
   campo carrega o valor *próprio*, achatado). Sem tratamento, a tela abriria vazia
   e o próximo save gravaria "não ofereço nada" — tirando um médico que funciona do
   ar. Resolvido em `snapshot.ts::professionalSlicesFromWire(p, clinicTypes)`, que
   **semeia da lista da clínica** quando o profissional herda. `handleDiscard` passa
   a mesma lista, ou Descartar restauraria o estado vazio que nunca existiu.

2. **Serviço fora do catálogo some da tela.** `catalogRows` mostra as sobras com o
   chip "Entra no catálogo ao salvar", e `publishServices` (em `page.tsx`) as
   publica com `?force=true` antes do `PUT` de configuração. `force` é correto
   **aqui e em nenhum outro lugar**: o aviso de quase-duplicado existe para impedir
   alguém de *digitar* um serviço quase igual, e isto publica um serviço que o
   profissional comprovadamente já oferece. Duplicata exata continua impossível — o
   servidor devolve 409 com a linha existente anexada, e ligar a ela é justamente o
   resultado certo.

3. **O segundo médico nunca era ligado.** `catalogRows` casa uma entrada sem id à
   linha do catálogo **por nome normalizado**, então a tela já *parece* certa. Mas
   parecer certo não é estar ligado: sem gravar o id, o registro no servidor
   continua dizendo só "Limpeza". Só o primeiro médico (cuja entrada era publicada)
   ficava ligado; todo colega que apenas *casava* ficava solto para sempre — o exato
   cenário que o catálogo existe para resolver. `pendingLinks()` carimba esses ids
   também, sem nenhuma requisição, e **um save por profissional migra a clínica
   inteira**.

Um quarto detalhe, mais discreto: se o `GET` do catálogo **falha**, `catalog` fica
`null` e `publishServices` **não faz nada**. Tratar a falha como catálogo vazio
publicaria a lista inteira do profissional como serviços novos da clínica.

## 4. Google Calendar: "Conta única" passou a criar as agendas

Contrato e razões no `secretarIA/docs/CHECKPOINT_google_calendar_modes.md` §9. Do
lado daqui: `lib/save.ts` ganhou `publishServices` (antes do write, porque o
payload precisa dos ids) e `ensureCalendars` (**depois** do write bem-sucedido,
porque criar agendas para um modo que o servidor recusou deixaria lixo na conta
Google da clínica). Uma falha do Google nunca transforma um save bem-sucedido em
erro — vira contagem no toast.

O toast diz o que ficou pendente (serviços não publicados, agendas não criadas) e
usa o tom de **erro** quando há sobra: "salvo" sozinho seria tecnicamente verdade e
praticamente mentira.

## 5. brain-frontend: as telas da secretarIA saíram

Pedido: *"pode apagar tudo da secretaria que esta em brainfrontend, portanto as
abas dos médicos de agenda e configuracao"*.

Apagados: `app/(site)/secretaria/` inteiro (41 arquivos — agenda, configuração,
`_shared`), as duas abas do `doctor/layout.tsx`, e os arquivos que ficaram órfãos
com isso: `doctor/perfil/SecretariaConfigSection.tsx`, `doctor/perfil/lib/`,
`app-shell.css`, `product-tokens.css` e `__tests__/app-shell-viewport.test.ts` (o
guard do FIX 33 continua vivo no `secretarIA-frontend`, que é onde as telas estão
agora).

**Decisão que passou do pedido literal:** o card "Configurações secretarIA" dentro
de *Meu Perfil* também saiu. Não era uma das duas abas citadas, mas era uma
superfície de configuração da secretarIA gravando no hub a partir do
brain-frontend — exatamente a divergência que motivou o pedido — e era a última
coisa importando a árvore apagada.

`lib/secretaria-app.ts` (**novo**) guarda a origem do app da secretarIA. Todo link
que ia para `/secretaria/*` virou `<a>` cross-origin: `next/link` não sai da
aplicação, e usá-lo aqui renderizaria um link que não faz nada. Sem a origem
configurada, os controles aparecem **desabilitados com o motivo**, nunca apontando
para uma rota que dá 404.

Os dois `router.replace("/secretaria/configuracao")` (convite aceito, checkout
concluído) agora vão para `/doctor/dashboard`. A sessão fica em `sessionStorage`,
que é **por origem** — mandar um usuário recém-criado para o outro domínio o
receberia com uma segunda tela de login.

### ⚠️ Variável de build nova

`NEXT_PUBLIC_SECRETARIA_APP_BASE_URL` — a origem pública do
**secretarIA-frontend**. Já tem o par `ARG`/`ENV` no `Dockerfile` do
brain-frontend (obrigatório: `NEXT_PUBLIC_*` é assado no build; setar só no painel
do EasyPanel **não tem efeito**). O default é vazio de propósito. **Enquanto não
for preenchida no build, os links da secretarIA no portal Brain ficam
desabilitados.**

## 6. Pendências

1. Preencher `NEXT_PUBLIC_SECRETARIA_APP_BASE_URL` e rebuildar o brain-frontend.
2. Migração `d1c2b3a4e5f6` (tabela `services`) em produção — **a tela depende
   dela**; sem a tabela o `GET /tenants/me/services` falha e a Seção 06 mostra o
   erro com "Tentar de novo".
3. Deploy do secretarIA **API + worker no mesmo SHA** (toca `services/`).
4. Backfill do catálogo (opcional — a tela publica o que falta ao salvar).
5. Commit dos três repositórios.
