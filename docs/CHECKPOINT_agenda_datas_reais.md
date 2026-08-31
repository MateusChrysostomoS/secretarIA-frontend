# CHECKPOINT — Agenda: datas reais (AG-1 a AG-4)

**Data:** 2026-08-30 · **Estado:** implementado, 3 gates verdes, verificado ao vivo · **Commit:** não commitado

Corrige o bloco de maior severidade da auditoria de produção de 30/08/2026 na `/agenda`:
rótulos de data congelados em junho/2026, botões de navegação inertes, e domingo
descartado em silêncio.

> Este documento existe também para registrar **decisões que eu tomei sozinho** em vez de
> perguntar. Cada uma vem com a pergunta que a originou e o motivo da escolha, para que
> possam ser revertidas com conhecimento de causa.

---

## 1. O que estava errado (medido, não suposto)

A tela tinha **dois relógios**. A busca (`currentWeekIsoRange()`) sempre pediu a semana
real; os rótulos vinham de literais herdados do mock do design, congelados em
**Mon 01/06 – Sat 06/06 2026**. O comentário no topo de `_shared/data.ts` já chamava isso
de *"known scaffold limitation"* — ou seja, alguém viu, nomeou, e mandou pra produção.

Inventário completo dos hardcodes (o raio era maior que o relatado na auditoria):

| Onde | O quê |
|---|---|
| `_shared/data.ts` | `WEEK_DAYS`, `MONTH_LABEL`, `PERIOD_LABEL` |
| `_shared/data.ts` `dayFull()` | sufixo `"/06"` concatenado incondicionalmente |
| `agenda/page.tsx` | `"Junho de 2026"` — **terceiro** hardcode, independente de `MONTH_LABEL` |
| `agenda/calendar.tsx` | `NOW_MIN = 11*60+22` (linha de "agora" fixa em 11:22) |
| `agenda/calendar.tsx` | `MONTH_GRID` de junho inteiro + hoje fixo em `c.d === 2` |
| `agenda/modals.tsx` | **três** seletores de dia com `{d.full} {d.date}/06` (Nova consulta, Remarcar, Bloquear) — a auditoria citou um |

### Por que não era cosmético

`dayFull()` compunha a **mensagem de WhatsApp de confirmação enviada ao paciente**
(`modals.tsx`, `NewApptModal`) e o detalhe de agendamentos **reais** no drawer. Uma consulta
de agosto chegava ao paciente como *"Quarta, 03/06"*.

### Correção ao AG-2 da auditoria

A auditoria afirmava: *"o paciente É agendado no dia certo — só o que a secretária VÊ está
errado."* **Falso aos domingos.** Medido às 22:55 de domingo 30/08/2026:

```
janela fetch : Mon Aug 24 -> Mon Aug 31   (a semana que JÁ tinha acabado)
  modal diz "Segunda 01/06"  ->  grava Mon Aug 24  [PASSADO]
  modal diz "Sábado  06/06"  ->  grava Sat Aug 29  [PASSADO]
```

`mondayOfWeek(domingo)` voltava 6 dias. **Todas as 6 opções gravavam no passado**, e a
tela buscava a semana anterior. O bug de escrita estava escondido atrás do bug de rótulo.

### Correção ao AG-4 da auditoria

A janela de busca sempre **incluiu** domingo (7×24h). Quem descartava era o mapeamento:
`hub-mapping.ts`, `if (jsDay === 0) return null`. Evento buscado, recebido e jogado fora em
silêncio. **Alargar a janela não resolveria nada.**

### Dois achados novos, de fora da auditoria

- **`output: "export"` pré-renderiza a rota.** Provado: `grep -o "Junho de 2026"
  out/agenda/index.html` encontrava a string no HTML servido. Um fix ingênuo (derivar a data
  em escopo de módulo ou durante o render) trocaria "sempre junho" por "sempre a data do
  último deploy", com hydration mismatch de brinde.
- **`Appt` guardava índice de coluna, não data.** Por construção, nada impedia um item de
  outra semana cair na coluna visível.

---

## 2. Decisões tomadas (as perguntas que eu não fiz)

### D1 — A semana passa a começar no **domingo**, não na segunda

**Pergunta:** com uma 7ª coluna, domingo entra no início (Dom–Sáb) ou no fim (Seg–Dom)?

**Decisão:** Dom–Sáb.

**Por quê:** (a) é a convenção de calendário brasileira, e o `MonthView` já a assumia no
cabeçalho `["Dom","Seg",…]` — Seg–Dom deixaria as duas visões em desacordo; (b) resolve o
edge case de domingo na direção útil: num domingo, hoje vira a **primeira** coluna e a
semana inteira à frente fica agendável, em vez de hoje ser a última coluna com só as horas
restantes; (c) `jsDay` vira o índice de coluna diretamente (`day = start.getDay()`), sem o
off-by-one que originou o descarte de domingo.

**Custo:** a coluna de domingo costuma ficar vazia numa clínica, e ela agora abre a semana.
Aceito — é o preço de (b) e (c).

### D2 — Domingo ganha coluna de verdade, não um aviso de "fora de escopo"

**Pergunta:** o prompt permitia documentar "domingo é fora de escopo" na UI em vez de
suportá-lo.

**Decisão:** suportar.

**Por quê:** o dado já existe e já é buscado. Um bloqueio ou consulta lançado no domingo no
Google Calendar conectado é real; declarar domingo fora de escopo esconderia dado real do
médico para poupar uma coluna.

### D3 — Anterior/Próximo implementados, não escondidos

**Pergunta:** ligar os botões ou removê-los.

**Decisão:** ligar.

**Por quê:** sem navegação, "só a semana corrente" é uma limitação dura — num sábado ou
domingo a secretária não conseguiria agendar para a semana seguinte de jeito nenhum. Com
navegação, o desconforto de fim de semana some. `IconBtn` já aceitava `onClick`; o que
faltava era a camada de estado, que agora existe.

### D4 — O passo da navegação segue a visão ativa

**Decisão:** semana → ±7 dias; dia → ±1 dia; mês → ±1 mês.

**Por quê:** um botão que pula uma semana enquanto a tela mostra um mês não tem
significado. O rótulo (`title`) muda junto: "Semana anterior" / "Dia anterior" / "Mês
anterior".

### D5 — A visão de mês busca o **intervalo do próprio grid**

**Pergunta:** manter a fidelidade atual (pontos só na semana carregada) ou alargar a busca?

**Decisão:** alargar (`monthIsoRange`).

**Por quê:** este é o ponto sutil. Enquanto a grade dizia "junho de 2026" no meio de agosto,
ela era obviamente falsa e ninguém confiava nela. No instante em que passa a mostrar o mês
certo, **célula vazia passa a ler como fato** — "não há consultas em setembro". Com uma
semana carregada, ~28 de ~35 células fariam essa afirmação sem o hub ter sido perguntado.
Tornar a grade real **obriga** a busca a acompanhar, senão troco um mock evidente por um
erro convincente. Sem mudança de backend: mesmo endpoint, intervalo maior.

### D6 — `Appt` ganha `date: string` obrigatório

**Decisão:** todo item carrega a data local (`"2026-08-30"`); `day` continua, mas só como
posição de coluna derivada dela. Todas as visões filtram por `date`.

**Por quê:** mata na raiz o aliasing entre semanas e permite que o drawer e as mensagens
formatem a data do próprio agendamento em vez de a da coluna.

### D7 — A escrita é ancorada na data escolhida, não em (âncora + índice)

**Decisão:** `slotIsoRangeFromDateKey(dateKey, start, dur)` é o caminho de escrita.

**Por quê:** era exatamente (âncora + índice) que fazia o agendamento cair na semana errada
num domingo. Com a data explícita, criar algo enquanto se olha outra semana grava onde o
usuário apontou. `slotToIsoRange(day, …, weekStart)` continua existindo, implementada sobre
a primeira.

### D8 — A âncora nasce **depois do mount**

**Decisão:** `useState<Date|null>(null)` + `useEffect`, seguindo o padrão que
`useSecretariaHub.ts` já usa. Grade e rótulos ficam vazios até o mount.

**Por quê:** `output: "export"`. Ver §1. É o que mantém o HTML do build idêntico ao primeiro
render do cliente. Confirmado: `out/agenda/index.html` agora não contém **nenhuma** data.

### D9 — A `NowLine` some fora de 07:00–20:00

**Decisão:** `NowLine` retorna `null` fora da faixa que a grade desenha.

**Por quê:** achado do teste ao vivo — consequência da minha própria mudança. Com o valor
fixo em 11:22 isso nunca acontecia; com o relógio real, abrir a agenda às 22h desenhava uma
régua vermelha flutuando abaixo da grade, marcando um horário que a coluna não mostra.

### D10 — **Nenhum `aria-label` adicionado** ao `<select>` de dia

**Pergunta:** o achado AG-2 dizia que o `<select>` nativo estava sem accessible name. O
prompt mandou medir antes de aceitar.

**Decisão:** medido — o claim é **falso**. Nada a corrigir.

**Evidência:** Chrome real, `Accessibility.getFullAXTree` com o modal aberto:

```
name="Dia"                computedFrom=relatedElement  ignored=false
name="Início"             computedFrom=relatedElement  ignored=false
name="Duração"            computedFrom=relatedElement  ignored=false
name="Tipo de consulta"   computedFrom=relatedElement  ignored=false
```

O `<label>` do componente `Field` (`_shared/ui.tsx`) envolve o `<select>`, e a associação
implícita funciona. Adicionar `aria-label` seria redundante. **O achado A11Y-1 (sobre
`CSelect`/`CToggle` em `/configuracao`) não deve ser estendido para cá.**

### D11 — Sub-rótulo = mês da âncora

Numa semana que atravessa dois meses o rótulo principal diz "30 de agosto – 5 de setembro"
e o sub diz o mês do dia focado. Nenhum dos dois meses é "mais certo"; o sub existe para
carregar o **ano**, que o rótulo principal não tem.

---

## 3. O que mudou

**Arquivo novo:** `app/(site)/_shared/calendar-dates.ts` — puro, sem globais de browser,
dono de toda derivação de data (`startOfWeek`, `addDays`, `addMonths`, `toDateKey`,
`fromDateKey`, `weekDays`, `monthGrid`, `monthLabel`, `weekPeriodLabel`, `dayLabelFromKey`,
`weekdayShortFromKey`, `dayIndexFromKey`, `minutesFromMidnight`). Nomes de mês e dia vêm de
`Intl.DateTimeFormat("pt-BR")`, não de tabela escrita à mão.

**Tudo é local-time de propósito.** `toDateKey` lê `getFullYear/getMonth/getDate` em vez de
fatiar `toISOString()`: em UTC-3 a data UTC já virou a partir das 21:00, e uma consulta das
21:30 seria arquivada no dia seguinte. `fromDateKey` reconstrói meia-noite local, porque
`new Date("2026-08-30")` é meia-noite **UTC** (21:00 do dia 29 aqui).

| Arquivo | Mudança |
|---|---|
| `_shared/data.ts` | remove `WEEK_DAYS`/`MONTH_LABEL`/`PERIOD_LABEL`/`dayFull`/`WeekDay`; `Appt` ganha `date` |
| `agenda/lib/hub-mapping.ts` | `weekIsoRange`/`monthIsoRange`/`slotIsoRangeFromDateKey`; `mapHubEventToAppt` exportado, para de descartar domingo, emite `date` |
| `agenda/calendar.tsx` | 7 colunas; views recebem `days`/`cells`/`nowMin`; `MonthView` gera grade real; `NOW_MIN` morre |
| `agenda/page.tsx` | estado de âncora pós-mount; Anterior/Próximo/Hoje; busca segue a visão; rótulos derivados |
| `agenda/modals.tsx` | 3 seletores passam a listar dias reais; mensagem de WhatsApp usa a data real |
| `agenda/drawer.tsx` | `dayLabelFromKey(appt.date)` |

**Sem mudança de backend.**

---

## 4. Validação

### Gates (os 3 reais do repo)
- `.\node_modules\.bin\tsc.cmd --noEmit` → **exit 0**
- `npm test` → **406/406** (58 novos: 30 em `calendar-dates`, 28 em `hub-mapping`)
- `npm run build` → **OK**, 17 rotas exportadas

Os testes que o topo de `hub-mapping.ts` prometia ("kept separate so the conversion is
unit-testable") finalmente existem. Todos usam âncora fixa — nenhum chama `new Date()` sem
argumento, porque um teste que lê o relógio passa ou falha conforme o dia, que é justamente
o modo de falha em questão. Cobrem virada de mês e de ano, evento em domingo, `now` num
domingo, e a semântica local vs. UTC.

### Ao vivo (Chrome real via CDP, dev server na 3111)

Domingo 30/08/2026 22:55 (relógio de verdade):

```
gridTemplateColumns : 60px repeat(7, 1fr)
colunas             : Dom30  Seg31  Ter1  Qua2  Qui3  Sex4  Sáb5
bolha de hoje       : 30
label               : 30 de agosto – 5 de setembro   [sub: Agosto de 2026]
Próximo             -> 6 – 12 de setembro
Anterior x2         -> 23 – 29 de agosto
Hoje                -> 30 de agosto – 5 de setembro
Mês                 -> Agosto de 2026, 42 células
Próximo mês         -> Setembro de 2026, 35 células
console errors      : (nenhum)
```

Quarta 02/09/2026 14:30 (relógio falsificado via `Page.addScriptToEvaluateOnNewDocument`,
para testar em outro dia da semana):

```
label            : 30 de agosto – 5 de setembro   [sub: Setembro de 2026]
bolha de hoje    : 2
NowLine          : desenhada, top=435px   (esperado 435px)
console errors   : (nenhum)
```

Modal e drawer (harness temporária, já removida — sem sessão os gatilhos ficam desabilitados):

```
drawer          : "Domingo, 30/08 · 09:00–09:50"
seletor de dia  : Domingo 30/08 · Segunda 31/08 · Terça 01/09 · … · Sábado 05/09
```

**Zero erro/warning de console em todos os cenários** → sem hydration mismatch.

### HTML pré-renderizado
`grep -oE "Junho de 2026|de agosto|Domingo|Segunda" out/agenda/index.html` → **vazio**.
Nenhuma data assada no build.

---

## 5. Pendências e observações

- **Não commitado.** A working tree é compartilhada com outra sessão trabalhando em
  segurança/nginx/token (`lib/url-token.ts`, `app/(auth)/esqueci_senha/*`, `convite/`,
  `nginx.conf`, `package.json`). **Nunca use `git add -A` aqui** — adicione os arquivos
  desta feature explicitamente.
- `RescheduleModal` e `EditApptModal` continuam sem uso (o drawer mantém os gatilhos
  desabilitados por falta de endpoint). Foram atualizados para compilar e para não guardar
  data falsa quando forem religados.
- A visão de mês mostra pontos, não detalhe; clicar numa célula move a âncora e abre o dia.
- `HOUR_START`/`HOUR_END` (07:00–20:00) continuam fixos — fora do escopo desta rodada, mas
  agora é uma limitação visível (ver D9), não um dado inventado.
- Skill nova criada para esta classe de bug:
  `TECH/.claude/skills/date-derived-ui-labels/`.

Prompt de origem: `z_prompts/PROMPT_AUDIT_FRONTEND_*` (bloco AG-1..AG-4). Os demais achados
da auditoria (segurança, a11y de `/configuracao`, performance) são de outros prompts e não
foram tocados.
