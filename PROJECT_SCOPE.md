<!-- AUTO-MAINTAINED: see "Keeping this file in sync" at the bottom.
     Every Claude Code session working on this repo should update this file
     when it changes user-facing behavior, roles, data models, or routes. -->

# SIWES Finder — Project Scope

SIWES Finder is a Next.js + MongoDB platform that connects Nigerian students
seeking SIWES (Students Industrial Work Experience Scheme) placements with
verified employers, and gives their schools visibility into the process.

**Last synced with:** mobile fintech redesign Batch D — Employer
Dashboard (2026-07-18) — a new `(tabs)/employer-dashboard.tsx` gives
employers a real Home tab for the first time (gradient hiring-pipeline
hero, animated KPI row, "Awaiting your review" preview; employer tab bar
is now 4 tabs, Home/Applicants/Logbook/Account); `employer-logbook.tsx`
gained a rotated "APPROVED" stamp visual. The dashboard's own "+ Post a
job" CTA needed a screen that didn't exist yet, so this batch also added
`post-job.tsx` (mirrors the web's post-job wizard and `POST /api/jobs`
contract) plus `createJob()` in the mobile client — which surfaced and
fixed a real backend bug: `POST /api/jobs` was still cookie-session-only
while its `GET` sibling already supported mobile bearer tokens; both now
use `requireSession` (see `MOBILE_APP.md`'s "Fintech redesign — Batch D"
phase; `__tests__/api/jobs.test.ts` updated, 393/393 root tests pass).
Before that: Batch C (student screens — `GradientHeroCard` dashboard/
profile heroes, animated KPI count-up, a horizontal "recommended for
you" carousel, onboarding gradient-blob accents, a `BottomSheet` logbook
composer) and Batch B (PIN-keypad unlock alongside biometric, via
`pinSettings.ts` and a shared `hasQuickUnlockConfigured()` gate) — see
`MOBILE_APP.md`'s "Fintech redesign" phases for the full detail on each.
Before that: mobile Google sign-in (2026-07-18) — a "Continue with
Google" button ships on `login.tsx`/`signup.tsx`
(`expo-auth-session`, new native dependency, mobile version bumped
1.3.0 → 1.4.0), verified server-side by `POST /api/mobile/google-signin`
(`google-auth-library`); web's NextAuth Google callback and this route
now share one find-or-create helper (`src/lib/googleAuth.ts`) so both
clients land the same account for a given email; a brand-new
(`unassigned`) Google sign-in on mobile is routed to a new
`role-picker.tsx` screen instead of the old "not supported" holding
screen (see `MOBILE_APP.md`'s Google sign-in phase). Before that: mobile
biometric/PIN unlock + visible OTA sync (2026-07-17) — idle-lock now
offers Face ID/fingerprint/device-PIN unlock instead of always forcing a
full re-login (new native dependency, mobile version bumped 1.2.0 →
1.3.0); the cold-start loading screen shows the running app version and,
when applicable, when it last synced an OTA update; onboarding gained
animated illustrations; a git-push race in the native-build workflow's
download-link step now retries instead of failing outright (see
`MOBILE_APP.md` Phases 11-12). Before that: UI/UX +
feed-relevance batch (2026-07-17) — mobile Dashboard landing tab (Jobs
demoted to a secondary "browse-jobs" tab), mobile post-signup
profile-setup wizard, manual light/dark theme override + Settings screen,
swipe-to-save auto-close, mobile idle-timeout auto-lock, `Job.department`
(required, canonical list) + compulsory skills on posting, default
department/skill feed scoping (search stays universal), mobile Jobs feed
pagination (see "Default feed scoping" and Mobile app section below).
Before that: full security audit + hardening (2026-07-14)
— jwt role-escalation fix, rate limiting, security headers, email
normalization, 404/error pages, robots/sitemap (see "Security hardening"
below); before that, email verification made opt-in via
`REQUIRE_EMAIL_VERIFICATION` (2026-07-13) because the Resend sandbox
sender can't deliver to real users.
Recent-change log: see `PROGRESS.md` (auto-appended on every push to main).

## Roles

| Role | Who | Access |
|---|---|---|
| `student` | Students seeking a placement | Browse/apply to jobs, profile, resume, saved jobs, logbook, opt-in community |
| `employer` | Companies posting placements | Post/manage jobs, review applicants, must be admin-approved (CAC verification) before listings go public |
| `school` | Institutions tracking their students | Read-only view of their own students (matched by university name) — profiles, applications, logbooks; must be admin-approved before student data unlocks |
| `admin` | Platform staff | Approve/reject companies & schools, moderate job listings, manage users |
| `super_admin` | Elevated admin | Everything `admin` can do, plus promote other users to admin/super_admin and is the only role that can delete another super_admin's account |
| `unassigned` | Just signed up via Google, hasn't picked a role yet | Routed to `/onboarding` (web) or `role-picker.tsx` (mobile) |

Admin/super_admin are **never** self-assignable at signup — only granted via
the `ADMIN_EMAILS` / `SUPER_ADMIN_EMAILS` env-var allowlists (promoted on
sign-in) or by an existing super_admin via `POST /api/admin/super-admins`.
`src/lib/roles.ts` (`isAdminRole`) treats admin and super_admin as
equivalent everywhere except that one deletion-hierarchy check.

## Data models (`src/models/`)

- **User** — one schema for all roles (see `role` enum above). Notable fields:
  `avatarUrl` (profile picture / company logo / school crest, shared field),
  `savedJobs` (student bookmarks), `followedEmployers` (student→employer
  follows, drives new-job-posted alerts), `communityJoined` (opt-in flag),
  `verificationStatus` (`unsubmitted → pending → approved/rejected`, used by
  both employers and schools — an *admin* reviewing the organization),
  `resetOtpHash`/`resetOtpExpires` (password reset, hash-only), `emailVerified`
  + `verifyOtpHash`/`verifyOtpExpires`/`verifyOtpAttempts` (email-ownership
  verification — confirming the account holder controls the address they
  signed up with; separate concern from `verificationStatus` above, same
  hash-only OTP pattern as password reset).
- **Job** — posted by employers. `applicationMethod` is `platform | email |
  external`. `department` (required, one of `src/lib/departments.ts`'s
  canonical list — e.g. "Computer Science" for a Software Engineering role)
  and at least one `requirements` skill are compulsory on every new posting
  (`POST /api/jobs` rejects a missing/unrecognized department or an empty
  skills list); both drive the default feed scoping below. Optional
  `applicationDeadline` and `maxApplicants` + `applicantCount`; a job
  auto-closes (`isActive: false`) once either limit is hit, checked lazily
  by `src/lib/jobStatus.ts` (no cron — evaluated on read/apply).
- **Application** — links a student, job, and employer. Unique index on
  `(job, student)` prevents duplicate applications. Status:
  `Pending | Accepted | Rejected`.
- **Logbook** — daily/weekly entries a student writes against their accepted
  placement; the employer approves each entry (`isApproved`).
- **Message** — one message in a per-`Application` thread between the
  student and employer on that application. `senderRole` records who sent
  it (avoids a lookup just to render "you" vs. the other party), `read`
  flips true once the recipient opens the thread.

## Feature surface

**Auth** — credentials (bcrypt) + Google OAuth via NextAuth on web;
credentials + Google on mobile too (`POST /api/mobile/login` /
`POST /api/mobile/google-signin`, bearer tokens instead of cookies — see
Mobile app section). Both Google paths (web NextAuth callback, mobile
route) share one find-or-create helper, `src/lib/googleAuth.ts`, so a
Google sign-in from either client always lands on the same account for a
given email; `src/lib/adminEmails.ts` holds the admin/super-admin
allowlist logic both it and the credentials providers use. Signup
(`/api/auth/register`) only accepts `student | employer | school` — never a
privileged role. OTP-based forgot-password flow (`/api/auth/forgot-password`,
`/api/auth/reset-password`) via Resend, 10-minute expiry, generic response to
avoid email enumeration.

**Email verification** — **opt-in via `REQUIRE_EMAIL_VERIFICATION=true`,
and OFF by default** (`src/lib/emailVerification.ts`): the default Resend
sandbox sender (`onboarding@resend.dev`) only delivers to the Resend account
owner's own address, so until a custom domain is verified on Resend (and
`RESEND_FROM_EMAIL` points at it) real users would never receive their
codes. With the flag off, `POST /api/auth/register` creates accounts with
`emailVerified: true` (no OTP generated or emailed), returns
`requiresVerification: false` so the web signup page skips `/verify-email`,
the apply/post-job gates below are bypassed, and `/api/profile` +
`/api/mobile/login` report every account as verified so the reminder
banners stay hidden (including for accounts created while the flag was on
that never finished verifying). Everything below describes the flag-ON
behavior, which needs no code changes to restore (the E2E golden path runs
with the flag on — see `playwright.config.ts` `webServer.env`).

When on: every credentials signup gets a 6-digit OTP emailed
immediately (`POST /api/auth/register`, best-effort — a failed send doesn't
block account creation, since `/api/auth/resend-verification` gives a retry
path). Web and mobile still auto-login right after signup, but both then
route straight to `/verify-email` (web: `?next=/profile-setup` for students,
`/login-redirect` for employer/school; mobile: same screen, no `next` since
there's no separate profile wizard) **before** anything else — a fresh
account cannot reach the profile-setup wizard or its dashboard until the
code is entered. `POST /api/auth/verify-email` checks the code (same
hash-compare + 5-attempt-lockout + expiry pattern as password reset);
`POST /api/auth/resend-verification` covers a missed/expired code. A "Sign
out" escape hatch is on both `/verify-email` screens for a mistyped email or
an inbox the user can't reach right now. Beyond that first-run gate, two
actions stay gated on `emailVerified` at the route level (fresh DB read,
never a trusted session claim) with a 403 + `code: 'EMAIL_NOT_VERIFIED'` —
a student applying (`POST /api/applications`) and an employer posting an
opportunity (`POST /api/jobs`) — with a persistent, role-specific,
dismissible banner nudging back to `/verify-email` on the web dashboard
layout and the mobile student/employer tab shells (school is exempt — its
mobile screens are all read-only, nothing to unlock) for anyone who somehow
still isn't verified later. Google-OAuth accounts skip all of this (no
password to prove, and Google already confirmed the address).
Company/school admin verification (`verificationStatus`) is a distinct,
human-reviewed check and is unaffected by this.

**Email notifications** (`src/lib/email.ts`, Resend) — sent best-effort
(failures logged, never fail the underlying action) on: application
accepted/rejected (to the student, from `PUT /api/applications/[id]`),
logbook entry approved (to the student, from `PUT /api/logbook/[id]`),
verification approved/rejected (to the employer/school, from
`PATCH /api/admin/companies/[id]`, wording adapted per role, rejection
reason included), a new opportunity posted by a followed company (to every
student following that employer, from `POST /api/jobs`), and a new
application message (to whichever party didn't send it, from
`POST /api/applications/[id]/messages`). Mobile push (where a token is
registered) and email are independent channels — one failing never blocks
the other, and one recipient's failure never blocks the next recipient's
(see the followers loop in `POST /api/jobs`). Every value interpolated into
an email's HTML (names, job titles, company names, rejection reasons) is
run through `escapeHtml()` first — these all originate as user-supplied
data (a job title, a display name, a message body) and are sent as raw
HTML via Resend, so an unescaped `<img onerror=...>` in e.g. a job title
would otherwise render as live markup in the recipient's email client.

**Security-relevant fixes (this audit pass)** — two stored-injection issues
found and fixed, both in code that renders user-controlled strings into a
format a human later opens outside React's own auto-escaping: (1) the email
HTML injection above, and (2) CSV/formula injection in the school roster
export (`src/lib/csv.ts`) — a cell starting with `=`, `+`, `-`, `@`, tab, or
CR is now prefixed with `'` before serializing, since Excel/Sheets treats a
leading one of those as a live formula when the file is opened (e.g. a
student name of `=HYPERLINK(...)` could otherwise execute as a link/formula
for whoever opens the export). Both have dedicated tests
(`__tests__/lib/email.test.ts`, `__tests__/lib/csv.test.ts`).

**Messaging** (`Message` model, `GET`/`POST /api/applications/[id]/messages`)
— a lightweight thread per application, restricted to that application's
student and employer (a flat 404 either way if the caller isn't a party to
it, same as the existing application-decision route). `ApplicationMessageButton`
(`src/components/`) is a self-contained button+modal used identically on
the employer applicant card and the student applications list; it polls
every 8s while open rather than using a websocket. Opening the thread marks
the other party's unread messages read; there's no unread badge on the list
views themselves (see Known gaps).

**Students** — browse/search jobs (`/student/jobs`, filters: keyword, type,
location, sort — including "Best match"; search matches title, description,
**required skills/requirements**, location, and company name/industry), job
details with Apply (in-app / email / external depending on the listing),
save jobs for later, follow a company for new-listing alerts (email + push),
message the employer on any of their own applications, e-Logbook, profile
(academic details + faculty + skills + resume PDF + avatar), opt-in
Community directory (peers who also joined, grouped implicitly by shared
placement visibility).

**Default feed scoping** — `GET /api/jobs`'s student branch, when called
with no `q` search term, additionally restricts results to jobs whose
`department` matches the student's `courseOfStudy` (now selected from the
same canonical `departments.ts` list — see the Job model above) and/or
whose `requirements` overlap the student's `skills` (`$or`, case-insensitive
substring). A student with neither set yet sees the unscoped feed. Typing
into the search bar (`q` present) always searches everything, unrestricted
— the scoping only shapes the *default* (empty-search) view, both on the
web browse page and the mobile Jobs tab. `student/profile` and
`profile-setup` (web + mobile) both now render "Course of study" as a
select from that same list rather than free text, so new/updated profiles
match exactly; profiles saved before this change keep whatever free-text
value they had until re-saved.

**Match score** (`src/lib/match.ts`, `computeMatchScore`) — a genuine (not
decorative) 0-100% overlap between a student's `skills` and a job's
`requirements` (case-insensitive substring match either direction), plus a
+10 boost when the job's `location` contains the student's
`preferredState`. Attached server-side to every job in `GET /api/jobs`'s
student branch and to the single-job details lookup, but only when the
student has listed at least one skill — otherwise omitted entirely rather
than showing a misleading 0%. `sort=match` on the feed sorts by this score
(computed in memory over the filtered set, since it isn't a stored field).
The landing page's floating "92%" card is unrelated — it's a static
marketing mockup for logged-out visitors who have no profile to score
against.

**Employers** — post/edit/deactivate jobs (multi-step wizard with
deadline/cap controls), manage applicants (accept/reject — singly or in
bulk via a select-all-pending checkbox row and `PATCH /api/applications/bulk`,
web and mobile; message), company verification submission (CAC number +
document + company logo), approve student logbook entries
(`/employer/logbook`, backed by `GET /api/logbook` and
`PUT /api/logbook/[id]`, scoped to entries tied to their own placements).
This approval access was removed in an earlier commit ("logbooks are now a
private student record"), then restored — API and mobile screen during
mobile Phase 3, the web page in a later session — at the user's explicit
confirmation; see `MOBILE_APP.md` Phase 3. Both the single-item route and
the bulk route share their best-effort notification logic via
`src/lib/notifyApplicationDecision.ts`.

**Schools** — `/school/dashboard` (KPI overview: registered/placed/applying
students, department count, logbook volume, plus a by-department breakdown
table with placement rate), `/school/students` (directory grouped by
faculty → department, search, per-student placement + logbook status, an
"Export CSV" button streaming the same roster data as
`GET /api/school/students?format=csv`) → `/school/students/[id]` (full
record: profile, every application, complete logbook with approval state),
`/school/logbooks` (every logbook entry across every student and company in
one filterable feed — read-only, approval is the employer's call), and
`/school/profile` (institution details + accreditation document submission
for admin review — same `/api/companies/verification` endpoint employers
use, shared fields/labels adapted per role). A student belongs to a school
when their profile's `university` matches the school account's institution
name (case-insensitive). Locked behind admin verification — same queue as
employers, badged "School".

**Logbook streak reminders** — a daily best-effort push notification
(`POST /api/cron/logbook-streak-reminders`) to students with an active
(Accepted) placement who haven't logged an entry in 2+ days, using the
placement's acceptance date as the reference for a student who has never
logged at all (so a brand-new placement isn't nagged immediately). This
route has no user session — it's fired by a scheduled GitHub Action
(`.github/workflows/logbook-streak-reminders.yml`, daily) and gated by a
shared `CRON_SECRET` (set identically as a GitHub Actions secret and a
Vercel env var) instead of `requireSession`. **Requires that one-time
`CRON_SECRET` setup on both sides to actually fire** — see the workflow
file's header comment.

**Admin** — dashboard KPIs, company+school verification queue
(`/admin/companies`), user management with delete (hierarchy-protected —
plain admin can't delete a super_admin) and super-admin/admin promotion by
email (`/admin/users`, form visible to super_admin sessions only, backed by
`POST /api/admin/super-admins`), job moderation/takedown.

**Uploads** (`/api/upload`) — one endpoint, three kinds: `resume` (student,
PDF), `verification` (employer, PDF), `avatar` (any role, PNG/JPEG). All
magic-byte verified server-side (never trust client MIME/extension), capped
at 5MB (documents) / 2MB (images), filenames server-generated. Vercel Blob in
production when `BLOB_READ_WRITE_TOKEN` is set, else local disk in dev.

**Access control layers** — `src/proxy.ts` (Next.js middleware, optimistic
role-gate on `/admin`, `/employer`, `/student`, `/school`) is first-line
only; every API route independently re-checks `session.user.role`, which is
the actual authorization boundary.

## Mobile app (Expo / React Native)

A native Android-first app is being built in `mobile/` in this repo, as a
client of the existing `/api/*` routes (no second backend). Auth uses bearer
JWTs signed with the same `NEXTAUTH_SECRET`, issued by `POST
/api/mobile/login`, alongside the existing cookie sessions —
`requireSession()` (`src/lib/mobileAuth.ts`) accepts either on every route
that needs it, including (as of Phase 3) the school-only routes via a
retrofitted `requireApprovedSchool()`. Phases 0-3 are done: foundations,
student MVP (auth, browse/search/apply, saved jobs, applications tracker,
profile), e-Logbook with offline drafts and push notifications, and
employer (applicant review, logbook approval) + school (read-only
dashboards) screens. Employers also got a Home dashboard tab and a
mobile job-posting wizard in the fintech redesign's Batch D (see "Last
synced with" above) -- posting a job was web-only until then. Push
notifications won't actually deliver until the
app has a linked EAS project (`User.expoPushToken` stays unset otherwise —
see `MOBILE_APP.md`'s setup table). Phase 4 (Android release) has its icon
assets and a `/privacy` policy page (a Play Store requirement) done, but
the actual store publishing is on hold — the user doesn't want to pay
Google Play Console's $25 one-time fee, so a distribution-path decision
(direct APK download, an alternate free app store, or paying later) is
still open. Phase 5 (mobile parity for match score, company-follow, and
messaging) is done in-code but **not yet in any published build** — the
owner needs to run a new `eas build` and re-publish before installed apps
get these screens; see `MOBILE_APP.md`'s "Cutting a new Android build".
**Read `MOBILE_APP.md` before doing any mobile work** — it carries the full
architecture, the phase-by-phase checklist (kept current in each PR), and
the release/store setup steps.

**v1.2 UI/UX follow-ups (post-release, OTA-eligible)** — the student tab
set now opens on a `dashboard` tab (progress banner, KPI snapshot, quick
actions, recommended jobs, recent applications — mirrors the web's
`/student/dashboard`), with the job-search feed demoted to a secondary
`browse-jobs` tab (paginated via infinite scroll, `PAGE_SIZE = 12`, instead
of one long fetch); a new `profile-setup.tsx` wizard runs right after a
student's first signup (matching the web flow, previously mobile skipped
straight to the dashboard); manual light/dark theme override
(`ThemeModeContext` + a new Settings screen, reachable from the
profile/account gear icon) alongside the existing system-follow default;
swipe-left on a job card now auto-saves it (single-action rows only —
multi-action employer rows still require an explicit tap); and an
idle-timeout auto-lock (`autoLockSettings.ts` + `useIdleAutoLock`,
configurable in Settings, persisted-timestamp based so it survives a full
app kill) signs the user out after the chosen period of backgrounding.
All of the above (including the new `dashboard`/`profile-setup`/`settings`
route files -- Expo Router resolves routes from the JS bundle at runtime,
not at native build time) ship over OTA, same as the rest of Phase 5 --
no new native dependency, no fresh `eas build` required.

**v1.3/v1.4 (native, needs a fresh build each)** — biometric/PIN unlock
(`expo-local-authentication`, v1.3.0) lets idle-lock offer Face
ID/fingerprint/device-PIN instead of always forcing a full re-login, kept
gated behind a Settings toggle that requires one successful biometric
check to turn on. Google sign-in (`expo-auth-session`, v1.4.0) adds a
"Continue with Google" button to `login.tsx`/`signup.tsx`, verified
server-side by `POST /api/mobile/google-signin`; it's hidden by default
until the owner provisions Android/iOS OAuth client IDs (see
`MOBILE_APP.md`'s account-setup table) — an unconfigured build just never
shows the button rather than crashing. A brand-new Google sign-in
(`role: 'unassigned'`) is routed to `role-picker.tsx`, mobile's
equivalent of the web's `/onboarding` role picker.

**Fintech redesign in progress (v1.5.0, batched, see `MOBILE_APP.md`)** —
Claude Design prototypes imported for student/employer/school. Batch A
(gradient hero card, bottom sheet, animated counter primitives) and Batch
B shipped OTA so far. Batch B closes the "PIN unlock deferred" gap from
v1.3: `pinSettings.ts` (salted-hash PIN via `expo-crypto`, already a
transitive dependency — no new native module) adds a keypad-entry
alternative to biometric unlock, with a shared
`hasQuickUnlockConfigured()` check so a PIN-only user locks on idle
timeout/app-kill instead of being logged out, same as a biometric-only
user. Settings gained a "Quick-unlock PIN" section (set/change/remove via
a bottom-sheet keypad flow). Batch C (student screens) shipped next:
dashboard and profile heroes now use the shared `GradientHeroCard`, the
dashboard's KPI row counts up on load, "Recommended for you" is a
horizontal carousel, onboarding gained drifting gradient-blob accents,
and the logbook entry form moved from an always-open card into a
bottom-sheet composer behind an "Add today's entry" trigger row. Batch C
deliberately dropped a jobs-feed stipend-range filter slider (no numeric
`Job.stipend` field to back it) and skipped re-skinning the
already-redesigned login/signup/profile-setup screens — see
`MOBILE_APP.md`'s Batch C entry for the full reasoning. Batch D shipped
next: mobile finally has an Employer Dashboard tab
(`(tabs)/employer-dashboard.tsx` — gradient hiring-pipeline hero, animated
KPI row, "Awaiting your review" preview; employer tab bar is now 4 tabs,
Home/Applicants/Logbook/Account) and, since the design's own "+ Post a
job" CTA assumed the feature already existed on mobile and it didn't, a
new `post-job.tsx` wizard plus `createJob()` in the client. That surfaced
a real backend bug fixed in the same batch: `POST /api/jobs` was still
cookie-session-only (`getServerSession`) while its `GET` sibling already
supported mobile bearer tokens (`requireSession`) — now both do (see
`MOBILE_APP.md`'s Batch D entry, `__tests__/api/jobs.test.ts` updated,
393/393 root tests pass). `employer-logbook.tsx` also gained the
prototype's rotated "APPROVED" stamp visual. Remaining batches (school
screen restyles, PDF logbook export) are still pending.

## Demo/seed data

`scripts/seed-companies.mjs` — idempotent script that creates 5 pre-verified
demo companies (Paystack, Andela, MTN Nigeria, Dangote Group, Zenith Bank)
with SVG logos (`public/logos/`) and 5 listings each (25 total) spanning
software, design, engineering, finance, telecoms, and marketing. Run with
`MONGODB_URI=... node scripts/seed-companies.mjs [password]`.

`scripts/create-super-admin.mjs` — one-off script to create/promote a
`super_admin` account directly in MongoDB with a chosen email/password.

## Security hardening (2026-07 audit)

Landed in the security-audit PR: NextAuth's `jwt` callback re-reads the
role from the database on session `update()` (the client payload is
attacker-controlled — previously any signed-in user could escalate their
token to admin); Mongo-backed fixed-window **rate limiting**
(`src/lib/rateLimit.ts`, fail-open, TTL-swept `rate_limits` collection)
on login (web + mobile), register, and all four OTP endpoints, with
per-inbox AND per-IP budgets on the email-sending ones; baseline
**security headers** in `next.config.ts` (HSTS, nosniff, frame DENY,
referrer, permissions); `typeof`-string checks so objects can't reach
Mongo queries or bcrypt via verify-email/reset-password; **email
normalization** (schema lowercase+trim + `findUserByEmail` in
`src/lib/userLookup.ts` with a legacy mixed-case fallback on login
paths); unified "Invalid email or password" login errors (no email
enumeration); generic 500 bodies on register.

Follow-up (same PR): the Playwright E2E suite now runs in CI against a
throwaway Mongo service; unhandled server errors are logged as
structured JSON via `src/instrumentation.ts` `onRequestError` and client
render crashes POST to `/api/client-errors` (both searchable in Vercel
Logs — no external service needed); a **report-only** CSP header logs
would-be violations to `/api/csp-report` so the policy can be tightened
into enforce mode from real data.

Still open, deliberately: enforcing the CSP (needs the report-only logs
to run quiet first, then a nonce setup to drop unsafe-inline);
resumes/verification docs live on public-but-unguessable Vercel Blob
URLs (fine at this scale — needs S3/R2 or similar for true private
storage before real growth, Vercel Blob only does public); Sentry (or
similar) as a proper error dashboard — the structured logs above are the
no-account interim; mobile crash reporting (needs a native rebuild);
bearer tokens are valid until their 2h expiry with no server-side
revocation.

## Known gaps / not yet built

- **4 moderate `npm audit` findings in transitive dependencies**
  (`postcss` via `next`, `uuid` via `next-auth`) — both only have a fix via
  `npm audit fix --force`, which downgrades `next` to a `9.x` canary and
  `next-auth` to `3.x`: a breaking change to the framework this whole app
  is built on, not something to force through as a drive-by fix. Needs a
  deliberate, tested major-version migration in its own PR.
- **No saved-jobs UI on the school/employer side** — bookmarking is
  student-only (matches the feature's purpose).
- **Community feature** is a directory + implied connection, not a full chat
  — see `021b140`/`55fa53c` history for what actually shipped vs. what was
  scoped early on.
- **Unread-message badges are web-only** — both web applications lists
  (student + employer) now show a count badge on the Message button
  (`src/lib/unreadMessages.ts`, cleared via router.refresh after the
  thread marks messages read). The mobile applications/applicant lists
  still don't surface unread state — needs the same aggregate exposed
  through the API for the mobile client, then an OTA.
- **Mobile screens exist for match score/best-match sort, company follow,
  and messaging as of Mobile Phase 5** (`MOBILE_APP.md`), but a new Android
  build + Release upload is needed before an already-installed app picks
  them up — see "Cutting a new Android build" in that doc.
- **CSV export (`/school/students`) is web-only** — deliberately not built
  for mobile; downloading and opening a spreadsheet isn't a mobile-native
  workflow, unlike bulk accept/reject (built for both) and messaging.
- **The logbook streak reminder cron needs one-time owner setup to actually
  fire** — `CRON_SECRET` must be set identically in the GitHub Actions repo
  secrets and Vercel's env vars; until then the scheduled workflow's daily
  run just 401s against its own request.
- **Mobile biometric/PIN unlock ships pending its own native build** — the
  code landed (see `MOBILE_APP.md` Phase 12: `AuthContext`'s `locked` state,
  `ui/lock-screen.tsx`, a Settings toggle), but `expo-local-authentication`
  is a new native dependency, so it can't reach an already-installed app
  over OTA — an install stays on the old (password-only) behavior until it
  updates to the 1.3.0 build this change triggers.
- **Mobile Google sign-in ships pending Google OAuth client IDs** — the
  code landed (`ui/google-signin-button.tsx`, `POST
  /api/mobile/google-signin`, `role-picker.tsx`), but the button hides
  itself until `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` (build-time) and
  `GOOGLE_ANDROID_CLIENT_ID` (server-side verification) are both set —
  see `MOBILE_APP.md`'s account-setup table for how to create them.
  `expo-auth-session` is also a new native dependency, so once those
  exist the button additionally needs the 1.4.0 build it triggers to
  reach an already-installed app.
- **Job.department backfill** — jobs created before this field existed have
  no `department` value in the DB (Mongoose's `required: true` only
  validates new saves, not existing documents) and are excluded from the
  default department-scoped feed view for students until an employer edits
  and re-saves them; they still appear for anyone searching or with
  matching skills.

## Environment variables

See `.env.example` and `DEPLOY.md` for the full list. The ones with
non-obvious behavior: `ADMIN_EMAILS` / `SUPER_ADMIN_EMAILS` (comma-separated
allowlists, promote on sign-in), `MONGODB_URI` (must include a database name
in the path or Mongoose silently falls back to a `test` database),
`BLOB_READ_WRITE_TOKEN` (auto-injected by Vercel once a Blob store is
connected — don't set by hand), `RESEND_API_KEY` (forgot-password emails),
`CRON_SECRET` (gates `POST /api/cron/logbook-streak-reminders` — must be set
to the same value in both Vercel and the GitHub Actions repo secrets, or the
daily reminder sweep 401s against itself), `GOOGLE_ANDROID_CLIENT_ID` /
`GOOGLE_IOS_CLIENT_ID` (verifies mobile Google sign-in ID tokens
server-side, alongside the existing `GOOGLE_CLIENT_ID` web OAuth client —
see `src/app/api/mobile/google-signin/route.ts`; the matching
`EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` / `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`
build-time vars live in `mobile/eas.json`, not here).

## Repo conventions worth knowing

- **`AGENTS.md`** carries an auto-managed Next.js version-drift warning block
  (don't edit between the `BEGIN`/`END` markers) — this file is a separate,
  hand-maintained companion.
- **`PROGRESS.md` is machine-written** — a GitHub Action appends a row on
  every push to main. Read it for recent history; never edit it by hand.
- **Never gate a real `<input>` behind `readOnly` to fight browser autofill.**
  It silently breaks the on-screen keyboard on mobile (readonly inputs never
  trigger it, and flipping `readOnly` off in a React `onFocus` handler fires
  too late for iOS/Android to notice). The login page hit exactly this bug
  and now uses hidden honeypot decoy fields instead — copy that pattern if
  another form needs to stop stale-account autofill.
- **`connectToDatabase()` (`src/lib/mongodb.ts`) imports every Mongoose model
  as a side effect.** Next.js bundles each route/page into its own
  serverless function, so a file that only imports `Job` but does
  `.populate('employerId', ...)` (a `User` ref) can hit `MissingSchemaError`
  on a cold start where nothing else in that function's bundle registered
  `User` first. Don't "fix" this by importing models piecemeal per file —
  keep relying on the central import list, and add any new model there too.
- Tests live in `__tests__/`, mirroring `src/` structure; run with `npm
  test`. Every API route change should come with route-level test coverage
  (see any file under `__tests__/api/` for the pattern: mock
  `next-auth/next` + the Mongoose model, assert status codes and the
  DB-query shape).
- `npm run lint`, `npx tsc --noEmit`, and `npm test` all must pass before a
  PR is considered done — CI (`.github/workflows/ci.yml`) enforces this.
- **`.claude/` carries a project-level install of [ECC](https://github.com/affaan-m/ECC)
  v2.0.0**, trimmed to a curated, stack-relevant subset (14 agents, 20 skills,
  4 rule packs — no hooks, no legacy commands; see `.claude/ECC-NOTICE.md` for
  the full list and why it's trimmed rather than the full ~734-file bundle).
  This is separate from `.agents/skills/` + `skills-lock.json`, which is a
  different, unrelated skill-manager already used by this repo — don't merge
  the two systems.

## Keeping this file in sync

This file has no magic auto-update — it stays accurate two ways:

1. **Every Claude Code session** working on this repo should update the
   relevant section here (and bump "Last synced with" to the merge/HEAD
   commit) as part of finishing work that changes roles, data models, API
   routes, or major features — the same way tests are expected to accompany
   route changes.
2. **A scheduled Routine** re-checks `origin/main` periodically, diffs
   against the commit recorded above, and updates this file directly if a
   session skipped step 1 (e.g., a change landed without going through a
   Claude Code PR). See the repo owner's Claude Code session history for the
   routine, or recreate it with `create_trigger` if missing.
