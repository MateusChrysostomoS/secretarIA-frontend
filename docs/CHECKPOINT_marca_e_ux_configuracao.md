# CHECKPOINT — Marca Brain nova + rodada de UX na Configuração

**Data:** 2026-08-24, marca revista em 2026-08-25 · **Estado:** BUILT e validado localmente

As seções de UX (3 a 5) foram commitadas em `59f0108`. As seções 1 e 2 (marca e favicon)
substituem uma primeira tentativa que serviu a arte como **bitmap** (`public/brand/brain-logo.png`,
commit `adaee99`): funcionava, mas prendia a marca num verde fixo e divergia do caminho que o
`brain-frontend` e o `PreCheck` já tinham adotado — vetorizar. O bitmap e o `public/` saíram.

Gates verdes neste repo: `tsc --noEmit`, `npm test` (12 arquivos / 297 testes), `npm run build`.
Verificação visual feita no build estático servido localmente (login `/` e `/configuracao` em
modo demo), nos dois temas.

---

## 1. Marca — a logo Brain de verdade

`app/(site)/_components/BrandGlyph.tsx` passa a servir **a logo real**, vetorizada do arquivo da
marca (`brand-src/brain-logo-original.png`, versionado junto para poder ser regerada). O que existia
aqui antes era uma reconstrução à mão — arcos escritos um a um tentando lembrar a forma. Mesmo
`viewBox 32×32` e mesma prop `size`, então os **9 call sites deste repo não mudaram uma linha**.

O componente e o bloco de CSS são **cópia idêntica** do `brain-frontend` (lá no commit `54c81c9`).
Se um mudar, o outro tem que acompanhar — são dois arquivos, não um pacote compartilhado.

**Como regerar, se a arte mudar.** Três armadilhas, anotadas também no componente:

- o PNG da marca vem com **fundo branco OPACO** (tem canal alpha, mas é 255 inteiro), então a
  máscara sai da *distância ao branco*, não do alpha;
- o `potracer` trata `False` como tinta — passar a máscara direta **vetoriza o fundo** e devolve a
  logo em negativo; ela tem que ir invertida;
- sem um blur gaussiano (~3) na máscara sobreamostrada antes de traçar, o potrace segue cada degrau
  da serrilha do PNG: ~70 KB de path em vez de 8, sem nenhum ganho visual.

`fillRule="evenodd"` não é decorativo: são 10 contornos, e os vazios entre os sulcos do cérebro só
ficam vazados por causa dele.

**Cor.** A logo é uma forma só (`.gl`), então as três classes que dividiam o desenho antigo (`.gs`
stroke, `.gt` cauda, `.gf` nós) saíram junto. E a marca **não segue os tokens do produto**: tem verde
próprio, `#45965d`, com `#5cb87a` no escuro — o verde cheio tem contraste ~3:1 sobre o navy e some
quando o glifo cai para 20px.

### Login (`/`) — grupo `(auth)`

`app/(auth)/_shared/AuthShell.tsx` mostra o lockup **"Brain │ secretarIA"**, o mesmo do
`PortalHeader`. O default de `role` é `"Portal da clínica"`: era `"por Brain"`, e o lockup logo acima
já diz Brain — a linha repetia a palavra.

**Armadilha, e ela já mordeu o `brain-frontend`:** esse grupo roda no CSS portado do PreCheck e
**não carrega `brand-ds.css`** — que é onde `.gl` ganha `fill`. Um `<path>` sem nenhum fill pintado
não fica sem cor, fica **PRETO**; e como o tema padrão desses grupos legados é o escuro, a marca
some no navy sem erro nenhum no console. Por isso `(auth)/_shared/auth-shell.css` **repete** os dois
tons, escopado em `main.login-page .login-brand`. Toda superfície nova que use `<BrandGlyph />` fora
do `(site)` precisa fazer o mesmo.

## 2. Ícone da aba (favicon)

A aba não tinha ícone nenhum: sem `app/favicon.ico`/`icon.png`/`apple-icon.png`, o navegador mostrava
o globo genérico, e o site salvo na tela inicial do celular idem. Os três arquivos vieram do
`brain-frontend` (commit `d60b559` lá), gerados da mesma arte: o fundo branco opaco vira alpha
(senão o ícone seria um quadrado branco com a logo dentro) e a arte fica com 8% de folga de cada
lado. O `.ico` carrega 16/32/48/256.

O App Router monta as três tags sozinho a partir dos nomes em `app/` — conferido no HTML do build:

    <link rel="icon" href="/favicon.ico" ...>
    <link rel="icon" href="/icon.png?..." sizes="512x512">
    <link rel="apple-touch-icon" href="/apple-icon.png?...">

É a marca **Brain**, não um ícone próprio da secretarIA — que não existe. Se um dia existir, é aqui
que troca.

---

## 3. Google Calendar na aba Profissionais (Seção 05) e na Seção 08

O que a linha do profissional mostra passou a depender do `google_calendar_mode` de verdade, em vez
de duas variações do mesmo botão:

| modo | linha do profissional | Seção 08 (clínica) |
|---|---|---|
| `shared_account` | **nenhuma ação** — o chip "Agenda" já reporta o resultado | card de conectar/conectado, como antes |
| `per_professional` | conectado → chip verde **"Conectado"** (não clicável); senão → botão de OAuth | card de conectar **escondido**, com um apontamento para a Seção 05 |

**Armadilha registrada:** "esse médico conectou a agenda dele" é `calendar_source === "professional"`,
**nunca** `has_calendar`. `has_calendar` também é `true` para quem só está coberto pela credencial da
clínica — foi exatamente assim que a tela de perfil passou a oferecer "Reconectar agenda" para quem
nunca conectou nada. `calendar_source` é obrigatório em `ProfessionalListItem`
(`secretarIA/src/secretaria/schemas/professional.py`), mas o cliente o declara **opcional**: contra um
backend antigo ele vem `undefined`, e aí a linha cai nos rótulos antigos por `has_calendar` em vez de
afirmar uma conexão que ninguém confirmou.

Remover o botão "Criar agenda do profissional" do modo `shared_account` é seguro porque o salvamento
já cria a agenda de todo profissional ativo (`shouldEnsureCalendars` / `ensureCalendars` em
`page.tsx`, idempotente). Com ele saíram `handleCreateCalendar`, `RosterActionError` e o CTA de
scroll — o único erro que sobrou é a falha do OAuth, que não tem CTA.

A faixa fixa de salvar também virou consciente do modo: em `per_professional` ela dizia "Conecte o
Google Calendar para ativar a sincronização", cobrando uma conexão de clínica que esse modo não usa.

---

## 4. Serviço novo já nasce marcado para quem o criou

`handleServiceSubmit` (page.tsx): ao **criar** (não ao editar) um serviço do catálogo, ele também
entra na lista do profissional selecionado. Antes a pessoa digitava o serviço, fechava o diálogo,
via a linha na lista e ia embora sem marcar o checkbox — o profissional não passava a oferecer nada
e o bot nunca mencionava o serviço.

Só acontece quando `professionalEditable` é verdadeiro: marcar dentro de uma lista ainda não
hidratada (portanto vazia) montaria um payload que apaga o que o hub guarda — ver `lib/hydration.ts`.

---

## 5. Horário da clínica + "Preencher horários padrão da clínica" (Seção 07)

O seletor **"Herdar da clínica / Configuração própria"** saiu. Ele obrigava o médico a responder uma
pergunta de modelagem de dados ("seu horário é um override?") antes de conseguir digitar um horário —
e, pior, **o horário da própria clínica não tinha campo nenhum nesta tela**: existia só como o que o
ramo "herdar" exibia, em modo leitura. A clínica nunca conseguia defini-lo.

Agora a Seção 07 tem duas grades:

1. **Horário de funcionamento da clínica** (`tenants.business_hours`) — editável, com o mesmo gate de
   hidratação de qualquer campo tenant-level desta tela.
2. **Horário semanal do profissional**, sempre editável, com o botão **"Preencher horários padrão da
   clínica"** que copia a grade de cima como ponto de partida.

A herança continua real por baixo (`business_hours: null` = segue a clínica ao vivo), mas virou
**consequência de não ter digitado nada**, não um modo a escolher. Quem herda vê a grade da clínica
no lugar da própria (vazia), e **mexer nela é o ato de assumir** — o flip mora em
`setProfessionalDays` (page.tsx) e só sai de `"inherit"`, nunca de `"unknown"` (que significa "o
backend não disse", e afirmar `"own"` por ele seria justamente o chute que `ConfigInheritance` existe
para recusar).

**Armadilha registrada:** por isso `AvailabilitySection` passa a **semana inteira** para `setDays`, e
não um updater funcional. Enquanto se herda, `days` está vazio — um `setDays(prev => ...)` deixaria
cair os outros seis dias na primeira edição.

### Consequências de contrato
- `TenantSlices` ganhou `clinicDays`; `tenantSlicesFromWire` / `emptyTenantSlices` acompanham.
- `buildConfigUpdatePayload` recebe um 7º argumento (`clinicDays`) e passou a enviar `business_hours`
  no PUT tenant-level — campo que **já existia na wire e já tinha consumidores** (o plugin
  `human_backup` decide "fora do expediente" por ele; o prompt do agente o recita ao paciente).
- `dirtySections` marca `disp` quando só o horário da clínica mudou, senão o Descartar diria que não
  há nada a descartar logo depois de a pessoa digitar a semana da clínica.
- `InheritanceChoice.tsx` foi **apagado**; o `InheritedNote` que ele exportava virou
  `components/InlineNote.tsx` (usado por Seção 06 e 07).

---

## Decisão de escopo que ficou de fora

O pedido dizia "o médico gestor consiga pôr o horário da clínica". A grade da clínica **não** foi
restringida a `is_owner`: nenhum outro campo tenant-level desta tela é (saudação, Pix, endereço), o
`PUT /tenants/me/config` não é owner-only no backend, e um gate só no cliente seria uma restrição
inventada que o servidor não cumpre. O bloco é rotulado como sendo da clínica inteira; o gestor
consegue definir, e ninguém ganha um botão morto.

## Pendências

- Commit + push + deploy (EasyPanel) — nada disto foi enviado.
- O chip "Conectado" foi validado por leitura de contrato, não em tela: o modo demo não tem
  `calendar_source` (o snapshot do visitante é vazio). Conferir com uma clínica real depois do deploy.
