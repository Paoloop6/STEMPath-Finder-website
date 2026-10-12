# NextStep Database · STEMPath Finder

NextStep Database helps students in grades 6–12 find STEM programs they can actually apply to by browsing opportunities and comparing them with their grade, interests, location, format and budget.

**Live site:** [https://www.nextstepdatabase.fyi/](https://www.nextstepdatabase.fyi/)

The project is called **STEMPath Finder** in the Congressional App Challenge video and in older source paths. This repository contains the website, server, schemas and opportunity-discovery code. The submission version integrates the preserved public-site branch, including `GET /api/student-videos`, while retaining the newer Lambda discovery code. See [submission checks](docs/submission-checks.md).

## Related code

- [Native iPhone app — Paoloop6/nextstepdatabase](https://github.com/Paoloop6/nextstepdatabase)
- [Website, API and jobs — this repository](https://github.com/Paoloop6/STEMPath-Finder-website)

## Architecture

```text
SwiftUI iPhone app ─┐
                   ├─ HTTPS server API (Node.js + Express) ─┬─ DynamoDB
React/Vite website ┘                                       ├─ S3 archives
                                                           └─ PostgreSQL
Opportunity discovery: AWS Lambda + Exa + DeepSeek ─────────> DynamoDB + S3
Student-video ingestion: separate daily Mac job
                       + YouTube Data API + DeepSeek ──────> DynamoDB + S3
```

The API normalizes DynamoDB opportunities, filters visibility/eligibility fields, and serves browsing and matching routes. PostgreSQL holds legacy opportunity/candidate tables and Express sessions. S3 holds raw/extracted ingestion artifacts outside Git. The Lambda searches with Exa, crawls sources, extracts structured fields with DeepSeek and deduplicates records. New discoveries are pending and unpublished. Admin status fields and controls exist, but their existence does not prove human review took place. Deadline checks/filtering exist; no deadline-notification feature is claimed.

The YouTube code is a separate daily pipeline, not a component of the Lambda handler. The [student-video API route](artifacts/api-server/src/routes/student-videos.ts) is mounted on `main` at `GET /api/student-videos`. Its source was recovered from the local project without outputs or transcripts. Supabase edge-function source is also retained as a separate implementation; the Express app does not invoke it. The OpenAPI specification covers the original API and does not fully describe the newer DynamoDB or Student Stories routes; see the route source for their response shapes.

## Folder structure

| Path | Contents |
|---|---|
| `artifacts/stempathfinder/` | React/TypeScript website, Vite configuration, static assets and prerender build |
| `artifacts/api-server/` | Express API, route handlers, authentication and build scripts |
| `server/README.md` | Direct links to the existing API, validation and deployment source |
| `artifacts/lambda-opportunities/` | AWS Lambda handler, crawler, discovery/frontier/deadline logic and tests |
| `nightly-job/` | Job guide and recovered YouTube pipeline source |
| `lib/aws/` | DynamoDB/S3 helpers |
| `lib/db/` | PostgreSQL Drizzle schema and setup configuration |
| `lib/api-spec/`, `lib/api-zod/`, `lib/api-client-react/` | OpenAPI source, generated validators and React API client |
| `database/` | Empty AWS storage template and database setup guide |
| `api/index.mjs`, `vercel.json` | Vercel API entry and deployment routing; `_app.mjs` is generated during build |
| `supabase/` | Separate Deno edge functions, shared ranking and incremental migrations |
| `scripts/` | Maintenance tools and local submission build helpers |
| `data/sample-opportunities.json` | Ten fictional examples in the real DynamoDB format, pending/unpublished |
| `artifacts/mockup-sandbox/` | Existing UI prototyping workspace |

Existing runtime folders are preserved to keep import, workspace and deployment paths working. No production database contents, opportunity catalog, transcripts, downloaded pages, API credentials or dependency directories are supplied in the current source tree.

## Run locally

Use Node.js 24+ and pnpm 11.18.0 (the workspace package manager).

```sh
npm install -g pnpm@11.18.0
cp .env.example .env
npm install
npm run build
npm run start:example
```

`npm install` delegates workspace installation to pnpm. The normal build needs the public live API for prerendering but no private keys. `npm run build:sample` uses ten fictional examples through a temporary local API instead; do not deploy that sample output. `npm run start:example` generates a temporary session secret and starts the API; `/api/healthz` works without keys, while data routes need configured services. `npm run dev:website` starts Vite on port 5173.

See [local development](docs/local-development.md) for configuration, the full environment-variable table, database setup and iPhone build instructions. The template has blank values for all app-specific variables and standard AWS credential options. Never put private secrets in a `VITE_` variable.

## Outside libraries, tools, APIs and services

The complete direct package inventory, with each package's role, is in [dependencies and services](docs/dependencies.md). Exact dependency versions and transitive packages are recorded in `pnpm-lock.yaml`.

- React, TypeScript, Vite, Tailwind CSS, Radix UI, shadcn-style components, Wouter and TanStack Query provide the website UI, routing and client data access.
- Node.js, Express, Zod, Drizzle, node-postgres, session middleware and Pino provide the API, validation, SQL access, sessions and logging.
- AWS Lambda runs opportunity discovery; the AWS SDK accesses DynamoDB and S3. Exa finds sources; DeepSeek extracts fields and supplies AI matching explanations.
- YouTube Data API v3 provides video search/metadata; the separate video pipeline attempts public caption retrieval and uses DeepSeek for extraction. Stored results are not included.
- Vercel hosts the website/API and provides the analytics package. Supabase/Deno source represents a separate edge-function implementation.
- Swift, SwiftUI, Foundation/URLSession, MapKit, Core Location and WebKit support the iPhone client; it has no third-party package dependencies.
- pnpm/npm, esbuild, Orval, Drizzle Kit, Node's test runner, Xcode, Git/GitHub, Replit development tooling and Prettier support development and builds. See the inventory for unused/optional scaffold dependencies as well as active ones.

## Submission and secret checks

See [submission checks](docs/submission-checks.md) and the [redacted security review](docs/security-review.md) for the exact checks and remaining actions. History was scanned without rewriting commits or force-pushing. Deleting a file from the current tree does not remove it from historical commits.

## AI use

- **In the app**: the Match feature uses DeepSeek on the server to analyze opportunities and explain each match.
- **In development**: we used Claude (Anthropic) to help develop the app's UI (user interface) and to edit our demo video.
