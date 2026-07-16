# Website Defacement Detection & Vulnerability Assessment Platform

Monitors registered website URLs for content changes, classifies changes as
benign vs. likely-defacement using an LLM, and raises alerts with an
explainable risk score.

**Domain:** Cyber Security & Web Mining (PS-005)


## Stack

- Next.js 14 (App Router) — single deployable, no separate backend
- PostgreSQL + Prisma
- Sessions: signed httpOnly cookies (jose), passwords hashed with bcrypt

## Setup

```bash
npm install
cp .env.example .env 
npx prisma migrate dev --name init
npm run dev
```

Seed at least one ADMIN user manually (no public signup route ships in this
build — see Known Limitations) before logging in.

## Architecture notes

- **Auth & sessions**: `lib/auth.ts`
- **Authorization**: `lib/rbac.ts` — every API route calls `requireAuth()` or
  `requireRole()` as its first line. Ownership checks (e.g. "does this
  ANALYST own this Asset") are done per-route by comparing the session's
  `userId` against the resource's owner field, never by trusting a client-
  supplied id.
- **SSRF protection**: `lib/ssrf-guard.ts` — all outbound fetches to
  user-supplied asset URLs go through `safeFetch()`, which blocks private/
  reserved IP ranges (including cloud metadata `169.254.169.254`), re-
  validates DNS on every redirect hop (blocks DNS-rebinding), and caps
  response size/time.
- **Stored content handling**: fetched HTML is stripped to plain text before
  storage (`stripToText()` in the check route) and is never rendered as
  live HTML in the dashboard — this avoids stored XSS via a
  defaced/malicious target page.
- **Prompt-injection handling**: untrusted fetched content is wrapped in
  explicit delimiter tags with a system prompt instructing the model to
  treat it as inert data, never as instructions. Model output is parsed as
  strict JSON; severity is derived server-side from the numeric score, not
  taken from free-text model output. Parse/range failures fail closed into
  a "needs manual review" alert rather than silently skipping.
- **Audit log**: `lib/audit.ts` — append-only by design, no update/delete
  path exists in the module.

## Known limitations (honest, so this doesn't become an SL-3 documentation
issue)

- No public user signup route — users must be seeded directly via Prisma
  Studio or a seed script. Only ADMIN/ANALYST roles exist.
- Asset checks are triggered manually via `POST /api/assets/:id/check`, not
  on an automatic schedule/cron in this build.
- `stripToText()` is a conservative tag-stripper, not a full HTML sanitizer
  library — sufficient to prevent stored XSS for this build's rendering
  path, but not a general-purpose sanitizer if the content is ever rendered
  as HTML elsewhere.
- No rate limiting on `/api/assets/:id/check` yet — a target worth adding
  during the Live Game Window if abuse shows up.
