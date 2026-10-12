// Fast website mapping: turn a seed URL into a list of candidate internal URLs
// without deeply processing any of them.
//
// This is the cheap half of the split described in PART 3. Mapping only needs
// URLs, so it reads sitemap.xml (and sitemap indexes) where available and falls
// back to pulling anchors out of already-fetched HTML. Nothing here calls a
// model or fetches a page for its content.

/** Extract <loc> values from a sitemap or sitemap index document. */
export function parseSitemapLocations(xml: string): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    const value = decodeXmlEntities(match[1]!.trim());
    if (value) out.push(value);
  }
  return out;
}

/** True when the document is a sitemap index rather than a URL set. */
export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

function decodeXmlEntities(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/**
 * Pull hyperlinks out of an HTML document.
 *
 * Regex rather than a DOM parser: the bundle ships to Lambda and this only has
 * to be good enough to enumerate href targets, which are well-formed in
 * practice. Relative hrefs are resolved against `baseUrl`.
 */
export function extractLinks(html: string, baseUrl: string): Array<{ url: string; text: string }> {
  const out: Array<{ url: string; text: string }> = [];
  const seen = new Set<string>();
  const re = /<a\b[^>]*?href\s*=\s*("([^"]*)"|'([^']*)'|([^\s">]+))[^>]*>([\s\S]{0,200}?)<\/a>/gi;
  let match: RegExpExecArray | null;
  while ((match = re.exec(html)) !== null) {
    const raw = (match[2] ?? match[3] ?? match[4] ?? "").trim();
    if (!raw) continue;
    if (/^(javascript:|mailto:|tel:|#|data:)/i.test(raw)) continue;
    let resolved: string;
    try {
      resolved = new URL(decodeXmlEntities(raw), baseUrl).toString();
    } catch {
      continue;
    }
    if (!/^https?:/i.test(resolved)) continue;
    if (seen.has(resolved)) continue;
    seen.add(resolved);
    const text = stripTags(match[5] ?? "").slice(0, 120);
    out.push({ url: resolved, text });
  }
  return out;
}

export function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Page title, meta description and Open Graph description for cheap screening. */
export function extractPageSignals(html: string): {
  title: string;
  description: string;
  headings: string[];
} {
  const title = stripTags(/<title[^>]*>([\s\S]{0,300}?)<\/title>/i.exec(html)?.[1] ?? "");
  const metaDescription =
    matchMeta(html, /name\s*=\s*["']description["']/i) ??
    matchMeta(html, /property\s*=\s*["']og:description["']/i) ??
    "";
  const headings: string[] = [];
  const hre = /<h[1-3][^>]*>([\s\S]{0,300}?)<\/h[1-3]>/gi;
  let m: RegExpExecArray | null;
  while ((m = hre.exec(html)) !== null && headings.length < 25) {
    const text = stripTags(m[1] ?? "");
    if (text) headings.push(text);
  }
  return { title, description: metaDescription, headings };
}

function matchMeta(html: string, attrPattern: RegExp): string | null {
  const re = /<meta\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const tag = m[0]!;
    if (!attrPattern.test(tag)) continue;
    const content = /content\s*=\s*("([^"]*)"|'([^']*)')/i.exec(tag);
    const value = content?.[2] ?? content?.[3];
    if (value) return decodeXmlEntities(stripTags(value));
  }
  return null;
}

/** The Open Graph image URL, used for showcase asset selection. */
export function extractOgImage(html: string, baseUrl: string): string | null {
  const value =
    matchMeta(html, /property\s*=\s*["']og:image["']/i) ??
    matchMeta(html, /name\s*=\s*["']twitter:image["']/i);
  if (!value) return null;
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return null;
  }
}

/** Candidate sitemap locations for a site, in the order worth trying. */
export function sitemapCandidates(origin: string): string[] {
  return [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
  ];
}

/** Sitemap URLs advertised by robots.txt. */
export function sitemapsFromRobots(robotsTxt: string): string[] {
  const out: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const m = /^\s*sitemap\s*:\s*(\S+)/i.exec(line);
    if (m?.[1]) out.push(m[1]);
  }
  return out;
}

/**
 * Minimal robots.txt evaluation for our own user agent.
 *
 * Only Disallow rules from `*` and a matching agent block are honoured. This is
 * deliberately strict-by-default: an unparseable robots.txt disallows nothing,
 * but an explicit Disallow always wins.
 */
export function isDisallowed(robotsTxt: string, path: string, agent = "nextstepbot"): boolean {
  const lines = robotsTxt.split(/\r?\n/);
  let applies = false;
  let sawAnyGroup = false;
  const disallows: string[] = [];
  for (const raw of lines) {
    const line = raw.replace(/#.*$/, "").trim();
    if (!line) continue;
    const ua = /^user-agent\s*:\s*(.+)$/i.exec(line);
    if (ua) {
      const value = ua[1]!.trim().toLowerCase();
      applies = value === "*" || value === agent.toLowerCase();
      sawAnyGroup = true;
      continue;
    }
    if (!sawAnyGroup || !applies) continue;
    const dis = /^disallow\s*:\s*(.*)$/i.exec(line);
    if (dis) {
      const value = dis[1]!.trim();
      if (value) disallows.push(value);
    }
  }
  return disallows.some((rule) => path.startsWith(rule));
}
