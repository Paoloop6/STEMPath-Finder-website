# STEMPath Finder

A web application that helps middle-school and high-school students (grades 6–12) find verified STEM opportunities — competitions, summer programs, internships, research programs, and scholarships — through a transparent, rule-based matching system.

## Run & Operate

- `pnpm --filter @workspace/stempathfinder run dev` — run the frontend (port assigned by workflow)
- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Required Secrets

Set these in the Secrets panel before using the admin area or candidate API:

| Secret | Purpose |
|--------|---------|
| `SESSION_SECRET` | Express session signing (already set) |
| `ADMIN_PASSWORD` | Password for admin login at `/admin/login` (username: `admin`) |
| `CANDIDATE_API_TOKEN` | Bearer token for the `POST /api/candidates` research-agent endpoint |

Optional env:
- `ADMIN_USERNAME` — defaults to `admin` if not set

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite + Wouter + shadcn/ui + Tailwind CSS
- API: Express 5 with pino logging + express-session + connect-pg-simple
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec in `lib/api-spec/openapi.yaml`)

## Where things live

| Path | Purpose |
|------|---------|
| `artifacts/stempathfinder/src/pages/public/` | Student-facing pages (Home, MatchForm, Results, OpportunityDetail) |
| `artifacts/stempathfinder/src/pages/admin/` | Admin pages (Login, Dashboard, Opportunities, Candidates) |
| `artifacts/api-server/src/routes/` | Express route files |
| `artifacts/api-server/src/lib/matcher.ts` | Match scoring engine (no AI — pure rule-based, 100 pts) |
| `lib/db/src/schema/opportunities.ts` | Opportunities table schema |
| `lib/db/src/schema/candidates.ts` | Candidate review queue schema |
| `lib/api-spec/openapi.yaml` | Source of truth for all API contracts |

## Architecture decisions

- **No AI for scoring**: Match scores are fully deterministic (fixed 8-category rubric summing to 100). Transparent and auditable.
- **Admin auth**: Simple session-based authentication with `express-session` + `connect-pg-simple`. Credentials stored as Replit Secrets — never hardcoded.
- **Candidates never auto-publish**: The `POST /api/candidates` endpoint (bearer token) saves records to a separate candidates table only. Admin must explicitly approve → verify → publish for any record to appear in student results.
- **Sample data flagged**: All 10 seeded opportunities have `is_sample_data = true` and names prefixed with `[SAMPLE]`. A warning banner appears on detail pages for these records.
- **Session table**: Created automatically by `connect-pg-simple` on first server start (`createTableIfMissing: true`).

## Product

- **Homepage** (`/`) — hero, category showcase, CTA
- **Matching form** (`/match`) — 9-field student profile form
- **Results** (`/results`) — ranked opportunities with score cards and score breakdown tooltip
- **Opportunity detail** (`/opportunities/:id`) — full info, eligibility explanation, requirements checklist, verification badge
- **Admin dashboard** (`/admin`) — stats: total/published/verified opportunities, pending candidates
- **Admin opportunities** (`/admin/opportunities`) — searchable table, publish toggle, edit/delete
- **Admin form** (`/admin/opportunities/new`, `/admin/opportunities/:id/edit`) — full create/edit form
- **Candidate queue** (`/admin/candidates`) — filter by status, review actions
- **Candidate detail** (`/admin/candidates/:id`) — approve/reject/duplicate with notes

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- The frontend stores the student profile in `localStorage` via the `use-profile` hook so the detail page can recompute match scores without requiring the user to re-submit the form.
- After any `lib/api-spec/openapi.yaml` change, always run codegen before using new types.
- `pnpm --filter @workspace/db run push-force` if schema push fails with column conflicts.
- Admin username defaults to `admin`. Set `ADMIN_USERNAME` env var to change it.

## Candidate API (for future research agent)

```
POST /api/candidates
Authorization: Bearer <CANDIDATE_API_TOKEN>
Content-Type: application/json

{
  "candidates": [
    {
      "name": "Program Name",
      "organization": "Org Name",
      "officialUrl": "https://...",
      "summary": "...",
      "category": "Competition",
      "stemField": "Biology",
      "possibleGrades": "9-12",
      "possibleAges": "14-18",
      "location": "Nationwide",
      "format": "remote",
      "possibleCost": "free"
    }
  ]
}
```

- Max 20 candidates per request
- Duplicate detection: checks `officialUrl` against both candidates and opportunities tables
- All submissions land in the candidate review queue — never published automatically

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
