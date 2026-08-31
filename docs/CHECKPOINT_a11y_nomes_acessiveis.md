# CHECKPOINT — nomes acessíveis dos controles de formulário (A11Y-1)

**Estado:** implementado, validado em Chrome real, **não commitado** (working tree) e
**não deployado** (exige rebuild da imagem). Data: 2026-08-31.

Corrige o achado **A11Y-1** da auditoria de 30/08/2026
(`z_prompts/PROMPT_AUDIT_FRONTEND_A11Y_CTOGGLE_CSELECT.md`): controles de formulário
escritos à mão chegavam ao leitor de tela **sem nome nenhum**.

O padrão geral virou a skill `custom-control-accessible-name` (em `TECH/.claude/skills/`),
referenciada a partir de `front-brain`.

---

## 1. O que foi medido (não inferido)

Tudo abaixo saiu de **Chrome real dirigido por CDP**, lendo o nome acessível calculado pelo
próprio browser (`Accessibility.getPartialAXTree` → `node.name.value`) — a string que o
leitor de tela recebe — mais **axe-core 4.10.2** rodando na mesma página renderizada.

`/configuracao` e `/agenda` renderizam um **demo sem sessão**, então foram auditadas contra
um `out/` local, sem login. `/app/onboarding` exigiu plantar `brain.session` no
`sessionStorage` e stubar um `fetch` via `Page.addScriptToEvaluateOnNewDocument`.

### Antes

| superfície | `select-name` | `button-name` | `label` | controles sem nome (medido) |
|---|---|---|---|---|
| `/configuracao` | 43 | 14 | 0 | **45 selects, 14 switches, 3 inputs** |
| `/app/onboarding` | 0 | 2 | 0 | 2 switches |
| modal "Nova consulta" | 0 | 1 | 1 | 1 switch, 1 textarea |

### Depois

| superfície | controles | sem nome | violações de nome no axe |
|---|---|---|---|
| `/configuracao` | 160 | **0** | **nenhuma** |
| `/app/onboarding` | 3 | **0** | **nenhuma** |
| modal "Nova consulta" | 12 | **0** | **nenhuma** |

Sobram em `/configuracao` só `color-contrast` e `region` — os achados **A11Y-2 / A11Y-3**,
que têm prompt próprio e ficaram deliberadamente de fora.

---

## 2. Três causas raiz distintas (a auditoria via uma só)

### 2.1 Controle sem conteúdo para nomear — `CToggle`, `CSelect` e cópias

O único filho do switch é um `<span>` decorativo; o `<select>` é nu. Não há de onde computar
*name from content*. **43 selects + 14 switches.**

### 2.2 O `<label>` do `Field` estava preso no controle ERRADO

`Field` (`app/(site)/_shared/ui.tsx`) tem um `<label>` como raiz, envolvendo
`<span>{label}{tip && <HelpTip/>}</span>` e depois `{children}`. Um `<label>` que envolve
vários elementos rotuláveis (`button`, `input`, `meter`, `output`, `progress`, `select`,
`textarea`) nomeia **só o primeiro em ordem de DOM** — e `HelpTip` renderiza
`<button aria-label="Ajuda">` **antes** dos filhos.

Provado com a API da própria plataforma, `label.control`:

| `Field` | tem `tip`? | `label.control` resolve para | select nomeado? |
|---|---|---|---|
| Idioma de atendimento | não | `select` | **sim** |
| Política de retenção | sim | `button[aria-label=Ajuda]` | **não** |
| Duração padrão | sim | `button[aria-label=Ajuda]` | **não** |

Atinge 14 controles ao todo: 2 selects, 3 inputs do `NumberField` (sem nome nenhum) e mais 9
que só se salvam pelo `placeholder`.

### 2.3 O `<label>` do `ToggleRow` nomeia — mas horrível

Ao contrário do que o prompt afirmava, **`<button>` é rotulável**, e o Chrome nomeou os 2
switches do `ToggleRow`. O defeito é o valor: virou o texto INTEIRO do label, título e
descrição colados — *"Cobrar sinal via Pix Reduz faltas cobrando um sinal quando o paciente
agenda. Requer o add-on…"* — ~300 caracteres lidos em voz alta antes de o usuário saber o
que o switch faz. Bug de *nome ruim*, não de *nome ausente*; o axe nunca vai apontar.

---

## 3. Onde a auditoria e a investigação erraram

| alegação | realidade medida |
|---|---|
| "3 de 6 chamadas de `CSelect` já estão dentro de `Field` e plausivelmente já têm nome" | só **1 das 3** tinha; as outras 2 caíam na causa 2.2 |
| "`<label>` envolvendo NÃO nomeia um `<button role=switch>`" | **nomeia sim** — mal (causa 2.3) |
| "o `<select>` do modal Nova consulta não tem nome" | os **4** selects do modal já tinham nome (`Field` sem `tip`); o defeito real ali era o `Toggle` e um `<textarea>` |
| "14 switches" | são **16** no DOM: 14 sem nome, 2 com nome ruim |
| axe basta para confirmar | axe **passou** os 2 selects e 3 inputs da causa 2.2 — falso negativo pela checagem de *implicit label* |

---

## 4. O que mudou

O contrato: **todo controle escrito à mão recebe `label: string` obrigatório e o gasta em
`aria-label`.** Obrigatório e não opcional porque aí o compilador enumera as chamadas — prop
opcional é exatamente como um controle chega em produção sem nome.

| arquivo | mudança |
|---|---|
| `configuracao/components/CToggle.tsx` | `label` obrigatório → `aria-label` |
| `configuracao/components/CSelect.tsx` | `label` obrigatório → `aria-label`, nos **6** call sites, inclusive os 3 dentro de `Field` |
| `configuracao/components/ToggleRow.tsx` | repassa `label={title}`; comentário corrigido |
| `configuracao/components/AvailabilitySection.tsx` | `DayRow` ganha `groupLabel`; nomes compostos nas 2 grades |
| `configuracao/components/{Messages,Pix,Services}Section.tsx` | `label` nos call sites; `NumberField` passa `aria-label` ao `TextInput` |
| `agenda/modals.tsx` | `Select` local: `label` obrigatório nos **12** call sites; `Toggle` local ganha `type="button"`, `role="switch"`, `aria-checked` e `label`; o `<textarea>` do `MessagePreview` ganha um `<label htmlFor>` de verdade (a legenda era um `<div>` solto) |
| `app/onboarding/_components/PauseToggles.tsx` | `Switch` local ganha `label` |
| `app/__tests__/control-accessible-names.test.ts` | **novo** — guarda o contrato |

### Nomes compostos nas grades de horário

`/configuracao` mostra **duas** grades de 7 dias (clínica e profissional) com os mesmos nomes
de dia. Cada controle dobra o título da grade no nome:

```tsx
const scope = day.label + " — " + groupLabel;   // "Segunda — Horário semanal do profissional"
<CToggle label={"Atender " + scope} />
<CSelect label={"Início da faixa " + (i + 1) + " — " + scope} />
```

Um `role="group"`/`<fieldset>` por grade seria o complemento certo, mas **não substitui**: as
listas de elementos/formulários do NVDA/JAWS e o alvo de controle por voz mostram o nome
próprio do controle, sem legenda de ancestral. Fica para o prompt de landmarks (A11Y-3).

---

## 5. Como isso é guardado

A suíte roda no ambiente **`node`, sem jsdom** (ver `vitest.config.ts`) — nenhum teste
consegue renderizar componente nem perguntar o nome acessível à plataforma. Então o guard é
por **texto de fonte**, no mesmo estilo de `app/__tests__/no-third-party-resources.test.ts`:
`app/__tests__/control-accessible-names.test.ts` (20 casos) verifica que cada controle
declara `label` **não-opcional**, que o gasta em `aria-label`, que **nenhum call site** omite
`label=`, e que todo switch carrega `role="switch"` + `aria-checked`.

O guard foi validado por mutação: tornando `label` opcional e removendo um `label=` de uma
chamada, ele falha nos 2 pontos certos; restaurados os arquivos, volta a 20/20.

**Gates:** `tsc --noEmit` limpo · `npm test` 474/474 · `npm run build` verde.

---

## 6. O que NÃO foi corrigido (de propósito)

- **A causa 2.2 continua viva na origem.** `Field` ainda reata seu `<label>` no botão do
  `HelpTip` sempre que tem `tip`. Os controles conhecidos foram blindados um a um, mas
  `Field` não dá sinal nenhum ao compilador — o próximo componente novo colocado dentro de um
  `<Field tip="…">` cai no mesmo buraco. Consertar na raiz é mudar a API do `Field`
  (associação explícita `id`/`htmlFor`), não um patch por call site.
- **9 controles nomeados pelo `placeholder`** (3 inputs, 6 textareas): o leitor de tela
  anuncia o texto de exemplo ("Av. Paulista, 1000") em vez do rótulo. Passa no axe, erra na
  prática. Mesma origem, mesma correção de raiz.
- **`hint` e `tip` do `Field` são só para quem enxerga** — nunca ligados por
  `aria-describedby`.
- **20 botões "Remover faixa" idênticos** e 10 "Adicionar faixa": têm nome, mas todos o
  mesmo. Não é falha de 4.1.2, é ambiguidade.
- **`aria-label` em `<select>` nativo só foi medido no Chrome.** Historicamente há lacunas em
  **Safari/VoiceOver** que a associação nativa por `<label>` não tem. Se iPad/iPhone importar
  para a clínica, confirmar lá antes de dar o assunto por encerrado.
- **Nenhum leitor de tela real (NVDA/Narrator) foi executado ponta a ponta.** A verificação é
  o nome computado pelo próprio motor de acessibilidade do Chrome, que é a string entregue à
  AT — mais forte que axe (que aqui deu falso negativo), mas não é o mesmo que ouvir o
  anúncio. Uma tentativa de ler os nomes pela UI Automation do Windows não expôs o conteúdo
  web sem um cliente de AT ativo.

---

## 7. Pendências para deploy

Igual às outras correções desta rodada: o `out/` só muda com **rebuild da imagem** no
EasyPanel. Nenhuma env var nova, nenhuma migração.
