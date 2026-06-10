# AGENTS.md

## Cursor Cloud specific instructions

### Product

West Coast Cleaners **Facebook Ad Engine** — a TanStack Start + React SPA for generating Facebook group ads. Backend is hosted Supabase (Auth, Postgres, Storage, Edge Functions). Production targets Cloudflare Workers.

### Services

| Service | Required | Start command | URL |
|---------|----------|---------------|-----|
| Frontend dev server | Yes | `npm run dev` | `http://localhost:5173` |
| Supabase (hosted) | Yes | Remote — no local start in repo | `https://azwpkwhodnkeezqksuvz.supabase.co` |
| Edge Functions (`generate-ads`, `save-ad-edit`) | Yes for ad generation | Deployed on Supabase | `/functions/v1/*` on project URL |

There is no `docker-compose`, local Supabase stack, or test script in this repo.

### Environment

Copy or use the committed `.env` in the repo root. Required variables:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (client)
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` (SSR fallback)

Edge Function secrets (`GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, etc.) are configured in the Supabase dashboard, not in `.env`.

### Common commands

See `package.json` scripts:

- **Dev:** `npm run dev` (Vite + TanStack Start SSR; add `-- --host 0.0.0.0 --port 5173` when binding externally)
- **Lint:** `npm run lint` (ESLint + Prettier; may report pre-existing formatting issues)
- **Build:** `npm run build`
- **Preview:** `npm run preview`

Use **npm** (Node 22+). The repo has `bun.lock` from Lovable but Bun is not required.

### Auth and E2E testing

Sign-in uses **Google OAuth** via Supabase. Access is restricted to emails in `src/lib/auth.ts` (`ALLOWED_EMAILS`). Full ad generation requires:

1. An allowlisted Google account signed in
2. Network access to the hosted Supabase project and Gemini API
3. Deployed edge functions with secrets set

Without auth, you can still verify the dev server and sign-in UI at `/`.

### Gotchas

- **No README** in repo — this file and `package.json` are the primary setup references.
- **Lint** may fail on Prettier formatting in several files; this is pre-existing and does not block `npm run build`.
- **Built-in ad images** under `public/ad-images/` may be missing locally; the UI still runs but some image paths may 404 until assets are added.
- **OAuth redirect URLs** in Supabase must include `http://localhost:5173/` for local dev.
- Cloud Agent VMs may not resolve external Supabase DNS; local UI testing works, but OAuth and edge function calls need outbound network to Supabase/Google.
