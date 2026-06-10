# AGENTS.md

## Cursor Cloud specific instructions

### Product

West Coast Cleaners **Facebook Ad Engine** — a TanStack Start (React SSR) web app for generating Facebook group ads. Auth and backend run on a **hosted Supabase** project (not local Docker).

### Services

| Service | Required locally? | Notes |
|---------|-------------------|-------|
| Vite dev server (`npm run dev`) | Yes | Default URL: `http://localhost:8080` (Lovable sandbox config; not 5173) |
| Hosted Supabase | Yes (remote) | Auth, Postgres, Storage, Edge Functions — configured via `.env` |
| Supabase Edge Functions | Remote only | `generate-ads`, `save-ad-edit` — deployed to hosted project |
| Google Gemini API | Remote only | Secret on Supabase (`GEMINI_API_KEY`) |

There is no `docker-compose`, no local Supabase stack, and no automated test suite in this repo.

### Commands

See `package.json` scripts:

- **Install:** `npm install` (use npm; `bun` is not available in Cloud Agent VMs)
- **Dev:** `npm run dev` → `http://localhost:8080`
- **Lint:** `npm run lint` (may report pre-existing Prettier/formatting issues)
- **Build:** `npm run build`
- **Preview:** `npm run preview` (after build)

### Environment variables

`.env` is committed with Supabase client keys (`VITE_SUPABASE_*`, `SUPABASE_*`). Edge-function secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) live in the Supabase dashboard, not in the repo.

### Auth and E2E testing

- Sign-in is **Google OAuth** via Supabase; only allow-listed emails in `src/lib/auth.ts` can use the app.
- Full ad generation calls the remote `generate-ads` edge function and requires a valid Supabase session.
- If the Supabase project hostname does not resolve (`NXDOMAIN`) or OAuth redirect fails, the **frontend still runs** — verify the login screen at `/` loads. Complete OAuth requires network access to the live Supabase project and an approved Google account.

### Dev server startup

Run in a persistent shell (tmux recommended):

```bash
npm run dev
```

Wait for `Local: http://localhost:8080/` before browser testing.

### Supabase CLI (optional)

Migrations and edge functions live under `supabase/`. Deploy with Supabase CLI against the hosted project (`supabase db push`, `supabase functions deploy`). Not required for frontend-only development.
