# Deploying to Vercel

This repo builds and boots cleanly for production (`npm run build && npm run start`
verified locally). `vercel login` and `vercel link` need an interactive
browser session (or a personal access token) tied to your own Vercel
account, so the steps below are for you to run.

**Current state:** already deployed and live at
https://siwes-finder-eight.vercel.app (project `siwes-finder` under the
`oyebintans-projects` Vercel team). The GitHub repo is connected via
`vercel git connect`, so **pushes to `main` now deploy automatically** —
you generally won't need to run `vercel --prod` by hand anymore. The steps
below are for re-linking from scratch (e.g. a new machine or a fresh
Vercel project) or as a reference for what's already configured.

## 1. One-time setup

```bash
npm install -g vercel   # or use `npx vercel` for every command below
vercel login            # or: export VERCEL_TOKEN=<your token>
vercel link             # run from the repo root; creates/links the Vercel project
                         # non-interactively: vercel link --yes --scope <team> --project <name>
vercel git connect https://github.com/<owner>/<repo>.git   # enables auto-deploy on push to main
```

## 2. Set environment variables

Set these as **Production** env vars (`vercel env add <NAME> production`, or via
the Vercel dashboard → Project → Settings → Environment Variables):

| Variable | Value |
|---|---|
| `MONGODB_URI` | Your MongoDB Atlas connection string. **Must include a database name** in the path, e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/siwes-finder?appName=Cluster0` — a URI with no path segment falls back to Mongoose's default `test` database. |
| `NEXTAUTH_SECRET` | A **fresh** secret, not reused from local dev: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your production URL. Unknown until the first deploy — use the assigned `*.vercel.app` URL (or your custom domain), then redeploy if it changes. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | From Google Cloud Console, if enabling Google sign-in. |
| `ADMIN_EMAILS` | Comma-separated list of emails that should be promoted to admin on sign-in. |
| `BLOB_READ_WRITE_TOKEN` | Auto-injected once a Vercel Blob store is connected to the project (see step 3 below) — don't set this by hand. |

## 3. Before the first deploy actually works

**MongoDB Atlas IP allowlist**: Atlas rejects connections from IPs not on its
Network Access allowlist. Vercel's serverless functions don't have a fixed
IP on the free tier, so add `0.0.0.0/0` ("Allow Access from Anywhere") under
Atlas → Network Access.

**Connect a Vercel Blob store** (required for resume / CAC document uploads):
Vercel's serverless functions have a read-only filesystem outside `/tmp`, and
`/tmp` doesn't persist across invocations, so `src/app/api/upload/route.ts`
cannot write to local disk in production. It already branches to Vercel Blob
storage when `BLOB_READ_WRITE_TOKEN` is present — you just need to connect a
store so Vercel injects that variable:

```bash
vercel blob create-store <name> --access public --environment production
```

Or via the dashboard: Project → Storage → Create Database → Blob. Either way,
redeploy afterward so the function picks up the new env var. Uploaded files
become publicly readable at a `*.public.blob.vercel-storage.com` URL (no extra
CDN/proxy config needed).

## 4. Deploy

```bash
vercel --prod
```

## 5. After the first deploy

- **Google OAuth redirect URI**: if using Google sign-in, add
  `https://<your-domain>/api/auth/callback/google` to the OAuth client's
  Authorized redirect URIs in Google Cloud Console. Sign-in will fail with a
  redirect_uri_mismatch error until this is done.
- **`NEXTAUTH_URL`**: if you didn't know the final domain in step 2, update
  the env var to match and redeploy (`vercel --prod`).
