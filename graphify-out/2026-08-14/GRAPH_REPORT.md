# Graph Report - secretarIA-frontend  (2026-08-14)

## Corpus Check
- 93 files · ~72,164 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 700 nodes · 1347 edges · 42 communities (40 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `291baeae`
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
- [[_COMMUNITY_PriorApiStep.tsx|PriorApiStep.tsx]]
- [[_COMMUNITY_WhatsappUsageStep.tsx|WhatsappUsageStep.tsx]]
- [[_COMMUNITY_clearSession|clearSession]]

## God Nodes (most connected - your core abstractions)
1. `manageFetch()` - 39 edges
2. `Icon()` - 18 edges
3. `hubFetch()` - 17 edges
4. `compilerOptions` - 16 edges
5. `Session` - 15 edges
6. `ManageApiError` - 12 edges
7. `CHECKPOINT — secretarIA-frontend (split out of brain-frontend)` - 11 edges
8. `BrandGlyph()` - 10 edges
9. `Field()` - 10 edges
10. `StepHeading()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `loadTrialDays()` --calls--> `getCheckoutTrialDays()`  [EXTRACTED]
  app/(site)/_components/CheckoutTrialNotice.tsx → lib/manage-api.ts
- `useSecretariaHub()` --calls--> `hubConfigured()`  [EXTRACTED]
  app/(site)/_shared/useSecretariaHub.ts → lib/secretaria-hub.ts
- `CheckoutSucessoInner()` --calls--> `exchangeOnboardingToken()`  [EXTRACTED]
  app/(site)/checkout/sucesso/page.tsx → lib/manage-api.ts
- `CheckoutSucessoInner()` --calls--> `saveSession()`  [EXTRACTED]
  app/(site)/checkout/sucesso/page.tsx → lib/manage-api.ts
- `CheckoutTrialNotice()` --calls--> `catalogRequiresWhatsappCoexistence()`  [EXTRACTED]
  app/(site)/_components/CheckoutTrialNotice.tsx → lib/manage-api.ts

## Import Cycles
- None detected.

## Communities (42 total, 2 thin omitted)

### Community 0 - "page.tsx"
Cohesion: 0.06
Nodes (61): ApptBlock(), DayBlock(), DayView(), heightOf(), MONTH_GRID, MonthView(), NowLine(), toneOf() (+53 more)

### Community 1 - "manage-api.ts"
Cohesion: 0.03
Nodes (69): AdminAnamnesis, AdminAnamnesisDetail, AdminAnamnesisList, AdminDemoRequest, AdminMetrics, AdminMetricsClinic, AdminMetricsDoctor, AdminMetricsSatisfaction (+61 more)

### Community 2 - "CadastroWizard.tsx"
Cohesion: 0.13
Nodes (17): ADDON_COPY, AddonsStep(), AddonsStepProps, CadastroWizardProps, PROGRESS, PROGRESS_LABEL, ContactStep(), ContactStepProps (+9 more)

### Community 3 - "page.tsx"
Cohesion: 0.05
Nodes (27): CadastroWizard(), resolvePlan(), CadastroInner(), BrandGlyph(), BrandGlyphProps, CheckoutTrialNotice(), CheckoutTrialNoticeProps, loadTrialDays() (+19 more)

### Community 4 - "secretaria-hub.ts"
Cohesion: 0.06
Nodes (46): baseStyle, HubNotice(), HubNoticeProps, warnStyle, RETRY_DELAYS_MS, UseSecretariaHubResult, getSecretariaHubToken(), AddressWire (+38 more)

### Community 5 - "page.tsx"
Cohesion: 0.09
Nodes (29): AgendaPage(), AddressFieldsOfCtx, applyWireAddress(), applyWireAppointmentTypes(), applyWireBusinessHours(), applyWireGcal(), applyWireInsurances(), applyWireMessages() (+21 more)

### Community 6 - "ProfessionalsSection.tsx"
Cohesion: 0.10
Nodes (16): Modal(), ModalProps, COPY, InviteKind, InviteTeamMemberModal(), InviteTeamMemberModalProps, ProfessionalsSection(), ProfessionalsSectionProps (+8 more)

### Community 7 - "manageFetch"
Cohesion: 0.11
Nodes (23): adminCreateUser(), adminDeleteTenant(), adminGetAnamnesis(), adminGetEntitlements(), adminGetMetrics(), adminGetTenant(), adminListAnamneses(), adminListDemoRequests() (+15 more)

### Community 8 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, next, react, react-dom, devDependencies, @types/node, @types/react, @types/react-dom (+11 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "PixSection.tsx"
Cohesion: 0.33
Nodes (7): AddressFields(), AddressFieldsProps, ContextSection(), ContextSectionProps, ClinicCtx, Field(), TextInput()

### Community 11 - "page.tsx"
Cohesion: 0.25
Nodes (9): formatDate(), isConnected(), ReativarPage(), alertStyle, PortalAccessNotice(), wrapStyle, usePortalGuard(), getTestWindow() (+1 more)

### Community 12 - "page.tsx"
Cohesion: 0.31
Nodes (5): CheckoutSucessoInner(), renderView(), ViewState, getOnboardingStatus(), getSession()

### Community 13 - "page.tsx"
Cohesion: 0.16
Nodes (11): PauseToggles(), PauseTogglesProps, ATTEMPT_RESULT_LABEL, BLOCKER_COPY, formatDateTime(), MANUAL_ACTION_REASONS, OnboardingPage(), isSessionExpired() (+3 more)

### Community 14 - "page.tsx"
Cohesion: 0.18
Nodes (4): AuthShell(), AuthShellProps, PasswordField(), PasswordFieldProps

### Community 15 - "Icon"
Cohesion: 0.16
Nodes (9): CSelect(), CSelectProps, CToast(), CToastProps, NumberFieldProps, PixSection(), PixSectionProps, PixDeposit (+1 more)

### Community 16 - "meta-embedded-signup.ts"
Cohesion: 0.06
Nodes (22): ActivateButton(), ActivateButtonProps, classifySignupMessage(), EmbeddedSignupOutcome, FacebookLoginResponse, loadFacebookSdk(), OnboardingAttemptDecision, resolveAttemptDecision() (+14 more)

### Community 17 - "BrandIcon.tsx"
Cohesion: 0.21
Nodes (9): BrandIcon(), BrandIconProps, FILLED, IconName, PATHS, ThemeToggle(), ThemeToggleProps, Theme (+1 more)

### Community 18 - "AvailabilitySection.tsx"
Cohesion: 0.14
Nodes (11): AvailabilitySection(), AvailabilitySectionProps, DayRowProps, TIME_LIST, CToggle(), CToggleProps, ToggleRow(), ToggleRowProps (+3 more)

### Community 19 - "doRefresh"
Cohesion: 0.26
Nodes (14): decodeJwtPayload(), doRefresh(), enterDoctorMode(), exchangeInviteToken(), exchangeOnboardingToken(), fetchImpersonationDoctor(), login(), rawManageFetch() (+6 more)

### Community 20 - "Session"
Cohesion: 0.17
Nodes (12): DedicatedNumberGuide(), DedicatedNumberGuideProps, STEPS, PageCreationGuide(), PageCreationGuideProps, STEPS, TestWindowExplainerStep(), TestWindowExplainerStepProps (+4 more)

### Community 21 - "ServiceCard.tsx"
Cohesion: 0.15
Nodes (13): DURATION_OPTIONS, RequirementRowProps, ServiceCard(), ServiceCardProps, ServicesSection(), ServicesSectionProps, DEFAULT_PIX_DEPOSIT, EMPTY_PROFESSIONAL_PROFILE (+5 more)

### Community 22 - "CHECKPOINT — secretarIA-frontend (split out of brain-frontend)"
Cohesion: 0.17
Nodes (11): A tela `/` — composição nova, não é cópia, CHECKPOINT — secretarIA-frontend (split out of brain-frontend), Decisões tomadas nesta rodada, Deploy no EasyPanel (guia — nada disto foi executado), Lacunas conhecidas (nada disto bloqueia o build), Mapa de rotas (11, todas estáticas), O que ficou de fora — e por quê, O que foi portado (+3 more)

### Community 23 - "types.ts"
Cohesion: 0.16
Nodes (11): FacebookPageStep(), FacebookPageStepProps, OPTIONS, RadioOption, RadioPillGroup(), RadioPillGroupProps, GoogleGlyph(), GoogleSection() (+3 more)

### Community 24 - "manage-api.test.ts"
Cohesion: 0.15
Nodes (11): ADDON_SUMMARY_LABEL, FB_PAGE_LABEL, PRIOR_API_LABEL, SummaryStep(), SummaryStepProps, USAGE_LABEL, PURCHASABLE_PLANS, ResolvedPlan (+3 more)

### Community 25 - "ActivateButton.tsx"
Cohesion: 0.40
Nodes (4): OnboardingBanner(), STATE_LABEL, DoctorOnboarding, getDoctorOnboarding()

### Community 26 - "usePortalGuard.ts"
Cohesion: 0.43
Nodes (4): isSamePath(), PORTAL_ROLES, PostLoginDecision, resolvePostLogin()

### Community 27 - "Section.tsx"
Cohesion: 0.16
Nodes (11): FIXED_GREETING_BUTTONS, LANGUAGE_OPTIONS, MessagesSection(), MessagesSectionProps, PostConsultSection(), PostConsultSectionProps, Section(), SectionProps (+3 more)

### Community 28 - "StateTimeline.tsx"
Cohesion: 0.50
Nodes (4): NODES, rankOf(), StateTimeline(), OnboardingState

### Community 29 - "SideNav.tsx"
Cohesion: 0.33
Nodes (5): NAV, NavItem, SideNav(), SideNavProps, IconName

### Community 30 - "secretarIA-frontend"
Cohesion: 0.40
Nodes (4): Convenções deste repo, Documentação — manter em dia (obrigatório), graphify, secretarIA-frontend

### Community 32 - "getEntitlements"
Cohesion: 0.67
Nodes (3): coerceAddons(), coerceLimits(), getEntitlements()

### Community 38 - "ManageApiError"
Cohesion: 0.29
Nodes (5): RestartButton(), RestartButtonProps, ManageApiError, restartTestWindow(), RestartTestWindowResult

### Community 39 - "PriorApiStep.tsx"
Cohesion: 0.40
Nodes (4): OPTIONS, PriorApiStep(), PriorApiStepProps, SignupIntakePriorApi

### Community 40 - "WhatsappUsageStep.tsx"
Cohesion: 0.40
Nodes (4): OPTIONS, WhatsappUsageStep(), WhatsappUsageStepProps, SignupIntakeWhatsappUsage

### Community 41 - "clearSession"
Cohesion: 0.50
Nodes (4): clearSession(), exitDoctorMode(), logout(), signOut()

## Knowledge Gaps
- **252 isolated node(s):** `AuthShellProps`, `PasswordFieldProps`, `BrandGlyphProps`, `IconName`, `PATHS` (+247 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Session` connect `meta-embedded-signup.ts` to `manage-api.ts`, `page.tsx`, `secretaria-hub.ts`, `ManageApiError`, `ProfessionalsSection.tsx`, `page.tsx`, `ActivateButton.tsx`, `usePortalGuard.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `ManageApiError` connect `ManageApiError` to `manage-api.ts`, `CadastroWizard.tsx`, `page.tsx`, `secretaria-hub.ts`, `ProfessionalsSection.tsx`, `page.tsx`, `manage-api.test.ts`, `usePortalGuard.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Icon()` connect `Icon` to `page.tsx`, `secretaria-hub.ts`, `page.tsx`, `ProfessionalsSection.tsx`, `AvailabilitySection.tsx`, `ServiceCard.tsx`, `types.ts`, `Section.tsx`, `SideNav.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `AuthShellProps`, `PasswordFieldProps`, `BrandGlyphProps` to the rest of the system?**
  _252 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05502392344497608 - nodes in this community are weakly interconnected._
- **Should `manage-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02666666666666667 - nodes in this community are weakly interconnected._
- **Should `CadastroWizard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.13043478260869565 - nodes in this community are weakly interconnected._