# Graph Report - secretarIA-frontend  (2026-08-31)

## Corpus Check
- 137 files · ~160,778 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1733 nodes · 3595 edges · 94 communities (89 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `bf9b3de4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_manage-api.ts|manage-api.ts]]
- [[_COMMUNITY_CadastroWizard.tsx|CadastroWizard.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_secretaria-hub.ts|secretaria-hub.ts]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_ProfessionalsSection.tsx|ProfessionalsSection.tsx]]
- [[_COMMUNITY_manageFetch|manageFetch]]
- [[_COMMUNITY_package.json|package.json]]
- [[_COMMUNITY_compilerOptions|compilerOptions]]
- [[_COMMUNITY_PixSection.tsx|PixSection.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_page.tsx|page.tsx]]
- [[_COMMUNITY_Icon|Icon]]
- [[_COMMUNITY_meta-embedded-signup.ts|meta-embedded-signup.ts]]
- [[_COMMUNITY_BrandIcon.tsx|BrandIcon.tsx]]
- [[_COMMUNITY_AvailabilitySection.tsx|AvailabilitySection.tsx]]
- [[_COMMUNITY_doRefresh|doRefresh]]
- [[_COMMUNITY_Session|Session]]
- [[_COMMUNITY_ServiceCard.tsx|ServiceCard.tsx]]
- [[_COMMUNITY_CHECKPOINT — secretarIA-frontend (split out of brain-frontend)|CHECKPOINT — secretarIA-frontend (split out of brain-frontend)]]
- [[_COMMUNITY_types.ts|types.ts]]
- [[_COMMUNITY_manage-api.test.ts|manage-api.test.ts]]
- [[_COMMUNITY_ActivateButton.tsx|ActivateButton.tsx]]
- [[_COMMUNITY_usePortalGuard.ts|usePortalGuard.ts]]
- [[_COMMUNITY_Section.tsx|Section.tsx]]
- [[_COMMUNITY_StateTimeline.tsx|StateTimeline.tsx]]
- [[_COMMUNITY_SideNav.tsx|SideNav.tsx]]
- [[_COMMUNITY_secretarIA-frontend|secretarIA-frontend]]
- [[_COMMUNITY_layout.tsx|layout.tsx]]
- [[_COMMUNITY_getEntitlements|getEntitlements]]
- [[_COMMUNITY_next.config.mjs|next.config.mjs]]
- [[_COMMUNITY_ManageApiError|ManageApiError]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_clearSession|clearSession]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 102|Community 102]]

## God Nodes (most connected - your core abstractions)
1. `manageFetch()` - 43 edges
2. `Session` - 32 edges
3. `ManageApiError` - 29 edges
4. `hubFetch()` - 24 edges
5. `Icon()` - 19 edges
6. `Icon()` - 18 edges
7. `compilerOptions` - 16 edges
8. `compilerOptions` - 16 edges
9. `getSession()` - 14 edges
10. `saveSession()` - 13 edges

## Surprising Connections (you probably didn't know these)
- `pickProfessional()` --calls--> `canManageClinic()`  [EXTRACTED]
  app/(site)/configuracao/page.tsx → lib/portal-routes.ts
- `ConfiguracaoPage()` --calls--> `canManageClinic()`  [EXTRACTED]
  app/(site)/configuracao/page.tsx → lib/portal-routes.ts
- `loadTrialDays()` --calls--> `getCheckoutTrialDays()`  [EXTRACTED]
  app/(site)/_components/CheckoutTrialNotice.tsx → lib/manage-api.ts
- `isPurchaseGated()` --calls--> `catalogRequiresWhatsappCoexistence()`  [EXTRACTED]
  app/(site)/_lib/launch.ts → lib/manage-api.ts
- `useSecretariaHub()` --calls--> `hubConfigured()`  [EXTRACTED]
  app/(site)/_shared/useSecretariaHub.ts → lib/secretaria-hub.ts

## Communities (94 total, 5 thin omitted)

### Community 0 - "page.tsx"
Cohesion: 0.06
Nodes (55): ApptBlock(), DayBlock(), DayView(), heightOf(), MONTH_GRID, MonthView(), NowLine(), toneOf() (+47 more)

### Community 1 - "manage-api.ts"
Cohesion: 0.05
Nodes (82): AdminAnamnesis, AdminAnamnesisDetail, AdminAnamnesisList, AdminDemoRequest, AdminMetrics, AdminMetricsClinic, AdminMetricsDoctor, AdminMetricsSatisfaction (+74 more)

### Community 2 - "CadastroWizard.tsx"
Cohesion: 0.14
Nodes (15): DedicatedNumberGuide(), DedicatedNumberGuideProps, STEPS, PageCreationGuide(), PageCreationGuideProps, STEPS, OPTIONS, PriorApiStep() (+7 more)

### Community 3 - "page.tsx"
Cohesion: 0.21
Nodes (7): CadastroWizard(), resolvePlan(), CadastroInner(), errorStyle, LaunchWaitlistForm(), LaunchWaitlistFormProps, isPurchaseGated()

### Community 4 - "secretaria-hub.ts"
Cohesion: 0.06
Nodes (64): RETRY_DELAYS_MS, UseSecretariaHubResult, getSecretariaHubToken(), AddressWire, AppointmentCancelPayload, AppointmentCreatePayload, AppointmentReschedulePayload, AppointmentStatusWire (+56 more)

### Community 5 - "page.tsx"
Cohesion: 0.09
Nodes (35): AddressFieldsOfCtx, applyWireAddress(), applyWireAppointmentTypes(), applyWireBusinessHours(), applyWireGcal(), applyWireInsurances(), applyWireMessages(), applyWirePixDeposit() (+27 more)

### Community 6 - "ProfessionalsSection.tsx"
Cohesion: 0.16
Nodes (13): canSave(), SaveBlockedReason, SaveMode, CalendarEnsureResult, ensureCalendars(), performSave(), PublishResult, retryProfessionalOnly() (+5 more)

### Community 7 - "manageFetch"
Cohesion: 0.12
Nodes (22): adminCreateUser(), adminDeleteTenant(), adminGetAnamnesis(), adminGetEntitlements(), adminGetMetrics(), adminGetTenant(), adminListAnamneses(), adminListDemoRequests() (+14 more)

### Community 8 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, next, react, react-dom, devDependencies, @types/node, @types/react, @types/react-dom (+11 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "PixSection.tsx"
Cohesion: 0.14
Nodes (11): Modal(), ModalProps, COPY, InviteKind, InviteTeamMemberModal(), InviteTeamMemberModalProps, ProfessionalsSection(), ProfessionalsSectionProps (+3 more)

### Community 11 - "page.tsx"
Cohesion: 0.24
Nodes (10): CheckoutTrialNotice(), CheckoutTrialNoticeProps, loadTrialDays(), noticeStyle, CheckoutTrialNotice(), CheckoutTrialNoticeProps, loadTrialDays(), noticeStyle (+2 more)

### Community 12 - "page.tsx"
Cohesion: 0.11
Nodes (23): CheckoutSucessoInner(), renderView(), ViewState, decodeJwtPayload(), doRefresh(), enterDoctorMode(), exchangeInviteToken(), exchangeOnboardingToken() (+15 more)

### Community 13 - "page.tsx"
Cohesion: 0.18
Nodes (11): ConfigEvent, ConfigScope, emitConfigEvent(), HydrationAction, hydrationReducer(), IDLE_SCOPE, isCurrentCycle(), isVisitorDemo() (+3 more)

### Community 14 - "page.tsx"
Cohesion: 0.18
Nodes (10): 1. Como foi medido, 2. A auditoria original errou os números — o fundo não é `--surface`, 3. São SEIS causas, não três — e uma delas é o inverso das outras, 4. O que mudou, 5. A11Y-3 — o que era verdade e o que não era, 6. Resultado, 7. Pendências e consequências conhecidas, CHECKPOINT — contraste e landmarks (A11Y-2 / A11Y-3) (+2 more)

### Community 15 - "Icon"
Cohesion: 0.07
Nodes (29): 1. O que estava errado (medido, não suposto), 2. Decisões tomadas (as perguntas que eu não fiz), 3. O que mudou, 4. Validação, 5. Pendências e observações, Ao vivo (Chrome real via CDP, dev server na 3111), CHECKPOINT — Agenda: datas reais (AG-1 a AG-4), code:block1 (janela fetch : Mon Aug 24 -> Mon Aug 31   (a semana que JÁ t) (+21 more)

### Community 16 - "meta-embedded-signup.ts"
Cohesion: 0.08
Nodes (28): ActivateButton(), ActivateButtonProps, classifySignupMessage(), EmbeddedSignupOutcome, FacebookLoginResponse, loadFacebookSdk(), OnboardingAttemptDecision, resolveAttemptDecision() (+20 more)

### Community 17 - "BrandIcon.tsx"
Cohesion: 0.06
Nodes (38): NODES, rankOf(), StateTimeline(), ATTEMPT_RESULT_LABEL, BLOCKER_COPY, formatDateTime(), MANUAL_ACTION_REASONS, OnboardingPage() (+30 more)

### Community 18 - "AvailabilitySection.tsx"
Cohesion: 0.09
Nodes (20): AvailabilitySection(), AvailabilitySectionProps, DayRowProps, TIME_LIST, CSelect(), CSelectProps, CToast(), CToastProps (+12 more)

### Community 19 - "doRefresh"
Cohesion: 0.25
Nodes (6): ADDON_COPY, AddonsStep(), AddonsStepProps, PURCHASABLE_PLANS, ResolvedPlan, SignupAddonId

### Community 20 - "Session"
Cohesion: 0.22
Nodes (3): b64url(), makeJwt(), ManageApiModule

### Community 21 - "ServiceCard.tsx"
Cohesion: 0.09
Nodes (20): appt, block, d, end, { endIso }, events, instant, keys (+12 more)

### Community 22 - "CHECKPOINT — secretarIA-frontend (split out of brain-frontend)"
Cohesion: 0.13
Nodes (13): A tela `/` — composição nova, não é cópia, CHECKPOINT — secretarIA-frontend (split out of brain-frontend), code:block1 (npm install), Decisões tomadas nesta rodada, Deploy no EasyPanel (guia — nada disto foi executado), Lacunas conhecidas (nada disto bloqueia o build), Mapa de rotas (14 + `_not-found`, todas estáticas), Mapa de rotas (14, todas estáticas) (+5 more)

### Community 23 - "types.ts"
Cohesion: 0.20
Nodes (10): conf, csp, firstLocation, lines, map, read(), repoRoot, REQUIRED (+2 more)

### Community 24 - "manage-api.test.ts"
Cohesion: 0.40
Nodes (3): HubModule, mockHubTokenMint(), mockResponse()

### Community 25 - "ActivateButton.tsx"
Cohesion: 0.16
Nodes (12): AddressFields(), AddressFieldsProps, ContextSection(), ContextSectionProps, NumberFieldProps, PixSection(), PixSectionProps, ToggleRow() (+4 more)

### Community 26 - "usePortalGuard.ts"
Cohesion: 0.20
Nodes (12): pickProfessional(), InicioPage(), canManageClinic(), isSamePath(), PORTAL_ROLES, PostLoginDecision, resolveEntryRedirect(), resolvePostLogin() (+4 more)

### Community 27 - "Section.tsx"
Cohesion: 0.11
Nodes (19): FIXED_GREETING_BUTTONS, LANGUAGE_OPTIONS, MessagesSection(), MessagesSectionProps, PostConsultSection(), PostConsultSectionProps, Section(), SectionProps (+11 more)

### Community 28 - "StateTimeline.tsx"
Cohesion: 0.16
Nodes (13): buildLoadFailedEvent(), INITIAL_HYDRATION_STATE, statusOf(), event, fullyLoaded(), loaded, refreshed, retried (+5 more)

### Community 29 - "SideNav.tsx"
Cohesion: 0.18
Nodes (9): GoogleGlyph(), GoogleSection(), GoogleSectionProps, GoogleCalendarMode, baseStyle, HubNotice(), HubNoticeProps, warnStyle (+1 more)

### Community 30 - "secretarIA-frontend"
Cohesion: 0.40
Nodes (4): Convenções deste repo, Documentação — manter em dia (obrigatório), graphify, secretarIA-frontend

### Community 31 - "layout.tsx"
Cohesion: 0.20
Nodes (9): dmSans, FONT_VARIABLES, hankenGrotesk, instrumentSerif, inter, metadata, newsreader, RootLayout() (+1 more)

### Community 32 - "getEntitlements"
Cohesion: 0.08
Nodes (23): AuthoritativeSnapshot, EMPTY_SNAPSHOT, a, allClosed, b, baseline, baselineProfessional, body (+15 more)

### Community 38 - "ManageApiError"
Cohesion: 0.53
Nodes (5): emptiedProfessionalWire(), inheritingProfessionalWire(), legacyBackendProfessionalWire(), professionalWire(), tenantWire()

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (22): ConfigGapBanner(), ConfigGapBannerProps, colleagueMessage(), ConfigGapNotice, ConfigGapProfessional, ConfigGapSession, dismissConfigGap(), findConfigGaps() (+14 more)

### Community 40 - "Community 40"
Cohesion: 0.10
Nodes (33): AddressFieldsOfCtx, applyWireAddress(), applyWireAppointmentTypes(), applyWireBusinessHours(), applyWireGcal(), applyWireInsurances(), applyWireMessages(), applyWirePixDeposit() (+25 more)

### Community 41 - "clearSession"
Cohesion: 0.50
Nodes (4): fetchDoctorProfessionals(), getDoctorProfessionals(), invalidateDoctorProfessionals(), professionalsKey()

### Community 42 - "Community 42"
Cohesion: 0.13
Nodes (17): DURATION_OPTIONS, ServicesSection(), ServicesSectionProps, CatalogRow, catalogRows(), offerService(), pendingLinks(), unpublished() (+9 more)

### Community 44 - "Community 44"
Cohesion: 0.06
Nodes (25): a, afterMutation, b, b64url(), body, deferredRefresh, fresh, jwt (+17 more)

### Community 46 - "Community 46"
Cohesion: 0.09
Nodes (18): isLegacyBackend(), AUTHENTICATED, blockedScenarios, boom, cause, deps, LOADED_NO_PROFESSIONAL, LOADED_WITH_A (+10 more)

### Community 47 - "Community 47"
Cohesion: 0.09
Nodes (17): AvailabilitySection(), AvailabilitySectionProps, DayRowProps, TIME_LIST, CSelect(), CSelectProps, CToggle(), CToggleProps (+9 more)

### Community 48 - "Community 48"
Cohesion: 0.10
Nodes (19): dependencies, next, react, react-dom, devDependencies, @types/node, @types/react, @types/react-dom (+11 more)

### Community 49 - "Community 49"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 50 - "Community 50"
Cohesion: 0.20
Nodes (9): 1. O que estava errado, medido em produção, 2. A armadilha que quase anulou a correção, 3. CSP — a decisão e por que ela é essa, 4. Referrer-Policy e os tokens na URL (SEC-3), 5. 404 e robots.txt (SEC-4), 6. Arquivos, 7. Como foi verificado, 8. Pendências (+1 more)

### Community 51 - "Community 51"
Cohesion: 0.06
Nodes (14): AuthShell(), AuthShellProps, PasswordField(), PasswordFieldProps, StepIndicator(), StepIndicatorProps, confirmPasswordReset(), ManageApiError (+6 more)

### Community 53 - "Community 53"
Cohesion: 0.09
Nodes (31): Drawer(), DrawerProps, BLOCK_REASONS, BlockModal(), CANCEL_REASONS, CancelModal(), clinicDisplay(), MessagePreview() (+23 more)

### Community 54 - "Community 54"
Cohesion: 0.09
Nodes (26): AddressFields(), AddressFieldsProps, ContextSection(), ContextSectionProps, COPY, InviteKind, InviteTeamMemberModal(), InviteTeamMemberModalProps (+18 more)

### Community 55 - "Community 55"
Cohesion: 0.20
Nodes (13): ApptBlock(), DayBlock(), DayView(), heightOf(), MONTH_GRID, MonthView(), NowLine(), toneOf() (+5 more)

### Community 56 - "Community 56"
Cohesion: 0.11
Nodes (27): AgendaPage(), capitalize(), dayIndexFromKey(), fromDateKey(), isSameDay(), MONTH_FMT, MONTH_YEAR_FMT, MonthCell (+19 more)

### Community 57 - "Community 57"
Cohesion: 0.18
Nodes (12): CadastroWizardProps, PROGRESS, PROGRESS_LABEL, ContactStep(), ContactStepProps, honeypotStyle, ContactFields, EMPTY_ANSWERS (+4 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (15): 1. O que foi medido (não inferido), 2.1 Controle sem conteúdo para nomear — `CToggle`, `CSelect` e cópias, 2.2 O `<label>` do `Field` estava preso no controle ERRADO, 2.3 O `<label>` do `ToggleRow` nomeia — mas horrível, 2. Três causas raiz distintas (a auditoria via uma só), 3. Onde a auditoria e a investigação erraram, 4. O que mudou, 5. Como isso é guardado (+7 more)

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (17): ADDON_COPY, AddonsStep(), AddonsStepProps, CadastroWizardProps, PROGRESS, PROGRESS_LABEL, ContactStep(), ContactStepProps (+9 more)

### Community 60 - "Community 60"
Cohesion: 0.17
Nodes (12): DedicatedNumberGuide(), DedicatedNumberGuideProps, STEPS, PageCreationGuide(), PageCreationGuideProps, STEPS, TestWindowExplainerStep(), TestWindowExplainerStepProps (+4 more)

### Community 61 - "Community 61"
Cohesion: 0.14
Nodes (13): FacebookPageStep(), FacebookPageStepProps, OPTIONS, OPTIONS, PriorApiStep(), PriorApiStepProps, RadioOption, RadioPillGroup() (+5 more)

### Community 62 - "Community 62"
Cohesion: 0.15
Nodes (13): alertStyle, PortalAccessNotice(), wrapStyle, PortalHeader(), PortalHeaderProps, PortalProduct, PRODUCT_NAME, ProductLockup() (+5 more)

### Community 63 - "Community 63"
Cohesion: 0.07
Nodes (29): CToast(), CToastProps, GoogleGlyph(), GoogleSection(), GoogleSectionProps, PostConsultSection(), PostConsultSectionProps, ProfessionalsSection() (+21 more)

### Community 64 - "Community 64"
Cohesion: 0.13
Nodes (16): PauseToggles(), PauseTogglesProps, NODES, rankOf(), StateTimeline(), ATTEMPT_ERROR_CODE_LABEL, attemptFailureSuffix(), explainAttemptError() (+8 more)

### Community 65 - "Community 65"
Cohesion: 0.16
Nodes (11): FacebookPageStep(), FacebookPageStepProps, OPTIONS, OPTIONS, WhatsappUsageStep(), WhatsappUsageStepProps, RadioOption, RadioPillGroup() (+3 more)

### Community 66 - "Community 66"
Cohesion: 0.24
Nodes (8): collapseBlankRun(), FIXED_GREETING_BUTTONS, GreetingComposer(), LANGUAGE_OPTIONS, MessagesSection(), MessagesSectionProps, splitGreetingTemplate(), Messages

### Community 67 - "Community 67"
Cohesion: 0.21
Nodes (9): BrandIcon(), BrandIconProps, FILLED, IconName, PATHS, ThemeToggle(), ThemeToggleProps, Theme (+1 more)

### Community 68 - "Community 68"
Cohesion: 0.22
Nodes (7): ADDON_SUMMARY_LABEL, FB_PAGE_LABEL, PRIOR_API_LABEL, SummaryStep(), SummaryStepProps, USAGE_LABEL, createPublicCheckoutSession()

### Community 69 - "Community 69"
Cohesion: 0.17
Nodes (11): 1. O que é, 2. De onde vem o sinal — e a correção ao prompt, 3. As três decisões, confirmadas pelo usuário antes do código, 4. Arquivos, 5. Armadilhas registradas, 6. Gates (rodados 2026-08-29), 7. Pendências, CHECKPOINT — Banner "configure sua secretarIA" (FEAT 42) (+3 more)

### Community 70 - "Community 70"
Cohesion: 0.17
Nodes (11): 1. O que estava errado, 2. A correção, 3. Como foi provado, 4. Pendências, CHECKPOINT — Fontes self-hosted via `next/font/google` (PERF-1 / LGPD), code:tsx (<link rel="preconnect" href="https://fonts.googleapis.com" /), code:css (/* antes */  --font-title: 'Space Grotesk', system-ui, sans-), Guarda de regressão (+3 more)

### Community 71 - "Community 71"
Cohesion: 0.18
Nodes (10): 1. Marca — a logo Brain de verdade, 2. Ícone da aba (favicon), 3. Google Calendar na aba Profissionais (Seção 05) e na Seção 08, 4. Serviço novo já nasce marcado para quem o criou, 5. Horário da clínica + "Preencher horários padrão da clínica" (Seção 07), CHECKPOINT — Marca Brain nova + rodada de UX na Configuração, Consequências de contrato, Decisão de escopo que ficou de fora (+2 more)

### Community 72 - "Community 72"
Cohesion: 0.20
Nodes (8): BACKEND_PROFESSIONAL_LIST_ITEM_KEYS, HubModule, legacy, { missing, unexpected }, mockHubTokenMint(), mockResponse(), result, { unexpected }

### Community 73 - "Community 73"
Cohesion: 0.20
Nodes (22): ModalState, ToastState, Toolbar(), ViewMode, blockReasonFromSummary(), currentWeekIsoRange(), formatBlockSummary(), isBlockSummary() (+14 more)

### Community 74 - "Community 74"
Cohesion: 0.27
Nodes (11): usePortalGuard(), getTestWindow(), TestWindow, daysRemaining(), daysRemainingLabel(), formatDays(), formatDate(), isConnected() (+3 more)

### Community 77 - "Community 77"
Cohesion: 0.27
Nodes (9): baseStyle, failureMessage(), infoStyle, LoadStateNotice(), LoadStateNoticeProps, warnStyle, hasLoadError(), HydrationState (+1 more)

### Community 78 - "Community 78"
Cohesion: 0.10
Nodes (33): ConfiguracaoPage(), NAV_IDS, NavId, alsoAffected(), DEMO_CATALOG, DEMO_CTX, DEMO_PROFILE, DEMO_ROSTER (+25 more)

### Community 81 - "Community 81"
Cohesion: 0.12
Nodes (7): SetPasswordForm(), SetPasswordFormProps, ViewState, SetPasswordForm(), SetPasswordFormProps, ViewState, setPassword()

### Community 82 - "Community 82"
Cohesion: 0.17
Nodes (10): ADDON_SUMMARY_LABEL, FB_PAGE_LABEL, PRIOR_API_LABEL, SummaryStep(), SummaryStepProps, USAGE_LABEL, PURCHASABLE_PLANS, ResolvedPlan (+2 more)

### Community 83 - "Community 83"
Cohesion: 0.31
Nodes (4): CadastroInner(), CadastroWizard(), isPurchaseGated(), resolvePlan()

### Community 84 - "Community 84"
Cohesion: 0.22
Nodes (8): 1. O problema, 2. A tela nova, 3. As três armadilhas de migração, 4. Google Calendar: "Conta única" passou a criar as agendas, 5. brain-frontend: as telas da secretarIA saíram, 6. Pendências, O aviso antes de renomear — a parte que o usuário pediu explicitamente, ⚠️ Variável de build nova

### Community 85 - "Community 85"
Cohesion: 0.08
Nodes (16): PauseToggles(), PauseTogglesProps, OnboardingBanner(), STATE_LABEL, OnboardingBanner(), STATE_LABEL, DoctorOnboarding, getDoctorOnboarding() (+8 more)

### Community 86 - "Community 86"
Cohesion: 0.20
Nodes (7): CALL_SITE_FILES, code, CONTROLS, repoRoot, sources, SWITCH_IMPLEMENTATIONS, unlabelled

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (4): css, repoRoot, rule, SCREENS

### Community 90 - "Community 90"
Cohesion: 0.29
Nodes (6): Auditoria de rotas & requisições — 30/08/2026, Convenções deste repo, Documentação — manter em dia (obrigatório), graphify, Prompts prontos para rodar, secretarIA-frontend

### Community 92 - "Community 92"
Cohesion: 0.29
Nodes (6): RestartButton(), RestartButtonProps, RestartButton(), RestartButtonProps, restartTestWindow(), RestartTestWindowResult

### Community 93 - "Community 93"
Cohesion: 0.25
Nodes (5): code, cssFiles, m, offenders, repoRoot

### Community 94 - "Community 94"
Cohesion: 0.40
Nodes (4): errorStyle, LaunchWaitlistForm(), LaunchWaitlistFormProps, submitLaunchWaitlist()

### Community 102 - "Community 102"
Cohesion: 0.29
Nodes (5): beforeSubmit, conditional, DEMO_SCREENS, repoRoot, src

## Knowledge Gaps
- **613 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+608 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Session` connect `Community 85` to `Community 64`, `manage-api.ts`, `secretaria-hub.ts`, `Community 39`, `Community 72`, `PixSection.tsx`, `Community 44`, `Community 78`, `meta-embedded-signup.ts`, `Community 81`, `BrandIcon.tsx`, `Session`, `Community 54`, `manage-api.test.ts`, `usePortalGuard.ts`, `Community 92`, `SideNav.tsx`, `Community 63`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Why does `ManageApiError` connect `Community 51` to `manage-api.ts`, `Community 68`, `secretaria-hub.ts`, `PixSection.tsx`, `page.tsx`, `Community 81`, `BrandIcon.tsx`, `doRefresh`, `Community 82`, `Community 54`, `Community 57`, `usePortalGuard.ts`, `Community 59`, `Community 92`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `HubApiError` connect `secretaria-hub.ts` to `page.tsx`, `Community 73`, `PixSection.tsx`, `Community 46`, `Community 78`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _613 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05714285714285714 - nodes in this community are weakly interconnected._
- **Should `manage-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.04675846242111302 - nodes in this community are weakly interconnected._
- **Should `CadastroWizard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.14210526315789473 - nodes in this community are weakly interconnected._