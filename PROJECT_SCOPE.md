<!-- AUTO-MAINTAINED: see "Keeping this file in sync" at the bottom.
     Every Claude Code session working on this repo should update this file
     when it changes user-facing behavior, roles, data models, or routes. -->

# SIWES Finder — Project Scope

SIWES Finder is a Next.js + MongoDB platform that connects Nigerian students
seeking SIWES (Students Industrial Work Experience Scheme) placements with
verified employers, and gives their schools visibility into the process.

**Last synced with:** `7652b0e` (main, 2026-07-11) — PR #16 merged (Mobile
Phase 3: employer applicant/logbook review, school read-only dashboards),
plus this PR's start of Mobile Phase 4 (Android app icon/splash, a new
`/privacy` page for the Play Store requirement — the store publishing steps
themselves are on hold pending a distribution-path decision, see
`MOBILE_APP.md` Phase 4).
Recent-change log: see `PROGRESS.md` (auto-appended on every push to main).

## Roles

| Role | Who | Access |
|---|---|---|
| `student` | Students seeking a placement | Browse/apply to jobs, profile, resume, saved jobs, logbook, opt-in community |
| `employer` | Companies posting placements | Post/manage jobs, review applicants, must be admin-approved (CAC verification) before listings go public |
| `school` | Institutions tracking their students | Read-only view of their own students (matched by university name) — profiles, applications, logbooks; must be admin-approved before student data unlocks |
| `admin` | Platform staff | Approve/reject companies & schools, moderate job listings, manage users |
| `super_admin` | Elevated admin | Everything `admin` can do, plus promote other users to admin/super_admin and is the only role that can delete another super_admin's account |
| `unassigned` | Just signed up via Google, hasn't picked a role yet | Routed to `/onboarding` |

Admin/super_admin are **never** self-assignable at signup — only granted via
the `ADMIN_EMAILS` / `SUPER_ADMIN_EMAILS` env-var allowlists (promoted on
sign-in) or by an existing super_admin via `POST /api/admin/super-admins`.
`src/lib/roles.ts` (`isAdminRole`) treats admin and super_admin as
equivalent everywhere except that one deletion-hierarchy check.

## Data models (`src/models/`)

- **User** — one schema for all roles (see `role` enum above). Notable fields:
  `avatarUrl` (profile picture / company logo / school crest, shared field),
  `savedJobs` (student bookmarks), `communityJoined` (opt-in flag),
  `verificationStatus` (`unsubmitted → pending → approved/rejected`, used by
  both employers and schools), `resetOtpHash`/`resetOtpExpires` (password
  reset, hash-only — the OTP itself is never stored).
- **Job** — posted by employers. `applicationMethod` is `platform | email |
  external`. Optional `applicationDeadline` and `maxApplicants` +
  `applicantCount`; a job auto-closes (`isActive: false`) once either limit
  is hit, checked lazily by `src/lib/jobStatus.ts` (no cron — evaluated on
  read/apply).
- **Application** — links a student, job, and employer. Unique index on
  `(job, student)` prevents duplicate applications. Status:
  `Pending | Accepted | Rejected`.
- **Logbook** — daily/weekly entries a student writes against their accepted
  placement; the employer approves each entry (`isApproved`).

## Feature surface

**Auth** — credentials (bcrypt) + Google OAuth via NextAuth. Signup
(`/api/auth/register`) only accepts `student | employer | school` — never a
privileged role. OTP-based forgot-password flow (`/api/auth/forgot-password`,
`/api/auth/reset-password`) via Resend, 10-minute expiry, generic response to
avoid email enumeration.

**Students** — browse/search jobs (`/student/jobs`, filters: keyword, type,
location, sort; search matches title, description, **required
skills/requirements**, location, and company name/industry), job details
with Apply (in-app / email / external depending on the listing), save jobs
for later, e-Logbook, profile (academic details + faculty + skills + resume
PDF + avatar), opt-in Community directory (peers who also joined, grouped
implicitly by shared placement visibility).

**Employers** — post/edit/deactivate jobs (multi-step wizard with
deadline/cap controls), manage applicants (accept/reject), company
verification submission (CAC number + document + company logo), approve
student logbook entries (`PUT /api/logbook/[id]`, scoped to entries tied to
their own placements). This approval access was removed in an earlier
commit ("logbooks are now a private student record") and restored during
mobile Phase 3, at the user's explicit confirmation — see `MOBILE_APP.md`
Phase 3. **The route and the mobile app's `employer-logbook` screen exist;
the web employer UI for it (`/employer/logbook`) was not restored** and
remains web-inaccessible unless a future session rebuilds that page too.

**Schools** — `/school/dashboard` (KPI overview: registered/placed/applying
students, department count, logbook volume, plus a by-department breakdown
table with placement rate), `/school/students` (directory grouped by
faculty → department, search, per-student placement + logbook status) →
`/school/students/[id]` (full record: profile, every application, complete
logbook with approval state), `/school/logbooks` (every logbook entry
across every student and company in one filterable feed — read-only,
approval is the employer's call), and `/school/profile` (institution
details + accreditation document submission for admin review — same
`/api/companies/verification` endpoint employers use, shared fields/labels
adapted per role). A student belongs to a school when their profile's
`university` matches the school account's institution name
(case-insensitive). Locked behind admin verification — same queue as
employers, badged "School".

**Admin** — dashboard KPIs, company+school verification queue
(`/admin/companies`), user management with delete (hierarchy-protected —
plain admin can't delete a super_admin), job moderation/takedown, super-admin
promotion (`/admin/super-admins` — currently API-only, see gaps below).

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
dashboards) screens. Push notifications won't actually deliver until the
app has a linked EAS project (`User.expoPushToken` stays unset otherwise —
see `MOBILE_APP.md`'s setup table). Phase 4 (Android release) has its icon
assets and a `/privacy` policy page (a Play Store requirement) done, but
the actual store publishing is on hold — the user doesn't want to pay
Google Play Console's $25 one-time fee, so a distribution-path decision
(direct APK download, an alternate free app store, or paying later) is
still open. **Read `MOBILE_APP.md` before doing any mobile work** — it
carries the full
architecture, the phase-by-phase checklist (kept current in each PR), and
the release/store setup steps.

## Demo/seed data

`scripts/seed-companies.mjs` — idempotent script that creates 5 pre-verified
demo companies (Paystack, Andela, MTN Nigeria, Dangote Group, Zenith Bank)
with SVG logos (`public/logos/`) and 5 listings each (25 total) spanning
software, design, engineering, finance, telecoms, and marketing. Run with
`MONGODB_URI=... node scripts/seed-companies.mjs [password]`.

`scripts/create-super-admin.mjs` — one-off script to create/promote a
`super_admin` account directly in MongoDB with a chosen email/password.

## Known gaps / not yet built

- **No UI for `/api/admin/super-admins`** — promoting a user to admin or
  super_admin is currently an API-only call; there's no button in
  `/admin/users` yet.
- **No saved-jobs UI on the school/employer side** — bookmarking is
  student-only (matches the feature's purpose).
- **No email notifications** for application status changes, job approval,
  or school/company verification decisions — Resend is only wired for
  password reset.
- **No automated tests for the E2E Playwright suite in CI** — `test:e2e`
  exists (`e2e/`) but only the Vitest unit/integration suite
  (`npm test`) runs in `.github/workflows/ci.yml`.
- **Community feature** is a directory + implied connection, not a full chat
  — see `021b140`/`55fa53c` history for what actually shipped vs. what was
  scoped early on.
- **Employer logbook approval has no web UI** — the route (`PUT
  /api/logbook/[id]`) and the mobile app's `employer-logbook` screen both
  work; the equivalent web page (`/employer/logbook`) was deleted in an
  earlier commit and hasn't been rebuilt. An employer without the mobile
  app currently has no way to approve entries.

## Environment variables

See `.env.example` and `DEPLOY.md` for the full list. The ones with
non-obvious behavior: `ADMIN_EMAILS` / `SUPER_ADMIN_EMAILS` (comma-separated
allowlists, promote on sign-in), `MONGODB_URI` (must include a database name
in the path or Mongoose silently falls back to a `test` database),
`BLOB_READ_WRITE_TOKEN` (auto-injected by Vercel once a Blob store is
connected — don't set by hand), `RESEND_API_KEY` (forgot-password emails).

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
