# Graph Report - secretarIA-frontend  (2026-08-31)

## Corpus Check
- 136 files · ~155,842 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1702 nodes · 3558 edges · 107 communities (98 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.65)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed6d414d`
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
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
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
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]
- [[_COMMUNITY_Community 103|Community 103]]
- [[_COMMUNITY_Community 104|Community 104]]
- [[_COMMUNITY_Community 105|Community 105]]
- [[_COMMUNITY_Community 106|Community 106]]

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
- `CheckoutTrialNotice()` --calls--> `catalogRequiresWhatsappCoexistence()`  [EXTRACTED]
  app/(site)/_components/CheckoutTrialNotice.tsx → lib/manage-api.ts
- `CheckoutSucessoInner()` --calls--> `saveSession()`  [EXTRACTED]
  app/(site)/checkout/sucesso/page.tsx → lib/manage-api.ts

## Communities (107 total, 9 thin omitted)

### Community 0 - "page.tsx"
Cohesion: 0.08
Nodes (34): ApptBlock(), DayBlock(), DayView(), heightOf(), MONTH_GRID, MonthView(), NowLine(), toneOf() (+26 more)

### Community 1 - "manage-api.ts"
Cohesion: 0.05
Nodes (78): AdminAnamnesis, AdminAnamnesisDetail, AdminAnamnesisList, AdminDemoRequest, AdminMetrics, AdminMetricsClinic, AdminMetricsDoctor, AdminMetricsSatisfaction (+70 more)

### Community 2 - "CadastroWizard.tsx"
Cohesion: 0.23
Nodes (9): DedicatedNumberGuideProps, STEPS, PageCreationGuide(), PageCreationGuideProps, STEPS, TestWindowExplainerStepProps, StepActions(), StepHeading() (+1 more)

### Community 3 - "page.tsx"
Cohesion: 0.31
Nodes (4): CadastroWizard(), resolvePlan(), CadastroInner(), isPurchaseGated()

### Community 4 - "secretaria-hub.ts"
Cohesion: 0.08
Nodes (48): getSecretariaHubToken(), AppointmentCancelPayload, AppointmentCreatePayload, AppointmentReschedulePayload, AppointmentStatusWire, AppointmentWire, BlockCreatePayload, CachedToken (+40 more)

### Community 5 - "page.tsx"
Cohesion: 0.09
Nodes (36): AddressFieldsOfCtx, applyWireAddress(), applyWireAppointmentTypes(), applyWireBusinessHours(), applyWireGcal(), applyWireInsurances(), applyWireMessages(), applyWirePixDeposit() (+28 more)

### Community 6 - "ProfessionalsSection.tsx"
Cohesion: 0.15
Nodes (14): CToast(), CToastProps, NAV, NavItem, SideNav(), SideNavProps, firstLetter(), Avatar() (+6 more)

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
Cohesion: 0.23
Nodes (10): formatDate(), isConnected(), ReativarPage(), alertStyle, PortalAccessNotice(), wrapStyle, isSessionExpired(), usePortalGuard() (+2 more)

### Community 12 - "page.tsx"
Cohesion: 0.17
Nodes (8): CheckoutSucessoInner(), renderView(), ViewState, getOnboardingStatus(), getSession(), CheckoutSucessoInner(), renderView(), ViewState

### Community 13 - "page.tsx"
Cohesion: 0.19
Nodes (11): NODES, rankOf(), StateTimeline(), ATTEMPT_RESULT_LABEL, BLOCKER_COPY, formatDateTime(), MANUAL_ACTION_REASONS, OnboardingPage() (+3 more)

### Community 14 - "page.tsx"
Cohesion: 0.15
Nodes (6): AuthShell(), AuthShellProps, StepIndicator(), StepIndicatorProps, requestPasswordReset(), verifyResetToken()

### Community 15 - "Icon"
Cohesion: 0.07
Nodes (29): 1. O que estava errado (medido, não suposto), 2. Decisões tomadas (as perguntas que eu não fiz), 3. O que mudou, 4. Validação, 5. Pendências e observações, Ao vivo (Chrome real via CDP, dev server na 3111), CHECKPOINT — Agenda: datas reais (AG-1 a AG-4), code:block1 (janela fetch : Mon Aug 24 -> Mon Aug 31   (a semana que JÁ t) (+21 more)

### Community 16 - "meta-embedded-signup.ts"
Cohesion: 0.08
Nodes (28): ActivateButton(), ActivateButtonProps, classifySignupMessage(), EmbeddedSignupOutcome, FacebookLoginResponse, loadFacebookSdk(), OnboardingAttemptDecision, resolveAttemptDecision() (+20 more)

### Community 17 - "BrandIcon.tsx"
Cohesion: 0.21
Nodes (9): BrandIcon(), BrandIconProps, FILLED, IconName, PATHS, ThemeToggle(), ThemeToggleProps, Theme (+1 more)

### Community 18 - "AvailabilitySection.tsx"
Cohesion: 0.09
Nodes (20): AvailabilitySection(), AvailabilitySectionProps, DayRowProps, TIME_LIST, CSelect(), CSelectProps, CToast(), CToastProps (+12 more)

### Community 19 - "doRefresh"
Cohesion: 0.24
Nodes (15): decodeJwtPayload(), doRefresh(), enterDoctorMode(), exchangeInviteToken(), exchangeOnboardingToken(), exitDoctorMode(), fetchImpersonationDoctor(), login() (+7 more)

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
Cohesion: 0.10
Nodes (20): AddressFields(), AddressFieldsProps, ContextSection(), ContextSectionProps, FIXED_GREETING_BUTTONS, LANGUAGE_OPTIONS, MessagesSection(), MessagesSectionProps (+12 more)

### Community 26 - "usePortalGuard.ts"
Cohesion: 0.22
Nodes (10): clearSession(), isSamePath(), PORTAL_ROLES, PostLoginDecision, resolveEntryRedirect(), resolvePostLogin(), decision, malformed (+2 more)

### Community 27 - "Section.tsx"
Cohesion: 0.13
Nodes (16): DrawerProps, NAV, NavItem, SideNav(), SideNavProps, ApptStatus, firstLetter(), STATUS_META (+8 more)

### Community 28 - "StateTimeline.tsx"
Cohesion: 0.09
Nodes (31): ConfiguracaoPage(), alsoAffected(), buildLoadFailedEvent(), canEditProfessionalFields(), canEditTenantFields(), canSave(), ConfigEvent, ConfigScope (+23 more)

### Community 29 - "SideNav.tsx"
Cohesion: 0.40
Nodes (4): GoogleGlyph(), GoogleSection(), GoogleSectionProps, GoogleCalendarMode

### Community 30 - "secretarIA-frontend"
Cohesion: 0.40
Nodes (4): Convenções deste repo, Documentação — manter em dia (obrigatório), graphify, secretarIA-frontend

### Community 31 - "layout.tsx"
Cohesion: 0.20
Nodes (9): dmSans, FONT_VARIABLES, hankenGrotesk, instrumentSerif, inter, metadata, newsreader, RootLayout() (+1 more)

### Community 32 - "getEntitlements"
Cohesion: 0.09
Nodes (28): AuthoritativeSnapshot, EMPTY_SNAPSHOT, emptiedProfessionalWire(), inheritingProfessionalWire(), legacyBackendProfessionalWire(), professionalWire(), tenantWire(), a (+20 more)

### Community 38 - "ManageApiError"
Cohesion: 0.19
Nodes (11): RETRY_DELAYS_MS, UseSecretariaHubResult, Session, hubConfigured(), baseStyle, HubNotice(), HubNoticeProps, warnStyle (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.10
Nodes (22): ConfigGapBannerProps, colleagueMessage(), ConfigGapNotice, ConfigGapProfessional, ConfigGapSession, dismissConfigGap(), findConfigGaps(), isConfigGapDismissed() (+14 more)

### Community 40 - "Community 40"
Cohesion: 0.07
Nodes (51): AddressFieldsOfCtx, applyWireAddress(), applyWireAppointmentTypes(), applyWireBusinessHours(), applyWireGcal(), applyWireInsurances(), applyWireMessages(), applyWirePixDeposit() (+43 more)

### Community 41 - "clearSession"
Cohesion: 0.22
Nodes (6): logout(), signOut(), ManageApiModule, navigate, sessionStorageMock, SignOutModule

### Community 42 - "Community 42"
Cohesion: 0.17
Nodes (14): CatalogRow, catalogRows(), offerService(), pendingLinks(), unpublished(), nearDuplicateNames(), normalizeServiceName(), CatalogService (+6 more)

### Community 43 - "Community 43"
Cohesion: 0.13
Nodes (20): blockReasonFromSummary(), currentWeekIsoRange(), formatBlockSummary(), isBlockSummary(), mapHubEventsToAppts(), mapHubEventToAppt(), mondayOfWeek(), slotToIsoRange() (+12 more)

### Community 44 - "Community 44"
Cohesion: 0.09
Nodes (17): b64url(), body, deferredRefresh, fresh, jwt, logoutPromise, makeJwt(), ManageApiModule (+9 more)

### Community 45 - "Community 45"
Cohesion: 0.20
Nodes (7): CToggle(), CToggleProps, NumberFieldProps, PixSection(), PixSectionProps, ToggleRow(), ToggleRowProps

### Community 46 - "Community 46"
Cohesion: 0.09
Nodes (17): AUTHENTICATED, blockedScenarios, boom, cause, deps, LOADED_NO_PROFESSIONAL, LOADED_WITH_A, loadedWithB (+9 more)

### Community 47 - "Community 47"
Cohesion: 0.13
Nodes (12): AvailabilitySection(), AvailabilitySectionProps, DayRowProps, TIME_LIST, CSelect(), CSelectProps, InlineNote(), DURATION_OPTIONS (+4 more)

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
Cohesion: 0.15
Nodes (4): AuthShell(), AuthShellProps, StepIndicator(), StepIndicatorProps

### Community 53 - "Community 53"
Cohesion: 0.09
Nodes (29): Drawer(), DrawerProps, BLOCK_REASONS, BlockModal(), CANCEL_REASONS, CancelModal(), clinicDisplay(), MessagePreview() (+21 more)

### Community 54 - "Community 54"
Cohesion: 0.12
Nodes (18): COPY, InviteKind, InviteTeamMemberModal(), InviteTeamMemberModalProps, Modal(), ModalProps, ServiceDraft, ServiceEditorModal() (+10 more)

### Community 55 - "Community 55"
Cohesion: 0.18
Nodes (14): ApptBlock(), DayBlock(), DayView(), heightOf(), MONTH_GRID, MonthView(), NowLine(), toneOf() (+6 more)

### Community 56 - "Community 56"
Cohesion: 0.12
Nodes (25): AgendaPage(), capitalize(), dayIndexFromKey(), fromDateKey(), isSameDay(), MONTH_FMT, MONTH_YEAR_FMT, monthLabel() (+17 more)

### Community 57 - "Community 57"
Cohesion: 0.16
Nodes (14): ADDON_COPY, AddonsStep(), AddonsStepProps, CadastroWizardProps, PROGRESS, PROGRESS_LABEL, PURCHASABLE_PLANS, ResolvedPlan (+6 more)

### Community 58 - "Community 58"
Cohesion: 0.12
Nodes (15): 1. O que foi medido (não inferido), 2.1 Controle sem conteúdo para nomear — `CToggle`, `CSelect` e cópias, 2.2 O `<label>` do `Field` estava preso no controle ERRADO, 2.3 O `<label>` do `ToggleRow` nomeia — mas horrível, 2. Três causas raiz distintas (a auditoria via uma só), 3. Onde a auditoria e a investigação erraram, 4. O que mudou, 5. Como isso é guardado (+7 more)

### Community 59 - "Community 59"
Cohesion: 0.13
Nodes (16): ADDON_COPY, AddonsStep(), AddonsStepProps, CadastroWizardProps, PROGRESS, PROGRESS_LABEL, DedicatedNumberGuide(), TestWindowExplainerStep() (+8 more)

### Community 60 - "Community 60"
Cohesion: 0.13
Nodes (16): ContactStep(), ContactStepProps, honeypotStyle, DedicatedNumberGuide(), DedicatedNumberGuideProps, STEPS, PageCreationGuide(), PageCreationGuideProps (+8 more)

### Community 61 - "Community 61"
Cohesion: 0.16
Nodes (11): FacebookPageStep(), FacebookPageStepProps, OPTIONS, OPTIONS, PriorApiStep(), PriorApiStepProps, RadioOption, RadioPillGroup() (+3 more)

### Community 62 - "Community 62"
Cohesion: 0.17
Nodes (11): PortalHeader(), PortalHeaderProps, PortalProduct, PRODUCT_NAME, ProductLockup(), SecretariaWordmark(), SecretariaWordmarkProps, ThemeToggle() (+3 more)

### Community 63 - "Community 63"
Cohesion: 0.14
Nodes (10): GoogleGlyph(), GoogleSection(), GoogleSectionProps, ProfessionalsSection(), ProfessionalsSectionProps, createSelfProfessional(), DoctorSecretary, getDoctorSecretaries() (+2 more)

### Community 64 - "Community 64"
Cohesion: 0.14
Nodes (13): PauseToggles(), PauseTogglesProps, alertStyle, PortalAccessNotice(), wrapStyle, NODES, rankOf(), StateTimeline() (+5 more)

### Community 65 - "Community 65"
Cohesion: 0.15
Nodes (12): FacebookPageStep(), FacebookPageStepProps, OPTIONS, OPTIONS, PriorApiStep(), PriorApiStepProps, OPTIONS, WhatsappUsageStep() (+4 more)

### Community 66 - "Community 66"
Cohesion: 0.19
Nodes (10): FIXED_GREETING_BUTTONS, LANGUAGE_OPTIONS, MessagesSection(), MessagesSectionProps, PostConsultSection(), PostConsultSectionProps, Section(), SectionProps (+2 more)

### Community 67 - "Community 67"
Cohesion: 0.16
Nodes (12): BrandIcon(), BrandIconProps, FILLED, IconName, PATHS, ConfigGapBanner(), isSessionExpired(), pickProfessional() (+4 more)

### Community 68 - "Community 68"
Cohesion: 0.14
Nodes (13): loadTrialDays(), CheckoutTrialNotice(), CheckoutTrialNoticeProps, loadTrialDays(), noticeStyle, ADDON_SUMMARY_LABEL, FB_PAGE_LABEL, PRIOR_API_LABEL (+5 more)

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
Cohesion: 0.35
Nodes (9): usePortalGuard(), daysRemaining(), daysRemainingLabel(), formatDays(), formatDate(), isConnected(), ReativarPage(), anchor (+1 more)

### Community 76 - "Community 76"
Cohesion: 0.27
Nodes (7): PortalHeader(), PortalHeaderProps, PortalProduct, PRODUCT_NAME, ProductLockup(), SecretariaWordmark(), SecretariaWordmarkProps

### Community 77 - "Community 77"
Cohesion: 0.27
Nodes (9): baseStyle, failureMessage(), infoStyle, LoadStateNotice(), LoadStateNoticeProps, warnStyle, hasLoadError(), HydrationState (+1 more)

### Community 78 - "Community 78"
Cohesion: 0.09
Nodes (32): NAV_IDS, NavId, DEMO_CATALOG, DEMO_CTX, DEMO_PROFILE, DEMO_ROSTER, DEMO_SERVICE_IDS, DEMO_SERVICES (+24 more)

### Community 79 - "Community 79"
Cohesion: 0.25
Nodes (3): SetPasswordForm(), SetPasswordFormProps, ViewState

### Community 80 - "Community 80"
Cohesion: 0.31
Nodes (8): AddressFields(), AddressFieldsProps, ContextSection(), ContextSectionProps, toWireInsurances(), ClinicCtx, insurancesError(), TextInput()

### Community 81 - "Community 81"
Cohesion: 0.22
Nodes (4): SetPasswordForm(), SetPasswordFormProps, ViewState, setPassword()

### Community 82 - "Community 82"
Cohesion: 0.17
Nodes (10): ADDON_SUMMARY_LABEL, FB_PAGE_LABEL, PRIOR_API_LABEL, SummaryStep(), SummaryStepProps, USAGE_LABEL, PURCHASABLE_PLANS, ResolvedPlan (+2 more)

### Community 83 - "Community 83"
Cohesion: 0.15
Nodes (11): CheckoutTrialNotice(), CheckoutTrialNoticeProps, noticeStyle, CadastroInner(), CadastroWizard(), errorStyle, LaunchWaitlistForm(), LaunchWaitlistFormProps (+3 more)

### Community 84 - "Community 84"
Cohesion: 0.22
Nodes (8): 1. O problema, 2. A tela nova, 3. As três armadilhas de migração, 4. Google Calendar: "Conta única" passou a criar as agendas, 5. brain-frontend: as telas da secretarIA saíram, 6. Pendências, O aviso antes de renomear — a parte que o usuário pediu explicitamente, ⚠️ Variável de build nova

### Community 85 - "Community 85"
Cohesion: 0.29
Nodes (6): OnboardingBanner(), STATE_LABEL, OnboardingBanner(), STATE_LABEL, DoctorOnboarding, getDoctorOnboarding()

### Community 86 - "Community 86"
Cohesion: 0.20
Nodes (7): CALL_SITE_FILES, code, CONTROLS, repoRoot, sources, SWITCH_IMPLEMENTATIONS, unlabelled

### Community 89 - "Community 89"
Cohesion: 0.33
Nodes (4): css, repoRoot, rule, SCREENS

### Community 90 - "Community 90"
Cohesion: 0.29
Nodes (6): Auditoria de rotas & requisições — 30/08/2026, Convenções deste repo, Documentação — manter em dia (obrigatório), graphify, Prompts prontos para rodar, secretarIA-frontend

### Community 91 - "Community 91"
Cohesion: 0.40
Nodes (3): PauseToggles(), PauseTogglesProps, pauseOnboarding()

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

### Community 103 - "Community 103"
Cohesion: 0.60
Nodes (4): ATTEMPT_ERROR_CODE_LABEL, attemptFailureSuffix(), explainAttemptError(), suffix

### Community 104 - "Community 104"
Cohesion: 0.40
Nodes (4): ContactStep(), ContactStepProps, honeypotStyle, ContactFields

### Community 105 - "Community 105"
Cohesion: 0.40
Nodes (4): OPTIONS, WhatsappUsageStep(), WhatsappUsageStepProps, SignupIntakeWhatsappUsage

## Knowledge Gaps
- **594 isolated node(s):** `nextConfig`, `name`, `version`, `private`, `dev` (+589 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Session` connect `ManageApiError` to `manage-api.ts`, `secretaria-hub.ts`, `PixSection.tsx`, `meta-embedded-signup.ts`, `Session`, `manage-api.test.ts`, `usePortalGuard.ts`, `Community 39`, `clearSession`, `Community 43`, `Community 44`, `Community 54`, `Community 63`, `Community 64`, `Community 72`, `Community 78`, `Community 79`, `Community 81`, `Community 85`, `Community 91`, `Community 92`, `Community 106`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `ManageApiError` connect `Community 101` to `manage-api.ts`, `Community 68`, `secretaria-hub.ts`, `ManageApiError`, `PixSection.tsx`, `page.tsx`, `page.tsx`, `Community 79`, `Community 81`, `Community 82`, `Community 51`, `Community 54`, `Community 57`, `usePortalGuard.ts`, `Community 59`, `Community 92`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **Why does `signOut()` connect `clearSession` to `Community 67`, `page.tsx`, `Community 73`, `Community 43`, `Community 78`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `nextConfig`, `name`, `version` to the rest of the system?**
  _594 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.08305647840531562 - nodes in this community are weakly interconnected._
- **Should `manage-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05031645569620253 - nodes in this community are weakly interconnected._
- **Should `secretaria-hub.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08446455505279035 - nodes in this community are weakly interconnected._