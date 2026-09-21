# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Everybody, in the way an Apple Store site serves everybody (user's framing). The core job belongs to students in grades 6–12 looking for real STEM programs they can apply to; parents, teachers, and counselors use the same site on a student's behalf. No sign-in, no saved session: a visitor arrives from search or a link, browses or answers a short profile, and leaves with a shortlist and real application links.

## Product Purpose

NextStep Database is a researched database of real STEM opportunities for grades 6–12: competitions, research programs, internships, summer camps, scholarships. It exists so a student does not have to piece together the landscape from scattered school emails and forum posts. Success is a student leaving with opportunities they are actually eligible for, with deadlines and application links they can trust.

## Positioning

All three of these are true and confirmed by the user:

- Researched, verified, human-reviewed: every opportunity is discovered by the pipeline, extracted, then reviewed and approved before it is published. Not scraped live, not crowdsourced.
- Transparent rule-based matching, no AI scoring: an 8-category, 100-point deterministic rubric (artifacts/api-server/src/lib/matcher.ts). A student can see why something matched.
- Scale: over 1,200 published opportunities (bulk approval on 2026-09-08), growing with each pipeline run.

The site name is NextStep Database. "STEMPath Finder" remains the name of the matching feature inside it, not the site brand.

## Operating Context

- Visitors come from Google (SEO browse pages like /summer-internships, /locations/houston, /opportunities-for-11th-graders), from school counselors, and from the iOS app which reads the same API.
- Flows: browse the database (/database and SEO browse routes), answer a profile and get matches (/find, legacy /match → /results), read an opportunity detail (/opportunities/:id, permanent slugged URLs with JobPosting JSON-LD), student pathways, guides.
- Admin review queue is a separate, light-themed, lazy-loaded area; candidates never auto-publish.
- Data source: DynamoDB table stempath-data via /api/opportunities. Records are heterogeneous: deadlines, cost, grade levels, and location are often null or free text and must render as unknown, never inferred.

## Capabilities and Constraints

- React 18 + Vite + TypeScript, wouter router, Tailwind v4 (CSS-first theming in src/index.css), shadcn/ui over Radix, framer-motion, sonner, vaul, cmdk available.
- Fonts currently loaded: Bricolage Grotesque, Inter, Instrument Sans (Google Fonts, index.html).
- SEO is a first-class constraint: per-route meta and JSON-LD via src/components/Seo.tsx, two sitemaps, noindex on /match, /results, /docs, admin. Slugged opportunity URLs are permanent.
- Dev: dev.sh runs the API on 8080 and Vite on 5173 with PORT and BASE_PATH required; /api is proxied.
- Redesign scope: homepage first, then roll the world across find, database, detail, pathways, guides, browse pages, and shared layouts.

## Brand Commitments

- Name: NextStep Database. Domain nextstepdatabase.fyi.
- Reference the user pinned: the Apple Store site, as the bar for breadth of audience and craft.
- Assets: atom favicon set (public/favicon*.png, icon-512.png, apple-touch-icon.png); 48 university SVG logos in public/university-logos/. No wordmark file exists.
- Voice in existing copy: plain, direct, honest ("Researched before you arrive", "No sign-in required. This session is not saved.", "I wanted this to exist, so I built it.").

## Evidence on Hand

- Live counts from /api/opportunity-stats (researched opportunities, websites found, last updated), rendered by src/components/home/LiveStats.tsx.
- Real opportunity records with organizations, deadlines, and links; university logos for many of them.
- No testimonials, press, customer logos, or benchmark numbers exist. Do not fabricate any.
- Founder story: built by a student who wanted it to exist.

## Product Principles

1. Truth over polish: unknown fields stay unknown; nothing is inferred or invented.
2. Show the database, don't describe it: the real records are the proof.
3. Explainable matching: every recommendation can say why.
4. Zero friction: no accounts, no saved state, fast on a school Chromebook.
5. Everybody in, expert out: broad, approachable entry; precise, filterable depth.

## Accessibility & Inclusion

Students on school-managed devices and mobile. Keyboard and screen-reader operable, reduced-motion respected, no reliance on color alone for status.
