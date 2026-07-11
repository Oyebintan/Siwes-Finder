# SIWES Finder — Mobile app

Expo (React Native + TypeScript) client for SIWES Finder. Read
[`/MOBILE_APP.md`](../MOBILE_APP.md) (repo root) first — it has the full
plan, phase checklist, and auth strategy. This app has no backend of its
own; every screen is a client of the existing Next.js `/api/*` routes (see
[`/PROJECT_SCOPE.md`](../PROJECT_SCOPE.md)).

## Get started

```bash
npm install
cp .env.example .env   # set EXPO_PUBLIC_API_URL, see comments in the file
npx expo start
```

Then press `a` for Android, `i` for iOS (macOS only), or `w` for web in the
terminal that opens, or scan the QR code with Expo Go on a physical device.

## Structure

- `src/app/` — screens (file-based routing via expo-router). `login.tsx` /
  `signup.tsx`, `jobs/[id].tsx`, and `school/students/[id].tsx` are
  full-screen stack routes; `(tabs)/` holds the authenticated experience,
  gated by role in `(tabs)/_layout.tsx`: student gets Jobs/Applications/
  Logbook/Profile, employer gets Applicants/Logbook/Account, school gets
  Overview/Students/Logbooks/Account (employer and school share the
  minimal `account.tsx` — full profile editing for those roles stays
  web-only for now).
- `src/api/` — `client.ts` (typed fetch wrapper + bearer auth, one function
  per API route the app calls), `authStorage.ts` (encrypted token storage),
  `AuthContext.tsx` (app-wide auth state), `logbookDrafts.ts` (offline
  logbook entry queue, AsyncStorage-backed), `pushNotifications.ts`
  (Expo push token registration — no-ops without a linked EAS project, see
  `MOBILE_APP.md`)
- `src/components/`, `src/hooks/`, `src/constants/theme.ts` — shared UI
  primitives and the brand palette (ported from the web app's
  `globals.css`)

## Scripts

- `npm start` — Expo dev server
- `npm run lint` — `expo lint` (see `eslint.config.js`)
- `npm run typecheck` — `tsc --noEmit`
