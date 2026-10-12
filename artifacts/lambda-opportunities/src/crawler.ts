// Bounded, polite site crawler.
//
// Responsibilities, in order:
//   1. map a site quickly (robots.txt, sitemaps, then anchors) into the frontier
//   2. fetch due URLs under a global cap and a per-host cap
//   3. skip re-extraction of pages that have not changed (ETag / Last-Modified /
//      content hash), while still keeping them in the site graph
//   4. never let one slow or broken URL hold up unrelated work
//
// Depth and breadth are configuration, not hard-coded, so raising coverage does
// not mean touching this file.

import { sha256Hex } from "@workspace/aws";
import { HostLimiter, mapLimit, TimeBudget } from "./concurrency";
import { canonicalizeUrl, domainOf, urlPriority } from "./discovery";
import {
  type FrontierEntry,
  isDueForFetch,
  loadDomainFrontier,
  noteDiscovered,
  MAX_RETRIES,
  saveFrontier,
  selectForCrawl,
} from "./frontier";
import {
  extractLinks,
  extractPageSignals,
  isDisallowed,
  isSitemapIndex,
  parseSitemapLocations,
  sitemapCandidates,
  sitemapsFromRobots,
  stripTags,
} from "./sitemap";
import { screenPage, type ScreeningResult } from "./screening";

export const USER_AGENT =
  "NextStepBot/1.0 (+https://www.nextstepdatabase.fyi; student opportunity indexer)";

export type CrawlConfig = {
  /** How many links deep to follow from a seed. */
  maxDepth: number;
  /** Most pages fetched per domain in one run. */
  maxPagesPerDomain: number;
  /** Global in-flight fetches. */
  fetchConcurrency: number;
  /** In-flight fetches against any single host. */
  perHostConcurrency: number;
  /** Skip refetching a URL seen more recently than this. */
  refetchAfterDays: number;
  fetchTimeoutMs: number;
  /** Cap on sitemap URLs adopted per domain, so a 50k-URL sitemap cannot flood. */
  maxSitemapUrls: number;
};

export const DEFAULT_CRAWL_CONFIG: CrawlConfig = {
  maxDepth: 2,
  maxPagesPerDomain: 25,
  fetchConcurrency: 10,
  perHostConcurrency: 2,
  refetchAfterDays: 14,
  fetchTimeoutMs: 15_000,
  maxSitemapUrls: 300,
};

export type CrawledPage = {
  entry: FrontierEntry;
  html: string;
  text: string;
  title: string;
  description: string;
  headings: string[];
  screening: ScreeningResult;
  /** True when the fetch confirmed the page is byte-identical to last time. */
  unchanged: boolean;
};

export type DomainCrawlResult = {
  domain: string;
  pages: CrawledPage[];
  /** Every internal URL known for this domain after mapping. */
  linksDiscovered: number;
  pagesFetched: number;
  pagesUnchanged: number;
  pagesFailed: number;
  robotsBlocked: number;
  fromSitemap: number;
  errors: string[];
};

const BANNED_HOST = "ecdatabase.org";

function hostAllowed(host: string): boolean {
  return host !== BANNED_HOST && !host.endsWith(`.${BANNED_HOST}`);
}

type FetchOutcome = {
  ok: boolean;
  status: number;
  html: string;
  contentType: string | null;
  etag: string | null;
  lastModified: string | null;
  notModified: boolean;
};

async function fetchPage(
  url: string,
  entry: FrontierEntry | null,
  timeoutMs: number,
): Promise<FetchOutcome> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  };
  // Conditional request: the cheapest possible change detection.
  if (entry?.etag) headers["If-None-Match"] = entry.etag;
  else if (entry?.lastModified) headers["If-Modified-Since"] = entry.lastModified;

  const response = await fetch(url, {
    headers,
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (response.status === 304) {
    return {
      ok: true,
      status: 304,
      html: "",
      contentType: entry?.contentType ?? null,
      etag: entry?.etag ?? null,
      lastModified: entry?.lastModified ?? null,
      notModified: true,
    };
  }

  const contentType = response.headers.get("content-type");
  if (!response.ok) {
    return { ok: false, status: response.status, html: "", contentType, etag: null, lastModified: null, notModified: false };
  }
  if (contentType && !/text\/html|application\/xhtml/i.test(contentType)) {
    // Not HTML: recorded so we never fetch it again, but not an error.
    return { ok: false, status: response.status, html: "", contentType, etag: null, lastModified: null, notModified: false };
  }

  return {
    ok: true,
    status: response.status,
    html: await response.text(),
    contentType,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    notModified: false,
  };
}

async function fetchText(url: string, timeoutMs: number): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Map and crawl one domain.
 *
 * Seeds are the URLs search already gave us for this domain. Mapping runs first
 * and is cheap; fetching is bounded and always leaves the frontier in a state
 * the next run can resume from.
 */
export async function crawlDomain(
  domain: string,
  seedUrls: string[],
  config: CrawlConfig,
  budget: TimeBudget,
  hostLimiter: HostLimiter,
): Promise<DomainCrawlResult> {
  const result: DomainCrawlResult = {
    domain,
    pages: [],
    linksDiscovered: 0,
    pagesFetched: 0,
    pagesUnchanged: 0,
    pagesFailed: 0,
    robotsBlocked: 0,
    fromSitemap: 0,
    errors: [],
  };

  if (!hostAllowed(domain)) {
    result.errors.push(`banned host: ${domain}`);
    return result;
  }

  const now = Date.now();
  const nowIso = new Date().toISOString();
  const origin = `https://${domain}`;

  let frontier: Map<string, FrontierEntry>;
  try {
    frontier = await loadDomainFrontier(domain);
  } catch (error) {
    result.errors.push(`frontier load: ${message(error)}`);
    frontier = new Map();
  }

  // --- robots -------------------------------------------------------------
  const robotsTxt = (await fetchText(`${origin}/robots.txt`, config.fetchTimeoutMs)) ?? "";
  const allowed = (url: string): boolean => {
    if (!robotsTxt) return true;
    try {
      return !isDisallowed(robotsTxt, new URL(url).pathname);
    } catch {
      return false;
    }
  };

  const adopt = (
    rawUrl: string,
    parentUrl: string | null,
    discoveredFrom: string,
    depth: number,
  ): void => {
    const canonical = canonicalizeUrl(rawUrl);
    if (!canonical) return;
    if (domainOf(canonical) !== domain) return; // stay on the source website
    if (!hostAllowed(domainOf(canonical))) return;
    noteDiscovered(
      frontier,
      {
        canonicalUrl: canonical,
        url: rawUrl,
        domain,
        parentUrl,
        discoveredFrom,
        crawlDepth: depth,
        priority: urlPriority(canonical, depth),
      },
      nowIso,
    );
  };

  for (const seed of seedUrls) adopt(seed, null, "search", 0);

  // --- sitemap mapping ----------------------------------------------------
  if (budget.hasRoom(30_000)) {
    const candidates = [...sitemapsFromRobots(robotsTxt), ...sitemapCandidates(origin)];
    let adopted = 0;
    for (const sitemapUrl of candidates.slice(0, 4)) {
      if (adopted >= config.maxSitemapUrls || !budget.hasRoom(20_000)) break;
      const xml = await fetchText(sitemapUrl, config.fetchTimeoutMs);
      if (!xml) continue;
      let locations = parseSitemapLocations(xml);
      if (isSitemapIndex(xml)) {
        // One level of index expansion, preferring child sitemaps whose name
        // hints at program content.
        const children = locations
          .sort((a, b) => scoreSitemapName(b) - scoreSitemapName(a))
          .slice(0, 3);
        locations = [];
        for (const child of children) {
          if (!budget.hasRoom(20_000)) break;
          const childXml = await fetchText(child, config.fetchTimeoutMs);
          if (childXml) locations.push(...parseSitemapLocations(childXml));
        }
      }
      // Prioritised, then capped: the highest-signal URLs survive the cap.
      const ranked = locations
        .filter((u) => domainOf(u) === domain)
        .sort((a, b) => urlPriority(b, 1) - urlPriority(a, 1));
      for (const location of ranked) {
        if (adopted >= config.maxSitemapUrls) break;
        adopt(location, sitemapUrl, "sitemap", 1);
        adopted += 1;
      }
      result.fromSitemap += adopted;
      if (adopted > 0) break;
    }
  }

  // --- bounded fetching, depth by depth -----------------------------------
  let fetchedThisRun = 0;
  for (let depth = 0; depth <= config.maxDepth; depth++) {
    if (fetchedThisRun >= config.maxPagesPerDomain) break;
    if (!budget.hasRoom(30_000)) break;

    const due = selectForCrawl(frontier, now, {
      limit: config.maxPagesPerDomain - fetchedThisRun,
      refetchAfterDays: config.refetchAfterDays,
    }).filter((entry) => entry.crawlDepth <= depth);
    if (due.length === 0) continue;

    const outcomes = await mapLimit(due, config.fetchConcurrency, async (entry) => {
      if (!allowed(entry.canonicalUrl)) {
        entry.status = "skipped";
        result.robotsBlocked += 1;
        return null;
      }
      return hostLimiter.run(domain, async () => {
        const outcome = await fetchPage(entry.canonicalUrl, entry, config.fetchTimeoutMs);
        entry.lastFetched = new Date().toISOString();

        if (outcome.notModified) {
          entry.status = "unchanged";
          result.pagesUnchanged += 1;
          return null;
        }
        if (!outcome.ok) {
          entry.retryCount += 1;
          entry.status = entry.retryCount > MAX_RETRIES ? "exhausted" : "failed";
          entry.contentType = outcome.contentType;
          result.pagesFailed += 1;
          return null;
        }

        const hash = sha256Hex(outcome.html);
        const unchanged = entry.contentHash === hash;
        entry.status = unchanged ? "unchanged" : "fetched";
        entry.contentHash = hash;
        entry.contentType = outcome.contentType;
        entry.etag = outcome.etag;
        entry.lastModified = outcome.lastModified;
        if (unchanged) result.pagesUnchanged += 1;

        const signals = extractPageSignals(outcome.html);
        const text = stripTags(outcome.html).slice(0, 20_000);
        const screening = screenPage({
          url: entry.canonicalUrl,
          title: signals.title,
          description: signals.description,
          headings: signals.headings,
          textSample: text.slice(0, 4000),
        });

        // Link discovery happens for every fetched page regardless of how it
        // screened, so a low-scoring hub page still expands the frontier.
        if (screening.keepCrawling && entry.crawlDepth < config.maxDepth) {
          for (const link of extractLinks(outcome.html, entry.canonicalUrl)) {
            adopt(link.url, entry.canonicalUrl, "anchor", entry.crawlDepth + 1);
          }
        }

        return {
          entry,
          html: outcome.html,
          text,
          title: signals.title,
          description: signals.description,
          headings: signals.headings,
          screening,
          unchanged,
        } satisfies CrawledPage;
      });
    });

    for (const outcome of outcomes) {
      if (!outcome.ok) {
        result.pagesFailed += 1;
        result.errors.push(outcome.error.message);
        continue;
      }
      if (outcome.value) {
        result.pages.push(outcome.value);
        result.pagesFetched += 1;
      }
      fetchedThisRun += 1;
    }
  }

  result.linksDiscovered = frontier.size;

  try {
    await saveFrontier([...frontier.values()]);
  } catch (error) {
    result.errors.push(`frontier save: ${message(error)}`);
  }

  return result;
}

/** Child sitemaps whose filename hints at programs are expanded first. */
function scoreSitemapName(url: string): number {
  return urlPriority(url, 1);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export { isDueForFetch };
