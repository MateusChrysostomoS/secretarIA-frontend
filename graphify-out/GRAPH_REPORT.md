# Graph Report - wt-sec-site  (2026-10-19)

## Corpus Check
- 169 files · ~204,247 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1493 nodes · 2727 edges · 265 communities (100 shown, 165 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 11 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c4eda94e`
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
- PixSection.tsx
- portal-routes.ts
- StateTimeline.tsx
- attempt-error.ts

## God Nodes (most connected - your core abstractions)
1. `ConfiguracaoPage()` - 53 edges
2. `manageFetch()` - 46 edges
3. `hubFetch()` - 34 edges
4. `AgendaPage()` - 26 edges
5. `Termos de Uso da secretarIA` - 26 edges
6. `Session` - 21 edges
7. `Icon()` - 19 edges
8. `Política de Privacidade da secretarIA` - 17 edges
9. `ManageApiError` - 16 edges
10. `compilerOptions` - 16 edges

## Surprising Connections (you probably didn't know these)
- `ServicesSection()` --indirect_call--> `row()`  [INFERRED]
  app/(site)/configuracao/components/ServicesSection.tsx → lib/__tests__/config-gap.test.ts
- `ConfiguracaoPage()` --indirect_call--> `isLegacyBackend()`  [INFERRED]
  app/(site)/configuracao/page.tsx → lib/secretaria-hub.ts
- `ConfiguracaoPage()` --indirect_call--> `row()`  [INFERRED]
  app/(site)/configuracao/page.tsx → lib/__tests__/config-gap.test.ts
- `EntryInner()` --calls--> `resolveEntryRedirect()`  [EXTRACTED]
  app/(auth)/entrar/page.tsx → lib/portal-routes.ts
- `UpdatePasswordInner()` --calls--> `stripQueryParamFromUrl()`  [EXTRACTED]
  app/(auth)/esqueci_senha/atualizar_senha/page.tsx → lib/url-token.ts

## Import Cycles
- None detected.

## Communities (265 total, 165 thin omitted)

### Community 0 - "calendar-dates.ts"
Cohesion: 0.17
Nodes (31): monthIsoRange(), AgendaPage(), ModalState, ToastState, ViewMode, addDays(), addMonths(), capitalize() (+23 more)

### Community 1 - "manage-api.ts"
Cohesion: 0.02
Nodes (75): AdminAnamnesis, AdminAnamnesisDetail, AdminAnamnesisList, AdminDemoRequest, AdminMetrics, AdminMetricsClinic, AdminMetricsDoctor, AdminMetricsSatisfaction (+67 more)

### Community 2 - "WizardShell.tsx"
Cohesion: 0.15
Nodes (14): DedicatedNumberGuide(), DedicatedNumberGuideProps, STEPS, FacebookPageStep(), FacebookPageStepProps, OPTIONS, PageCreationGuide(), PageCreationGuideProps (+6 more)

### Community 3 - "page.tsx"
Cohesion: 0.17
Nodes (10): ids(), CadastroWizard(), resolvePlan(), CadastroInner(), errorStyle, LaunchWaitlistForm(), LaunchWaitlistFormProps, isPurchaseGated() (+2 more)

### Community 4 - "hub-mapping.ts"
Cohesion: 0.11
Nodes (26): AddressFieldsOfCtx, applyLink(), applyWireAddress(), applyWireBusinessHours(), applyWireGcal(), applyWireMessages(), applyWirePixDeposit(), applyWirePostConsult() (+18 more)

### Community 5 - "modals.tsx"
Cohesion: 0.13
Nodes (21): BLOCK_REASONS, BlockModal(), CANCEL_REASONS, CancelModal(), clinicDisplay(), defaultDateKey(), EditApptModal(), MessagePreview() (+13 more)

### Community 6 - "InsuranceSection.tsx"
Cohesion: 0.10
Nodes (28): ContextSection(), ContextSectionProps, CToggle(), CToggleProps, InsuranceSection(), InsuranceSectionProps, MODE_OPTIONS, ProfessionalInsuranceSection() (+20 more)

### Community 7 - "manageFetch"
Cohesion: 0.11
Nodes (23): adminCreateUser(), adminDeleteTenant(), adminGetAnamnesis(), adminGetEntitlements(), adminGetMetrics(), adminGetTenant(), adminListAnamneses(), adminListDemoRequests() (+15 more)

### Community 8 - "package.json"
Cohesion: 0.11
Nodes (18): dependencies, next, react, react-dom, devDependencies, @types/node, @types/react, @types/react-dom (+10 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "ProfessionalsSection.tsx"
Cohesion: 0.09
Nodes (29): GoogleGlyph(), GoogleSection(), GoogleSectionProps, ProfessionalRow(), ProfessionalsSection(), ProfessionalsSectionProps, CalendarNotice, clinicNeedsReconnect() (+21 more)

### Community 11 - "TestWindowExplainerStep.tsx"
Cohesion: 0.31
Nodes (7): TestWindowExplainerStep(), TestWindowExplainerStepProps, CheckoutTrialNotice(), CheckoutTrialNoticeProps, loadTrialDays(), noticeStyle, getCheckoutTrialDays()

### Community 12 - "page.tsx"
Cohesion: 0.19
Nodes (13): decodeJwtPayload(), enterDoctorMode(), exitDoctorMode(), fetchImpersonationDoctor(), login(), performRefresh(), rawManageFetch(), readBoolClaim() (+5 more)

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
Cohesion: 0.17
Nodes (13): ActivateButton(), ActivateButtonProps, classifySignupMessage(), EmbeddedSignupOutcome, FacebookLoginResponse, loadFacebookSdk(), OnboardingAttemptDecision, resolveAttemptDecision() (+5 more)

### Community 17 - "BrandIcon.tsx"
Cohesion: 0.22
Nodes (9): ContactForm(), FieldErrors, MAX, BrandIcon(), BrandIconProps, FILLED, IconName, PATHS (+1 more)

### Community 18 - "AvailabilitySection.tsx"
Cohesion: 0.18
Nodes (10): AvailabilitySection(), AvailabilitySectionProps, DayRow(), DayRowProps, fmtHM(), TIME_LIST, InlineNote(), DayConfig (+2 more)

### Community 19 - "ui.tsx"
Cohesion: 0.11
Nodes (20): DrawerProps, CToast(), CToastProps, NAV, NavItem, SideNav(), SideNavProps, ApptStatus (+12 more)

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
Cohesion: 0.07
Nodes (30): AgendaFigure(), CONTEXT_NAV, ContextoFigure(), ConversasFigure(), CONVERSATIONS, ConvRow, Ev, HeroFigure() (+22 more)

### Community 26 - "hub-mapping.ts"
Cohesion: 0.22
Nodes (14): blockReasonFromSummary(), currentWeekIsoRange(), formatBlockSummary(), isBlockSummary(), mapHubEventsToAppts(), mapHubEventToAppt(), slotIsoRangeFromDateKey(), slotToIsoRange() (+6 more)

### Community 27 - "page.tsx"
Cohesion: 0.12
Nodes (27): LegalDocumentPage(), renderInline(), SubheadingTag, Text(), LEGAL_DOCUMENTS, LegalDocumentEntry, LegalDocumentKey, loadLegalDocument() (+19 more)

### Community 29 - "page.tsx"
Cohesion: 0.07
Nodes (26): 10. O papel da Clínica no seu atendimento, 11. Contratação, planos e pagamento, 12. Contas da Equipe e acesso ao Console, 13. Responsabilidades da Clínica, 14. Proteção de dados: a Clínica como controladora e a Brain como operadora, 15. Disponibilidade, suporte e mudanças no Serviço, 16. Suspensão e encerramento, 17. Propriedade intelectual (+18 more)

### Community 30 - "secretarIA-frontend"
Cohesion: 0.29
Nodes (6): Auditoria de rotas & requisições — 30/08/2026, Convenções deste repo, Documentação, graphify, Prompts prontos para rodar, secretarIA-frontend

### Community 31 - "layout.tsx"
Cohesion: 0.15
Nodes (13): dmSans, FONT_VARIABLES, hankenGrotesk, instrumentSerif, inter, metadata, newsreader, spaceGrotesk (+5 more)

### Community 38 - "page.tsx"
Cohesion: 0.16
Nodes (18): ATTEMPT_RESULT_LABEL, BLOCKER_COPY, formatDateTime(), MANUAL_ACTION_REASONS, OnboardingPage(), alertStyle, PortalAccessNotice(), wrapStyle (+10 more)

### Community 39 - "ConfigGapBanner.tsx"
Cohesion: 0.17
Nodes (15): ConfigGapBanner(), ConfigGapBannerProps, colleagueMessage(), ConfigGapNotice, ConfigGapProfessional, ConfigGapSession, dismissConfigGap(), findConfigGaps() (+7 more)

### Community 40 - "snapshot.ts"
Cohesion: 0.09
Nodes (44): PostConsultSection(), PostConsultSectionProps, DEMO_CATALOG, DEMO_CTX, DEMO_PROFILE, DEMO_ROSTER, DEMO_SERVICE_IDS, DEMO_SERVICES (+36 more)

### Community 41 - "CHECKPOINT — Sessão fora do storage: cookie httpOnly first-party (SEC-2)"
Cohesion: 0.15
Nodes (12): 10. Pendências desta rodada, 11. Skills atualizadas, 1. O que estava errado, 2. Por que NÃO foi a "Opção B" que a auditoria sugeria, 3. A arquitetura que ficou, 4. A consequência que mais pega, e o que ela obrigou a mudar, 5. Armadilhas encontradas que o prompt não previa, 6. Como foi provado (contra nginx real, não contra o diff) (+4 more)

### Community 42 - "ServicesSection.tsx"
Cohesion: 0.22
Nodes (13): DURATION_OPTIONS, ServicesSection(), ServicesSectionProps, alsoAffected(), CatalogRow, catalogRows(), offerService(), pendingLinks() (+5 more)

### Community 43 - "calendar.tsx"
Cohesion: 0.21
Nodes (13): ApptBlock(), DayBlock(), DayView(), heightOf(), MonthView(), NowLine(), toneOf(), topOf() (+5 more)

### Community 45 - "snapshot.test.ts"
Cohesion: 0.10
Nodes (20): 10. Incidentes de segurança, 11. Seus direitos e como exercê-los, 12. Crianças e adolescentes, 13. Cookies e armazenamento no navegador, 14. Canal WhatsApp (quando disponível), 15. Alterações desta Política, 16. Encarregado e contato, 1. Sobre esta Política (+12 more)

### Community 46 - "save.test.ts"
Cohesion: 0.11
Nodes (22): SAVE_BLOCKED_MESSAGE, AuthoritativeSnapshot, EMPTY_SNAPSHOT, snapshotForTenant(), emptiedProfessionalWire(), inheritingProfessionalWire(), legacyBackendProfessionalWire(), professionalWire() (+14 more)

### Community 47 - "page.tsx"
Cohesion: 0.12
Nodes (16): EntryInner(), CheckoutSucessoInner(), renderView(), ViewState, baseStyle, HubNotice(), HubNoticeProps, warnStyle (+8 more)

### Community 49 - "CHECKPOINT — chamadas duplicadas e prefetch desperdiçado (PERF-4 / PERF-2 / PERF-3)"
Cohesion: 0.20
Nodes (9): 1. O que mudou, 2. O achado que a auditoria errou: era 1 tela, não 3, 3. O bug que só mutation test achou: derrubar o in-flight não basta, 4. PERF-3 — duas correções ao relatório original, nenhum código aqui, 5. Prova pós-deploy, em produção real (clínica "Chrysostomo For Eyes"), 6. Instrumentos — 2 armadilhas para não repetir, 7. Gates, 8. Pendências (+1 more)

### Community 50 - "CHECKPOINT — Hardening do nginx: headers, 404 e robots.txt (SEC-1 / SEC-3 / SEC-4)"
Cohesion: 0.20
Nodes (9): 1. O que estava errado, medido em produção, 2. A armadilha que quase anulou a correção, 3. CSP — a decisão e por que ela é essa, 4. Referrer-Policy e os tokens na URL (SEC-3), 5. 404 e robots.txt (SEC-4), 6. Arquivos, 7. Como foi verificado, 8. Pendências (+1 more)

### Community 51 - "page.tsx"
Cohesion: 0.07
Nodes (20): UpdatePasswordInner(), ResetTokenInner(), AuthShell(), AuthShellProps, PasswordField(), PasswordFieldProps, StepIndicator(), StepIndicatorProps (+12 more)

### Community 53 - "ProfessionalInsuranceSection.tsx"
Cohesion: 0.18
Nodes (14): Modal(), ModalProps, COPY, InviteKind, InviteTeamMemberModal(), InviteTeamMemberModalProps, ServiceEditorModal(), createProfessionalInvite() (+6 more)

### Community 54 - "MessagesSection.tsx"
Cohesion: 0.19
Nodes (10): collapseBlankRun(), FIXED_GREETING_BUTTONS, GreetingComposer(), LANGUAGE_OPTIONS, MessagesSection(), MessagesSectionProps, splitGreetingTemplate(), Section() (+2 more)

### Community 55 - "AddonsStep.tsx"
Cohesion: 0.18
Nodes (9): ADDON_COPY, AddonsStep(), AddonsStepProps, SignupAddonId, offered(), getCheckoutConfig(), isCheckoutConfigAddon(), ManageApiError (+1 more)

### Community 58 - "CHECKPOINT — nomes acessíveis dos controles de formulário (A11Y-1)"
Cohesion: 0.13
Nodes (14): 1. O que foi medido (não inferido), 2.1 Controle sem conteúdo para nomear — `CToggle`, `CSelect` e cópias, 2.2 O `<label>` do `Field` estava preso no controle ERRADO, 2.3 O `<label>` do `ToggleRow` nomeia — mas horrível, 2. Três causas raiz distintas (a auditoria via uma só), 3. Onde a auditoria e a investigação erraram, 4. O que mudou, 5. Como isso é guardado (+6 more)

### Community 59 - "CadastroWizard.tsx"
Cohesion: 0.16
Nodes (13): CadastroWizardProps, PROGRESS, PROGRESS_LABEL, ContactStep(), ContactStepProps, honeypotStyle, passwordError(), ContactFields (+5 more)

### Community 60 - "platform-links.ts"
Cohesion: 0.17
Nodes (11): PortalHeader(), PortalHeaderProps, PortalProduct, PRODUCT_NAME, ProductLockup(), SecretariaWordmark(), SecretariaWordmarkProps, ThemeToggle() (+3 more)

### Community 63 - "secretaria-hub.ts"
Cohesion: 0.07
Nodes (51): ConfiguracaoPage(), pickProfessional(), saveMessage(), successTone(), getSecretariaHubToken(), invalidateDoctorProfessionals(), canManageClinic(), AppointmentCancelPayload (+43 more)

### Community 64 - "RestartButton.tsx"
Cohesion: 0.40
Nodes (4): RestartButton(), RestartButtonProps, restartTestWindow(), RestartTestWindowResult

### Community 65 - "FacebookPageStep.tsx"
Cohesion: 0.16
Nodes (11): OPTIONS, PriorApiStep(), PriorApiStepProps, OPTIONS, WhatsappUsageStep(), WhatsappUsageStepProps, RadioOption, RadioPillGroup() (+3 more)

### Community 66 - "ContactForm.tsx"
Cohesion: 0.18
Nodes (5): SiteHeader(), SiteHeaderProps, SiteNavLink, BrandGlyph(), BrandGlyphProps

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
Cohesion: 0.24
Nodes (11): saveBlockedReason, CalendarEnsureResult, ensureCalendars(), performSave(), PublishResult, retryProfessionalOnly(), SaveDeps, SaveOutcome (+3 more)

### Community 82 - "SummaryStep.tsx"
Cohesion: 0.14
Nodes (12): ADDON_SUMMARY_LABEL, FB_PAGE_LABEL, PRIOR_API_LABEL, SummaryStep(), SummaryStepProps, USAGE_LABEL, PURCHASABLE_PLANS, ResolvedPlan (+4 more)

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
Cohesion: 0.50
Nodes (4): OnboardingBanner(), STATE_LABEL, DoctorOnboarding, getDoctorOnboarding()

### Community 95 - "Glyph.tsx"
Cohesion: 0.35
Nodes (9): daysRemaining(), daysRemainingLabel(), formatDays(), anchor, formatDate(), isConnected(), ReativarPage(), getTestWindow() (+1 more)

### Community 258 - "getEntitlements"
Cohesion: 0.20
Nodes (6): AddressFields(), AddressFieldsProps, ServiceDraft, ServiceEditorModalProps, Field(), TextInput()

### Community 260 - "PixSection.tsx"
Cohesion: 0.20
Nodes (7): CSelect(), CSelectProps, NumberFieldProps, PixSection(), PixSectionProps, PixDeposit, inputStyle

### Community 261 - "portal-routes.ts"
Cohesion: 0.33
Nodes (6): SiteErrorProps, isSamePath(), PORTAL_ROLES, PostLoginDecision, resolveEntryRedirect(), resolvePostLogin()

### Community 262 - "StateTimeline.tsx"
Cohesion: 0.50
Nodes (4): NODES, rankOf(), StateTimeline(), OnboardingState

### Community 263 - "attempt-error.ts"
Cohesion: 0.80
Nodes (3): ATTEMPT_ERROR_CODE_LABEL, attemptFailureSuffix(), explainAttemptError()

## Knowledge Gaps
- **641 isolated node(s):** `AuthShellProps`, `PasswordFieldProps`, `StepIndicatorProps`, `KEYS`, `repoRoot` (+636 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **165 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Session` connect `InsuranceSection.tsx` to `RestartButton.tsx`, `manage-api.ts`, `page.tsx`, `ConfigGapBanner.tsx`, `snapshot.ts`, `ProfessionalsSection.tsx`, `page.tsx`, `meta-embedded-signup.ts`, `page.tsx`, `manage-api.test.ts`, `PauseToggles.tsx`, `ProfessionalInsuranceSection.tsx`, `secretaria-hub.test.ts`, `sign-out.test.ts`, `OnboardingBanner.tsx`, `secretaria-hub.ts`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `SecretariaWordmark()` connect `platform-links.ts` to `snapshot.ts`, `page.tsx`, `page.tsx`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `ManageApiError` connect `AddonsStep.tsx` to `RestartButton.tsx`, `manage-api.ts`, `page.tsx`, `page.tsx`, `BrandIcon.tsx`, `SummaryStep.tsx`, `page.tsx`, `ProfessionalInsuranceSection.tsx`, `CadastroWizard.tsx`, `secretaria-hub.ts`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `ConfiguracaoPage()` (e.g. with `hydrationReducer()` and `closedWeek()`) actually correct?**
  _`ConfiguracaoPage()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `AuthShellProps`, `PasswordFieldProps`, `StepIndicatorProps` to the rest of the system?**
  _643 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `manage-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02499247214694369 - nodes in this community are weakly interconnected._
- **Should `hub-mapping.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10826210826210826 - nodes in this community are weakly interconnected._