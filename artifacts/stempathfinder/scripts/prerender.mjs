/**
 * Build-time prerenderer.
 *
 * The app is a client-rendered SPA, so before this script ran every URL served
 * a byte-identical 2.3 KB shell: same <title>, no canonical, empty <div
 * id="root">. This emits one real HTML file per route with that route's title,
 * description, canonical, Open Graph tags and JSON-LD already in the markup,
 * and — for routes whose copy lives in a data module — the page's actual text.
 *
 * Cloaking safety: injected body copy is read from the SAME modules the React
 * components render (browse-pages.ts, guides.ts, path-finder.ts,
 * static-pages.ts). Routes whose copy lives inside components get head tags
 * only, never invented body text. If you add body copy here, it must come from
 * a shared module, not be written inline.
 *
 * Also emits sitemap.xml from the same route list, so the sitemap can never
 * advertise a route that wasn't prerendered or list a noindex page.
 *
 * Run after `vite build`: node scripts/prerender.mjs
 */

import { createServer } from 'vite';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(ROOT, 'dist/public');
const ORIGIN = 'https://www.nextstepdatabase.fyi';

const escapeHtml = (v) =>
  String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/** JSON-LD must not be HTML-escaped, but must not break out of the script tag. */
const jsonLdSafe = (obj) =>
  JSON.stringify(obj).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');

// Vite resolves the "@/" alias and compiles TS for us, so the prerenderer reads
// exactly the modules the app builds from.
process.env.PORT ||= '5173';
process.env.BASE_PATH ||= '/';

const vite = await createServer({
  root: ROOT,
  configFile: path.join(ROOT, 'vite.config.ts'),
  server: { middlewareMode: true },
  appType: 'custom',
  logLevel: 'error',
  // We only ssrLoadModule a few plain-TS data modules; without this, Vite
  // starts a dependency pre-bundling scan of the whole app that then errors
  // out when we close the server.
  optimizeDeps: { noDiscovery: true, include: [] },
});

const { BROWSE_PAGES } = await vite.ssrLoadModule('/src/lib/browse-pages.ts');
const { GUIDES } = await vite.ssrLoadModule('/src/lib/guides.ts');
const pf = await vite.ssrLoadModule('/src/lib/path-finder.ts');
const sp = await vite.ssrLoadModule('/src/lib/static-pages.ts');
const seo = await vite.ssrLoadModule('/src/lib/seo.ts');
await vite.close();

const { SITE_NAME, DEFAULT_TITLE, DEFAULT_DESCRIPTION } = seo;

const fullTitle = (t) =>
  !t ? DEFAULT_TITLE : t.includes(SITE_NAME) ? t : `${t} | ${SITE_NAME}`;

const p = (text) =>
  `<p class="mt-4 max-w-[680px] text-[16px] leading-[1.6] text-[var(--brand-muted-1)]">${escapeHtml(text)}</p>`;

const h1 = (text) =>
  `<h1 class="font-display mt-3 max-w-[760px] text-[32px] font-[660] leading-[1.05] tracking-[-0.03em] text-foreground sm:text-[44px]">${escapeHtml(text)}</h1>`;

const linkList = (links) =>
  `<ul class="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[14px]">${links
    .map(
      ([label, href]) =>
        `<li><a class="text-primary underline-offset-4 hover:underline" href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`,
    )
    .join('')}</ul>`;

const breadcrumbJsonLd = (crumbs, routePath) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: `${ORIGIN}/` },
    ...crumbs.map((name, i) => ({
      '@type': 'ListItem',
      position: i + 2,
      name,
      item: `${ORIGIN}${routePath}`,
    })),
  ],
});

/** Every prerendered route. `body` is optional and must come from a module. */
const routes = [];

// --- Core pages: head tags only (their copy lives inside components) --------
routes.push({
  path: '/',
  title: DEFAULT_TITLE,
  description: DEFAULT_DESCRIPTION,
  jsonLd: [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: SITE_NAME,
      url: `${ORIGIN}/`,
      description: DEFAULT_DESCRIPTION,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: SITE_NAME,
      url: `${ORIGIN}/`,
      logo: `${ORIGIN}/icon-512.png`,
    },
  ],
  body:
    h1(sp.HOME_H1) +
    p(sp.HOME_LEAD) +
    linkList([
      ['Find your matches', '/find'],
      ['STEM Path Finder', '/stem-path-finder'],
      ['Browse the database', '/database'],
      ['Guides', '/guides'],
      ['How it works', '/how'],
    ]),
});
routes.push({
  path: '/find',
  title: 'Find Your STEM Opportunity Matches',
  description:
    'Answer a few questions and get matched to researched STEM opportunities for students — internships, research programs, and competitions that fit your grade and interests.',
});
routes.push({
  path: '/database',
  title: 'Browse the STEM Opportunity Database',
  description:
    'Browse every researched STEM opportunity for students — internships, research programs, competitions, and camps with structured details and deadlines.',
});
routes.push({
  path: '/student-pathways',
  title: 'Student Pathways: Real Routes Into STEM Colleges',
  description:
    'Explore anonymized pathways of real students — the activities, awards, and programs that led to acceptances at top STEM universities.',
});

// --- Pages whose copy lives in static-pages.ts -----------------------------
routes.push({
  path: '/how',
  title: 'How NextStep Database Works',
  description:
    'How NextStep Database researches STEM opportunities for students from official sources before you search — what we record, and what you should always confirm yourself.',
  body: h1(sp.HOW_IT_WORKS_H1) + sp.HOW_IT_WORKS_INTRO.map(p).join(''),
});
routes.push({
  path: '/different',
  title: 'Researched Database vs. a General Chatbot',
  description:
    "Why a researched database of STEM opportunities beats a chatbot's generated answers — no invented programs, deadlines, or links.",
  body: h1(sp.DIFFERENCE_H1) + sp.DIFFERENCE_INTRO.map(p).join(''),
});

// --- /stem-path-finder ----------------------------------------------------
routes.push({
  path: '/stem-path-finder',
  title: pf.PATH_FINDER_TITLE,
  description: pf.PATH_FINDER_DESCRIPTION,
  jsonLd: [
    breadcrumbJsonLd(['STEM Path Finder'], '/stem-path-finder'),
    {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: 'STEM pathways for middle and high school students',
      itemListElement: pf.PATHWAYS.map((pw, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: pw.name,
        url: `${ORIGIN}/stem-path-finder#${pw.id}`,
      })),
    },
  ],
  body:
    h1(pf.PATH_FINDER_H1) +
    pf.PATH_FINDER_INTRO.map(p).join('') +
    '<h2 class="font-display mt-12 text-[24px] font-semibold text-foreground">Six STEM pathways</h2>' +
    pf.PATHWAYS.map(
      (pw) =>
        `<div id="${escapeHtml(pw.id)}" class="mt-8 border-t border-border pt-6">` +
        `<h3 class="font-display text-[19px] font-semibold text-foreground">${escapeHtml(pw.name)}</h3>` +
        p(pw.summary) +
        `<ul class="mt-4 max-w-[680px] list-disc space-y-2 pl-5 text-[15px] leading-[1.65] text-[var(--brand-muted-1)]">${pw.startingPoints
          .map((s) => `<li>${escapeHtml(s)}</li>`)
          .join('')}</ul>` +
        linkList(pw.links) +
        '</div>',
    ).join('') +
    '<h2 class="font-display mt-14 text-[24px] font-semibold text-foreground">Five questions that narrow the field</h2>' +
    pf.FINDER_QUESTIONS.map(
      (q) =>
        '<div class="mt-7">' +
        `<h3 class="font-display text-[17px] font-semibold text-foreground">${escapeHtml(q.question)}</h3>` +
        p(q.why) +
        linkList(q.links) +
        '</div>',
    ).join('') +
    '<h2 class="font-display mt-14 text-[24px] font-semibold text-foreground">How students actually use this</h2>' +
    pf.USAGE_EXAMPLES.map(
      (e) =>
        '<div class="mt-6 max-w-[680px]">' +
        `<h3 class="font-display text-[16px] font-semibold text-foreground">${escapeHtml(e.situation)}</h3>` +
        p(e.approach) +
        '</div>',
    ).join(''),
});

// --- Guides ---------------------------------------------------------------
routes.push({
  path: '/guides',
  title: 'Guides to STEM Opportunities and Internships',
  description:
    'Guides for students on finding summer internships, research programs, free STEM programs, and application timelines.',
  jsonLd: [breadcrumbJsonLd(['Guides'], '/guides')],
  body:
    h1('Guides for Students') +
    GUIDES.map(
      (g) =>
        `<div class="mt-6"><h2 class="font-display text-[19px] font-semibold text-foreground"><a class="text-primary underline-offset-4 hover:underline" href="/guides/${escapeHtml(g.slug)}">${escapeHtml(g.title)}</a></h2>${p(g.description)}</div>`,
    ).join(''),
});

for (const g of GUIDES) {
  routes.push({
    path: `/guides/${g.slug}`,
    title: g.title,
    description: g.description,
    ogType: 'article',
    jsonLd: [breadcrumbJsonLd(['Guides', g.title], `/guides/${g.slug}`)],
    body:
      h1(g.h1) +
      p(g.intro) +
      g.sections
        .map(
          (s) =>
            `<div class="mt-8"><h2 class="font-display text-[22px] font-semibold text-foreground">${escapeHtml(s.heading)}</h2>${s.paragraphs.map(p).join('')}</div>`,
        )
        .join('') +
      '<h2 class="font-display mt-12 text-[18px] font-semibold text-foreground">Explore opportunities</h2>' +
      linkList(g.links),
  });
}

// --- Browse pages ---------------------------------------------------------
for (const page of BROWSE_PAGES) {
  const related = page.related
    .map((rp) => BROWSE_PAGES.find((e) => e.path === rp))
    .filter(Boolean)
    .map((e) => [e.h1, e.path]);
  routes.push({
    path: page.path,
    title: page.title,
    description: page.description,
    noindex: Boolean(page.noindex),
    jsonLd: [breadcrumbJsonLd([page.h1], page.path)],
    body:
      h1(page.h1) +
      page.intro.map(p).join('') +
      (related.length
        ? '<h2 class="font-display mt-12 text-[18px] font-semibold text-foreground">Related pages</h2>' +
          linkList([...related, ['Full opportunity database', '/database']])
        : ''),
  });
}

// --- Published opportunity detail pages -----------------------------------
// Fetched from the live API at build time and written as real files, so each
// published record has meaningful HTML before any JavaScript runs, and any id
// that is missing, unpublished or expired simply has no file — which means
// Vercel answers it with 404.html and a real HTTP 404.
//
// Only fields the record actually carries are rendered. Nothing is inferred,
// defaulted or invented: no verification dates, no employment status, no
// program dates, and no structured data beyond what is visibly on the page.
const API_BASE = process.env.PRERENDER_API_BASE || ORIGIN;

let published = [];
{
  const url = `${API_BASE}/api/opportunities`;
  const response = await fetch(url, { headers: { accept: 'application/json' } });
  if (!response.ok) {
    throw new Error(
      `[prerender] ${url} returned ${response.status}. Refusing to build: a ` +
        `partial fetch would silently drop opportunity pages and shrink sitemap.xml.`,
    );
  }
  const payload = await response.json();
  const all = Array.isArray(payload.opportunities) ? payload.opportunities : [];
  if (all.length === 0) {
    throw new Error(
      '[prerender] the API returned zero opportunities. Refusing to build ' +
        'rather than deploying a sitemap that drops every detail page.',
    );
  }
  // The endpoint already excludes unpublished, rejected, invalid and expired
  // records. Re-checking published here means a change to that endpoint cannot
  // silently start publishing pages for records that are not public.
  published = all.filter(
    (o) => o.published === true && o.invalid !== true && o.reviewStatus !== 'rejected',
  );
  console.log(
    `[prerender] ${published.length} published of ${all.length} returned`,
  );
}

/** Non-empty, non-null string, else null. Never substitutes a placeholder. */
const field = (v) => {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s && s.toLowerCase() !== 'null' ? s : null;
};

const detailRow = (label, value) =>
  value
    ? `<div class="mt-3"><dt class="text-[13px] uppercase tracking-[0.12em] text-muted-foreground">${escapeHtml(label)}</dt><dd class="mt-1 text-[15px] leading-[1.6] text-foreground">${escapeHtml(value)}</dd></div>`
    : '';

for (const o of published) {
  const title = field(o.title) ?? 'Opportunity';
  const routePath = seo.opportunityPath(title, o.numericId || o.opportunityId);
  const org = field(o.organization);
  const type = field(o.opportunityType);
  const location = field(o.location);
  const deadline = field(o.deadline);
  const cost = field(o.cost);
  const compensation = field(o.compensation);
  const description = field(o.description);
  const eligibility = field(o.eligibility);
  const officialUrl = field(o.officialUrl) ?? field(o.applicationUrl);
  const grades = Array.isArray(o.gradeLevels) && o.gradeLevels.length
    ? o.gradeLevels.join(', ')
    : null;
  const remote =
    o.remoteStatus && o.remoteStatus !== 'unknown' ? String(o.remoteStatus) : null;

  // Built from this record's own fields, so it differs per page rather than
  // repeating one boilerplate sentence across every opportunity.
  const metaBits = [
    type && org ? `${type} from ${org}` : type || (org ? `Run by ${org}` : null),
    location,
    grades ? `grades ${grades}` : null,
    deadline ? `deadline ${deadline}` : null,
  ].filter(Boolean);
  const description_meta = `${title}. ${metaBits.join('. ')}.`.slice(0, 320);

  const body =
    h1(title) +
    (org
      ? `<p class="mt-2 text-[17px] text-[var(--brand-muted-1)]">${escapeHtml(org)}</p>`
      : '') +
    (description
      ? `<h2 class="font-display mt-8 text-[20px] font-semibold text-foreground">Program overview</h2>${p(description)}`
      : '') +
    (eligibility
      ? `<h2 class="font-display mt-8 text-[20px] font-semibold text-foreground">Eligibility</h2>${p(eligibility)}`
      : '') +
    '<h2 class="font-display mt-8 text-[20px] font-semibold text-foreground">Key details</h2>' +
    '<dl class="mt-2">' +
    detailRow('Organization', org) +
    detailRow('Type', type) +
    detailRow('Location', location) +
    detailRow('Format', remote) +
    detailRow('Eligible grades', grades) +
    detailRow('Application deadline', deadline) +
    detailRow('Cost', cost) +
    detailRow('Compensation', compensation) +
    detailRow('Time commitment', field(o.timeCommitment)) +
    detailRow('Application status', field(o.applicationStatus)) +
    '</dl>' +
    (officialUrl
      ? `<h2 class="font-display mt-8 text-[20px] font-semibold text-foreground">How to apply</h2>` +
        `<p class="mt-3 text-[15px] leading-[1.7] text-[var(--brand-muted-1)]">Apply on the program's own site. Details here were read from that page and can change — confirm them there before applying.</p>` +
        `<p class="mt-3"><a class="text-primary underline-offset-4 hover:underline" href="${escapeHtml(officialUrl)}" rel="noreferrer noopener">Official program page</a></p>`
      : '') +
    linkList([
      ['Browse all opportunities', '/database'],
      ['STEM Path Finder', '/stem-path-finder'],
      ['Guides', '/guides'],
    ]);

  routes.push({
    path: routePath,
    title,
    description: description_meta,
    // lastmod only where the record genuinely records a content change.
    lastmod: field(o.updatedAt)?.slice(0, 10) ?? null,
    jsonLd: [
      breadcrumbJsonLd([title], routePath),
      // WebPage only. Every property below is visible on the page above.
      {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: title,
        url: `${ORIGIN}${routePath}`,
        ...(description ? { description } : {}),
        isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: `${ORIGIN}/` },
      },
    ],
    body,
  });
}

// --- Render ---------------------------------------------------------------
const template = await readFile(path.join(DIST, 'index.html'), 'utf8');

function render(route) {
  const canonical = `${ORIGIN}${route.path === '/' ? '/' : route.path}`;
  const title = fullTitle(route.title);
  const desc = route.description ?? DEFAULT_DESCRIPTION;
  const robots = route.noindex ? 'noindex, follow' : 'index, follow';
  const image = `${ORIGIN}/icon-512.png`;

  let html = template;

  html = html.replace(
    /<title>[\s\S]*?<\/title>/,
    `<title>${escapeHtml(title)}</title>`,
  );
  const setMeta = (attr, key, value) => {
    const re = new RegExp(`<meta ${attr}="${key}" content="[^"]*"\\s*/?>`);
    const tag = `<meta ${attr}="${key}" content="${escapeHtml(value)}" />`;
    html = re.test(html) ? html.replace(re, tag) : html.replace('</head>', `  ${tag}\n</head>`);
  };
  setMeta('name', 'description', desc);
  setMeta('name', 'robots', robots);
  setMeta('property', 'og:title', title);
  setMeta('property', 'og:description', desc);
  setMeta('property', 'og:url', canonical);
  setMeta('property', 'og:type', route.ogType ?? 'website');
  setMeta('property', 'og:image', image);
  setMeta('name', 'twitter:title', title);
  setMeta('name', 'twitter:description', desc);
  setMeta('name', 'twitter:image', image);

  html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${canonical}" />`,
  );

  const blocks = (route.jsonLd ?? [])
    .map(
      (b) =>
        `<script type="application/ld+json">${jsonLdSafe(b)}</script>`,
    )
    .join('\n    ');
  if (blocks) html = html.replace('</head>', `    ${blocks}\n  </head>`);

  if (route.body) {
    // React replaces this on mount. The copy comes from the same modules the
    // components render, so what a crawler reads matches what a user sees.
    html = html.replace(
      '<div id="root"></div>',
      `<div id="root"><main class="mx-auto w-full max-w-[var(--page-width)] px-4 pb-24 pt-12 sm:px-6 sm:pt-16">${route.body}</main></div>`,
    );
  }
  return html;
}

let written = 0;
for (const route of routes) {
  const outDir =
    route.path === '/' ? DIST : path.join(DIST, route.path.replace(/^\//, ''));
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'index.html'), render(route), 'utf8');
  written += 1;
}

// --- Neutral app shell for client-rendered routes -------------------------
// Routes that can't be prerendered (opportunity detail, /match, /results,
// /docs, admin) are rewritten here rather than to /index.html. Pointing them
// at index.html would serve the prerendered HOMEPAGE — its H1, its copy, and a
// canonical of "/" — to every one of those URLs, which reads as a duplicate of
// the homepage to any crawler that doesn't execute JS. This shell carries no
// body copy and no canonical, so the values React sets are the only ones.
{
  let shell = template;
  shell = shell.replace(/<link rel="canonical" href="[^"]*"\s*\/?>/, '');
  shell = shell.replace(
    /<meta property="og:url" content="[^"]*"\s*\/?>/,
    '',
  );
  await writeFile(path.join(DIST, 'app.html'), shell, 'utf8');
}

// --- 404 page -------------------------------------------------------------
// Vercel serves this with a real HTTP 404 for any path that matches no file
// and no rewrite. Before this, the SPA catch-all returned 200 for every
// unknown URL, making the whole URL space an indexable soft 404.
await writeFile(
  path.join(DIST, '404.html'),
  render({
    path: '/404',
    title: 'Page not found',
    description:
      'This page does not exist. Browse the researched STEM opportunity database instead.',
    noindex: true,
    body:
      h1('Page not found') +
      p(
        "That page doesn't exist — it may have been moved, or the link may be wrong.",
      ) +
      linkList([
        ['Home', '/'],
        ['STEM Path Finder', '/stem-path-finder'],
        ['Browse the database', '/database'],
        ['Guides', '/guides'],
      ]),
  }),
  'utf8',
);

// --- Sitemap from the same route list -------------------------------------
const indexable = routes.filter((r) => !r.noindex);
const sitemap =
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
  indexable
    .map((r) => {
      const loc = escapeHtml(`${ORIGIN}${r.path === '/' ? '/' : r.path}`);
      // lastmod is emitted only where a record genuinely tracks content
      // changes. Static pages have no such timestamp, so they carry none
      // rather than a build date that would claim a change that never happened.
      const lastmod = r.lastmod ? `<lastmod>${r.lastmod}</lastmod>` : '';
      return `  <url><loc>${loc}</loc>${lastmod}</url>`;
    })
    .join('\n') +
  '\n</urlset>\n';
await writeFile(path.join(DIST, 'sitemap.xml'), sitemap, 'utf8');

console.log(
  `[prerender] ${written} routes -> HTML, ${indexable.length} in sitemap.xml (${routes.length - indexable.length} noindex excluded)`,
);
