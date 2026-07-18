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
4. Google sign-in ships in v1.4.0 (see "Google sign-in" phase below):
   `expo-auth-session`'s Google provider runs the OAuth code flow on-device
   and hands the app a Google ID token; `POST /api/mobile/google-signin`
   verifies it server-side (`google-auth-library`) and returns the same
   `{ token, user }` shape as credentials login, via a helper
   (`src/lib/googleAuth.ts`) shared with the web's NextAuth callback so
   both paths find-or-create the same account for a given email.
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

- [x] **Fix (2026-07-16, from the first real on-device run):** the
      role-gated tab bar leaked every role's screens into everyone's tab
      bar. expo-router registers *every* file in `(tabs)/` as a route
      whether or not the layout declares it, and undeclared routes still
      get a default tab button (raw filename, no icon) — so conditionally
      *omitting* `<Tabs.Screen>` entries per role never actually hid
      anything. `(tabs)/_layout.tsx` now declares all ten screens
      unconditionally: other roles' screens are removed with
      `<Tabs.Protected guard={...}>` (unroutable, not just hidden), and
      `index` — the `/` anchor login/verify-email land on — stays routable
      for every role but is hidden from non-students, whom `index.tsx`
      redirects to their own dashboard (employer → Applicants, school →
      Overview), mirroring the web's role-scoped dashboards. Same PR:
      safe-area-aware Android tab bar (gesture-nav pill no longer overlaps
      it), status-bar inset on the verify-email banner, and a `shift`
      animation between tab scenes.

**On-device status:** first verified on a physical Android phone
2026-07-16 (v1.0.0-android-ci5) — install, login, and API connectivity
confirmed working; the tab-bar leak above was found and fixed in that run.

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
- [x] **Round 2 (2026-07-17, owner: "make it feel like a real mobile
      app"):** global chrome + feedback layer, all JS-only (OTA-deliverable,
      no new native deps):
      - `components/ui/toast.tsx` — app-wide `ToastProvider`/`useToast()`:
        pill toasts under the status bar with tone icons, success/error
        notification haptics, auto-dismiss, tap to dismiss. Wired into
        bookmark save/unsave (feed + job detail, which previously failed
        *silently*), follow/unfollow, apply-decision + bulk decisions
        (employer), logbook entry logged + entry approved, profile/photo/
        resume saves (replacing the inline success banner).
      - `components/ui/refresh-control.tsx` — `BrandRefreshControl`;
        pull-to-refresh now exists on **all** list/scroll screens (it was
        missing on logbook, both employer tabs, and all three school tabs)
        and is brand-tinted everywhere instead of stock gray.
      - Navigation chrome: detail-screen stack headers restyled (surface
        color, no hairline/shadow, bold title, unlabeled back arrow),
        tab bar floats (no top border, soft shadow), haptic tick on tab
        switch, `expo-status-bar` mounted with `style="auto"`.
      - Safe-area bug fixes: the job screen's Apply bar and the message
        thread's composer sat under the gesture-nav pill on edge-to-edge
        Androids — both now absorb `insets.bottom`.
      - Perf fix: the jobs feed fired a redundant second fetch 350ms after
        every mount (search-debounce effect running on first render).

### Phase 7.5 — v1.2 UI/UX overhaul (2026-07-17, owner-directed)
Owner supplied reference designs (fintech gradient onboarding, glass pill
nav bar, glow-accent stat cards) and asked for a heavy UI/UX-only pass.
All JS-only → OTA-deliverable to v1.0.0-android-ci5 installs; the v1.2.0
version bump + fresh APK is a separate, final PR (runtimeVersion is
appVersion-keyed, so the bump must come last or current installs stop
receiving updates).
- [x] **Manrope brand typeface** app-wide: five weights vendored in
      `mobile/assets/fonts/` (OFL license alongside), loaded via
      `useFonts` with the splash held until ready. `FontFamily` tokens in
      `constants/theme.ts`; every `fontWeight` in the app replaced with an
      exact family (Android has no faux-bold for custom fonts). Type
      scale retuned mobile-first (`title` 48→28, `subtitle` 32→20); the
      hardcoded `#3c87f7` in `linkPrimary` now uses `theme.primary`.
- [x] **Onboarding redesign** (reference 1): always-dark slides with a
      full-bleed per-slide gradient glow, brand row, two-tone headline
      (second line in the slide's accent), elongated progress dots,
      full-width CTA with Skip beneath.
- [x] **Floating glass pill tab bar** (reference 3): icon-only, detached
      from screen edges, translucent surface + shadow, active tab in a
      spring-in filled brand pill (`ui/tab-bar-icon.tsx`), hides when the
      keyboard opens. Screens pad their scroll content via the new
      `useTabBarInset()` so lists scroll underneath the glass.
- [x] **Jobs feed** (reference 2): bottom-edge gradient glow on cards
      matching ≥70%, bookmark moved into a tinted icon-circle, optimistic
      save with a spring pop (rolled back + error toast on failure), and
      a collapsing large-title hero driven by list scroll on the UI
      thread (search + filters stay pinned).
- [x] **UX flows**: re-pressing the active tab scrolls to top on all nine
      tab screens (`useScrollToTop`); load-error banners gained a
      "Try again" action; app-wide offline strip (`ui/offline-banner.tsx`,
      NetInfo) with a "Back online" toast on reconnect; search fields
      gained a clear-× button; every sign-out button now confirms via a
      native dialog (`api/confirmSignOut.ts`); feed empty state offers
      "Clear filters"; profile avatar renders through `expo-image`
      (cached, fade-in); button labels cap font scaling at 1.3× so fixed
      heights never clip.
- [x] **OTA delivery root-cause fix (PR #47):** every `eas update` publish
      since day one targeted the *branch* `production`, but installs
      request updates by *channel* — and the channel was never linked to
      the branch, so no OTA had ever reached a device. The workflow now
      publishes with `--channel production` (creates/repairs the link) and
      prints `eas channel:view` after each publish. Confirmed delivered
      on the owner's phone 2026-07-17.
- [x] v1.2.0 release: `app.json` version bumped 1.0.0 → 1.2.0 (cuts a
      fresh APK via the build workflow so new downloads start current;
      existing installs already have everything via OTA). From this point
      OTA publishes target runtime 1.2.0 — pre-bump installs keep working
      but stop receiving further updates until reinstalled. Same PR
      raised the build workflow's EAS wait cap 40 → 75 minutes (run #4
      timed out on a healthy build stuck in the free-tier queue).
      **Build run #6 succeeded** (APK built, `v1.2.0-android-ci6` GitHub
      Release published) but its last step — auto-committing the
      website's updated download link — lost a `git push` race against
      the unrelated `PROGRESS.md` bot commit landing on `main` at the same
      moment, so the site kept pointing at the old `v1.0.0-android-ci5`
      asset. Fixed by hand with the same one-line `sed` the workflow
      itself runs. The workflow step is otherwise unchanged and will
      likely race again occasionally — worth a follow-up (e.g. `git pull
      --rebase` before the commit, or a retry loop) if it keeps happening.

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
the website — see `PROJECT_SCOPE.md`'s "Email verification".

> **Currently switched OFF server-side** (`REQUIRE_EMAIL_VERIFICATION`
> unset — see `src/lib/emailVerification.ts`): the Resend sandbox sender
> can't deliver codes to real users until a custom domain is verified. No
> mobile code changed for this — the server reports every account as
> `emailVerified: true` while off, so the screen and banners below simply
> never trigger. Everything lights back up when the flag is set.

Mobile side:
- [x] `client.ts` — `verifyEmail`/`resendVerificationEmail`; `emailVerified`
      added to `SessionUser`/`Profile`; `ApiError.code` added so a 403 with
      `code: 'EMAIL_NOT_VERIFIED'` can be branched on (currently just
      surfaced as the message text, same as any other error).
- [x] `AuthContext` gets `refreshUser()` so the banner/gate clears right
      after verifying, without a fresh login.
- [x] New `verify-email.tsx` stack screen — same email→OTP shape as
      `forgot-password.tsx`, plus a resend button and a sign-out escape
      hatch (for a mistyped email or an inbox the user can't reach).
- [x] Signup routes straight to `verify-email.tsx` before the tabs —
      `AuthContext.login()` now returns the fresh `SessionUser` so
      `signup.tsx` can check `emailVerified` immediately post-login (state
      updates from `setUser` aren't readable synchronously) and redirect
      accordingly, instead of going straight into the app.
- [x] `ui/verify-email-banner.tsx` — role-specific copy (student: "to
      apply to placements"; employer: "to post opportunities" — was
      generic copy shown to both, fixed after owner feedback), shown
      above the tab bar for student/employer only (school's screens are
      all read-only, nothing to unlock) when `!user.emailVerified`; a
      second-chance nudge for anyone who signs out of `verify-email.tsx`
      or otherwise ends up back in the app still unverified. Taps through
      to the screen above.
- [ ] This is OTA-eligible (no native code) — publish with `eas update`,
      no new build required for existing installs once this merges.

### Phase 10 — Dashboard, department-aware feed, idle-lock (2026-07-17)
Owner feedback batch spanning both web and mobile (see `PROJECT_SCOPE.md`'s
"Default feed scoping" for the shared backend half). Mobile-specific parts:
- [x] **Student Dashboard landing tab** — new `(tabs)/dashboard.tsx`
      (progress banner, KPI row, quick actions, recommended jobs, recent
      applications — mirrors the web's `/student/dashboard`), now the
      first student tab (title "Home"). The old `(tabs)/index.tsx` job feed
      moved verbatim to a new `(tabs)/browse-jobs.tsx` (second tab, title
      "Jobs"); `index.tsx` itself is now a pure role dispatcher (`/` →
      `/dashboard` for students, unchanged employer/school redirects),
      always hidden from the tab bar (`options: { href: null }`)
      regardless of role, simplifying the old per-role conditional.
- [x] **Post-signup profile-setup wizard** — new `profile-setup.tsx`,
      a 4-step flow (academic details incl. department, SIWES duration,
      skills, preferred location) ported from the web's `/profile-setup`.
      `signup.tsx` and `verify-email.tsx` now route students here after
      signup/verification instead of straight into the tabs (mirrors the
      web; employer/school still go straight in — their onboarding is
      company/institution verification, web-only).
- [x] **Manual light/dark theme override** — `ThemeModeContext` (wraps
      `useColorScheme()`, persisted via AsyncStorage) plus a new
      `settings.tsx` screen (Appearance: System/Light/Dark chips) reachable
      from a gear icon on the Profile/Account hero. `useTheme()` now reads
      from the context instead of the raw system value — every existing
      call site unchanged.
- [x] **Swipe-to-save auto-fires** — `ui/swipe-row.tsx`: a single-action
      row (the Jobs feed's save/unsave swipe) now fires on
      `onSwipeableOpen` and auto-closes, instead of requiring a second tap
      on the revealed button. Multi-action rows (employer accept/reject)
      are unchanged — auto-firing there would be ambiguous.
- [x] **Idle-timeout auto-lock** — `autoLockSettings.ts` (Never/1/5/15/30
      min, chip picker in the same Settings screen) + `useIdleAutoLock`
      (`AppState`-driven). Persisted-timestamp based rather than an
      in-memory timer, specifically so it survives a full OS-level app
      kill: `markBackgrounded()`/`hasAutoLockTimedOut()` are checked both
      on `AppState` resume and on `AuthContext`'s cold-boot token-restore
      effect. **Biometric/PIN quick-unlock was explicitly deferred** — it
      needs `expo-local-authentication` (a new native dependency), which
      would trigger a second concurrent EAS build via
      `mobile-build-release.yml`'s path filter (`mobile/package.json`
      changing) while build run #6 was still in flight; scope for a
      dedicated follow-up PR once native deps are safe to add again.
- [x] **Jobs feed pagination** — `browse-jobs.tsx` now fetches
      `PAGE_SIZE = 12` at a time via `onEndReached` (infinite scroll, with
      a footer spinner) instead of one flat `limit: 30` fetch — the same
      underlying `GET /api/jobs?page=&limit=` the web's numbered
      pagination already used.
- [x] Job cards (feed, detail, dashboard) show a department badge
      (`Ionicons school-outline`) when the job has one; the feed header
      shows a one-line note when the default department/skill scoping is
      active (hidden once the user searches or is viewing Saved).
- [x] Full profile screen and the wizard above both render "Department /
      course of study" as a `Chip` list from `constants/departments.ts`
      (kept in exact sync with the web's `src/lib/departments.ts`) instead
      of a free-text field, so new/edited profiles match the department
      scoping exactly.
- [ ] Not yet verified on a device — same sandbox caveat as every phase.
      **All of the above is OTA-eligible** (no new native dependency, no
      `app.json`/`eas.json` change) — publishes automatically via
      `mobile-ota-update.yml` on merge to `main`, reaching any install
      already on runtime 1.2.0 without a new APK.

### Phase 11 — Visible version/OTA sync + livelier first screens (2026-07-17)
Owner feedback: wanted a way to visually confirm an OTA update actually
landed (without digging into settings), and for the cold-start/onboarding
screens to feel less static. Both OTA-eligible (no native deps):
- [x] **Version + OTA sync indicator** — `(tabs)/_layout.tsx`'s
      `BrandedLoading` (the full-screen logo state shown on every cold
      start while the auth/onboarding flags resolve, before routing
      anywhere) now shows `v{Constants.expoConfig.version}` near the
      bottom of the screen, and — only when this launch is running an
      OTA-fetched update rather than the build's embedded bundle
      (`!Updates.isEmbeddedLaunch`) — `· Synced {date}` from
      `Updates.createdAt`. Read once at module scope (can't change without
      a fresh launch), not on every render.
- [x] **Livelier branded loading** — the same screen's logo now pulses
      inside an expanding/fading "ping" ring (`Easing.out`, looped),
      instead of the pulse alone.
- [x] **Onboarding illustrations** — `ui/onboarding-illustration.tsx`: a
      hand-drawn (react-native-svg primitives, not an external asset —
      keeps this OTA-eligible and avoids attribution/licensing questions
      that come with pulling real Storyset art) flat-design scene per
      slide (student-at-laptop / paper-airplane-and-checklist /
      open-logbook-and-pencil), each floating + subtly rotating on a
      loop, plus an independent re-pulsing accent dot. `onboarding.tsx`
      restructured (brand row pinned top, illustration centered, copy
      anchored bottom) to fit it in.
- [ ] Not yet verified on a device — same caveat as every phase.

### Phase 12 — Biometric/PIN unlock (2026-07-17)
Closes the gap deliberately left open in Phase 10's auto-lock: idle-lock
now offers a fast unlock instead of always requiring the password again.
**New native dependency (`expo-local-authentication`) → requires a fresh
EAS build**, unlike every other phase since Phase 9. `app.json` version
bumped 1.2.0 → 1.3.0 for this build.
- [x] `api/biometricSettings.ts` — `isBiometricHardwareReady()`
      (`hasHardwareAsync` && `isEnrolledAsync`), `getBiometricEnabled`/
      `setBiometricEnabled` (AsyncStorage flag, opt-in, defaults off),
      `authenticateWithBiometrics()` wraps `authenticateAsync` with
      `disableDeviceFallback: false` (the default) so the OS's own
      BiometricPrompt/LocalAuthentication sheet already falls back to
      whatever device credential is enrolled (PIN, pattern, password) when
      Face ID/fingerprint isn't available or fails — "unlock with
      fingerprint or PIN or anyone their phone allows" comes from the
      platform sheet itself, no second bespoke PIN entry screen needed.
- [x] **`AuthContext` gains a `locked` state** (session/token kept,
      distinct from signing out) plus `lock()`/`unlock()`. `useIdleAutoLock`
      now locks instead of logging out when the user has biometric enabled
      AND the device still has a usable credential enrolled; otherwise it
      falls back to the pre-Phase-12 full-logout behavior unchanged. The
      cold-boot check in `AuthContext`'s token-restore effect got the same
      branch, so a full app kill during the locked window boots straight
      into the lock screen (keeping the session) instead of wiping it.
- [x] **`ui/lock-screen.tsx`** — full-screen overlay rendered in
      `app/_layout.tsx` (via a small `LockGate` reading `useAuth().locked`)
      *on top of* the still-mounted Stack rather than replacing it, so
      navigation state under the lock survives the round trip. Auto-prompts
      biometrics on mount; "Use password instead" runs the normal
      `confirmSignOut()` flow into `/login`, same pattern as every other
      sign-out button in the app.
- [x] Settings screen: a "Biometric unlock" section with a native `Switch`,
      shown only when `isBiometricHardwareReady()` is true (a clear
      "not available" card explains why otherwise); turning it on requires
      passing one biometric check first, so a stale/misconfigured
      enrollment can't lock someone out with no way back in. Auto-lock's
      footnote text now reflects whichever mode is active.
- [x] `app.json`: `expo-local-authentication` config plugin added
      (`faceIDPermission` string for a future iOS build; Android needs no
      extra config, its permissions are auto-injected).
- [x] `.github/workflows/mobile-build-release.yml`: the download-link
      auto-commit step now rebases and retries (up to 5x) on a rejected
      push instead of failing outright — this is the exact race that hit
      build run #6 against the `PROGRESS.md` bot's commit (fixed by hand
      that time; this closes it going forward).
- [ ] Not yet verified on a device — same caveat as every phase. **Needs
      the new build this version bump triggers** to reach the owner's
      phone (OTA can't ship a new native module to an already-installed
      APK).

### Google sign-in (v1.4.0)
- [x] "Continue with Google" button (`ui/google-signin-button.tsx`) on both
      `login.tsx` and `signup.tsx`, using `expo-auth-session`'s Google
      provider (`useIdTokenAuthRequest`) — runs the OAuth code flow
      on-device (PKCE, no client secret needed) and exchanges it for a
      Google ID token.
- [x] Backend: `POST /api/mobile/google-signin` verifies the ID token with
      `google-auth-library` against whichever of `GOOGLE_ANDROID_CLIENT_ID`
      / `GOOGLE_IOS_CLIENT_ID` / `GOOGLE_CLIENT_ID` (the existing web
      client, doubling as the Expo Go/dev fallback) the token's `aud`
      matches, then returns the same `{ token, user }` shape as
      `/api/mobile/login`.
- [x] `src/lib/googleAuth.ts`'s `findOrCreateGoogleUser()` is shared
      between this route and the web's NextAuth `signIn` callback
      (`src/lib/auth.ts`) — one place decides whether an email is new,
      existing, or admin-allowlisted, so the two clients can never
      fork into duplicate accounts for the same address.
- [x] Button only renders when a real OAuth client ID is configured for
      the current platform (`isGoogleSignInConfigured()`, same "optional
      provider" pattern as the web's `GoogleProvider`) — an unconfigured
      build just hides it instead of crashing (the underlying hook throws
      on an undefined client ID).
- [x] A brand-new Google sign-in has no role yet (`unassigned`, same as
      the web). `(tabs)/_layout.tsx` redirects that straight to the new
      `role-picker.tsx` (Student/Employer cards, mirrors the web's
      `/onboarding`) instead of the generic "not supported" holding
      screen. `POST /api/auth/role` was retrofitted to `requireSession`
      so it accepts the mobile bearer token, not just the web's cookie.
- [x] **New native dependency (`expo-auth-session`, pulling in
      `expo-crypto`/`expo-application`) → version bump 1.3.0 → 1.4.0**,
      same "needs a fresh native build" rule as biometric unlock above.
- [ ] Not yet verified on a device. **Needs Google OAuth client IDs
      provisioned first** (see "One-time account setup" below) — without
      them the button stays hidden by design, not broken.

### Fintech redesign — Batch A: shared primitives (2026-07-18)
Foundation for the full UI/UX redesign (Claude Design prototypes for
student/employer/school, imported via DesignSync). No screen changes yet.
OTA-eligible (no native dep):
- [x] `theme.ts`: `GradientMood`/`GlowIntensity`/`MotionEnergy` constants
      (shipped as one fixed default — deep/standard/snappy — not exposed
      as Settings; these are aesthetic prototyping knobs, not a functional
      preference).
- [x] `ui/gradient-hero-card.tsx` + `ui/gradient-blob.tsx`: the
      brand-gradient hero pattern (previously duplicated per screen) as
      one reusable component, with an optional drifting glow-blob
      backdrop.
- [x] `ui/bottom-sheet.tsx`: hand-rolled sheet on RN's own `Modal
      animationType="slide"` (no drag-to-dismiss, no new dependency —
      matches the codebase's hand-rolled-over-library bias).
- [x] `hooks/use-animated-counter.ts`: cubic-ease-out count-up hook for
      KPI/stat numbers.

### Fintech redesign — Batch B: PIN-keypad unlock (2026-07-18)
Closes the "PIN quick-unlock was explicitly deferred" gap noted in Phase
12 above, and matches the redesign prototypes' lock screen (which shows a
PIN-keypad mode alongside the biometric one). Uses `expo-crypto`, already
a transitive dependency since Google sign-in — **no new native
dependency, OTA-eligible**:
- [x] `api/pinSettings.ts` — `hasPinSet()`/`setPin()`/`verifyPin()`/
      `clearPin()`; a salted SHA-256 hash (`expo-crypto`'s
      `digestStringAsync`) stored in `expo-secure-store`, mirroring
      `authStorage.ts`'s secret-goes-in-SecureStore convention (distinct
      from `biometricSettings.ts`'s AsyncStorage-for-a-boolean-flag —
      a PIN hash is a secret). `hasQuickUnlockConfigured()` is the shared
      "biometric enabled + hardware ready, OR PIN set" check now used by
      both `AuthContext`'s cold-boot restore and `useIdleAutoLock`, so a
      PIN-only user locks (keeps their session) instead of being logged
      out, exactly like a biometric-only user.
- [x] `ui/pin-keypad.tsx` (new) — `PinDots`/`PinKeypad`, a shared 12-key
      numeric pad + 4-dot progress indicator, used by both the lock
      screen and the new Settings PIN flow.
- [x] `ui/lock-screen.tsx` — now resolves which mode to show from what's
      actually configured (a PIN-only user never sees the OS biometric
      sheet auto-fire); "Use PIN instead"/"Use biometrics instead" toggle
      appears only when both are configured.
- [x] Settings screen: new "Quick-unlock PIN" section — "Set a PIN"/
      "Change PIN" opens a `BottomSheet` with a two-step enter → confirm
      keypad flow; "Remove" clears it with a native confirm dialog (same
      pattern as `confirmSignOut()`). Auto-lock's footnote text now
      reflects biometric-or-PIN, not biometric-only.
- [ ] Not yet verified on a device — same caveat as every phase.
      OTA-eligible: publishes automatically via `mobile-ota-update.yml`.

### Fintech redesign — Batch C: student screens (2026-07-18, scope revised in-flight)
OTA-eligible (no native dep). Applies Batch A's primitives where they add
real value; explicitly skips prototype details that don't map onto real
data or already-good screens (see `groovy-wiggling-dolphin.md`'s Batch C
section for the full reasoning) rather than forcing a 1:1 prototype port:
- [x] **Dashboard** (`(tabs)/dashboard.tsx`) — hero swapped to
      `GradientHeroCard`; the four KPI numbers (applications sent/under
      review/offers/open opportunities) now count up via
      `useAnimatedCounter` instead of snapping in; "Recommended for you"
      is now a horizontally-scrolling carousel instead of a stacked list.
- [x] **Profile** (`(tabs)/profile.tsx`) — identity header hero swapped
      to `GradientHeroCard` (same visual result, one shared component
      instead of duplicated `LinearGradient` markup).
- [x] **Onboarding** (`onboarding.tsx`) — two drifting `GradientBlob`
      accents (top-right, bottom-left, each slide's own accent color)
      layered over the existing full-bleed glow gradient, for the
      prototype's "alive" motion quality without touching the
      already-solid slide/copy/dot-indicator structure.
- [x] **Logbook** (`(tabs)/logbook.tsx`) — the always-open entry form is
      now a compact "Add today's entry" trigger row that opens a
      `BottomSheet` composer (week/hours/day-chips/activity/submit,
      unchanged fields, just relocated). The offline-queue path now also
      toasts immediately (previously only an in-form notice, which would
      have been hidden once the sheet closed); the persistent sync notice
      moved onto the main scroll so it survives the sheet closing.
- [x] `ui/bottom-sheet.tsx` gained a `KeyboardAvoidingView` wrap (same
      `padding`-on-iOS/default-resize-on-Android convention every other
      form screen already uses) — a `Modal` doesn't inherit that
      behavior automatically, and the logbook composer's multiline field
      needed it.
- [ ] **Dropped from the original Batch C scope, on purpose**: a jobs-feed
      bottom-sheet filter panel with a stipend-range slider
      (`Job.stipend` is free text, not numeric — no backend field to
      slide over, and the screen's existing inline Type/Best-match/Saved
      chips already cover every real filter dimension); a restyle pass
      on `login.tsx`/`signup.tsx`/`profile-setup.tsx` (already redesigned
      in the "centered, animated, fintech" pass — re-skinning for
      prototype parity alone wasn't worth the regression risk);
      `applications.tsx` (already a clean list, no gap to close).
- [ ] Not yet verified on a device — same caveat as every phase.

### Fintech redesign — Batch D: Employer Dashboard + employer restyle (2026-07-18)
OTA-eligible (no native dep). Closes the gap flagged in the original
design-brief session (no Employer Dashboard tab — employers landed
straight on Applicants):
- [x] New `(tabs)/employer-dashboard.tsx` — the employer's Home tab:
      `GradientHeroCard` "hiring pipeline" hero, an animated KPI row
      (open postings / total applicants / pending review / acceptance
      rate, all via `useAnimatedCounter`), a "+ Post a job" CTA, and an
      "Awaiting your review" preview of up to 3 pending applications
      (`See all →` routes to Applicants). Open postings and applicant
      stats come from the same `GET /api/jobs`/`GET /api/applications`
      calls the rest of the employer app already uses — no new read
      endpoints needed.
- [x] `(tabs)/_layout.tsx` — employer `Tabs.Protected` guard grew from 2
      routes to 3 (`employer-dashboard`, `employer-applicants`,
      `employer-logbook`); tab bar is now 4 tabs total
      (Home/Applicants/Logbook/Account), matching the student side's
      shape. `(tabs)/index.tsx`'s employer redirect now points at
      `/employer-dashboard` instead of `/employer-applicants`.
- [x] `employer-logbook.tsx` — approved entries now show `ui/approval-
      stamp.tsx` (new): a rotated bordered "APPROVED" stamp that springs
      in via `ZoomIn`, peeking off the card's top-right corner, in place
      of the plain success Badge — the prototype's "stamp" visual.
- [x] `account.tsx` (employer/school shared) — hero swapped to
      `GradientHeroCard`, same treatment `profile.tsx` got in Batch C.
- [x] **New: `post-job.tsx`** — a 3-step wizard (mirrors the web's
      `/employer/post-job` field set and `POST /api/jobs` contract
      exactly; required skills use this app's chip-multi-select
      convention instead of the web's free-text tag input) reachable from
      the dashboard's "+ Post a job" CTA. `api/client.ts` gained
      `createJob()`. This wasn't in the original Batch D scope — the
      prototype's CTA assumed job posting already existed on mobile, but
      it was web-only with no mobile client function at all, so the CTA
      would have had nothing to open.
- [x] **Backend fix riding along, required for the CTA above to work at
      all**: `POST /api/jobs` (`src/app/api/jobs/route.ts`) still used
      `getServerSession(authOptions)` (cookie-only) while its sibling
      `GET /api/jobs` was already retrofitted to `requireSession(req)`
      (cookie *or* mobile bearer token) — `src/lib/mobileAuth.ts`'s own
      comment already assumed this was done ("routes that actually gate
      on this — POST /api/applications, POST /api/jobs — re-check the
      DB"). Fixed to match GET; `__tests__/api/jobs.test.ts`'s 16
      POST-block mocks updated from `getServerSession` to
      `requireSession` accordingly (27/27 tests pass, full root suite
      393/393 pass).
- [ ] `employer-applicants.tsx` deliberately left unrestyled — already
      uses the same Card/Badge/SwipeRow/bulk-select vocabulary as every
      other redesigned list screen in the app, so there was no gap to
      close (same call as Batch C's `applications.tsx`).
- [ ] Not yet verified on a device — same caveat as every phase.

### Fintech redesign — Batch E: school screens (2026-07-18)
OTA-eligible (no native dep). Mostly landed on screens already in decent
shape from earlier phases, so this batch was smaller than A-D:
- [x] `school-overview.tsx` — new `GradientHeroCard` with a placement-rate
      gauge: reused `ui/match-ring.tsx` (previously the job-detail match
      score ring) rather than building a second circular-gauge component,
      extending it with optional `trackColor`/`valueColor` props so it
      reads in white on the gradient instead of its default theme colors.
      The KPI grid's values now count up via `useAnimatedCounter` (same
      primitive as Batches C/D), and the department-breakdown bars grow
      from 0 to their placement rate on mount (new local `DeptBar`
      helper, same shared-value + `withTiming` pattern `MatchRing` itself
      uses) instead of snapping straight to their final width.
- [x] `school-students.tsx` — added a small colored "status dot" on each
      student's avatar corner (green/placed, amber/applying, gray/not
      applied) as a quick-glance layer *alongside* the existing status
      Badge, not a replacement.
- [ ] `school-logbooks.tsx`'s status filter chips (All/Approved/Pending)
      and `school/students/[id].tsx`'s Card/Badge drill-in already
      existed from an earlier phase and already matched the redesign's
      vocabulary — no changes needed, no gap to close.
- [ ] Not yet verified on a device — same caveat as every phase.

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

**The API URL is baked in by `mobile/eas.json`'s production profile
`env`, NOT by a `.env` file.** History, because this failure mode is
sneaky: `mobile/src/api/client.ts` reads `EXPO_PUBLIC_API_URL` at *build*
time; if it's unset the build silently falls back to `http://10.0.2.2:3000`
(emulator-only — on a real phone every API call fails with "Could not
reach the server"). The old advice was "write `mobile/.env` before
building" — **that never worked for cloud builds**: `eas build` uploads
the project to EAS's build servers respecting `.gitignore`, and the root
`.gitignore` excludes `.env*`, so the file never reached the build
machine. Every EAS-compiled APK shipped broken until the URL moved into
`eas.json` (committed → always uploaded). A release build that somehow
still ends up on the fallback now shows an explicit "this app version was
built without a server address" error instead of the misleading
connection message.

`.env` still matters for anything bundled *locally*: `expo start` in dev,
and `eas update` in the OTA workflow (which runs Metro in CI, where the
workflow writes `.env` first).

```
cd mobile
eas build --platform android --profile production
```

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
| Google OAuth client IDs for mobile (Android now, iOS later) — an "Android" OAuth client (package `com.siwesfinder.app`, signed with the SHA-1 from `eas credentials`) and, later, an "iOS" one | Google Cloud Console → APIs & Services → Credentials (same project as the existing web `GOOGLE_CLIENT_ID`) | Free | Google sign-in phase above — the button just stays hidden until these exist. Set `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`/`EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in `mobile/eas.json`'s production `env` (build-time) and the matching `GOOGLE_ANDROID_CLIENT_ID`/`GOOGLE_IOS_CLIENT_ID` in Vercel (server-side verification) — see `mobile/.env.example`. |

## Conventions for sessions working on mobile

- Read `PROJECT_SCOPE.md` first (product/API truth), then this file
  (mobile plan + status). `PROGRESS.md` shows what landed recently.
- Every mobile PR: tick the phase checklist above, keep
  `PROJECT_SCOPE.md`'s mobile section accurate, and meet the same bar as
  the web app — typecheck, lint, and tests must pass in CI.
- Backend changes for mobile live in `src/` and get route tests like every
  other API change. Never fork backend logic into the app.
