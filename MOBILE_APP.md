<!-- Living document. Any session doing mobile work reads this first and
     updates the phase checklist in the SAME PR as the work. -->

# SIWES Finder — Mobile App (Expo / React Native)

## The idea

A native Android (later iOS) app for the whole SIWES Finder platform,
serving the same four roles as the website: students find and apply to
placements, employers post and review, schools track their students, admins
stay on the web. Nigerian students are overwhelmingly mobile-first; a real
app adds what the responsive site can't:

- **Push notifications** — "your application was accepted", "your logbook
  entry was approved", "3 new Design placements match your skills".
- **Offline-friendly logbook** — draft daily entries without data, sync
  when back online. Logbook writing is a daily habit; the app should make
  it a 20-second task from the home screen.
- **Presence** — an icon on the student's phone beats a bookmarked URL for
  daily engagement, and a Play Store listing is a trust signal for schools
  and companies.

## Architecture — one backend, two clients

```
┌─────────────┐        ┌──────────────────────────────┐        ┌─────────┐
│  Next.js    │  HTTPS │  Existing Next.js API routes │        │ MongoDB │
│  website    │───────▶│  /api/* on Vercel            │───────▶│  Atlas  │
└─────────────┘ cookie └──────────────────────────────┘        └─────────┘
                                    ▲
┌─────────────┐        Authorization: Bearer <JWT>
│  Expo app   │────────────────────┘
│  (mobile/)  │
└─────────────┘
```

- The app is a **client of the existing API** — no second backend, no data
  duplication. Every feature the app needs (jobs, applications, saved jobs,
  logbook, profile, uploads, school views) already has a JSON route; see
  `PROJECT_SCOPE.md` for the full API surface.
- Code lives in **`mobile/`** in this repo (Expo + TypeScript +
  expo-router). Monorepo means API changes and app changes ship in one PR
  and every session already has access.
- **TypeScript everywhere** — the same language and conventions as the
  site.

## Auth strategy (the one real backend change)

NextAuth sessions are cookie-based, which doesn't suit a native client. The
mobile app authenticates with **bearer tokens signed by the same
`NEXTAUTH_SECRET`**:

1. `src/lib/mobileAuth.ts` — sign/verify JWTs (`jose` or NextAuth's
   encode/decode helpers) carrying the same claims the web session token
   has: `id`, `role`.
2. `POST /api/mobile/login` — takes email + password (same bcrypt check as
   the web credentials provider in `src/lib/auth.ts`), returns
   `{ token, user }`. Token lifetime mirrors the web's rolling 2-hour
   session; the app silently re-issues on activity.
3. `requireSession(req)` wrapper — resolves the caller from **either** the
   NextAuth cookie **or** an `Authorization: Bearer` header, so each
   existing API route serves both clients with a one-line change. Adopt it
   route-by-route as the app needs them (Phase 1 list below), not
   big-bang.
4. Google sign-in on mobile via `expo-auth-session` is **Phase 2+** —
   credentials login ships first.
5. The app stores the token in `expo-secure-store` (encrypted device
   storage), never AsyncStorage.

## Phases

Keep this checklist current — tick items in the same PR that lands them.

### Phase 0 — Foundations
- [x] Scaffold Expo app in `mobile/` (TypeScript template + expo-router,
      via `create-expo-app`; demo/branding files from the template removed)
- [x] Typed API client (`mobile/src/api/client.ts` + `authStorage.ts` +
      `AuthContext.tsx`) with base-URL from env (`EXPO_PUBLIC_API_URL`; dev
      default `http://10.0.2.2:3000`, the Android emulator's localhost
      alias — override in `.env` for iOS Simulator/a physical device, see
      `mobile/.env.example`)
- [x] Backend: `src/lib/mobileAuth.ts` (`issueMobileToken` +
      `requireSession`) + `POST /api/mobile/login`, with route/unit tests
      following `__tests__/api/` and `__tests__/lib/` patterns.
      `requireSession` reuses `next-auth/jwt`'s own cookie-or-bearer lookup
      rather than a bespoke token format — no new auth system.
- [x] `/api/profile` GET retrofitted to `requireSession` as the
      proof-of-concept that a route can serve both clients; the rest of the
      API surface migrates route-by-route as Phase 1 screens need them.
- [x] CI: `mobile` job (install, `tsc --noEmit`, eslint) added to
      `.github/workflows/ci.yml`, path-filtered to `mobile/**` via
      `dorny/paths-filter`
- [x] Theming: brand tokens (primary `#2557eb` / dark `#5c86ff`, surface
      colors from `globals.css`) ported into the template's own
      `mobile/src/constants/theme.ts` rather than a second parallel theme
      file — one source of truth for colors, matching the convention
      `ThemedText`/`ThemedView` already expect
- [x] Minimal login → "hello, {name}" flow (`mobile/src/app/login.tsx`,
      `index.tsx`) proves the whole chain end-to-end: credentials login →
      bearer token in `expo-secure-store` → authenticated `/api/profile`
      fetch. Full navigation (Jobs/Applications/Logbook/Profile tabs)
      arrives in Phase 1.

**Done when:** a fresh checkout can `cd mobile && npm install && npx expo
start`, log in with a seeded account against the live API, and see a
"hello, {name}" screen. CI runs on mobile changes. **Not yet verified on an
actual device/emulator** — this was built and typechecked/linted in a
sandboxed environment with no Android/iOS runtime available; first real
device run is on the user.

### Phase 1 — Student MVP
- [x] Login / signup (credentials; role tabs like the web) —
      `mobile/src/app/signup.tsx` mirrors the web's student/company/school
      tabs and auto-logs in after `POST /api/auth/register`, same as the
      site. Non-student roles land on a "coming soon" holding screen (see
      below) rather than a broken Jobs feed, since Phase 1 only builds
      student screens.
- [x] Browse + search jobs (reuses `/api/jobs` incl. skill/company search) —
      `mobile/src/app/(tabs)/index.tsx`, with type filter chips and a
      debounced search box.
- [x] Job details + apply (platform/email/external methods) —
      `mobile/src/app/jobs/[id].tsx`, branching on `applicationMethod`
      exactly like the web's `ApplyButton`: email opens a `mailto:` link,
      external opens the company's URL, platform calls `POST
      /api/applications`.
- [x] Saved jobs (bookmark toggle, saved list) — a ★ toggle on job cards and
      the detail screen, plus a "Saved" filter chip on the Jobs screen
      (mirrors the web's `savedOnly` toggle rather than a separate nav item).
- [x] Applications tracker with status — `mobile/src/app/(tabs)/applications.tsx`.
- [x] Profile: academic details, faculty, skills, avatar + resume upload
      (`/api/upload` accepts multipart already) — `mobile/src/app/(tabs)/profile.tsx`,
      using `expo-image-picker` (avatar) and `expo-document-picker` (resume
      PDF), each uploading immediately and persisting the URL via `PUT
      /api/profile`, same two-step flow as the web's `AvatarUpload`.
- [x] Backend: retrofitted every remaining student-facing route to
      `requireSession` (bearer-or-cookie) — `GET /api/jobs`, `GET
      /api/jobs/[id]`, `POST`+`GET /api/applications`, `GET`+`POST
      /api/saved-jobs`, `PUT /api/profile`, `POST /api/upload`. Each got a
      route test asserting `requireSession` (not the cookie-only
      `getServerSession`) is called with the raw request, on top of the
      existing route-logic test coverage.
- [x] Navigation: `(tabs)` group (Jobs / Applications / Profile) behind an
      auth + role gate in `mobile/src/app/(tabs)/_layout.tsx`; `login`,
      `signup`, and `jobs/[id]` are full-screen stack routes outside the tab
      bar.

**Done when:** a student can go from install → signed in → applied → sees
the application in their tracker, entirely in the app.

**Two real bugs this surfaced and fixed, unrelated to mobile screens
directly but found while wiring them up:**
- `PUT /api/profile` was returning the full Mongoose user document,
  including the hashed password field, to the client. Both GET and PUT now
  `.select()` the same explicit safe-field list.
- `GET /api/profile`'s field-select never actually included `role`, so the
  Phase 0 `AuthContext` — which reads `profile.role` to restore the session
  on app boot — was silently always getting `undefined`. Fixed by adding
  `role` to the safe-field list (it isn't sensitive, unlike password).

**Not yet verified on an actual device/emulator** — same caveat as Phase 0:
built and typechecked/linted in a sandboxed environment with no
Android/iOS runtime available.

### Phase 2 — Logbook + push notifications
- [x] e-Logbook: write daily entries, week history —
      `mobile/src/app/(tabs)/logbook.tsx`, entries grouped by `weekNumber`
      (the schema's own natural grouping key — the web renders entries
      flat, so this is a fresh convention, not a ported one).
- [x] Offline drafts (queue locally, sync on reconnect) —
      `mobile/src/api/logbookDrafts.ts` queues a failed submit in
      AsyncStorage (only on a genuine network failure, not a server
      rejection like "no accepted placement yet"), and flushes on screen
      focus and on a `@react-native-community/netinfo` reconnect event.
- [x] `expoPushToken` field on User + register-device endpoint —
      `POST /api/mobile/register-push-token`; the client
      (`mobile/src/api/pushNotifications.ts`) registers on login and on
      session restore, no-oping quietly on a simulator/emulator, a denied
      permission, or **no EAS project linked yet** (see the setup table
      below — `getExpoPushTokenAsync` needs a real `projectId` to mint a
      token, which this sandboxed session can't produce without the
      owner's Expo account).
- [x] Server sends pushes on application decision — `PUT
      /api/applications/[id]` sends a best-effort push (`src/lib/push.ts`,
      wrapping `expo-server-sdk`) when an employer accepts/rejects; a
      delivery failure is logged and swallowed, never fails the status
      update itself.
- [x] ~~Server sends push on logbook approval~~ — **resolved in Phase 3.**
      This was originally dropped because the employer logbook-approval
      route had been deliberately removed in an earlier commit; flagged to
      the repo owner rather than silently reversed. Confirmed in Phase 3
      that it should come back (Phase 3's own scope needs employer approval
      anyway) — `PUT /api/logbook/[id]` is recreated there and the push
      send landed alongside it.

**Not yet verified on an actual device/emulator, and push notifications
specifically cannot be end-to-end tested until the app has a linked EAS
project** (see "One-time account setup" below) — the registration code
path is written and no-ops safely without one, but no real device token
can be minted in this sandboxed environment.

### Phase 3 — Employer & School
- [x] Employer: applicant list, accept/reject —
      `(tabs)/employer-applicants.tsx`, consuming `GET /api/applications`'s
      employer branch and `PUT /api/applications/[id]`, both already
      bearer-ready from Phase 1/2.
- [x] Employer: logbook approvals — `(tabs)/employer-logbook.tsx`. Required
      restoring `PUT /api/logbook/[id]` (deleted in an earlier commit) and
      the employer branch of `GET /api/logbook`, plus retrofitting
      `src/lib/schoolAuth.ts`'s `requireApprovedSchool()` — the one
      remaining auth helper untouched since Phase 0 — to accept bearer
      tokens. **This reverses a prior "logbooks are private" decision;
      done only after explicit user confirmation** (flagged in the Phase 2
      PR, confirmed before implementing here) — see `PROJECT_SCOPE.md`'s
      Employers section for the corrected, current behavior.
- [x] School: overview stats, student directory, logbook feed (read-only) —
      `(tabs)/school-overview.tsx`, `school-students.tsx` (grouped by
      faculty → department, tapping a student pushes
      `school/students/[id].tsx`), `school-logbooks.tsx` (status/department
      filters). No new stats endpoint — same as the web, KPIs are computed
      client-side from `GET /api/school/students`. All three
      `/api/school/**` routes now accept bearer tokens via the
      `requireApprovedSchool()` retrofit above.
- [x] Shared minimal `(tabs)/account.tsx` (name/email/role + sign out) for
      employer and school — full profile editing (company verification,
      institution accreditation, etc.) stays web-only; not in this phase's
      scope.

**Not yet verified on an actual device/emulator** — same caveat as every
prior phase.

### Phase 4 — Release (Android)
- [x] App icon + splash from the existing logomark (`src/app/icon.svg`'s
      two-circle mark) — regenerated every Android icon asset
      (`mobile/assets/images/icon.png`, `android-icon-{foreground,
      background,monochrome}.png`, `splash-icon.png`) from the brand SVG
      via `sharp`, white mark on the brand blue (`#2557eb`), respecting
      Android's adaptive-icon safe zone. `favicon.png` uses the original
      blue-on-transparent mark, matching the website's own favicon.
      **iOS's `assets/expo.icon/` (Apple's newer layered "Icon Composer"
      bundle format) was deliberately left untouched** — this phase is
      titled Release (Android), iOS icon work needs Apple's own tooling to
      verify visually and isn't scoped here.
- [x] Privacy policy page on the website (Play Store requirement) —
      `src/app/privacy/page.tsx`, linked from the homepage footer. Plain
      language, describes what's actually collected per role (including
      the mobile app's push token) and the third-party processors used
      (MongoDB Atlas, Vercel/Vercel Blob, Resend, Google, Expo) — not a
      lawyer-reviewed document, written in good faith for an MVP-stage
      platform; revisit if the platform scales significantly.
- [x] EAS build profile — `mobile/eas.json`, `production` (and `preview`)
      profiles both set `android.buildType: "apk"` (EAS's default for
      `production` is an AAB, Play-Store-only). An APK is what both chosen
      distribution paths below need. **Decision (owner, 2026-07-11): skip
      Google Play — no $25 registration fee.** Do both of the following
      instead, from the same build:
      1. **Direct download** — host the built `.apk` on the website; the
         owner adds the download link themselves once a build exists.
      2. **Free alternate app store** — Amazon Appstore and/or Huawei
         AppGallery, both free to register, both accept a plain APK. Either
         store's app can be installed on **any** Android device (not
         limited to Amazon/Huawei hardware) — same APK serves both this
         and the direct download above.
      `app.json`: `extra.eas.projectId` set (owner's Expo project),
      `android.package` set to `com.siwesfinder.app` (permanent once
      published anywhere, chosen deliberately). `expo-build-properties`
      plugin added with `enableMinifyInReleaseBuilds` +
      `enableShrinkResourcesInReleaseBuilds` (R8/Proguard + unused-resource
      stripping) and `buildArchs: ["armeabi-v7a", "arm64-v8a"]` (drops the
      `x86`/`x86_64` slices a universal APK bundles by default — those only
      ever run on emulators, never real phones — while keeping both real
      ARM architectures so older/budget Android devices still work) to
      bring the release APK size down from an initial ~100MB.
      **The owner runs the actual build** (this sandboxed environment
      can't reach `api.expo.dev` at all, confirmed by a direct connection
      test, so it can never run `eas` commands itself, credentials or not):
      ```
      cd mobile && eas build --platform android --profile production
      ```
      which uploads the resulting APK to expo.dev, downloadable from
      there or via the CLI's own link.
- [x] Direct download — the homepage's "Also on Android" banner
      (`src/app/page.tsx`) links to the `v1.0.0-android` GitHub Release
      asset (permanent hosting, no expiry — replaced the original EAS
      build artifact link, which only would have stayed live ~30 days on
      Expo's free tier). A new Android version means a new GitHub Release
      + updating the hardcoded fallback (or just setting
      `NEXT_PUBLIC_ANDROID_APK_URL` in Vercel instead).
- [ ] Amazon Appstore / Huawei AppGallery submission — not started; needs
      the owner's free developer account on each (see setup table below).
- [ ] Play Console submission — **explicitly out of scope**, per the
      decision above.
- [ ] Store listing (screenshots, description, feature graphic) — needed
      for the Amazon/Huawei submissions above; not started. Screenshots
      need a real build running on a device/emulator, which (like every
      prior phase) this sandboxed environment can't produce.

### Phase 5 — Mobile parity for web-only features
Batches 3-4 of the post-launch feature work (see `PROJECT_SCOPE.md`) shipped
match score, company-follow alerts, and application messaging on the web
dashboard only — the backend routes work for any bearer-token caller, but no
mobile screens existed yet. This phase closes that gap, reusing the existing
API entirely (no backend changes):
- [x] Match score + "Best match" sort — `Job.matchScore` (already returned
      by `GET /api/jobs` for a student with skills listed) surfaced as a
      badge on `(tabs)/index.tsx`'s job cards and `jobs/[id].tsx`'s detail
      screen; a "⚡ Best match" filter chip sends `sort=match`.
- [x] Follow company — `jobs/[id].tsx` gets a Follow button
      (`getFollowStatus`/`toggleFollowCompany` in `api/client.ts`, wrapping
      `GET`/`POST /api/companies/[id]/follow`).
- [x] Application messaging — new `messages/[id].tsx` stack screen (bubble
      thread, 8s poll while open, matching the web modal's cadence), reached
      via a "Message" button from both `(tabs)/applications.tsx` (student)
      and `(tabs)/employer-applicants.tsx` (employer). `listMessages`/
      `sendMessage` added to `api/client.ts`.
- [ ] Not yet verified on an actual device/emulator — same sandboxed-
      environment caveat as every prior phase.

**A new mobile build is needed to ship this to existing installs** — unlike
the backend-only parts of batches 1-4 (which reached installed apps
automatically once merged, since the app is just an API client), these are
new screens compiled into the binary. See "Cutting a new Android build"
below.

### Phase 6 — Bulk accept/reject on employer-applicants
Batch 6's employer-side bulk accept/reject (`PATCH /api/applications/bulk`,
see `PROJECT_SCOPE.md`) got a mobile equivalent alongside the web one, not
a separate later pass: `(tabs)/employer-applicants.tsx` gets a "Select"
toggle in the header, a checkbox on each pending applicant's card while in
select mode, and a bottom action bar ("Accept selected" / "Reject
selected") wired to the new `bulkUpdateApplications` client function. Also
compiled-in — needs the same new build as Phase 5 to reach existing
installs. CSV export (school roster) and the logbook streak push reminders
from the same batch are **not** mobile features — CSV export is
deliberately web-only (file downloads aren't a mobile-native workflow),
and the streak reminder is a server-side cron job with no UI at all.

### Phase 7 — Fintech-grade UI/UX overhaul
Owner feedback after the first real-device test: the app felt "too blank —
no animations or anything", auth screens floated at the top with dead space
below, and the overall look needed to be "fintech like and modern". This
phase rebuilt the presentation layer of **every** screen without touching
any API logic:
- [x] Shared UI kit in `mobile/src/components/ui/` — `PressableScale`
      (spring press feedback + haptic tick on every touchable),
      `Button` (gradient primary / secondary / ghost / danger), `Field`
      (animated focus ring, leading icons, show/hide-password toggle),
      `Badge` (tinted semantic pills), `Card` (elevated surface) +
      `InitialAvatar`, `Skeleton`/`SkeletonCard`/`SkeletonList` (pulsing
      loaders that replace every bare spinner), `EmptyState`,
      `ErrorBanner`, `Chip`, `ScreenHeader`, `BrandLogo` (the two-circle
      mark drawn natively on a gradient tile).
- [x] Theme tokens extended (`constants/theme.ts`): soft tints
      (`primarySoft` etc.), brand gradient pair, `Radius` scale.
- [x] Auth: login/signup fully redesigned — vertically centered, brand
      logomark hero, staggered entrance animations, animated segmented
      role control on signup, KeyboardAvoidingView.
- [x] Navigation shell: Ionicons on every tab (filled when active), styled
      tab bar, fade/slide stack transitions, session restore shows a
      pulsing brand mark instead of a spinner.
- [x] Every list screen: staggered card entrances (capped so scrolling
      stays instant), skeleton loading states, icon empty states,
      pull-to-refresh on Jobs/Applications.
- [x] Profile/Account: gradient identity header with avatar + camera
      badge, grouped section cards.
- [x] New deps (all SDK-57-pinned): `@expo/vector-icons`,
      `expo-linear-gradient`, `expo-haptics`. Animations use the
      already-installed `react-native-reanimated` (UI-thread).
- [ ] Not yet verified on a device — same sandbox caveat as every phase;
      **needs a new `eas build` to reach installs** (all compiled-in).

### Phase 8 — Engagement features
Follow-up batch on top of Phase 7, all approved by the owner in one go:
- [x] **Forgot password** — `forgot-password.tsx` (email → OTP + new
      password → done), reusing the website's public
      `/api/auth/forgot-password` + `/api/auth/reset-password` OTP flow;
      linked from the login screen. This closed a real gap: mobile
      previously had no reset path at all.
- [x] **Push deep links** — `src/api/notificationRouting.ts` maps every
      backend push payload type (`application-status`, `new-message`,
      `logbook-approval`, `new-job-alert`, `logbook-streak-reminder`) to
      its screen; handles warm taps and cold starts, validates ids as
      ObjectIds before routing (payloads are external input). Also sets a
      foreground notification handler so pushes show as banners in-app.
- [x] **Share a job** — native Share sheet from the job detail header.
- [x] **Apply success moment** — spring ZoomIn checkmark + success haptic.
- [x] **Match ring** — `ui/match-ring.tsx`, animated SVG gauge (new dep:
      `react-native-svg`, SDK-pinned) on the job detail screen.
- [x] **Logbook streak card** — `ui/streak-card.tsx`: Mon-Fri dots for the
      current week + 🔥 consecutive-weekday streak (weekends neither break
      nor extend, matching the reminder cron's logic).
- [x] **Swipe actions** — `ui/swipe-row.tsx` (ReanimatedSwipeable):
      swipe a job card to save/unsave, swipe a pending applicant to
      accept/reject. Every swipe action also exists as a visible button.
- [x] **Onboarding carousel** — 3 slides on first launch
      (`onboarding.tsx`, AsyncStorage seen-flag, gated from the tabs
      layout redirect).
- [ ] Same device-verification caveat; compiled-in → needs a new build.

### Phase 9 — Email-ownership verification
Owner request: verify a new signup actually controls the email they typed
(distinct from the existing employer/school admin-approval
`verificationStatus` check, which is unaffected). Backend is shared with
the website — see `PROJECT_SCOPE.md`'s "Email verification". Mobile side:
- [x] `client.ts` — `verifyEmail`/`resendVerificationEmail`; `emailVerified`
      added to `SessionUser`/`Profile`; `ApiError.code` added so a 403 with
      `code: 'EMAIL_NOT_VERIFIED'` can be branched on (currently just
      surfaced as the message text, same as any other error).
- [x] `AuthContext` gets `refreshUser()` so the banner/gate clears right
      after verifying, without a fresh login.
- [x] New `verify-email.tsx` stack screen — same email→OTP shape as
      `forgot-password.tsx`, plus a resend button.
- [x] `ui/verify-email-banner.tsx` — shown above the tab bar for
      student/employer only (school's screens are all read-only, nothing
      to unlock) when `!user.emailVerified`; taps through to the screen
      above.
- [ ] This is OTA-eligible (no native code) — publish with `eas update`,
      no new build required for existing installs once this merges.

## Over-the-air updates (EAS Update) — read this before cutting a build

`expo-updates` is configured (`runtimeVersion.policy: "appVersion"`,
update URL `https://u.expo.dev/<projectId>`, build channels `production`
and `preview` in `eas.json`). This changes the release workflow:

- **JS-only changes** (screens, styling, animations, API-client logic —
  i.e. nearly everything) no longer need a new APK. Publish them
  over-the-air; installed apps fetch the update on next launch (the app
  checks `ON_LOAD` and applies on the following start):
  ```
  cd mobile
  eas update --branch production --message "what changed"
  ```
  **This now happens automatically.** `.github/workflows/mobile-ota-update.yml`
  runs `eas update` on every push to `main` that touches `mobile/**` — no
  manual step for the common case. One-time setup: add an `EXPO_TOKEN`
  repo secret (Expo dashboard → account settings → Access Tokens → create
  one → GitHub repo → Settings → Secrets and variables → Actions). Until
  that secret exists the workflow just fails harmlessly; nothing else is
  affected.
- **Native changes still require a full build**: adding/removing a native
  module, changing `app.json` native config or icons, or bumping the Expo
  SDK. Bumping `version` in `app.json` changes the runtime version, which
  cuts existing installs off from newer OTA updates until they install
  the new APK — bump it exactly when you *do* cut a new build, not before.
  **This is now automatic too**: `.github/workflows/mobile-build-release.yml`
  runs on every push to `main` that touches `mobile/app.json`,
  `mobile/eas.json`, `mobile/package.json`, or `mobile/package-lock.json`
  — it builds the APK, publishes it as a new GitHub Release, and updates
  the homepage's download link, all with the same `EXPO_TOKEN` secret as
  the OTA workflow above. The one thing that still can't be automated:
  installing the new APK on a phone — Android has no silent self-update
  path for a sideloaded app outside the Play Store, so that's still a
  manual tap-the-link-and-reinstall step once per device, same as any
  update to a non-Store Android app.
- The **first APK that contains expo-updates must itself be a new build**
  — OTA can't reach APKs built before this config existed (that includes
  the current v1.0.0 installs).
- Rollback: `eas update:republish` an earlier update group from expo.dev
  or the CLI if a bad update ships.

## Cutting a new Android build

Run this whenever mobile-visible code changes (a new screen, a new
`app.json`/`eas.json` setting) — **not** needed for backend-only changes,
which every installed app already picks up automatically on its next
API call.

**Step 0 (do this before every build, or skip it and every screen in the
app fails with "Could not reach the server"):** confirm `mobile/.env`
exists and points at the deployed site, not the emulator-only default.
`mobile/src/api/client.ts` reads `EXPO_PUBLIC_API_URL` at *build* time and
bakes it into the compiled app — if that file is missing or the variable
is unset, the build silently falls back to `http://10.0.2.2:3000` (only
meaningful on an Android emulator; on a real phone it resolves to
nothing, so login/signup/every API call fails instantly). This bit the
very first production build — see `mobile/.env.example`.

```
cd mobile
echo "EXPO_PUBLIC_API_URL=https://siwes-finder-eight.vercel.app" > .env
eas build --platform android --profile production
```

`.env` is gitignored (same as the web app's), so this step doesn't persist
across machines/clones — it has to be redone once per machine you build
from, not once ever.

This uploads the build to expo.dev and prints a download link when it
finishes (10-20 min). Then, to publish it:

1. Download the `.apk` from that link.
2. On GitHub: go to the repo → Releases → either edit the existing
   `v1.0.0-android` release (delete the old asset, upload the new one) or
   publish a new tag (e.g. `v1.1.0-android`) with the new `.apk` attached.
3. If you used a new tag, update the download link: either set
   `NEXT_PUBLIC_ANDROID_APK_URL` in Vercel's project settings to the new
   asset URL, or ask a session to update the hardcoded fallback in
   `src/app/page.tsx`.

This sandboxed environment can't run `eas` (`api.expo.dev` is unreachable
from here, confirmed by a direct connection test) or upload a Release asset
(no file to upload from and no network path to GitHub's upload endpoint for
binary assets) — both steps are the owner's to run locally.

## One-time account setup (owner to-dos)

| What | Where | Cost | Needed by |
|---|---|---|---|
| Expo account + `eas init` to link a project (writes `extra.eas.projectId` into `app.json`) | expo.dev | Free tier is enough to start | **Phase 2 and 4** — push notifications won't register without it, and it's required to run any EAS build at all |
| Signing keystore | Managed automatically by EAS | — | Phase 4 |
| Amazon Appstore developer account | developer.amazon.com/apps-and-games | Free | Phase 4 (chosen distribution path) |
| Huawei AppGallery developer account | developer.huawei.com | Free | Phase 4 (chosen distribution path) |
| ~~Google Play Console~~ | ~~play.google.com/console~~ | ~~$25 one-time~~ | **Not needed** — skipped per the owner's decision above |
| (Later, iOS) Apple Developer | developer.apple.com | $99/year | Phase 4+ |

## Conventions for sessions working on mobile

- Read `PROJECT_SCOPE.md` first (product/API truth), then this file
  (mobile plan + status). `PROGRESS.md` shows what landed recently.
- Every mobile PR: tick the phase checklist above, keep
  `PROJECT_SCOPE.md`'s mobile section accurate, and meet the same bar as
  the web app — typecheck, lint, and tests must pass in CI.
- Backend changes for mobile live in `src/` and get route tests like every
  other API change. Never fork backend logic into the app.
