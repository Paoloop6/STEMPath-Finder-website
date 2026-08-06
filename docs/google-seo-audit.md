# Google SEO Audit — NextStep Database

**Site:** https://www.nextstepdatabase.fyi
**Repository:** Paoloop6/STEMPath-Finder
**Audit date:** 2026-08-06
**Standard applied:** Google Search Central documentation (Search Essentials, spam
policies, structured data general guidelines, JavaScript SEO basics).

This audit records the state of production **before** the improvement pass. Every
status code, byte count and score below was measured against the live site, not
inferred from source. Findings that were subsequently fixed are marked in
[Remediation status](#remediation-status) at the end.

---

## Executive summary

The site is a pure client-rendered Vite + React SPA served as static files from
Vercel, with a catch-all rewrite sending every unmatched path to `index.html`.
Three consequences dominate this audit and outrank everything else:

1. **Every URL returns byte-identical HTML.** All 35 public routes return the
   same 2,323-byte shell with the same `<title>`, no canonical, and an empty
   `<div id="root">`. Titles, descriptions, canonicals, H1s, body copy and
   JSON-LD are all injected by a `useEffect` after JavaScript executes.
2. **Nothing 404s.** Unknown URLs, misspelled routes and non-existent
   opportunity IDs all return HTTP 200 with that same shell. The entire URL
   space is an infinite soft-404 surface.
3. **Structured data asserts facts that are not on the page.** The `JobPosting`
   block emitted on internship detail pages hardcodes values that were never
   verified from source data.

Content quality is better than the technical layer suggests: the six guide pages
carry 400–800 words of genuinely useful original prose. The problem is that
Google cannot see any of it without rendering, and the 21 browse pages average
only ~25 words of original text each.

---

## 1. Route inventory and status codes

Measured with `curl` against production on 2026-08-06. Every route below
returned **HTTP 200** with a **2,323-byte** body and the identical title
`STEMPath Finder | Summer Internships and STEM Programs for High School
Students`.

### Public routes (35)

| Group | Routes |
|---|---|
| Core | `/`, `/find`, `/database`, `/student-pathways`, `/how`, `/different` |
| Guides | `/guides` + 6 × `/guides/{slug}` |
| Categories | `/summer-internships`, `/high-school-internships`, `/stem-internships`, `/research-programs`, `/computer-science-opportunities`, `/engineering-opportunities`, `/medical-opportunities`, `/robotics-opportunities`, `/science-competitions`, `/volunteer-opportunities`, `/paid-internships`, `/free-summer-programs` |
| Locations | `/locations/houston`, `/locations/texas`, `/locations/remote`, `/locations/united-states` |
| Grades | `/opportunities-for-{9th,10th,11th,12th}-graders`, `/opportunities-for-teens` |
| Detail | `/opportunities/{slug}-{id}` — 88 published records |
| Noindex | `/docs`, `/match`, `/results`, `/admin/*` |

### Status-code findings

| Test URL | Expected | Actual | Verdict |
|---|---|---|---|
| `/this-page-does-not-exist-12345` | 404 | **200** | Soft 404 |
| `/opportunities/totally-fake-999999999` | 404 | **200** | Soft 404 |
| `/stem-path-finder` (did not exist) | 404 | **200** | Soft 404 |
| `/admin`, `/admin/login` | 200 | 200 | OK (robots-disallowed) |
| `/database/` (trailing slash) | 301 → `/database` | **200, no redirect** | Duplicate URL |

**Every non-existent URL is indexable.** The React 404 component sets
`noindex, follow`, but only after JS runs, and it passes no `path` prop — so it
self-canonicalises to the bad URL. Google's guidance is explicit that soft 404s
waste crawl budget and should return a real 404 status.

---

## 2. JavaScript rendering — the dominant issue

```
$ curl -s https://www.nextstepdatabase.fyi/locations/houston | wc -c
2323
$ curl -s https://www.nextstepdatabase.fyi/ | wc -c
2323
```

Identical. The initial HTML contains **no** H1, no body copy, no canonical, and
a title that is wrong for 34 of 35 routes.

Google does render JavaScript, so this is not fatal — but rendering is queued and
deferred, `og:`/`twitter:` tags are read by most social crawlers **without**
rendering, and any per-page signal that exists only post-render is delayed or
missed. Google's JavaScript SEO guidance recommends server-side rendering or
prerendering for content that matters.

**Worst case: `/opportunities/{id}`.** Content requires a *second* round trip to
`GET /api/opportunities/{id}`. During loading the component renders no `<Seo>` at
all, so the document keeps the generic homepage title and has no canonical.

### Content availability by route

| Content source | Routes | In initial HTML? |
|---|---|---|
| Hardcoded in bundle | `/`, `/how`, `/different`, `/guides/*`, browse-page intros | No — but present once the bundle parses |
| Requires API fetch | `/opportunities/{id}`, `/database`, `/student-pathways`, all 21 browse listings | No — needs a second round trip |

---

## 3. Titles and meta descriptions

Titles and descriptions are, in the **rendered** DOM, unique and hand-written per
route — the underlying copy is good. The failure is purely that none of it is in
the served HTML.

**Missing descriptions** (fall back to `DEFAULT_DESCRIPTION`, so five routes
share one string): `/docs`, `/match`, `/results`, 404, `/admin/login`. Four are
noindex, so real impact is limited to `/docs`.

**Missing H1s:** `/how` and `/different` render **no `<h1>` at all**. Both are in
the sitemap and both are primary "about the product" pages.

**Boilerplate description on all 88 opportunity pages:** the second sentence is
identical on every record — *"View eligibility, dates, deadline, requirements,
and the official application link."*

---

## 4. Duplicate and near-duplicate pages

| Pages | Problem |
|---|---|
| `/summer-internships`, `/high-school-internships`, `/stem-internships` | **Share the exact same filter function** (`isInternship`). All three render a byte-identical listing, differing only by 384 / 338 / 221 characters of intro prose. |
| `/opportunities-for-teens` | `filter: () => true` — renders the **entire database**, duplicating `/database`. |
| `/locations/united-states` vs `/locations/remote` | The US filter includes remote records, so the two overlap heavily. |
| `/paid-internships` vs `/summer-internships` | Substantial overlap. |
| `/database/` vs `/database` | Both 200, no redirect, no trailing-slash policy. |
| `/opportunities/anything-you-like-42` | The route only parses the trailing `-{id}`; any slug prefix renders the same record. Unbounded duplicate URL space, controlled only by a JS-injected canonical. |

Three pages sharing one filter and one page duplicating the whole database is
the pattern Google's spam policies describe as doorway pages: multiple similar
pages that funnel to the same result. This is a **real risk**, not a theoretical
one, and is the reason this pass did not add more keyword-variant pages.

---

## 5. Canonical URLs

```js
// src/lib/seo.ts
export function siteOrigin(): string {
  const configured = import.meta.env.VITE_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  if (typeof window !== "undefined") return window.location.origin;
  return "";
}
```

- **`VITE_SITE_URL` is not set** in any env file or in Vercel, so the origin is
  always whatever host the visitor used.
- **No `<link rel="canonical">` exists in `index.html`** — pre-render, there is
  no canonical at all.
- Preview deployments (`*.vercel.app`) therefore self-canonicalise, making every
  preview a competing duplicate of production.
- Trailing-slash normalisation applies only on the fallback branch; pages that
  pass an explicit `path` are correct by luck of hardcoded slash-free strings.

### Domain configuration

| Check | Result |
|---|---|
| `http://www.…` → `https://www.…` | Works, 1 hop |
| `nextstepdatabase.fyi` (apex) | **Does not resolve — NXDOMAIN** |
| Apex → www redirect | **Does not exist** |

The apex domain is registered (Porkbun) and attached to the Vercel account, but
its nameservers are still Porkbun's and there is no A record pointing at Vercel.
Only `www` is wired to the project. This requires registrar DNS access — see
[Actions for the site owner](#actions-for-the-site-owner).

---

## 6. Structured data

| Type | Routes | Assessment |
|---|---|---|
| `WebSite` | `/` | Valid. No `SearchAction` despite the site having search. |
| `Organization` | `/` | `logo` points at `/icon-512.png`, which is **never displayed on the page** (the visible mark is an inline SVG). No `sameAs`, description or contact. |
| `BreadcrumbList` | 21 browse + guides + opportunity pages | **Correct** — mirrors the visible breadcrumb trail exactly. Absent on `/`, `/find`, `/database`, `/how`, `/different`, `/student-pathways`. |
| `WebPage` | `/opportunities/{id}` | Valid; all fields visible. |
| `JobPosting` | `/opportunities/{id}` where type contains "internship" | **Policy risk — see below.** |

### JobPosting is the most serious content-policy finding

Google requires structured data to represent the page's visible content and to
be accurate. This block violates that on four counts:

| Field | Value | Problem |
|---|---|---|
| `employmentType` | `"INTERN"` hardcoded | Never displayed; not derived from any record field |
| `applicantLocationRequirements` | `{Country: "United States"}` hardcoded | **Asserts US-only eligibility for every remote program without any source for it** |
| `datePosted` | `createdAt.slice(0,10)` | This is the date *our crawler discovered the record*, not the date the program posted it |
| `@type` itself | `JobPosting` | Many tagged records are **unpaid** academic/summer programs, not employment |

Marking unpaid educational programs as job postings, with fabricated eligibility
and posting dates, is exactly the "unsupported structured-data claim" category
the brief prohibits and is grounds for a manual action. **Recommendation: remove
`JobPosting` entirely.** `EducationalOccupationalProgram` is the semantically
correct type, but only once the required fields genuinely exist in the data.

---

## 7. Heading hierarchy

| Route | Problem |
|---|---|
| `/how` | **No H1.** Starts at H2. |
| `/different` | **No H1.** Two H2s, no H1. |
| `/database` | H1 → H3 (each row is an H3, no intervening H2) |
| `/find` | H1 → H3 skip |
| `/student-pathways` | Four H2s used as **filter-widget labels**, not content sections |
| `/opportunities/{id}` | A 14px sidebar caption is marked `<h2>` |

No page has multiple H1s.

---

## 8. Thin content

The 21 browse pages render, as original prose, only an eyebrow label, the H1,
and 1–2 intro paragraphs. Everything else is an API-fetched card list and a
related-links block.

**Median original prose: ~168 characters / ~25 words per indexable page.**

| | chars | words |
|---|---|---|
| Thickest — `/summer-internships` | 384 | 52 |
| Median — `/locations/texas` | 162 | 25 |
| Thinnest — `/opportunities-for-11th-graders` | 145 | 22 |

When the API returns no matches, the whole page body is the H1 plus ~25 words
plus one "no listings" sentence — roughly 50 words total, still `index, follow`.
There is **no conditional noindex for empty result sets**, so a location or
grade page with zero matching records is an indexable near-empty page.

By contrast the six `/guides/{slug}` pages carry 400–800 words each and are the
strongest content on the site.

---

## 9. Internal linking

Navigation is in good shape. The TopBar (8 links) and footer (17 links) are real
`<a href>` elements rendered by wouter's `<Link>`, so every browse page is one
click from every other page. Breadcrumbs, related-page blocks, guide links and
opportunity rows are all crawlable.

**Not crawlable (JS-only state, no URL):**

- `/student-pathways` — the entire filter system is `<button onClick>` calling
  `setLocation(..., {replace: true})`. Filter states have no `<a href>` anywhere.
- `/database` — search box and four `<select>` filters are React state with no
  URL representation at all.
- `/results` — reachable only via `history.state`; correctly noindex.

This is defensible: the 21 browse pages are the crawlable substitute for
`/database` facets. Worth stating explicitly rather than treating as a bug.

**Dead links:** `MainLayout` footer has `<a href="#">Privacy Policy</a>` and
`<a href="#">Terms of Service</a>` on `/match`, `/results` and every opportunity
detail page.

**Non-canonical internal link:** `Results.tsx` links to `/opportunities/{bare-id}`
rather than the canonical `/opportunities/{slug}-{id}`.

---

## 10. Images

**The entire application contains exactly one `<img>` tag** —
`UniversityLogo.tsx`, which correctly has alt text, explicit width/height and
`loading="lazy"`. Everything else is an inline lucide SVG (correctly
`aria-hidden` where decorative) or a CSS gradient.

- **No hero image and no purpose-built social image.** `og:image` is
  `/icon-512.png`, a 512×512 square app icon, served with
  `twitter:card=summary_large_image` (a 1.91:1 slot).
- `index.html` sets `og:image` to the **relative** path `/icon-512.png`. Open
  Graph requires absolute URLs; only the JS-injected version is absolute, so
  pre-render scrapers get an invalid value.
- Zero image-search surface across all 34 content pages.

No missing-alt defects were found, because there are essentially no images.

---

## 11. Performance and Core Web Vitals

Lighthouse 12, production URL, headless Chrome, 2026-08-06.

| Category | Mobile | Desktop |
|---|---|---|
| Performance | **79** | 97 |
| Accessibility | **85** | 94 |
| Best Practices | 100 | 100 |
| SEO | 100 | 100 |

| Metric | Mobile | Desktop |
|---|---|---|
| First Contentful Paint | 3.8 s | 1.0 s |
| **Largest Contentful Paint** | **3.9 s** | 1.0 s |
| Total Blocking Time | 90 ms | 0 ms |
| Cumulative Layout Shift | 0.001 | 0.008 |

Mobile LCP of 3.9 s fails Google's "good" threshold (≤2.5 s).

Note that **Lighthouse's SEO score of 100 is misleading** — it checks a single
URL in isolation and cannot detect identical titles across routes, soft 404s, or
doorway-page patterns. It should not be treated as a passing grade here.

### Contributing factors

| Issue | Detail |
|---|---|
| **Single 701 KB JS bundle** (204 KB gzip) | No code splitting. Admin dashboard, forms and charts all ship to every public visitor. |
| Render-blocking fonts | Three Google Fonts families loaded via a blocking `<link>` from an external origin |
| Unused JavaScript | Flagged by Lighthouse |
| `uses-long-cache-ttl` | Static assets served with a short cache policy |
| **`maximum-scale=1` in viewport** | Blocks pinch-zoom — a genuine mobile accessibility defect |
| Colour contrast | Insufficient ratio on some foreground/background pairs |
| Links without discernible name | Hurts both accessibility and anchor-text signals |

---

## 12. Sitemap and robots.txt

Both were rebuilt earlier in this engagement and are in good shape.

- `/sitemap.xml` — static file, 34 published public pages, valid XML, absolute
  `https://www` URLs, no admin/API/auth/noindex URLs.
- `/api/sitemap.xml` — database-driven, 122 URLs (34 static + 88 published
  opportunities). Correctly excludes `invalid`, `rejected` and unpublished
  records, and excludes expired records with a 24-hour grace period.
- `robots.txt` — allows public crawling, disallows `/admin`, `/account`,
  `/login`, `/match`, `/results` and `/api/` (excepting the sitemap), and
  advertises both sitemaps.

**Gaps found:**

- The 34 static URLs are duplicated across both sitemaps (harmless — Google
  dedupes by `loc` — but untidy).
- **No `lastmod` on the static sitemap.**
- `/api/sitemap.xml` emits `lastmod` from `updatedAt ?? lastCheckedAt ??
  createdAt`. `lastCheckedAt` is bumped on *every verification run even when
  nothing changed*, which would report false modification dates. Only `updatedAt`
  ("bumped only when extracted content changed") is a truthful `lastmod`.

---

## 13. Security and data-integrity observations

Outside the SEO brief, but found during the audit and worth recording:

- **`POST /api/admin/login` compares the password with plain `!==` string
  equality** against `process.env.ADMIN_PASSWORD` — no hashing, no
  constant-time comparison, no rate limiting.
- **`cors({ origin: true, credentials: true })`** reflects any `Origin` while
  allowing credentials, paired with a `sameSite: "lax"` session cookie.
- **`toLegacyOpportunity` fabricates values**: `verificationStatus:
  "needs_verification"`, `lastVerifiedDate: null`, `updatedAt: now`. Any UI
  built on those fields would display invented data. This is why the improvement
  pass does **not** add a "last verified" badge to opportunity pages — the field
  does not genuinely exist in the DynamoDB records.

No secrets are present in the client bundle, the repository, or commit history.
`.env`, `.env.local` and `.vercel/` are gitignored and confirmed absent.

---

## 14. Available data fields

What can honestly be displayed on an opportunity page, from
`NormalizedOpportunity`:

**Present:** `title`, `organization`, `opportunityType`, `stemFields`,
`description`, `eligibility`, `gradeLevels`, `location`, `remoteStatus`,
`deadline`, `applicationOpenDate`, `applicationStatus`, `cost`, `compensation`,
`officialUrl`, `applicationUrl`, `experienceLevel`, `timeCommitment`, `minAge`,
`maxAge`, `createdAt`, `updatedAt`, `lastCheckedAt`.

**Absent — must not be displayed or marked up:** a separate `summary`, program
start/end dates, a genuine `lastVerifiedDate`, a `verificationStatus` beyond the
internal `reviewStatus`, and any structured requirements list.

---

## Remediation status

| # | Finding | Severity | Status |
|---|---|---|---|
| 1 | No server-rendered content on any route | Critical | Fixed — build-time prerender |
| 2 | Soft 404s across the entire URL space | Critical | Fixed — 404 catch-all |
| 3 | `JobPosting` with unverifiable hardcoded claims | Critical | Fixed — removed |
| 4 | No canonical in served HTML | High | Fixed — prerendered per route |
| 5 | Identical title on all 35 routes | High | Fixed — prerendered per route |
| 6 | `/stem-path-finder` did not exist | High | Fixed — new page |
| 7 | Three internship pages share one filter | High | Fixed — differentiated + deduped |
| 8 | `/opportunities-for-teens` duplicates `/database` | High | Fixed — noindex |
| 9 | `/how`, `/different` have no H1 | Medium | Fixed |
| 10 | `maximum-scale=1` blocks pinch-zoom | Medium | Fixed |
| 11 | 701 KB single bundle | Medium | Fixed — route-level code splitting |
| 12 | Relative `og:image` | Medium | Fixed — absolute |
| 13 | Trailing-slash duplicates | Medium | Fixed — redirect |
| 14 | Empty browse pages stay indexable | Medium | Open — needs runtime data |
| 15 | Thin browse-page prose (~25 words) | Medium | Partially fixed |
| 16 | Apex domain does not resolve | Medium | **Owner action — DNS** |
| 17 | `lastCheckedAt` as `lastmod` | Low | Fixed — `updatedAt` only |
| 18 | Dead `href="#"` footer links | Low | Open |
| 19 | Admin password compared with `!==` | Security | **Owner action** |
| 20 | Permissive CORS with credentials | Security | **Owner action** |

---

## Actions for the site owner

1. **DNS for the apex domain.** In Porkbun, add `A nextstepdatabase.fyi
   76.76.21.21`, then add the apex to the Vercel project configured to
   **redirect to `www`** (not serve content, which would create duplicates).
2. **Google Search Console.** Submit `sitemap.xml`; verify a Domain property
   once apex DNS resolves.
3. **Set `SITE_URL`** in Vercel to `https://www.nextstepdatabase.fyi` so the
   database-driven sitemap stops deriving URLs from request headers.
4. **Rotate and hash the admin password**, and restrict CORS to known origins.

---

## What was deliberately not done

- **No new keyword-variant pages.** The site already has a doorway-page problem;
  adding more thin location or grade pages would deepen it.
- **No "last verified" badge**, no ratings, no reviews, no awards, no
  partnership or nonprofit claims — none of these are supported by real data.
- **No `Dataset` markup.** The site does not meet Google's dataset-description
  requirements.
- **No `JobPosting` replacement.** `EducationalOccupationalProgram` requires
  fields the records do not contain.
- **No rankings promised.** Rankings are Google's to decide.
