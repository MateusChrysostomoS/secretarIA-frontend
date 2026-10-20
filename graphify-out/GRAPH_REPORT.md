# Graph Report - wt-sec-site  (2026-10-19)

## Corpus Check
- 159 files · ~192,101 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1405 nodes · 2594 edges · 260 communities (95 shown, 165 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `36ddc103`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- calendar-dates.ts
- manage-api.ts
- WizardShell.tsx
- page.tsx
- hub-mapping.ts
- modals.tsx
- InsuranceSection.tsx
- manageFetch
- package.json
- compilerOptions
- ProfessionalsSection.tsx
- TestWindowExplainerStep.tsx
- page.tsx
- hydration.ts
- CHECKPOINT — contraste e landmarks (A11Y-2 / A11Y-3)
- 2. Decisões tomadas (as perguntas que eu não fiz)
- meta-embedded-signup.ts
- BrandIcon.tsx
- AvailabilitySection.tsx
- ui.tsx
- manage-api.test.ts
- appt
- CHECKPOINT — secretarIA-frontend (split out of brain-frontend)
- nginx-hardening.test.ts
- secretaria-hub.test.ts
- Figures.tsx
- hub-mapping.ts
- page.tsx
- event
- page.tsx
- secretarIA-frontend
- layout.tsx
- a
- next.config.mjs
- next-env.d.ts
- page.tsx
- ConfigGapBanner.tsx
- snapshot.ts
- CHECKPOINT — Sessão fora do storage: cookie httpOnly first-party (SEC-2)
- ServicesSection.tsx
- calendar.tsx
- a
- snapshot.test.ts
- save.test.ts
- page.tsx
- lint
- CHECKPOINT — chamadas duplicadas e prefetch desperdiçado (PERF-4 / PERF-2 / PERF-3)
- CHECKPOINT — Hardening do nginx: headers, 404 e robots.txt (SEC-1 / SEC-3 / SEC-4)
- page.tsx
- ProfessionalInsuranceSection.tsx
- MessagesSection.tsx
- AddonsStep.tsx
- cells
- CHECKPOINT — nomes acessíveis dos controles de formulário (A11Y-1)
- CadastroWizard.tsx
- platform-links.ts
- landing-page.test.ts
- secretaria-hub.ts
- RestartButton.tsx
- FacebookPageStep.tsx
- ContactForm.tsx
- CHECKPOINT — Banner "configure sua secretarIA" (FEAT 42)
- CHECKPOINT — Fontes self-hosted via `next/font/google` (PERF-1 / LGPD)
- CHECKPOINT — Marca Brain nova + rodada de UX na Configuração
- legacy
- build-env.test.ts
- MONTH_GRID
- page.tsx
- WD_LABELS
- SummaryStep.tsx
- CHECKPOINT_catalogo_servicos_ui.md
- PauseToggles.tsx
- control-accessible-names.test.ts
- block
- sign-out.test.ts
- app-shell-viewport.test.ts
- d
- end
- OnboardingBanner.tsx
- no-third-party-resources.test.ts
- { endIso }
- Glyph.tsx
- events
- instant
- keys
- mapped
- session-affordances.test.ts
- midnight
- month
- orphan
- start
- { startIso }
- { startIso, endIso }
- { startIso: wStart, endIso: wEnd }
- week
- suffix
- decision
- finishEvents
- result
- behind
- entry
- forms
- legacy
- roster
- rows
- service
- loaded
- refreshed
- retried
- s
- stale
- switched
- visitor
- blockedScenarios
- boom
- cause
- deps
- loadedWithB
- order
- persisted
- refusals
- s
- allClosed
- b
- baseline
- baselineProfessional
- body
- { ctx, messages, postConsult, pixDeposit, clinicDays }
- current
- currentProfessional
- emptied
- empty
- inheriting
- monday
- payload
- professional
- relinked
- sections
- slices
- snapshot
- tenant
- WEEK_DAYS
- WeekDay
- d
- days
- dec
- inMonth
- next
- noon
- nov
- otherWeek
- wednesday
- css
- rule
- code
- sources
- unlabelled
- conf
- csp
- firstLocation
- lines
- map
- REQUIRED
- SCREENS
- code
- cssFiles
- m
- offenders
- beforeSubmit
- conditional
- src
- code:block1 ({ role: "progressbar", name: "DADOS DE CONTATO", nameFrom: [)
- code:tsx (const scope = day.label + " — " + groupLabel;   // "Segunda )
- code:block1 (janela fetch : Mon Aug 24 -> Mon Aug 31   (a semana que JÁ t)
- code:block2 (name="Dia"                computedFrom=relatedElement  ignor)
- code:block3 (gridTemplateColumns : 60px repeat(7, 1fr))
- code:block4 (label            : 30 de agosto – 5 de setembro   [sub: Sete)
- code:block5 (drawer          : "Domingo, 30/08 · 09:00–09:50")
- code:block1 (GET /doctor/professionals   (brain-api, require_doctor, Bear)
- code:tsx (<link rel="preconnect" href="https://fonts.googleapis.com" /)
- code:css (/* antes */  --font-title: 'Space Grotesk', system-ui, sans-)
- code:block1 (npm install)
- a
- after
- b
- before
- { complete: _drop, ...withoutComplete }
- first
- { is_active: _drop, ...withoutFlag }
- notice
- second
- session
- storage
- afterMutation
- b
- body
- deferredRefresh
- fresh
- jwt
- logoutPromise
- newSession
- nowSpy
- oldSession
- p1
- p2
- realNow
- refreshCalls
- retriedCalls
- session
- sessionStorageMock
- stale
- started
- stored
- superseded
- decision
- malformed
- query
- route
- { missing, unexpected }
- result
- { unexpected }
- navigate
- sessionStorageMock
- atCap
- error
- overCap
- plans
- getEntitlements

## God Nodes (most connected - your core abstractions)
1. `ConfiguracaoPage()` - 53 edges
2. `manageFetch()` - 46 edges
3. `hubFetch()` - 34 edges
4. `AgendaPage()` - 26 edges
5. `Session` - 21 edges
6. `Icon()` - 19 edges
7. `ManageApiError` - 16 edges
8. `compilerOptions` - 16 edges
9. `BrandGlyph()` - 14 edges
10. `dayLabelFromKey()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `ServicesSection()` --indirect_call--> `row()`  [INFERRED]
  app/(site)/configuracao/components/ServicesSection.tsx → lib/__tests__/config-gap.test.ts
- `spies()` --indirect_call--> `isLegacyBackend()`  [INFERRED]
  app/(site)/configuracao/lib/__tests__/save.test.ts → lib/secretaria-hub.ts
- `ConfiguracaoPage()` --indirect_call--> `isLegacyBackend()`  [INFERRED]
  app/(site)/configuracao/page.tsx → lib/secretaria-hub.ts
- `ConfiguracaoPage()` --indirect_call--> `row()`  [INFERRED]
  app/(site)/configuracao/page.tsx → lib/__tests__/config-gap.test.ts
- `EntryInner()` --calls--> `resolveEntryRedirect()`  [EXTRACTED]
  app/(auth)/entrar/page.tsx → lib/portal-routes.ts

## Import Cycles
- None detected.

## Communities (260 total, 165 thin omitted)

### Community 0 - "calendar-dates.ts"
Cohesion: 0.26
Nodes (22): monthIsoRange(), AgendaPage(), addDays(), addMonths(), capitalize(), dayIndexFromKey(), fromDateKey(), isSameDay() (+14 more)

### Community 1 - "manage-api.ts"
Cohesion: 0.03
Nodes (74): AdminAnamnesis, AdminAnamnesisDetail, AdminAnamnesisList, AdminDemoRequest, AdminMetrics, AdminMetricsClinic, AdminMetricsDoctor, AdminMetricsSatisfaction (+66 more)

### Community 2 - "WizardShell.tsx"
Cohesion: 0.15
Nodes (14): DedicatedNumberGuide(), DedicatedNumberGuideProps, STEPS, PageCreationGuide(), PageCreationGuideProps, STEPS, OPTIONS, PriorApiStep() (+6 more)

### Community 3 - "page.tsx"
Cohesion: 0.16
Nodes (10): PURCHASABLE_PLANS, resolvePlan(), CadastroInner(), errorStyle, LaunchWaitlistForm(), LaunchWaitlistFormProps, isPurchaseGated(), CatalogPlanId (+2 more)

### Community 4 - "hub-mapping.ts"
Cohesion: 0.13
Nodes (22): AddressFieldsOfCtx, applyLink(), applyWireAddress(), applyWireBusinessHours(), applyWireGcal(), applyWireMessages(), applyWirePixDeposit(), applyWirePostConsult() (+14 more)

### Community 5 - "modals.tsx"
Cohesion: 0.16
Nodes (16): Drawer(), BLOCK_REASONS, BlockModal(), CANCEL_REASONS, CancelModal(), clinicDisplay(), defaultDateKey(), EditApptModal() (+8 more)

### Community 6 - "InsuranceSection.tsx"
Cohesion: 0.16
Nodes (16): InsuranceSection(), InsuranceSectionProps, MODE_OPTIONS, InsuranceModeState, useInsuranceMode(), Session, createTenantCustomInsurancePlan(), getInsuranceCatalog() (+8 more)

### Community 7 - "manageFetch"
Cohesion: 0.11
Nodes (24): adminCreateUser(), adminDeleteTenant(), adminGetAnamnesis(), adminGetEntitlements(), adminGetMetrics(), adminGetTenant(), adminListAnamneses(), adminListDemoRequests() (+16 more)

### Community 8 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, next, react, react-dom, devDependencies, @types/node, @types/react, @types/react-dom (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "ProfessionalsSection.tsx"
Cohesion: 0.05
Nodes (47): Modal(), ModalProps, GoogleGlyph(), GoogleSection(), GoogleSectionProps, COPY, InviteKind, InviteTeamMemberModal() (+39 more)

### Community 11 - "TestWindowExplainerStep.tsx"
Cohesion: 0.31
Nodes (7): TestWindowExplainerStep(), TestWindowExplainerStepProps, CheckoutTrialNotice(), CheckoutTrialNoticeProps, loadTrialDays(), noticeStyle, getCheckoutTrialDays()

### Community 12 - "page.tsx"
Cohesion: 0.13
Nodes (18): CheckoutSucessoInner(), renderView(), ViewState, decodeJwtPayload(), enterDoctorMode(), exchangeOnboardingToken(), exitDoctorMode(), fetchImpersonationDoctor() (+10 more)

### Community 13 - "hydration.ts"
Cohesion: 0.10
Nodes (30): baseStyle, failureMessage(), infoStyle, LoadStateNotice(), LoadStateNoticeProps, warnStyle, buildLoadFailedEvent(), canEditProfessionalFields() (+22 more)

### Community 14 - "CHECKPOINT — contraste e landmarks (A11Y-2 / A11Y-3)"
Cohesion: 0.20
Nodes (9): 1. Como foi medido, 2. A auditoria original errou os números — o fundo não é `--surface`, 3. São SEIS causas, não três — e uma delas é o inverso das outras, 4. O que mudou, 5. A11Y-3 — o que era verdade e o que não era, 6. Resultado, 7. Pendências e consequências conhecidas, CHECKPOINT — contraste e landmarks (A11Y-2 / A11Y-3) (+1 more)

### Community 15 - "2. Decisões tomadas (as perguntas que eu não fiz)"
Cohesion: 0.08
Nodes (24): 1. O que estava errado (medido, não suposto), 2. Decisões tomadas (as perguntas que eu não fiz), 3. O que mudou, 4. Validação, 5. Pendências e observações, Ao vivo (Chrome real via CDP, dev server na 3111), CHECKPOINT — Agenda: datas reais (AG-1 a AG-4), Correção ao AG-2 da auditoria (+16 more)

### Community 16 - "meta-embedded-signup.ts"
Cohesion: 0.15
Nodes (14): ActivateButton(), ActivateButtonProps, classifySignupMessage(), EmbeddedSignupOutcome, FacebookLoginResponse, loadFacebookSdk(), OnboardingAttemptDecision, resolveAttemptDecision() (+6 more)

### Community 17 - "BrandIcon.tsx"
Cohesion: 0.24
Nodes (8): SiteHeader(), SiteHeaderProps, SiteNavLink, BrandIcon(), BrandIconProps, FILLED, IconName, PATHS

### Community 18 - "AvailabilitySection.tsx"
Cohesion: 0.22
Nodes (8): AvailabilitySection(), AvailabilitySectionProps, DayRow(), DayRowProps, fmtHM(), TIME_LIST, InlineNote(), Prefs

### Community 19 - "ui.tsx"
Cohesion: 0.09
Nodes (27): DrawerProps, CToast(), CToastProps, NAV, NavItem, SideNav(), SideNavProps, Anamnese (+19 more)

### Community 20 - "manage-api.test.ts"
Cohesion: 0.18
Nodes (3): b64url(), makeJwt(), ManageApiModule

### Community 22 - "CHECKPOINT — secretarIA-frontend (split out of brain-frontend)"
Cohesion: 0.17
Nodes (11): A tela de login (`/entrar`, antes `/`) — composição nova, não é cópia, CHECKPOINT — secretarIA-frontend (split out of brain-frontend), Decisões tomadas nesta rodada, Deploy no EasyPanel (guia — nada disto foi executado), Lacunas conhecidas (nada disto bloqueia o build), Mapa de rotas (14 + `_not-found`, todas estáticas), O que ficou de fora — e por quê, O que foi portado (+3 more)

### Community 24 - "secretaria-hub.test.ts"
Cohesion: 0.33
Nodes (4): BACKEND_PROFESSIONAL_LIST_ITEM_KEYS, HubModule, mockHubTokenMint(), mockResponse()

### Community 25 - "Figures.tsx"
Cohesion: 0.12
Nodes (15): AgendaFigure(), CONTEXT_NAV, CONVERSATIONS, ConvRow, Ev, HOURS, LEGEND, NOW_TOP (+7 more)

### Community 26 - "hub-mapping.ts"
Cohesion: 0.22
Nodes (14): blockReasonFromSummary(), currentWeekIsoRange(), formatBlockSummary(), isBlockSummary(), mapHubEventsToAppts(), mapHubEventToAppt(), slotIsoRangeFromDateKey(), slotToIsoRange() (+6 more)

### Community 27 - "page.tsx"
Cohesion: 0.14
Nodes (12): ContextoFigure(), ConversasFigure(), HeroFigure(), StepAskArt(), StepPickArt(), DOES, DOES_NOT, FAQ (+4 more)

### Community 29 - "page.tsx"
Cohesion: 0.15
Nodes (12): DayView(), WeekView(), ModalState, ToastState, ViewMode, baseStyle, HubNotice(), HubNoticeProps (+4 more)

### Community 30 - "secretarIA-frontend"
Cohesion: 0.29
Nodes (6): Auditoria de rotas & requisições — 30/08/2026, Convenções deste repo, Documentação, graphify, Prompts prontos para rodar, secretarIA-frontend

### Community 31 - "layout.tsx"
Cohesion: 0.20
Nodes (8): dmSans, FONT_VARIABLES, hankenGrotesk, instrumentSerif, inter, metadata, newsreader, spaceGrotesk

### Community 38 - "page.tsx"
Cohesion: 0.05
Nodes (53): NODES, rankOf(), StateTimeline(), ATTEMPT_ERROR_CODE_LABEL, attemptFailureSuffix(), explainAttemptError(), ATTEMPT_RESULT_LABEL, BLOCKER_COPY (+45 more)

### Community 39 - "ConfigGapBanner.tsx"
Cohesion: 0.19
Nodes (14): ConfigGapBanner(), ConfigGapBannerProps, colleagueMessage(), ConfigGapNotice, ConfigGapProfessional, ConfigGapSession, dismissConfigGap(), findConfigGaps() (+6 more)

### Community 40 - "snapshot.ts"
Cohesion: 0.10
Nodes (31): applyWireAppointmentTypes(), applyWireProfessionalProfile(), comparableCtx(), comparablePix(), comparableServices(), dirtySections(), emptyProfessionalSlices(), emptyTenantSlices() (+23 more)

### Community 41 - "CHECKPOINT — Sessão fora do storage: cookie httpOnly first-party (SEC-2)"
Cohesion: 0.15
Nodes (12): 10. Pendências desta rodada, 11. Skills atualizadas, 1. O que estava errado, 2. Por que NÃO foi a "Opção B" que a auditoria sugeria, 3. A arquitetura que ficou, 4. A consequência que mais pega, e o que ela obrigou a mudar, 5. Armadilhas encontradas que o prompt não previa, 6. Como foi provado (contra nginx real, não contra o diff) (+4 more)

### Community 42 - "ServicesSection.tsx"
Cohesion: 0.21
Nodes (14): DURATION_OPTIONS, ServicesSection(), ServicesSectionProps, alsoAffected(), CatalogRow, catalogRows(), offerService(), pendingLinks() (+6 more)

### Community 43 - "calendar.tsx"
Cohesion: 0.32
Nodes (10): ApptBlock(), DayBlock(), heightOf(), MonthView(), NowLine(), toneOf(), topOf(), MonthCell (+2 more)

### Community 45 - "snapshot.test.ts"
Cohesion: 0.30
Nodes (10): AuthoritativeSnapshot, EMPTY_SNAPSHOT, snapshotForTenant(), emptiedProfessionalWire(), inheritingProfessionalWire(), legacyBackendProfessionalWire(), professionalWire(), tenantWire() (+2 more)

### Community 46 - "save.test.ts"
Cohesion: 0.14
Nodes (11): INITIAL_HYDRATION_STATE, AUTHENTICATED, LOADED_NO_PROFESSIONAL, LOADED_WITH_A, PROFESSIONAL_PATCH, ROSTER_OK, STARTED, TENANT_OK (+3 more)

### Community 47 - "page.tsx"
Cohesion: 0.27
Nodes (6): EntryInner(), RETRY_DELAYS_MS, useSecretariaHub(), UseSecretariaHubResult, ensureSession(), getSession()

### Community 49 - "CHECKPOINT — chamadas duplicadas e prefetch desperdiçado (PERF-4 / PERF-2 / PERF-3)"
Cohesion: 0.20
Nodes (9): 1. O que mudou, 2. O achado que a auditoria errou: era 1 tela, não 3, 3. O bug que só mutation test achou: derrubar o in-flight não basta, 4. PERF-3 — duas correções ao relatório original, nenhum código aqui, 5. Prova pós-deploy, em produção real (clínica "Chrysostomo For Eyes"), 6. Instrumentos — 2 armadilhas para não repetir, 7. Gates, 8. Pendências (+1 more)

### Community 50 - "CHECKPOINT — Hardening do nginx: headers, 404 e robots.txt (SEC-1 / SEC-3 / SEC-4)"
Cohesion: 0.20
Nodes (9): 1. O que estava errado, medido em produção, 2. A armadilha que quase anulou a correção, 3. CSP — a decisão e por que ela é essa, 4. Referrer-Policy e os tokens na URL (SEC-3), 5. 404 e robots.txt (SEC-4), 6. Arquivos, 7. Como foi verificado, 8. Pendências (+1 more)

### Community 51 - "page.tsx"
Cohesion: 0.07
Nodes (21): UpdatePasswordInner(), ResetTokenInner(), AuthShell(), AuthShellProps, PasswordField(), PasswordFieldProps, StepIndicator(), StepIndicatorProps (+13 more)

### Community 53 - "ProfessionalInsuranceSection.tsx"
Cohesion: 0.22
Nodes (10): CToggle(), CToggleProps, ProfessionalInsuranceSection(), ProfessionalInsuranceSectionProps, ToggleRow(), ToggleRowProps, createProfessionalCustomInsurancePlan(), getProfessionalInsurancePlans() (+2 more)

### Community 54 - "MessagesSection.tsx"
Cohesion: 0.09
Nodes (24): AddressFields(), AddressFieldsProps, ContextSection(), ContextSectionProps, CSelect(), CSelectProps, collapseBlankRun(), FIXED_GREETING_BUTTONS (+16 more)

### Community 55 - "AddonsStep.tsx"
Cohesion: 0.20
Nodes (9): ADDON_COPY, AddonsStep(), AddonsStepProps, ResolvedPlan, SignupAddonId, offered(), getCheckoutConfig(), isCheckoutConfigAddon() (+1 more)

### Community 58 - "CHECKPOINT — nomes acessíveis dos controles de formulário (A11Y-1)"
Cohesion: 0.13
Nodes (14): 1. O que foi medido (não inferido), 2.1 Controle sem conteúdo para nomear — `CToggle`, `CSelect` e cópias, 2.2 O `<label>` do `Field` estava preso no controle ERRADO, 2.3 O `<label>` do `ToggleRow` nomeia — mas horrível, 2. Três causas raiz distintas (a auditoria via uma só), 3. Onde a auditoria e a investigação erraram, 4. O que mudou, 5. Como isso é guardado (+6 more)

### Community 59 - "CadastroWizard.tsx"
Cohesion: 0.15
Nodes (14): CadastroWizard(), CadastroWizardProps, PROGRESS, PROGRESS_LABEL, ContactStep(), ContactStepProps, honeypotStyle, passwordError() (+6 more)

### Community 60 - "platform-links.ts"
Cohesion: 0.48
Nodes (5): parsePublicUrl(), PLATFORM_LOGIN_HREF, resolvePlatformLoginHref(), resolveSiteUrl(), SITE_URL

### Community 63 - "secretaria-hub.ts"
Cohesion: 0.07
Nodes (49): ConfiguracaoPage(), getSecretariaHubToken(), AppointmentCancelPayload, AppointmentCreatePayload, AppointmentReschedulePayload, AppointmentStatusWire, AppointmentWire, BlockCreatePayload (+41 more)

### Community 64 - "RestartButton.tsx"
Cohesion: 0.40
Nodes (4): RestartButton(), RestartButtonProps, restartTestWindow(), RestartTestWindowResult

### Community 65 - "FacebookPageStep.tsx"
Cohesion: 0.16
Nodes (11): FacebookPageStep(), FacebookPageStepProps, OPTIONS, OPTIONS, WhatsappUsageStep(), WhatsappUsageStepProps, RadioOption, RadioPillGroup() (+3 more)

### Community 66 - "ContactForm.tsx"
Cohesion: 0.40
Nodes (4): ContactForm(), FieldErrors, MAX, submitDemoRequest()

### Community 69 - "CHECKPOINT — Banner "configure sua secretarIA" (FEAT 42)"
Cohesion: 0.18
Nodes (10): 1. O que é, 2. De onde vem o sinal — e a correção ao prompt, 3. As três decisões, confirmadas pelo usuário antes do código, 4. Arquivos, 5. Armadilhas registradas, 6. Gates (rodados 2026-08-29), 7. Pendências, CHECKPOINT — Banner "configure sua secretarIA" (FEAT 42) (+2 more)

### Community 70 - "CHECKPOINT — Fontes self-hosted via `next/font/google` (PERF-1 / LGPD)"
Cohesion: 0.20
Nodes (9): 1. O que estava errado, 2. A correção, 3. Como foi provado, 4. Pendências, CHECKPOINT — Fontes self-hosted via `next/font/google` (PERF-1 / LGPD), Guarda de regressão, JetBrains Mono era peso morto, Pesos: nada foi perdido (+1 more)

### Community 71 - "CHECKPOINT — Marca Brain nova + rodada de UX na Configuração"
Cohesion: 0.17
Nodes (11): 1. Marca — a logo Brain de verdade, 2. Ícone da aba (favicon), 3. Google Calendar na aba Profissionais (Seção 05) e na Seção 08, 4. Serviço novo já nasce marcado para quem o criou, 5. Horário da clínica + "Preencher horários padrão da clínica" (Seção 07), 6. Conexão que o Google recusa — "Conectado" que não agenda (2026-09-12), CHECKPOINT — Marca Brain nova + rodada de UX na Configuração, Consequências de contrato (+3 more)

### Community 74 - "build-env.test.ts"
Cohesion: 0.40
Nodes (3): referenced, repoRoot, sources

### Community 78 - "page.tsx"
Cohesion: 0.10
Nodes (30): DEMO_CATALOG, DEMO_CTX, DEMO_PROFILE, DEMO_ROSTER, DEMO_SERVICE_IDS, DEMO_SERVICES, demoWeek(), VisitorDemo (+22 more)

### Community 82 - "SummaryStep.tsx"
Cohesion: 0.18
Nodes (9): ADDON_SUMMARY_LABEL, FB_PAGE_LABEL, PRIOR_API_LABEL, SummaryStep(), SummaryStepProps, USAGE_LABEL, attachSignupIntake(), createPublicCheckoutSession() (+1 more)

### Community 84 - "CHECKPOINT_catalogo_servicos_ui.md"
Cohesion: 0.22
Nodes (8): 1. O problema, 2. A tela nova, 3. As três armadilhas de migração, 4. Google Calendar: "Conta única" passou a criar as agendas, 5. brain-frontend: as telas da secretarIA saíram, 6. Pendências, O aviso antes de renomear — a parte que o usuário pediu explicitamente, ⚠️ Variável de build nova

### Community 85 - "PauseToggles.tsx"
Cohesion: 0.40
Nodes (3): PauseToggles(), PauseTogglesProps, pauseOnboarding()

### Community 86 - "control-accessible-names.test.ts"
Cohesion: 0.29
Nodes (4): CALL_SITE_FILES, CONTROLS, repoRoot, SWITCH_IMPLEMENTATIONS

### Community 92 - "OnboardingBanner.tsx"
Cohesion: 0.67
Nodes (3): OnboardingBanner(), STATE_LABEL, getDoctorOnboarding()

### Community 95 - "Glyph.tsx"
Cohesion: 0.50
Nodes (3): Glyph(), GlyphName, PATHS

### Community 258 - "getEntitlements"
Cohesion: 0.67
Nodes (3): coerceAddons(), coerceLimits(), getEntitlements()

## Knowledge Gaps
- **591 isolated node(s):** `AuthShellProps`, `PasswordFieldProps`, `StepIndicatorProps`, `MAX`, `FieldErrors` (+586 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **165 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Session` connect `InsuranceSection.tsx` to `RestartButton.tsx`, `manage-api.ts`, `page.tsx`, `ConfigGapBanner.tsx`, `ProfessionalsSection.tsx`, `page.tsx`, `page.tsx`, `meta-embedded-signup.ts`, `page.tsx`, `manage-api.test.ts`, `PauseToggles.tsx`, `MessagesSection.tsx`, `ProfessionalInsuranceSection.tsx`, `secretaria-hub.test.ts`, `sign-out.test.ts`, `OnboardingBanner.tsx`, `page.tsx`, `secretaria-hub.ts`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `BrandGlyph()` connect `page.tsx` to `WizardShell.tsx`, `page.tsx`, `page.tsx`, `BrandIcon.tsx`, `page.tsx`, `Figures.tsx`, `page.tsx`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **Why does `BrandIcon()` connect `BrandIcon.tsx` to `ContactForm.tsx`, `page.tsx`, `ConfigGapBanner.tsx`, `AddonsStep.tsx`, `Figures.tsx`, `page.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `ConfiguracaoPage()` (e.g. with `hydrationReducer()` and `closedWeek()`) actually correct?**
  _`ConfiguracaoPage()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AuthShellProps`, `PasswordFieldProps`, `StepIndicatorProps` to the rest of the system?**
  _593 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `manage-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.025 - nodes in this community are weakly interconnected._
- **Should `hub-mapping.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.13438735177865613 - nodes in this community are weakly interconnected._