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
- [ ] Login / signup (credentials; role tabs like the web)
- [ ] Browse + search jobs (reuses `/api/jobs` incl. skill/company search)
- [ ] Job details + apply (platform/email/external methods)
- [ ] Saved jobs (bookmark toggle, saved list)
- [ ] Applications tracker with status
- [ ] Profile: academic details, faculty, skills, avatar + resume upload
      (`/api/upload` accepts multipart already)

**Done when:** a student can go from install → signed in → applied → sees
the application in their tracker, entirely in the app.

### Phase 2 — Logbook + push notifications
- [ ] e-Logbook: write daily entries, week history, approval status
- [ ] Offline drafts (queue locally, sync on reconnect)
- [ ] `expoPushToken` field on User + register-device endpoint
- [ ] Server sends pushes on: application decision, logbook approval
      (hook into the existing routes that flip those states)

### Phase 3 — Employer & School
- [ ] Employer: applicant list, accept/reject, logbook approvals
- [ ] School: overview stats, student directory, logbook feed (read-only)

### Phase 4 — Release (Android)
- [ ] App icon + splash from the existing logomark (`public/logos` blue
      two-circle mark; see `src/app/icon.svg`)
- [ ] EAS build profile (`eas.json`), production Android build (AAB)
- [ ] Play Console: internal testing track → closed → production
- [ ] Store listing: screenshots, description, feature graphic
- [ ] Privacy policy page on the website (Play Store requirement)

## One-time account setup (owner to-dos)

| What | Where | Cost |
|---|---|---|
| Expo account (EAS builds) | expo.dev | Free tier is enough to start |
| Google Play Console | play.google.com/console | $25 one-time |
| Signing keystore | Managed automatically by EAS | — |
| (Later, iOS) Apple Developer | developer.apple.com | $99/year |

## Conventions for sessions working on mobile

- Read `PROJECT_SCOPE.md` first (product/API truth), then this file
  (mobile plan + status). `PROGRESS.md` shows what landed recently.
- Every mobile PR: tick the phase checklist above, keep
  `PROJECT_SCOPE.md`'s mobile section accurate, and meet the same bar as
  the web app — typecheck, lint, and tests must pass in CI.
- Backend changes for mobile live in `src/` and get route tests like every
  other API change. Never fork backend logic into the app.
