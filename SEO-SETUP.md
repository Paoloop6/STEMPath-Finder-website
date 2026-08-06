# SEO Setup & Google Search Console Guide

This document covers what was implemented for site-wide SEO and the manual
steps needed after deployment.

## What's implemented

- **Global SEO system** — `artifacts/stempathfinder/src/components/Seo.tsx`
  manages title, meta description, canonical URL, robots, Open Graph, Twitter
  cards, and JSON-LD per route. Defaults live in `src/lib/seo.ts`.
- **Permanent opportunity URLs** — every opportunity has an indexable page at
  `/opportunities/{title-slug}-{id}` (old `/opportunities/{id}` URLs still
  resolve). Pages show all researched fields, status (Open / Upcoming /
  Closed / Deadline passed), "Last verified" dates, breadcrumbs, similar
  opportunities, and related category links. JobPosting structured data is
  emitted only for open internships.
- **Category / location / grade pages** — config-driven in
  `src/lib/browse-pages.ts` (e.g. `/summer-internships`, `/locations/houston`,
  `/opportunities-for-11th-graders`), each with unique title, description, H1,
  intro, listings, and related links.
- **Guides** — `/guides/*`, content in `src/lib/guides.ts`.
- **Sitemaps** — two, both advertised in `robots.txt`:
  - `/sitemap.xml` — a real static file at
    `artifacts/stempathfinder/public/sitemap.xml` listing the homepage and the
    34 published public pages. Contains no admin, API, auth or noindex URLs.
    Keep it in sync with `BROWSE_PAGES` (`src/lib/browse-pages.ts`), `GUIDES`
    (`src/lib/guides.ts`), and `STATIC_PATHS` in
    `artifacts/api-server/src/routes/sitemap.ts`.
  - `/api/sitemap.xml` — dynamic
    (`artifacts/api-server/src/routes/sitemap.ts`): static pages + all active
    opportunity slugs with last-modified dates. Expired/unpublished records are
    excluded automatically.

  `sitemap.xml` and `robots.txt` are static files, so they return their real
  contents instead of falling through the SPA rewrite to `index.html`; the SPA
  rewrite in `vercel.json` excludes `robots.txt` and `sitemap` for the same
  reason.
- **robots.txt** — allows public crawling, blocks `/admin`, `/account`,
  `/login`, `/match`, `/results` and `/api/` (except the sitemap), and points
  to both sitemaps.
- **noindex** on session/duplicate pages: `/find` results are not
  URL-addressable; `/match`, `/results`, `/docs` (placeholder), 404, and all
  admin pages are noindex.
- **Favicon** — the atom logo at `public/favicon.png`, `favicon-32.png`,
  `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`.

## Manual steps after deploy

### 1. Confirm the production domain

- The live domain is `https://www.nextstepdatabase.fyi`. It is hardcoded in
  `artifacts/stempathfinder/public/robots.txt`, `sitemap.xml`, and
  `sitemap-pages.xml`. If the domain changes, update all three.
- Optionally set `SITE_URL=https://yourdomain.com` for the API server so
  sitemap URLs are pinned (otherwise it derives them from request headers),
  and `VITE_SITE_URL` at frontend build time to pin canonical URLs
  (otherwise the browser origin is used, which is usually correct).

### 2. Verify the domain in Google Search Console

1. Go to https://search.google.com/search-console and add a property.
2. Prefer a **Domain** property (verify via DNS TXT record at your registrar);
   a **URL prefix** property with the HTML-tag method also works — the meta
   tag would go in `artifacts/stempathfinder/index.html`.
3. Wait for verification (DNS can take a few hours).

### 3. Submit the sitemap

1. In Search Console: **Sitemaps** → enter `sitemap.xml` → Submit. The index
   pulls in both children, so there is nothing else to submit.
2. Status should become "Success" with discovered URLs. Re-check after the
   daily Lambda adds records — the sitemap updates automatically.

### 4. Inspect and request indexing

1. **URL Inspection** (top bar) → paste an opportunity URL, e.g.
   `https://yourdomain.com/opportunities/nasa-high-school-internship-1234`.
2. Review "Page is not indexed" reasons if any (crawl, robots, canonical).
3. Click **Request Indexing** for key pages (homepage, top categories, a few
   opportunities). Google limits requests per day — prioritize.

### 5. Monitor

- **Performance** report: queries, clicks, impressions, average position.
  Expect meaningful data after 2–4 weeks.
- **Indexing → Pages**: which URLs are indexed and why others aren't
  (e.g. "Crawled – currently not indexed" is normal early on).
- **Enhancements / Job postings**: validity of JobPosting structured data.

### 6. Test structured data

- https://search.google.com/test/rich-results — paste an open-internship
  opportunity URL; expect BreadcrumbList (+ JobPosting when open).
- https://validator.schema.org for the raw JSON-LD.

## Notes and caveats

- The site is a client-rendered SPA. Googlebot renders JavaScript, so per-page
  titles/descriptions/JSON-LD are picked up, but rendering-queue delays mean
  indexing can be slower than a server-rendered site. If indexing coverage
  becomes a problem later, consider prerendering or SSR for the public pages.
- Nothing here guarantees rankings or that Google will display the exact
  title/description; it makes every important page technically indexable and
  clearly organized.
