// Persistent URL frontier.
//
// Before this existed the crawler had no memory: every run rebuilt whatever it
// knew about a source website from scratch, so a site's structure was
// rediscovered daily and nothing could be skipped on the grounds that it had
// not changed.
//
// Stored in the existing single-table DynamoDB layout:
//   PK = FRONTIER#<domain>   SK = URL#<sha256(canonicalUrl)[0..24]>
//
// Partitioning by domain matches how we crawl (one site at a time) and lets a
// whole site graph be read with one Query instead of a table Scan.

import {
  awsConfig,
  batchWriteWithRetry,
  getDynamoDocumentClient,
  QueryCommand,
  sha256Hex,
} from "@workspace/aws";

export type FrontierStatus =
  | "pending" // discovered, not yet fetched
  | "fetched" // fetched successfully
  | "unchanged" // refetched and content hash matched, extraction skipped
  | "failed" // fetch failed, may retry
  | "skipped" // deliberately not fetched (off-domain, non-HTML, budget)
  | "exhausted"; // failed too many times, stop trying

export type FrontierEntry = {
  canonicalUrl: string;
  url: string;
  domain: string;
  parentUrl: string | null;
  /** How the URL entered the frontier: "search" | "sitemap" | "anchor". */
  discoveredFrom: string;
  crawlDepth: number;
  firstSeen: string;
  lastSeen: string;
  lastFetched: string | null;
  status: FrontierStatus;
  priority: number;
  retryCount: number;
  contentType: string | null;
  contentHash: string | null;
  etag: string | null;
  lastModified: string | null;
};

export const MAX_RETRIES = 2;

export function frontierKey(domain: string, canonicalUrl: string) {
  return {
    PK: `FRONTIER#${domain}`,
    SK: `URL#${sha256Hex(canonicalUrl).slice(0, 24)}`,
  };
}

/** Read every known URL for a domain. One Query, not a Scan. */
export async function loadDomainFrontier(domain: string): Promise<Map<string, FrontierEntry>> {
  const client = getDynamoDocumentClient();
  const out = new Map<string, FrontierEntry>();
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await client.send(
      new QueryCommand({
        TableName: awsConfig.dynamoTable,
        KeyConditionExpression: "PK = :pk AND begins_with(SK, :sk)",
        ExpressionAttributeValues: { ":pk": `FRONTIER#${domain}`, ":sk": "URL#" },
        ExclusiveStartKey: lastKey,
      }),
    );
    for (const item of (result.Items ?? []) as Array<Record<string, unknown>>) {
      const entry = itemToEntry(item);
      if (entry) out.set(entry.canonicalUrl, entry);
    }
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);
  return out;
}

function itemToEntry(item: Record<string, unknown>): FrontierEntry | null {
  const canonicalUrl = typeof item["canonicalUrl"] === "string" ? item["canonicalUrl"] : null;
  if (!canonicalUrl) return null;
  const str = (key: string): string | null =>
    typeof item[key] === "string" ? (item[key] as string) : null;
  const num = (key: string, fallback: number): number =>
    typeof item[key] === "number" ? (item[key] as number) : fallback;
  return {
    canonicalUrl,
    url: str("url") ?? canonicalUrl,
    domain: str("domain") ?? "",
    parentUrl: str("parentUrl"),
    discoveredFrom: str("discoveredFrom") ?? "unknown",
    crawlDepth: num("crawlDepth", 0),
    firstSeen: str("firstSeen") ?? new Date().toISOString(),
    lastSeen: str("lastSeen") ?? new Date().toISOString(),
    lastFetched: str("lastFetched"),
    status: (str("status") as FrontierStatus) ?? "pending",
    priority: num("priority", 0),
    retryCount: num("retryCount", 0),
    contentType: str("contentType"),
    contentHash: str("contentHash"),
    etag: str("etag"),
    lastModified: str("lastModified"),
  };
}

/** Persist frontier entries in bulk. Safe to call with an empty list. */
export async function saveFrontier(entries: FrontierEntry[]): Promise<number> {
  if (entries.length === 0) return 0;
  const requests = entries.map((entry) => ({
    put: {
      ...frontierKey(entry.domain, entry.canonicalUrl),
      entityType: "frontier_url",
      ...entry,
    },
  }));
  return batchWriteWithRetry(requests);
}

/**
 * Merge a newly discovered URL into an existing frontier map.
 *
 * Rediscovery refreshes lastSeen and can raise priority, but never resets
 * status, contentHash or retryCount: that history is the whole reason the
 * frontier is persistent.
 */
export function noteDiscovered(
  frontier: Map<string, FrontierEntry>,
  discovered: {
    canonicalUrl: string;
    url: string;
    domain: string;
    parentUrl: string | null;
    discoveredFrom: string;
    crawlDepth: number;
    priority: number;
  },
  nowIso: string,
): FrontierEntry {
  const existing = frontier.get(discovered.canonicalUrl);
  if (existing) {
    existing.lastSeen = nowIso;
    existing.priority = Math.max(existing.priority, discovered.priority);
    // A shorter path to the same page is the more reliable depth.
    existing.crawlDepth = Math.min(existing.crawlDepth, discovered.crawlDepth);
    return existing;
  }
  const entry: FrontierEntry = {
    ...discovered,
    firstSeen: nowIso,
    lastSeen: nowIso,
    lastFetched: null,
    status: "pending",
    retryCount: 0,
    contentType: null,
    contentHash: null,
    etag: null,
    lastModified: null,
  };
  frontier.set(entry.canonicalUrl, entry);
  return entry;
}

/**
 * Is this URL worth spending a fetch on right now?
 *
 * Returns false only for entries that are exhausted or were fetched so recently
 * that a refetch cannot tell us anything new. Note this gates *fetching*, never
 * link discovery: a page we skip here keeps every link we already know about it.
 */
export function isDueForFetch(
  entry: FrontierEntry,
  now: number,
  refetchAfterDays: number,
): boolean {
  if (entry.status === "exhausted") return false;
  if (entry.status === "failed" && entry.retryCount > MAX_RETRIES) return false;
  if (!entry.lastFetched) return true;
  const age = (now - Date.parse(entry.lastFetched)) / 86_400_000;
  return Number.isNaN(age) ? true : age >= refetchAfterDays;
}

/** Highest-priority pending URLs first, shallowest as the tiebreak. */
export function selectForCrawl(
  frontier: Map<string, FrontierEntry>,
  now: number,
  options: { limit: number; refetchAfterDays: number },
): FrontierEntry[] {
  return [...frontier.values()]
    .filter((entry) => isDueForFetch(entry, now, options.refetchAfterDays))
    .sort((a, b) => b.priority - a.priority || a.crawlDepth - b.crawlDepth)
    .slice(0, options.limit);
}
