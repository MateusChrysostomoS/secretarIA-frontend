# CHECKPOINT — Fontes self-hosted via `next/font/google` (PERF-1 / LGPD)

**Estado:** BUILT e VERIFICADO 2026-08-31 num Chrome real, contra o `out/` deste build
servido localmente. Gates verdes (`tsc --noEmit` limpo, 422 testes, `npm run build` OK).
**NÃO commitado, NÃO deployado.**

Origem: auditoria de produção de 30/08/2026, achado PERF-1, prompt
`z_prompts/PROMPT_AUDIT_FRONTEND_FONTES_LGPD.md`.

O `brain-frontend` tem **exatamente o mesmo `<link>`** em `app/layout.tsx:19` (mesma URL, as
mesmas 7 famílias — é a origem de onde este repo foi clonado em 2026-08-14). Ele **NÃO foi
tocado** nesta sessão, por decisão de escopo do prompt.

---

## 1. O que estava errado

`app/layout.tsx` carregava um stylesheet de terceiro no layout **raiz** — o único do App
Router, que engloba tanto o route group `(auth)` quanto o `(site)`:

```tsx
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
<link href={FONTS_HREF} rel="stylesheet" />   // 7 famílias, display=swap
```

Dois efeitos, e o segundo é o que pesa:

1. **Render-blocking.** Um `<link rel="stylesheet">` de terceiro bloqueia a renderização de
   toda página, atrás de DNS + TLS + HTTP para `fonts.googleapis.com` e depois de novo para
   `fonts.gstatic.com`.
2. **O IP do visitante ia para o Google em toda visita**, sem gate de consentimento algum
   antes do `<link>` — inclusive na `/` pública, antes de qualquer login ou aceite de termos.
   Num produto de saúde o visitante pode ser paciente. É o mesmo raciocínio que já gerou
   multas sob GDPR na Europa por Google Fonts hospedado no Google.

### JetBrains Mono era peso morto

A URL pedia 7 famílias. O repo define exatamente **6 tokens** de fonte, e nenhum é
monoespaçado:

| Token | Onde | Família |
| --- | --- | --- |
| `--font-title` | `app/globals.css` `:root` | Space Grotesk |
| `--font-body` | `app/globals.css` `:root` | DM Sans |
| `--font-ui` | `app/(auth)/_shared/auth-shell.css` `main.login-page` | Inter |
| `--font-serif` | `app/(auth)/_shared/auth-shell.css` `main.login-page` | Instrument Serif |
| `--font-serif` | `app/(site)/brand-ds.css` `:root` | Newsreader |
| `--font-sans` | `app/(site)/brand-ds.css` `:root` | Hanken Grotesk |

Não existe `--font-mono`, nenhuma regra `monospace`, nenhuma citação a "JetBrains" fora da
própria URL. **JetBrains Mono foi removida em vez de portada.**

Repare que `--font-serif` é definido pelos **dois** design systems com valores diferentes
(Instrument Serif no auth, Newsreader no portal). Eles nunca colidem porque os escopos não
se cruzam — `main.login-page` vs `:root` do `(site)`. Por isso as variáveis novas do
`next/font` são nomeadas **por família**, não por papel.

---

## 2. A correção

`next/font/google` baixa as fontes **no build** e as emite em `_next/static/media/`, servidas
pelo mesmo nginx. Zero requisição a terceiro em runtime, zero IP vazado. Funciona com
`output: "export"` — é a forma recomendada pelo próprio Next.js para static export.

Cada família virou uma variável CSS declarada no `<html>`, e os 6 tokens que citavam a
família pelo nome passaram a apontar para ela:

```css
/* antes */  --font-title: 'Space Grotesk', system-ui, sans-serif;
/* depois */ --font-title: var(--font-space-grotesk), system-ui, sans-serif;
```

A substituição é mecânica e não move nenhuma regra de lugar — por isso o risco visual é
nulo. Os 4 arquivos tocados: `app/layout.tsx`, `app/globals.css`,
`app/(auth)/_shared/auth-shell.css`, `app/(site)/brand-ds.css`.

### Pesos: nada foi perdido

Nas famílias variáveis o `weight` foi deixado **sem especificar**, o que embarca o eixo
inteiro num arquivo por estilo — superconjunto do que a URL antiga pedia:

| Família | URL antiga pedia | `next/font` entrega |
| --- | --- | --- |
| Space Grotesk | 400/500/600/700 | 300–700 variável |
| DM Sans | 300/400/500/600 (+`opsz` 9–40) | 100–1000 variável (+`opsz`) |
| Inter | 400/500/600/700 | 100–900 variável |
| Instrument Serif | 400, normal + itálico | 400, normal + itálico (não é variável) |
| Newsreader | 400/500/600, normal + itálico (+`opsz` 6–72) | 200–800 variável, ambos (+`opsz`) |
| Hanken Grotesk | 400/500/600/700 | 100–900 variável |

Os dois itálicos são uso real, não zelo: `.topbar-brand em` (globals.css) para Instrument
Serif, `.wa-ava` e `.mini-line .mk` (brand-ds) para Newsreader. O eixo `opsz` foi mantido
onde a URL antiga o pedia, senão o corpo de texto perderia o ajuste óptico que hoje tem.
`display: "swap"` espelha o `&display=swap` antigo.

### `preload: false` é deliberado

As fontes são declaradas no layout **raiz**, então elas valem para toda rota. Com `preload`
ligado, toda página pré-carregaria também os arquivos do design system que ela **não** usa —
os dois nunca aparecem juntos.

Desligado, o browser busca uma família só quando alguma regra realmente casa com ela. Medido
em Chrome, contexto isolado, a partir do `out/`:

| Rota | Design system | Arquivos de fonte buscados |
| --- | --- | --- |
| `/` | auth chrome | **4** — DM Sans, Inter, Instrument Serif normal + itálico |
| `/cadastro/` | brand-ds | **2** — Newsreader, Hanken Grotesk (166 KB) |

Ou seja: **a economia por route group acontece sozinha**, sem precisar mover os tokens de
`:root` para um wrapper por route group. (Space Grotesk sequer é buscada na `/`: ela é o
`--font-title` do app-shell do PreCheck, e `main.login-page` não usa esse token.)

O fallback com métricas ajustadas do `next/font` (`Space Grotesk Fallback` etc., via
`size-adjust`/`ascent-override`) continua ligado, então o `swap` não gera layout shift.

---

## 3. Como foi provado

Chrome real carregando o `out/` servido em `127.0.0.1`:

- `performance.getEntriesByType('resource')` filtrado por origem externa → **`[]`** nas duas
  telas. Nenhuma requisição sai do domínio.
- Um grep por `https?://[host]` em todo `*.html` do `out/` volta **vazio**: o HTML exportado
  não cita nenhum host externo. Essa é a asserção que vale — é o que o browser busca.
- `grep -rl "fonts.googleapis.com\|gstatic" out/` também volta **nenhum arquivo** aqui,
  mas **não repita esse grep como critério noutro repo**: ele só está limpo porque este app
  já está no Next 15.5.24. No `brain-frontend` (Next 15.1.6) o mesmo grep volta 2 arquivos
  num build correto — `__NEXT_OPTIMIZE_FONTS`, otimização legada de fonte do `next/head`,
  cujo runtime contém a lista de prefixos que ele usa pra detectar links de fonte.
- `document.fonts` após `fonts.ready`: na `/`, Instrument Serif (normal + itálico), Inter e
  DM Sans; em `/cadastro/`, Newsreader e Hanken Grotesk. Os tokens resolvem —
  `--font-ui` → `"Inter","Inter Fallback",system-ui,…`, `--font-serif` do portal →
  `"Newsreader","Newsreader Fallback",Georgia,…`.
- Screenshot da `/`: título em Instrument Serif com o itálico do lockup, UI em Inter.
  Nenhuma mudança visual.

### Guarda de regressão

`app/__tests__/no-third-party-resources.test.ts` (5 testes) afirma sobre o **fonte**, no
mesmo estilo do `nginx-hardening.test.ts`: o `app/layout.tsx` não cita host externo
algum, não declara `<link>` nem `<script src>`, e importa de `next/font/google`; e
nenhum token `--font-*` em `app/**/*.css` nomeia família literalmente. Existe porque a
regressão é invisível de dentro do app: repor o `<link>` não quebra nada, renderiza
igual, e o único sinal seria a aba de rede. A guarda de host é de propósito mais ampla
que "Google" — analytics, pixel e chat widget são o mesmo problema nesta tela pública.
Verificado que ela **falha** contra o código pré-correção nos 4 aspectos, não só que
passa no atual.

**Armadilha de medição:** navegar `/` → `/cadastro/` na mesma aba mostra **6** fontes
buscadas em `/cadastro/`, não 2. São revalidações de cache da navegação anterior (o Next
faz prefetch da rota `/` a partir do link de login). Em contexto isolado são 2. Meça sempre
em aba limpa antes de concluir que uma rota carrega fonte demais.

---

## 4. Pendências

- **Commit e deploy.** O build é feito dentro do `Dockerfile` (`RUN npm run build`), então a
  correção só existe em produção depois de um **rebuild da imagem**.
- **O build agora precisa de rede para `fonts.gstatic.com`** — mas em build time, no
  container, não no browser do visitante. O `npm ci` do mesmo stage já exige rede, então na
  prática não muda nada; só registre que um build 100% offline passaria a falhar.
- **`brain-frontend` tem o mesmo `<link>`** e não foi corrigido. Precisa de prompt próprio.

Relacionado: `docs/CHECKPOINT_nginx_hardening.md` — a CSP em `nginx.conf:94` permite
`https://fonts.googleapis.com` em `style-src` e `https://fonts.gstatic.com` em `font-src`.
Depois deste commit as duas origens viram permissão morta e podem sair — e devem, porque
`style-src https://fonts.googleapis.com` ainda autorizaria exatamente o stylesheet de
terceiro que esta correção acabou de remover. `app/__tests__/nginx-hardening.test.ts`
**não** fixa essas origens, então removê-las não quebra teste. Fora do escopo desta
sessão (o `nginx.conf` é território do prompt de segurança, já executado).
