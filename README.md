# FitTrack

A mobile-first fitness tracker for weight goals, dumbbell workouts and daily nutrition. React 19, TypeScript, TanStack Start/Router, Tailwind, Supabase and Recharts.

The original development brief is preserved in [docs/MVP-SPEC.md](docs/MVP-SPEC.md). Implementation and verification status is tracked in [docs/PROGRESS.md](docs/PROGRESS.md).

## Run locally

Use Node.js 22.13+ or 24 LTS and npm. This is a Vite/TanStack application; it does not run through Apache/PHP even when checked out inside XAMPP.

```sh
npm ci
```

Copy `.env.example` to `.env` only for a new checkout. Preserve an existing configured `.env`. Supply the Supabase project URL and publishable key for both browser and server variables. Do not put a service-role key in a `VITE_` variable.

```sh
npm run dev -- --host 127.0.0.1 --port 5173
```

Open `http://127.0.0.1:5173/`. If `localhost` opens a different application on Windows, use this explicit address.

## Database setup — required before using the new flows

In the connected Supabase project's SQL editor:

1. For a new empty project, apply `drizzle/migrations/0000_migration.sql` first. It creates the core tables, RLS policies, new-user trigger, 12 exercises and 17 foods. **Do not reapply it to an existing initialized database.**
2. Apply `drizzle/migrations/0001_mvp_workflows.sql`. This adds atomic onboarding, workout creation/resume, plan reordering, schedule replacement and stronger ownership checks.
3. Apply `drizzle/migrations/0002_account_requests.sql`. This adds account-deletion requests and a server-only fulfillment function.

The existing connected database may already contain migration 0000; migrations 0001 and 0002 must still be applied. Local automated tests apply all migrations in an isolated PostgreSQL engine. They do not apply changes to your hosted Supabase project.

4. Apply `drizzle/migrations/0003_onboarding_preferences.sql` to validate onboarding choices and save the selected A/B training schedule in the same transaction.

Create accounts through Supabase Auth / the registration screen after the initial migration so that the new-user trigger creates profiles, settings, A/B plans and the alternating Monday/Wednesday/Friday schedule. Migration `0003_onboarding_preferences.sql` makes onboarding save the actual selected training days as the alternating A/B schedule. Apply it to existing databases before deploying this onboarding update.

In Supabase Authentication URL Configuration, set the production Site URL and permit the appropriate development and production redirect URLs, including `/dashboard` and `/reset-password`. Email confirmations and password-reset emails require working email delivery. The registration screen handles both email-confirmed and immediately authenticated signups.

The database functions use the signed-in user's permissions and RLS. Onboarding, session copying, exercise reordering and schedule replacement are transactions. Repeated onboarding completion and workout-start requests do not create duplicate goals/sessions.

## Features

- Login, registration, recovery/reset forms, session-aware routing and onboarding gating.
- Six-step onboarding with editable calorie/protein estimates and a single atomic save.
- Dashboard using saved profile, goals, measurements, consumed food and workout records.
- Weight entry create/edit/delete, date filters, 7/30/90-day and all-time charts, editable goals.
- Workout plans, exercise targets/order, A/B templates, alternating schedule, exercise instructions.
- Active workouts with persisted sets, reps/load or timed sets, unilateral side, rest timer, skip/reopen, finish/cancel, and session/history views.
- Food search, custom foods, food units or servings, meal categories, edit/delete logs and date-based nutrition history. Nutrients are saved as snapshots.
- Reports with 7/30/90/custom date ranges, weight trends, logged-day calorie/protein averages, goal comparison, exercise performance and workout history.
- Profile, body weight/height units, time zone, date format, preferred landing page, password changes, sign-out and account-deletion requests.
- PWA manifest/icons and service worker. **Internet is required for logging.** Only public static assets are cached; private APIs and authenticated HTML are never stored in the app cache. A failed offline navigation shows a connection notice.

## Navigation

Main pages: `/dashboard`, `/workouts`, `/nutrition`, `/progress`, `/reports`, `/settings`, `/onboarding`.

Workout detail pages: `/workouts/plans/:id`, `/workouts/session/:id`, `/workouts/history`. History detail URLs redirect to the saved session view. `/profile`, `/progress/weight`, `/progress/goals`, `/nutrition/log`, `/nutrition/foods`, `/nutrition/history` and `/workouts/plans` are aliases to the relevant feature screens.

## Verification

```sh
npm run typecheck
npm test
npm run build
# All three in sequence:
npm run verify
```

Tests cover calculation edge cases, date/unit handling, key UI interactions, PostgreSQL migrations/RLS/atomic workflows, account-deletion restrictions and service-worker cache privacy. PostgreSQL tests use PGlite in memory and test fixtures only; they never write synthetic history to the live application.

Browser checks completed locally: landing page, signed-out dashboard redirect, and empty sign-in validation. Authenticated browser flows, mobile-device layouts, confirmation emails, password recovery delivery, PWA installation on supported devices, and production deployment still require live verification. See [docs/PROGRESS.md](docs/PROGRESS.md).

## Deployment

### Lovable / existing Cloudflare target

Keep the existing connection and normal `npm run build`. Do not rewrite published Git history. This change does not push or deploy automatically.

### Vercel

Set Node.js 24, install with `npm ci`, and build with `npm run build:vercel`. Add all four variables from `.env.example` in Vercel and configure matching Supabase auth redirect URLs. The build emits Vercel's Build Output API files into `.vercel/output` (SSR function and static assets); do not configure an SPA rewrite that sends every route to `index.html`. Deployment itself has not been performed.

The default build remains compatible with the connected Lovable target; the Vercel target is selected only for a Vercel build.

## Account deletion operations

The Settings screen queues a request; it does not claim that the account was already deleted. A trusted operator reviews pending rows in `account_deletion_requests`, confirms the request is still pending, and invokes:

```sql
select public.fulfill_account_deletion('the-requesting-user-uuid'::uuid);
```

Run this only from the Supabase SQL editor or a trusted service-role backend after reviewing the request. It permanently removes that user's fitness records, custom foods/exercises, profile, settings and Auth account in one transaction. Authenticated browser users have no permission to call it. The user can cancel the request before fulfillment. This personal MVP has no operator email notification or automatic processing schedule; pending requests must be reviewed manually.

## Structure

- `src/features/`: onboarding, dashboard, weight/goals, nutrition and workouts.
- `src/routes/`: route definitions, app shell, reports and settings.
- `src/components/`: shared forms, charts, feedback, install and deletion controls.
- `src/lib/`: typed data queries/mutations, calculations, dates and unit conversions.
- `src/test/`: database, interaction, navigation and PWA tests.
- `drizzle/migrations/`: versioned SQL migrations, policies and starter data.
- `public/`: manifest, icons, public-asset service worker and offline notice.

No fabricated progress, optional meal planning, payments, AI coaching or admin dashboard is added. Exercise loads remain in kg even when body weight is displayed in lb. Height in feet is entered as decimal feet. Nutrition references and suggested targets are estimates and remain editable.

## Optional browser automation

`npm run test:e2e` uses Playwright with desktop and mobile viewport projects. Install its Chromium browser first with `npx playwright install chromium`. Public checks cover protected routing and auth form validation.

The write-enabled workflow is skipped unless `FITTRACK_E2E_EMAIL`, `FITTRACK_E2E_PASSWORD` and `FITTRACK_E2E_ALLOW_WRITES=1` are supplied for a **disposable Supabase test account** with default kg settings. Optionally set `FITTRACK_E2E_URL` to a staging URL. It can complete onboarding, create/edit/delete a measurement, log rice, save a workout set and finish a session. It deliberately retains test meal/workout records for review. Do not point it at a personal production account. These Playwright flows have been authored but not executed in this session; equivalent public browser checks and the automated UI/database tests were run separately.

## Onboarding says the function is missing

If `complete_onboarding(payload)` cannot be found, confirm migration 0001 was applied to the same Supabase project used by the browser. After changing `.env`, fully stop and restart the development process, then reload the browser and sign in again. A hot restart can retain values from the previous project in process memory. If the project matches and the migration was just applied, run `NOTIFY pgrst, 'reload schema';` in the Supabase SQL editor to refresh its API schema cache. Do not rerun the initial schema against an existing database.

### Onboarding update for existing Supabase projects

Run `drizzle/migrations/0003_onboarding_preferences.sql` in the SQL editor of the project used by Vercel. This updates the atomic onboarding function to validate the choices and create the selected training schedule. It does not replace completed users' schedules. Then deploy the updated app. Existing migrations 0000–0002 must already be applied; do not rerun the initial schema.

## Profile photos and connected accounts

Apply `drizzle/migrations/0004_profile_connections.sql` in the Supabase SQL editor after migration 0003, then deploy the updated app. This adds profile photos, social links, and the `avatars` storage bucket. Uploaded profile photos are public; only their owner can upload, replace, or delete files in their account folder. Fitness records keep their existing private policies.

For Google login/signup and linking:

1. Create a Google Cloud OAuth web client. Set the authorized JavaScript origin to `https://fit-track-chi-lilac.vercel.app` and the authorized redirect URI to `https://vgcexdchlguaulwccdcd.supabase.co/auth/v1/callback`.
2. Enable Google under Supabase Authentication → Sign In / Providers and enter the client ID and secret there. Never place the secret in frontend environment variables.
3. Set the Supabase Site URL to `https://fit-track-chi-lilac.vercel.app`. Add `https://fit-track-chi-lilac.vercel.app/auth/callback**` to the redirect allowlist. For local testing add `http://localhost:8080/auth/callback**`. Keep the existing dashboard and password-reset redirect entries.
4. Enable manual identity linking in Supabase Authentication settings. GitHub and Facebook connections require their providers and developer-app credentials configured separately, with the same Supabase provider callback URI.
5. Redeploy, then test Google signup (new users reach onboarding), returning Google login, and connecting a provider from Settings → Connections. Supabase can automatically link identities sharing a verified email; existing users with different provider email addresses should connect from their signed-in Settings.

Settings also stores optional TikTok, Facebook, GitHub, Instagram and X profile links. A profile URL does not grant sign-in access. Photo updates appear in the profile, header and sidebar; removing a custom photo falls back to an available provider photo or initials.

## Saving BMI history

Apply `drizzle/migrations/0005_bmi_history.sql` in the Supabase SQL editor after migrations 0000–0004, then deploy the updated app. Progress → BMI calculator now has a Save BMI button and a BMI history section. Each private snapshot stores its timestamp, height, weight and adult-category confirmation. The database calculates BMI from those saved inputs. Saving does not update profile height or weight logs, and previous unsaved calculator results are not added retroactively.

## Planned exercise set limits

Apply `drizzle/migrations/0006_workout_set_limits.sql` after migration 0005, then deploy. Exercises show Completed and stop accepting new sets at their planned set count. The database enforces the limit and automatically marks the final planned set complete. Existing sets remain editable. Deleting a set below the target reopens a completed exercise. Existing excess sets are preserved.
