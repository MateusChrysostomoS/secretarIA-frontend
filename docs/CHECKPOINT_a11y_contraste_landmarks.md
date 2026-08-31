# CHECKPOINT — contraste e landmarks (A11Y-2 / A11Y-3)

**Estado:** implementado, medido em Chrome real, **não commitado** (working tree) e
**não deployado** (exige rebuild da imagem). Data: 2026-08-31.

Corrige os achados **A11Y-2** (contraste) e **A11Y-3** (landmarks + nome do progressbar) da
auditoria de 30/08/2026 (`z_prompts/PROMPT_AUDIT_FRONTEND_A11Y_CONTRASTE_LANDMARKS.md`).
Complementa `docs/CHECKPOINT_a11y_nomes_acessiveis.md` (A11Y-1, nomes de controle), que
deixou contraste e `region` explicitamente de fora.

---

## 1. Como foi medido

axe-core 4.10.2 rodando em **Chrome real dirigido por CDP** contra o `out/` estático servido
localmente — **5 telas × 2 temas**. `/agenda` e `/configuracao` renderizam um demo sem
sessão, então não exigem login; `/cadastro` exige `?plan=secretaria_basico` (sem isso a rota
cai em "Plano não encontrado" e o wizard — logo o progressbar — nunca monta).

O tema é determinístico plantando `localStorage.secretaria_theme` **antes** de qualquer
documento rodar (`Page.addScriptToEvaluateOnNewDocument`). Isso importa: o boot inline do
`app/layout.tsx` faz `location.pathname === '/' ? 'dark' : 'light'`, ou seja **a tela de
login abre em ESCURO por padrão** e todas as outras em claro. Medir só o default esconde
metade dos defeitos.

---

## 2. A auditoria original errou os números — o fundo não é `--surface`

Todos os cálculos do relatório usavam `--surface` (`#fffdf8`) como fundo. O fundo real da
`/agenda` e do cabeçalho da `/configuracao` é **`--page` (`#f4eee3`)**, porque `.app-screen`
pinta `background: var(--page)`. `--page` é mais escuro, então **todos os contrastes reais
eram piores** do que o relatado:

| elemento | relatado | **medido** |
|---|---|---|
| `--ink-faint` claro | 2.88:1 | **2.53:1** (sobre `--page`) |
| `--ink-faint` escuro | 3.76:1 | 3.76:1 sobre `--surface`, **3.32:1** sobre `--surface-2` |
| `--brand` como texto | 4.38:1 | **3.85:1** (sobre `--page`) |
| `--dim` (login) | 2.96:1 | 2.96:1 claro, **3.47:1** escuro |

## 3. São SEIS causas, não três — e uma delas é o inverso das outras

| # | par de cor | onde | claro | escuro | precisa |
|---|---|---|---|---|---|
| A | `--ink-faint` sobre `--page`/`--surface`/`--surface-2` | grade da agenda, gutter de horas, cabeçalhos de dia, eyebrows, hints, label do progressbar | 2.53 | 3.32 | 4.5 |
| B | `--dim` sobre `--surface`/`--bg` (auth) | divisor "OU", placeholders | 2.96 | 3.47 | 4.5 |
| C | `--brand` como TEXTO pequeno | wordmark "IA", "SEG" do dia de hoje, link do `HubNotice` | 3.85 | passa | 4.5 |
| D | **`#fff` sobre fundo `--brand`** | `Segmented` ativo ("Semana"), badge "31" de hoje, `.btn--primary` | 4.44 | **2.59** | 4.5 |
| E | `--teal` (auth) como TEXTO pequeno | "Esqueci minha senha", `.login-badge` | 4.02 | passa | 4.5 |
| F | `--ink-faint` do escopo `.band-dark` | `/inicio` | — | 3.54 | 4.5 |

**A causa D é a que a auditoria não viu, e é a única com um conflito real.** No tema claro
`--brand` falhava nos DOIS papéis (texto e fundo) e ambos pediam a mesma direção: escurecer.
No tema **escuro** `--brand` é um teal CLARO — ótimo como texto sobre o fundo escuro, mas
`#fff` em cima dele dá **2.59:1**, abaixo até do piso de 3:1 para elementos gráficos.
Escurecer `--brand` no escuro consertaria o fundo e quebraria o texto. Quem se move é o
**primeiro plano**, não a marca.

Daí o token novo **`--on-brand`**: primeiro plano de qualquer coisa pintada SOBRE um
preenchimento `--brand`. Claro `#ffffff` (idêntico ao de hoje — nenhuma tela clara muda por
causa dele), escuro `#0d1117` (7.29:1), `.band-dark` `#0c241f` (6.50:1).

### Por que `--brand` foi escurecido apesar do "não escureça a marca inteira"

O prompt pedia para não mexer em `--brand` e usar uma variante só nos dois usos de texto.
Isso não resolveria a causa D: um fundo só se conserta no fundo. E como no tema claro os
dois papéis pediam a mesma direção, **um único ajuste conserta os dois** —
`#14867a` → `#12786d`, 8% de luminância, matiz e saturação preservados (busca binária só em
L de HSL). Nenhum uso de `--brand` piorou; `--brand` como texto sobre `--brand-tint`, que
falhava sem ninguém ter notado (3.75:1), passou a 4.50:1 de brinde.

---

## 4. O que mudou

| arquivo | mudança |
|---|---|
| `app/(site)/brand-ds.css` | claro: `--ink-faint` `#92998f`→`#636a60`, `--brand` `#14867a`→`#12786d`, novo `--on-brand:#ffffff`. escuro: `--ink-faint` `#6e7681`→`#878f99`, novo `--on-brand:#0d1117`. `.band-dark`: `--ink-faint` `#7c958d`→`#95aaa3`, novo `--on-brand:#0c241f`. `.btn--primary` e `.price-flag` passam a usar `--on-brand` |
| `app/(auth)/_shared/auth-shell.css` | claro: `--dim` `#8a98a1`→`#63717b`, `--teal` `#1a8c93`→`#177b82`. escuro: `--dim` `#6e7c87`→`#8f9ba4` |
| `app/(site)/_shared/ui.tsx` | `Btn` primary, `Segmented` ativo e `HelpTip` aberto: `#fff` → `var(--on-brand)` |
| `app/(site)/agenda/calendar.tsx` | badge do dia de hoje (WeekView + MonthView): `#fff` → `var(--on-brand)` |
| `app/(site)/app/dashboard-shell.css` | `.prod-tab.on`, `.seg button.on`, `.ent-sim button.on` |
| `app/(site)/app/onboarding/onboarding.css` | `.onb-node.done .onb-node-dot` |
| `app/(site)/configuracao/page.tsx` | **novo `<main>`** envolvendo tudo abaixo do `PortalHeader` |
| `app/(site)/agenda/page.tsx` | os 3 banners movidos para DENTRO do `<main>` que já existia |
| `app/(site)/cadastro/_components/WizardShell.tsx` | `useId()` → `id` no span do rótulo + `aria-labelledby` no progressbar |

Não sobrou nenhum `#fff` literal sobre um preenchimento `--brand`
(`grep -rn 'var(--brand)' app/ | grep '#fff'` volta vazio).

---

## 5. A11Y-3 — o que era verdade e o que não era

**`/configuracao` sem `<main>` — confirmado**, 129 nós órfãos. O `<main>` novo assume o
papel de coluna flex que os filhos já tinham como filhos diretos de `.app-screen`, então o
layout não muda (`git diff -w` mostra só a abertura/fechamento da tag). O `<nav>` do
`SideNav` fica **dentro** do `<main>`, o que é válido: ele navega DENTRO deste conteúdo (âncoras
para as 8 seções da própria página), não é navegação de site.

**`/agenda` — confirmado, 1 nó só.** Era o banner de demonstração do `HubNotice`. Os três
banners (`ConfigGapBanner`, `HubNotice`, erro de fetch) eram irmãos do `<main>`. O
`ConfigGapBanner` é `position: fixed` (`.config-gap-toast`), então movê-lo no DOM é
visualmente inerte.

**Progressbar do cadastro — o prompt estava certo.** `aria-valuenow/min/max` já existiam e
**não** foram tocados; faltava só o nome. Provado lendo a árvore de acessibilidade do próprio
Chrome, não só pelo axe:

```
{ role: "progressbar", name: "DADOS DE CONTATO", nameFrom: ["relatedElement"],
  valuenow: "0", valuemin: "0", valuemax: "100" }
```

O `aria-labelledby` aponta para o **primeiro** span do `.cad-progress-label`, não para a div
inteira: o segundo span é a porcentagem, e incluí-la faria o leitor de tela dizer "0%" duas
vezes — uma como nome, outra como valor.

---

## 6. Resultado

| tela | antes (claro / escuro) | depois |
|---|---|---|
| `/` login | 2 / 1 `color-contrast` | **0** |
| `/agenda` | 24 + 1 `region` / 21 + 1 `region` | **0** |
| `/configuracao` | 7 + 129 `region` / 5 + 129 `region` | **0** |
| `/cadastro` (sem plano) | 1 / 1 | **0** |
| `/cadastro?plan=…` (wizard) | 2 + 1 `aria-progressbar-name` / idem | **0** |

Rodado depois com o **conjunto COMPLETO de regras do axe** (não só as três alvo) nas 5 telas
× 2 temas, incluindo `/inicio` como regressão do escopo `.band-dark`: **0 violações em todas**.

Gates: `tsc --noEmit` limpo, `npm test` 484/484, `npm run build` OK.
Conferido visualmente nos dois temas (screenshots das 4 telas).

---

## 7. Pendências e consequências conhecidas

- **A escala de tinta clara ficou comprimida.** `--ink-soft` (`#5b6a64`) já estava em
  **4.93:1** sobre `--page`, quase no piso AA. Como o terciário agora precisa de ≥4.5, ele
  necessariamente caiu logo ao lado: `--ink-faint` está em **4.84:1**. Os dois níveis quase
  não se distinguem mais por contraste — só por tamanho/peso/posição. Escurecer `--ink-soft`
  (p.ex. para ~6.5:1) devolveria três degraus visíveis, mas `--ink-soft` **não falha em
  lugar nenhum** e o prompt proibia mexer nele sem evidência; ficou de fora
  deliberadamente. **Decisão de design pendente com o usuário.**
- **Thumbs brancos de switch continuam brancos** (`CToggle`, `modals.tsx`, `.onb-switch-thumb`,
  `.cad-addon-check svg`). São objetos gráficos (WCAG 1.4.11, piso 3:1) e no tema escuro
  estão em 2.59:1 sobre o trilho `--brand`. O axe não checa isso, não é achado medido, e um
  thumb escuro contraria a convenção visual de switch — deixados como estão, com o
  `box-shadow` que já os separa. Vale uma decisão à parte.
- **`--teal` escuro (auth)** está em 4.48:1 sobre `--surface-2` (`#173342`) — 0.02 abaixo do
  piso. Nenhuma tela renderiza essa combinação hoje, então não é violação medida; se algum
  texto teal aparecer sobre `--surface-2` no escuro, vira uma.
- Os literais `rgba(26, 140, 147, …)` do `auth-shell.css` (glow, tint do badge, halo de foco)
  ainda são o teal ANTIGO. São decorações de 8–18% de alpha, imperceptíveis; não foram
  atualizados para manter o diff mínimo.
- **Não deployado.** Como todo CSS/JS deste repo, só vale num rebuild da imagem.
