# Graph Report - secretarIA-frontend  (2026-08-14)

## Corpus Check
- 93 files · ~71,617 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 699 nodes · 1346 edges · 38 communities (36 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 1 edges (avg confidence: 0.5)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4e9331a6`
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

## God Nodes (most connected - your core abstractions)
1. `manageFetch()` - 39 edges
2. `Icon()` - 18 edges
3. `hubFetch()` - 17 edges
4. `compilerOptions` - 16 edges
5. `Session` - 15 edges
6. `ManageApiError` - 12 edges
7. `BrandGlyph()` - 10 edges
8. `Field()` - 10 edges
9. `StepHeading()` - 10 edges
10. `StepActions()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `loadTrialDays()` --calls--> `getCheckoutTrialDays()`  [EXTRACTED]
  app/(site)/_components/CheckoutTrialNotice.tsx → lib/manage-api.ts
- `useSecretariaHub()` --calls--> `hubConfigured()`  [EXTRACTED]
  app/(site)/_shared/useSecretariaHub.ts → lib/secretaria-hub.ts
- `CheckoutTrialNotice()` --calls--> `catalogRequiresWhatsappCoexistence()`  [EXTRACTED]
  app/(site)/_components/CheckoutTrialNotice.tsx → lib/manage-api.ts
- `isPurchaseGated()` --calls--> `catalogRequiresWhatsappCoexistence()`  [EXTRACTED]
  app/(site)/_lib/launch.ts → lib/manage-api.ts
- `HubNotice()` --calls--> `hubConfigured()`  [EXTRACTED]
  app/(site)/_shared/HubNotice.tsx → lib/secretaria-hub.ts

## Import Cycles
- None detected.

## Communities (38 total, 2 thin omitted)

### Community 0 - "page.tsx"
Cohesion: 0.05
Nodes (63): ApptBlock(), DayBlock(), DayView(), heightOf(), MONTH_GRID, MonthView(), NowLine(), toneOf() (+55 more)

### Community 1 - "manage-api.ts"
Cohesion: 0.03
Nodes (69): AdminAnamnesis, AdminAnamnesisDetail, AdminAnamnesisList, AdminDemoRequest, AdminMetrics, AdminMetricsClinic, AdminMetricsDoctor, AdminMetricsSatisfaction (+61 more)

### Community 2 - "CadastroWizard.tsx"
Cohesion: 0.05
Nodes (56): ADDON_COPY, AddonsStep(), AddonsStepProps, CadastroWizardProps, PROGRESS, PROGRESS_LABEL, ContactStep(), ContactStepProps (+48 more)

### Community 3 - "page.tsx"
Cohesion: 0.05
Nodes (27): CadastroWizard(), resolvePlan(), CadastroInner(), BrandGlyph(), BrandGlyphProps, CheckoutTrialNotice(), CheckoutTrialNoticeProps, loadTrialDays() (+19 more)

### Community 4 - "secretaria-hub.ts"
Cohesion: 0.06
Nodes (45): baseStyle, HubNotice(), HubNoticeProps, warnStyle, RETRY_DELAYS_MS, UseSecretariaHubResult, getSecretariaHubToken(), AddressWire (+37 more)

### Community 5 - "page.tsx"
Cohesion: 0.09
Nodes (32): AddressFieldsOfCtx, applyWireAddress(), applyWireAppointmentTypes(), applyWireBusinessHours(), applyWireGcal(), applyWireInsurances(), applyWireMessages(), applyWirePixDeposit() (+24 more)

### Community 6 - "ProfessionalsSection.tsx"
Cohesion: 0.09
Nodes (17): Modal(), ModalProps, COPY, InviteKind, InviteTeamMemberModal(), InviteTeamMemberModalProps, ProfessionalsSection(), ProfessionalsSectionProps (+9 more)

### Community 7 - "manageFetch"
Cohesion: 0.11
Nodes (24): adminCreateUser(), adminDeleteTenant(), adminGetAnamnesis(), adminGetEntitlements(), adminGetMetrics(), adminGetTenant(), adminListAnamneses(), adminListDemoRequests() (+16 more)

### Community 8 - "package.json"
Cohesion: 0.10
Nodes (19): dependencies, next, react, react-dom, devDependencies, @types/node, @types/react, @types/react-dom (+11 more)

### Community 9 - "compilerOptions"
Cohesion: 0.10
Nodes (19): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+11 more)

### Community 10 - "PixSection.tsx"
Cohesion: 0.16
Nodes (12): AddressFields(), AddressFieldsProps, ContextSection(), ContextSectionProps, NumberFieldProps, PixSection(), PixSectionProps, ToggleRow() (+4 more)

### Community 11 - "page.tsx"
Cohesion: 0.16
Nodes (13): RestartButton(), RestartButtonProps, formatDate(), isConnected(), ReativarPage(), alertStyle, PortalAccessNotice(), wrapStyle (+5 more)

### Community 12 - "page.tsx"
Cohesion: 0.18
Nodes (11): CheckoutSucessoInner(), renderView(), ViewState, clearSession(), exchangeOnboardingToken(), exitDoctorMode(), getOnboardingStatus(), getSession() (+3 more)

### Community 13 - "page.tsx"
Cohesion: 0.18
Nodes (11): PauseToggles(), PauseTogglesProps, ATTEMPT_RESULT_LABEL, BLOCKER_COPY, formatDateTime(), MANUAL_ACTION_REASONS, OnboardingPage(), usePortalGuard() (+3 more)

### Community 14 - "page.tsx"
Cohesion: 0.18
Nodes (4): AuthShell(), AuthShellProps, PasswordField(), PasswordFieldProps

### Community 15 - "Icon"
Cohesion: 0.18
Nodes (9): CSelect(), CSelectProps, CToast(), CToastProps, FIXED_GREETING_BUTTONS, LANGUAGE_OPTIONS, MessagesSection(), MessagesSectionProps (+1 more)

### Community 16 - "meta-embedded-signup.ts"
Cohesion: 0.21
Nodes (10): classifySignupMessage(), EmbeddedSignupOutcome, FacebookLoginResponse, loadFacebookSdk(), OnboardingAttemptDecision, resolveAttemptDecision(), runEmbeddedSignup(), SignupMessageClassification (+2 more)

### Community 17 - "BrandIcon.tsx"
Cohesion: 0.21
Nodes (9): BrandIcon(), BrandIconProps, FILLED, IconName, PATHS, ThemeToggle(), ThemeToggleProps, Theme (+1 more)

### Community 18 - "AvailabilitySection.tsx"
Cohesion: 0.18
Nodes (8): AvailabilitySection(), AvailabilitySectionProps, DayRowProps, TIME_LIST, CToggle(), CToggleProps, Prefs, HelpTip()

### Community 19 - "doRefresh"
Cohesion: 0.27
Nodes (12): decodeJwtPayload(), doRefresh(), enterDoctorMode(), exchangeInviteToken(), fetchImpersonationDoctor(), login(), rawManageFetch(), readBoolClaim() (+4 more)

### Community 20 - "Session"
Cohesion: 0.18
Nodes (6): Session, HubModule, mockHubTokenMint(), mockResponse(), ManageApiModule, SignOutModule

### Community 21 - "ServiceCard.tsx"
Cohesion: 0.22
Nodes (8): DURATION_OPTIONS, RequirementRowProps, ServiceCard(), ServiceCardProps, ServicesSection(), ServicesSectionProps, Requirement, Service

### Community 22 - "CHECKPOINT — secretarIA-frontend (split out of brain-frontend)"
Cohesion: 0.18
Nodes (10): A tela `/` — composição nova, não é cópia, CHECKPOINT — secretarIA-frontend (split out of brain-frontend), Decisões tomadas nesta rodada, Deploy no EasyPanel (guia — nada disto foi executado), Lacunas conhecidas (nada disto bloqueia o build), Mapa de rotas (11, todas estáticas), O que ficou de fora — e por quê, O que foi portado (+2 more)

### Community 23 - "types.ts"
Cohesion: 0.27
Nodes (7): GoogleGlyph(), GoogleSection(), GoogleSectionProps, EMPTY_PROFESSIONAL_PROFILE, GcalState, GoogleCalendarMode, TimeRange

### Community 24 - "manage-api.test.ts"
Cohesion: 0.22
Nodes (3): b64url(), makeJwt(), ManageApiModule

### Community 25 - "ActivateButton.tsx"
Cohesion: 0.22
Nodes (7): ActivateButton(), ActivateButtonProps, OnboardingBanner(), STATE_LABEL, DoctorOnboarding, getDoctorOnboarding(), postOnboardingAttempt()

### Community 26 - "usePortalGuard.ts"
Cohesion: 0.43
Nodes (4): isSamePath(), PORTAL_ROLES, PostLoginDecision, resolvePostLogin()

### Community 27 - "Section.tsx"
Cohesion: 0.29
Nodes (6): PostConsultSection(), PostConsultSectionProps, Section(), SectionProps, PostConsult, TextArea()

### Community 28 - "StateTimeline.tsx"
Cohesion: 0.50
Nodes (4): NODES, rankOf(), StateTimeline(), OnboardingState

### Community 29 - "SideNav.tsx"
Cohesion: 0.40
Nodes (4): NAV, NavItem, SideNav(), SideNavProps

### Community 30 - "secretarIA-frontend"
Cohesion: 0.40
Nodes (4): Convenções deste repo, Documentação — manter em dia (obrigatório), graphify, secretarIA-frontend

### Community 32 - "getEntitlements"
Cohesion: 0.67
Nodes (3): coerceAddons(), coerceLimits(), getEntitlements()

## Knowledge Gaps
- **251 isolated node(s):** `AuthShellProps`, `PasswordFieldProps`, `BrandGlyphProps`, `IconName`, `PATHS` (+246 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Session` connect `Session` to `manage-api.ts`, `page.tsx`, `secretaria-hub.ts`, `ProfessionalsSection.tsx`, `page.tsx`, `page.tsx`, `manage-api.test.ts`, `ActivateButton.tsx`, `usePortalGuard.ts`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `ManageApiError` connect `CadastroWizard.tsx` to `manage-api.ts`, `page.tsx`, `secretaria-hub.ts`, `ProfessionalsSection.tsx`, `page.tsx`, `page.tsx`, `usePortalGuard.ts`?**
  _High betweenness centrality (0.014) - this node is a cross-community bridge._
- **Why does `Icon()` connect `Icon` to `page.tsx`, `secretaria-hub.ts`, `page.tsx`, `ProfessionalsSection.tsx`, `PixSection.tsx`, `AvailabilitySection.tsx`, `ServiceCard.tsx`, `types.ts`, `Section.tsx`, `SideNav.tsx`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `AuthShellProps`, `PasswordFieldProps`, `BrandGlyphProps` to the rest of the system?**
  _251 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `page.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.053554040895813046 - nodes in this community are weakly interconnected._
- **Should `manage-api.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.02666666666666667 - nodes in this community are weakly interconnected._
- **Should `CadastroWizard.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.050351721584598295 - nodes in this community are weakly interconnected._