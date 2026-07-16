# Website Defacement Detection & Vulnerability Assessment Platform

Monitors registered website URLs for content changes, classifies changes as **benign vs. likely-defacement** using an LLM, and raises alerts with an explainable risk score.

**Domain:** Cyber Security & Web Mining (PS-005)

**Live app:** https://siege-app-pvmc.vercel.app/dashboard
**Repo:** https://github.com/venkatpavan8806/siege-app

---

## Stack

- **Next.js 14** (App Router) — single deployable, no separate backend
- **PostgreSQL + Prisma**
- **Sessions:** signed httpOnly cookies ([jose](https://github.com/panva/jose)), passwords hashed with bcrypt

---

## Setup

```bash
npm install
cp .env.example .env      # fill in DATABASE_URL, SESSION_SECRET, ANTHROPIC_API_KEY
npx prisma migrate dev --name init
npm run dev
```

Seed at least one `ADMIN` user manually (no public signup route ships in this build — see [Known Limitations](#known-limitations)) before logging in.

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string used by Prisma for all app data (users, assets, alerts, audit log) |
| `SESSION_SECRET` | Signing secret for httpOnly session cookies |
| `ANTHROPIC_API_KEY` | Server-side-only key used to call the Anthropic API for defacement risk classification (see below) |

All credentials are read from server-side environment variables at deployment time. There is no in-app UI to view, change, or swap credentials — this is intentional, not an oversight.

---

## AI / BYOK Disclosure

Risk classification (`lib/llm-risk-scoring.ts`) calls the **Anthropic API** directly using our own API key, model `claude-sonnet-4-6`. The key is read from `ANTHROPIC_API_KEY` and used **server-side only** — it is never sent to the client, exposed in any API response, or logged. No mocked or rule-based logic stands in for this feature; every classification is a real model call.

---

## Architecture notes

- **Auth & sessions:** `lib/auth.ts`
- **Authorization:** `lib/rbac.ts` — every API route calls `requireAuth()` or `requireRole()` as its first line. Ownership checks (e.g. "does this ANALYST own this Asset") are done per-route by comparing the session's `userId` against the resource's owner field, never by trusting a client-supplied id.
- **SSRF protection:** `lib/ssrf-guard.ts` — all outbound fetches to user-supplied asset URLs go through `safeFetch()`, which blocks private/reserved IP ranges (including cloud metadata `169.254.169.254`), re-validates DNS on every redirect hop (blocks DNS-rebinding), and caps response size/time.
- **Stored content handling:** fetched HTML is stripped to plain text before storage (`stripToText()` in the check route) and is never rendered as live HTML in the dashboard — this avoids stored XSS via a defaced/malicious target page.
- **Prompt-injection handling:** untrusted fetched content is wrapped in explicit delimiter tags with a system prompt instructing the model to treat it as inert data, never as instructions. Model output is parsed as strict JSON; severity is derived server-side from the numeric score, not taken from free-text model output. Parse/range failures fail closed into a "needs manual review" alert rather than silently skipping.
- **Audit log:** `lib/audit.ts` — append-only by design, no update/delete path exists in the module.
- **Secrets handling:** no API route returns environment variables, stack traces, or raw error objects in responses. Credentials live only in server-side env vars, never in client bundles or database rows.

---

## Known limitations

*(honest, so this doesn't become an SL-3 documentation issue)*

- No public user signup route — users must be seeded directly via Prisma Studio or a seed script. Only `ADMIN`/`ANALYST` roles exist.
- Asset checks are triggered manually via `POST /api/assets/:id/check`, not on an automatic schedule/cron in this build.
- `stripToText()` is a conservative tag-stripper, not a full HTML sanitizer library — sufficient to prevent stored XSS for this build's rendering path, but not a general-purpose sanitizer if the content is ever rendered as HTML elsewhere.
- No rate limiting on `/api/assets/:id/check` yet — a target worth adding during the Live Game Window if abuse shows up.
- No user-facing way to change API keys or database connections — these are deployment-level environment variables, not app features.


Attacking Instructions — Website Defacement Detection & Vulnerability Assessment Platform

Test account
Role:     ANALYST
Email:    tryitout@example.com
Password: tryitout
Log in at /login (or wherever your login route is) with these credentials to get an authenticated starting point.
What this account can do

View assets and alerts it owns
Trigger a manual check on its own assets (POST /api/assets/:id/check)
Acknowledge alerts on its own assets
❌ Cannot resolve alerts — that's restricted to ADMIN only
❌ Cannot access other users' assets/alerts through normal (intended) use

Where to look

lib/rbac.ts — role + auth checks, called first in every API route
lib/ssrf-guard.ts — outbound fetch protections for user-supplied URLs
lib/llm-risk-scoring.ts — LLM-based defacement classification (Anthropic API, server-side only)
app/api/alerts/[id]/route.ts — alert acknowledge/resolve logic (ownership + role-gated)
app/api/assets/** — asset creation/check endpoints
Full architecture notes and known limitations are in the repo's README.md

What's in scope

The live deployed application above
Everything reachable through the ANALYST account, and anything reachable without authentication
Attempting privilege escalation from ANALYST to ADMIN-level actions
Attempting to access or modify resources owned by other users (IDOR-style testing)
Prompt-injection attempts against the defacement classifier (e.g. via a registered asset URL whose content tries to influence the model's output)
Standard web vulnerability classes: auth bypass, session handling, input validation, XSS, SSRF, rate limiting, information disclosure, etc.

What's out of scope

**Our actual server infrastructure/credentials (API keys, DB connection strings) — these are not something you need; if you find a path that leaks them, that's a valid finding to report, not something to use further**
