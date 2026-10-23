# FitTrack phase progress

Updated 23 October 2026. This records implementation separately from live acceptance testing.

## Phase 1 — Foundation

Implemented: TypeScript fixes, Supabase wiring, session-aware protected routes, mobile bottom navigation and collapsible desktop sidebar, authentication screens, typed database queries, ownership policy improvements, and atomic database operations.

Verified locally: TypeScript, builds, auth-required dashboard redirect, sign-in validation, isolated database policy tests. Existing Supabase API is reachable and exposes no food rows to an anonymous request.

Hosted checks: migration artifacts are reachable; all 14 private/reference tables returned no rows to an anonymous request; privileged account deletion rejects anonymous execution. Remaining live verification: email confirmation/recovery delivery, real account login/session expiration, and two-account checks against hosted Supabase.

## Phase 2 — Onboarding and dashboard

Implemented: six steps, personal details, goal selection, estimated/editable targets, equipment/days/experience, atomic completion with safe retry, and an actual-record dashboard with scheduled workout, weight trend, daily nutrition and recent workout count.

Verified locally: onboarding success and failure UI tests; database rollback/retry tests; dashboard consumption totals. No synthetic history is created.

Remaining: authenticated browser walk-through after hosted migrations are applied.

## Phase 3 — Weight and goals

Implemented: add/edit/delete measurements with confirmations, dates/notes, sorting/filtering, 7/30/90-day and all-time charts, editable goals, gain/loss/maintenance validation, and kg/lb conversion. Histories page through API results instead of truncating weight history at 1,000 rows.

Verified locally: calculation/date/unit edge cases, weight logging interaction, database range restrictions and cross-account writes.

Remaining: live add/edit/delete/reload and mobile interaction checks.

## Phase 4 — Workouts

Implemented: seeded exercise library and A/B templates, plan CRUD, targets, reordering, alternating schedule editing, atomic start/resume, persisted sets, timed exercises, unilateral sides, weight-basis labels, rest timer pause/resume/refresh, next/skip/reopen exercise actions, finish/cancel confirmation, and saved session/history detail.

Verified locally: atomic session copy/resume, schedule replacement, foreign-parent restrictions, timed-set interaction and training-volume calculation tests.

Remaining: authenticated full-session browser run, refresh/navigation recovery, and timer behavior on a real mobile device.

## Phase 5 — Nutrition

Implemented: starter Filipino food references, search, custom foods, quantity/serving selection, proportional macro snapshots, meal categories, edit/delete consumption, totals and previous-date navigation.

Verified locally: scaled food logging interaction and calculation tests; private/system-food access restrictions.

Remaining: live persistence checks and recipe/label usability checks. Starter values remain approximate references.

## Phase 6 — Reports and settings

Implemented: real-record weight/food/workout reports, 7/30/90/custom ranges, exercise load/duration trends, logged-day averages and current-goal comparisons; profile/equipment preferences, time zone/date format, body-weight/height units, landing page, password change, sign-out and a confirmed account-deletion request queue.

Verified locally: unit/date tests and restricted account-deletion fulfillment in PostgreSQL.

Remaining: real-browser preference/password checks and operator review of live deletion requests. Deletion fulfillment is manual and restricted to a trusted backend/operator.

## Phase 7 — Verification and deployment preparation

Implemented: manifest/icons, production-only public-asset service worker, honest offline notice, install affordance where supported, migration/setup documentation, verification script, Vercel build target, and security update to Vite.

Verified locally: TypeScript; 65 unit/UI/PostgreSQL/PWA/navigation tests; default production build; Vercel production build. Playwright desktop/mobile flows are authored but have not yet been executed.

Outstanding release gates: confirm the hosted migrations are fully applied; authenticated end-to-end browser tests; mobile/responsive and accessibility review with real app data; actual-device PWA installation; production deployment and post-deployment smoke checks. A passing build is not a completed live release.

Dependency audit: the Vite high-severity development-tool finding was addressed by updating Vite. The production-dependency audit reports zero vulnerabilities. Four moderate findings remain in development-only Drizzle/esbuild tooling; no blanket forced dependency upgrade was applied.

## Latest Phase 7 check

The preview is signed out following a failed login attempt. Hosted Auth settings confirm that email signup is enabled and email confirmation is required. A reachable email address and confirmation are needed before a new test account can be used for live acceptance testing. Login errors now distinguish incorrect credentials, email confirmation, connection failures, throttling and service outages; five focused tests cover this behavior.

Onboarding schema-cache issue diagnosed: the running development server retained the previous Supabase project after `.env` changed. Fully restarted the owned preview, verified that its served project now matches the configured project, and confirmed the configured onboarding RPC exists. The user still needs to reload/re-authenticate and retry completion to verify the full save.

## Exercise library images and procedures

Added locally hosted movement images for all 12 starter exercises, four-step procedures and form cues. Photos are sourced from the public-domain Free Exercise DB collection; original diagrams cover goblet squats, Romanian deadlifts, reverse lunges and forearm planks. The same guidance is available inside active workout sessions. Images are lazy loaded, include descriptive alt text and fall back to usable written instructions if loading fails. All 71 tests pass, including coverage of every seeded exercise and both of its image assets.

## Workout layout and responsive overlays

Refined the workout overview with a focused current-session panel, weekly schedule strip, plan cards, searchable exercise cards and recent sessions. A shared ResponsiveModal component presents desktop dialogs and mobile bottom drawers. Plan details/editing/creation, scheduling, session summaries and exercise guides use this component; active workout tracking stays on its dedicated page. Tests cover both device variants, accessible descriptions, dismissal and focus restoration, plus opening plan, create, schedule and exercise-detail flows. Desktop visual review used isolated local fixtures; no sample data was written to Supabase.

## Modal actions and plan editor refinement

Added pinned action footers for plan editing, creation and scheduling, consistent Cancel and primary buttons, saving indicators, and disabled duplicate submissions. The editor now groups plan details and collapsible exercise targets, with labeled reorder/remove controls and tracking-specific inputs. Save plan enables after metadata changes; exercise targets keep their own save action. Automated checks: 80 tests pass, including footer form submission on desktop and mobile branches. Live signed-in device review remains pending.

Exercise imagery consistency: replaced the four diagram sets with locally hosted photographs. Visually reviewed both frames for each replacement; variation notes distinguish kettlebell goblet squat and stiff-legged dumbbell demonstration, and plank captions distinguish kneeling preparation from the hold. All 12 starter guides now use photos.

## Nutrition layout and dedicated modals

Reworked nutrition into daily macro cards, calorie/protein progress, meal diary sections and a searchable food library. Dedicated MealEntryModal and CustomFoodModal components use desktop dialogs/mobile drawers with pinned action footers. Selected meal defaults carry into food logging; edits preview scaled snapshot macros. Existing calculation/save tests and new cancel/custom-food/meal-default tests pass (83 total). Desktop visual review used isolated sample fixtures; no sample data was saved to Supabase. Temporary review files were removed.

Food library moved into its dedicated responsive modal, opened from each meal Add food action. Selecting a food closes the library and opens portion entry with that meal preselected; custom food creation also transitions to its own modal. All 17 starter foods have local illustrative photo thumbnails in the library and portion form, with Commons author/license credits linked in the library. Unknown custom foods use an original food illustration. Visually reviewed all thumbnails and the desktop library using isolated fixtures; temporary review files removed.

## Modern progress design

Added a goal-progress ring, clearer latest/change/check-in cards, compact target summary and refined measurement history. Weight chart uses a subtle gradient area and quieter grid. Measurement logging/editing and target editing use dedicated responsive modals with pinned Save/Cancel actions. Existing save/edit/delete coverage and new target-update/cancel tests pass (87 total). Desktop page and measurement dialog reviewed with isolated example measurements; no example data saved to Supabase. Temporary visual fixtures removed.

## Shared page headers

Standardized page heading spacing, typography, dividers and action-button layout across authenticated pages. The app top bar now identifies the current section, including nested workout history, and links the profile avatar to settings. Long names truncate; mobile shows the compact avatar, with page actions below the title.

## Sidebar and profile photo refinement

Redesigned the desktop sidebar with grouped routine/insight navigation, Reports access, consistent active states, a compact rail, settings and a profile card. App header is sticky with a shared avatar. Avatar resolution checks common URL fields returned on the profile and then signed-in account metadata, scoped to the current profile ID; unsupported or broken URLs use initials. No photo column or upload flow was assumed or added. 90 tests pass, including photo fallback and collapsed navigation. Desktop visual review used a sample profile.

## Reports design refinement

Aligned Reports with the progress and nutrition pages: date-range snapshot, recorded-day counts, metric icons, weight/current-goal split, refined workout rows, chart styling and consistent empty states. Current all-time goal progress is explicitly separate from the report period. Workout entries link to read-only history summaries; exercise selection falls back to an available exercise when changing report ranges. 92 automated tests pass, including report empty states/custom dates/history links. Visual review used isolated sample records; temporary fixtures removed.

## Settings layout and confirmed sign-out

Refined More/Profile & settings with a photo-aware account summary, prominent Reports and Sign out actions (including mobile), section shortcuts, grouped form controls and consistent saving buttons. Both sidebar and settings sign-out triggers now require the shared SignOutDialog: desktop modal/mobile drawer, Stay signed in, explicit confirmation and disabled repeat submissions. Sidebar network exceptions reset pending state and remain visible in the dialog. 95 tests pass, including settings cancel/confirm and both responsive confirmation variants. Visual review used a sample profile; no real account was signed out. Temporary review files removed.

Settings sections now mount only after their section card is clicked. Personal profile, Preferences and Account & security open in the shared desktop modal/mobile drawer, with pinned action buttons. Cancelling closes and unmounts the selected form; password state is cleared on dismissal. Sign-out remains separate and confirmed.

Settings modal refinement: grouped personal details, training details, equipment and training-day selections into clearly labeled panels. Preferences group measurement units, regional display and landing-page settings. Account modal separates password editing, installation and account controls. Inputs use consistent touch-friendly heights, and the pinned footer includes section-specific guidance. Type checking and 27 targeted workflow/responsive-modal tests pass; Preferences visually reviewed with sample data.

## Verification feedback and shared toast design

Capture signup-return intent before Supabase consumes its URL fragment, without copying tokens into extra storage. A root-level notifier checks the authenticated user with Supabase before displaying Email verified successfully, once per return; ordinary sign-ins and password recovery do not trigger it. Verification failures display safe guidance. Refined the shared Sonner host with dark cards, status icons/accents, dismiss buttons and mobile offsets. 101 tests pass, including callback detection, confirmed/unconfirmed users, repeated mounts and network errors. Visual preview used sample messages. Deploy the updated app to Vercel and ensure hosted Supabase redirects there for live use.

## Onboarding input and database consistency

Onboarding reuses the registration name from the profile, starts personal measurements/goals/training answers blank, and offers calorie/protein estimates only on request. Controlled fields preserve edits and zero values across Back navigation. The final review shows the actual entered profile, targets, equipment and days; saving has a spinner, duplicate-submit guard and retryable errors. Migration 0003 updates complete_onboarding to validate and atomically save profile, active goal and selected alternating A/B schedule. PGlite tests verify non-default days, profile/goal values, idempotent retries and rollback of invalid days. This migration has NOT been applied to the hosted Supabase project: no database admin connection is available in this session. Apply 0003 to the project used by Vercel before deploying the app update. Existing completed users are left unchanged. Visual review used example inputs only.

Profile connections implementation: photo upload/removal with owner-scoped storage policies, profile social links, Google authentication buttons, OAuth return routing and provider connection controls. Hosted migration 0004 and external OAuth provider configuration remain deployment prerequisites; see README.

BMI calculator: available from Progress as a matching card, desktop modal and mobile drawer. Prefills saved height and latest recorded weight (or onboarding starting weight), supports kg/cm and lb/in, validates measurements and calculates without changing stored records. Adult category interpretation requires age-20-or-older confirmation and links to CDC guidance. No database migration is required.

Appearance: Settings offers Light, Dark and System selections. The preference saves on the current device, applies before initial paint, synchronizes across tabs and follows device appearance changes in System mode. Shared surface, text, button, sidebar, chart and toast colors adapt globally. No database migration is required.
