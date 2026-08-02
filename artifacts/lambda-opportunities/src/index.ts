// Lambda: stempath-daily-opportunities
//
// Daily STEM opportunity discovery, optimized for novelty:
//   1. Load the existing opportunity index from DynamoDB (canonical URLs,
//      title+org fingerprints, domains, lastCheckedAt, deadlines).
//   2. Run rotating Exa query groups (3 of 6 per day, phrasing varied daily).
//   3. Canonicalize + classify every result BEFORE DeepSeek; recurring and
//      low-value URLs never consume model budget.
//   4. Budget: 75% new URLs / 20% due-for-recheck / 5% deadline-sensitive,
//      with unused recheck capacity flowing back to new URLs.
//   5. Persist with stable canonical-URL PKs; rediscoveries preserve
//      createdAt/review state; near-duplicate titles link as
//      alternateSourceUrls instead of new records.
//
// Dry-run: {"trigger":"discovery-dry-run","limit":50,"write":false}
//   → Exa + classification only; no DeepSeek, no DynamoDB, no S3 writes.
//
// HARD RULE: never contacts ecdatabase.org or any subdomain.

import {
  awsConfig,
  batchWriteWithRetry,
  getDynamoDocumentClient,
  getItem,
  ScanCommand,
  sha256Hex,
  updateItem,
  uploadJson,
} from "@workspace/aws";
import {
  canonicalizeUrl,
  domainOf,
  fingerprintSimilarity,
  isOfficialDomain,
  LOW_VALUE_DOMAINS,
  normalizeTitleOrg,
  noveltyScore,
  queriesForDay,
  SIMILARITY_THRESHOLD,
} from "./discovery";

// ---------------------------------------------------------------------------
// Environment + safety
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

const BANNED_HOST = "ecdatabase.org";

function assertAllowedUrl(url: string): void {
  const host = new URL(url).hostname.toLowerCase();
  if (host === BANNED_HOST || host.endsWith(`.${BANNED_HOST}`)) {
    throw new Error(`Refusing to contact banned host: ${host}`);
  }
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  assertAllowedUrl(url);
  return fetch(url, init);
}

// ---------------------------------------------------------------------------
// Exa search
// ---------------------------------------------------------------------------

const EXA_ENDPOINT = "https://api.exa.ai/search";
const EXA_TIMEOUT_MS = 30000;
const MAX_SOURCE_CHARACTERS = 12000;
const RESULTS_PER_QUERY = 10;

const EXCLUDED_DOMAINS = [
  "ecdatabase.org", "reddit.com", "quora.com", "wikipedia.org", "youtube.com",
  "facebook.com", "instagram.com", "tiktok.com", "x.com", "twitter.com",
  "linkedin.com", "pinterest.com",
];

type ExaDoc = {
  url: string;
  title: string;
  text: string;
  group: string;
  publishedDate: string | null;
};

async function exaSearch(exaApiKey: string, group: string, query: string): Promise<ExaDoc[]> {
  const response = await safeFetch(EXA_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": exaApiKey },
    body: JSON.stringify({
      query,
      numResults: RESULTS_PER_QUERY,
      type: "auto",
      excludeDomains: EXCLUDED_DOMAINS,
      contents: {
        text: { maxCharacters: MAX_SOURCE_CHARACTERS },
        livecrawl: "fallback",
      },
    }),
    signal: AbortSignal.timeout(EXA_TIMEOUT_MS),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Exa search failed (${response.status}): ${detail.slice(0, 300)}`);
  }
  const data: any = await response.json();
  const results: any[] = Array.isArray(data?.results) ? data.results : [];
  return results
    .filter((r) => typeof r.url === "string" && typeof r.text === "string" && r.text.trim().length >= 400)
    .map((r) => ({
      url: r.url.trim(),
      title: typeof r.title === "string" ? r.title.trim() : "",
      text: r.text.trim().slice(0, MAX_SOURCE_CHARACTERS),
      group,
      publishedDate: typeof r.publishedDate === "string" ? r.publishedDate : null,
    }));
}

// ---------------------------------------------------------------------------
// DeepSeek structuring (unchanged extraction contract)
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You structure one public STEM-opportunity web page into strict JSON for a high-school opportunity database.

Return ONLY a JSON object with these fields (null/[] when the page does not state a value — never invent dates, costs, eligibility, or deadlines):

{
  "title": string, "organization": string|null, "opportunity_type": string|null,
  "location": string|null, "cost": string|null, "application_status": string|null,
  "application_deadline": string|null, "application_open_date": string|null,
  "official_url": string|null, "application_url": string|null,
  "good_for": string|null, "extra_information": string|null,
  "experience_level": string|null, "competitiveness": string|null,
  "program_format": string|null, "time_commitment": string|null,
  "prerequisites": string|null, "citizenship_requirements": string|null,
  "residency_requirements": string|null, "program_start_date": string|null,
  "program_end_date": string|null,
  "stem_fields": string[], "college_major_matches": string[],
  "skills_developed": string[], "eligible_grades": string[],
  "missing_information": string[],
  "financial_aid_available": boolean|null, "stipend_available": boolean|null,
  "essay_required": boolean|null, "recommendation_required": boolean|null,
  "transcript_required": boolean|null,
  "minimum_age": number|null, "maximum_age": number|null
}`;

async function structureWithDeepSeek(doc: ExaDoc): Promise<Record<string, unknown>> {
  const apiKey = requireEnv("DEEPSEEK_API_KEY");
  const baseUrl = process.env["DEEPSEEK_BASE_URL"] ?? "https://api.deepseek.com";
  const model = process.env["DEEPSEEK_MODEL"] ?? "deepseek-v4-flash";

  const response = await safeFetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 8000,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        {
          role: "user",
          content: `Category hint: ${doc.group}\nSource URL: ${doc.url}\nPage title: ${doc.title}\n\nPage text:\n${doc.text}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data: any = await response.json();
  if (!response.ok) {
    throw new Error(`DeepSeek HTTP ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
  }
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned no content");
  return JSON.parse(content) as Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Existing-opportunity index
// ---------------------------------------------------------------------------

type ExistingRecord = {
  PK: string;
  source_url?: string;
  official_url?: string;
  title?: string;
  organization?: string;
  application_deadline?: string;
  application_status?: string;
  lastCheckedAt?: string;
  createdAt?: string;
  contentHash?: string;
  alternateSourceUrls?: string[];
};

type ExistingIndex = {
  byCanonicalUrl: Map<string, ExistingRecord>;
  byFingerprint: Map<string, ExistingRecord>;
  fingerprints: string[];
  domains: Set<string>;
  organizations: Set<string>;
};

async function loadExistingIndex(): Promise<ExistingIndex> {
  const client = getDynamoDocumentClient();
  const records: ExistingRecord[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await client.send(
      new ScanCommand({
        TableName: awsConfig.dynamoTable,
        FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
        ExpressionAttributeValues: { ":pk": "OPPORTUNITY#", ":sk": "OPPORTUNITY" },
        ExclusiveStartKey: lastKey,
      }),
    );
    records.push(...((result.Items ?? []) as ExistingRecord[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);

  const index: ExistingIndex = {
    byCanonicalUrl: new Map(),
    byFingerprint: new Map(),
    fingerprints: [],
    domains: new Set(),
    organizations: new Set(),
  };
  for (const record of records) {
    for (const url of [record.source_url, record.official_url, ...(record.alternateSourceUrls ?? [])]) {
      const canonical = url ? canonicalizeUrl(url) : null;
      if (canonical && !index.byCanonicalUrl.has(canonical)) {
        index.byCanonicalUrl.set(canonical, record);
      }
    }
    if (record.source_url) index.domains.add(domainOf(record.source_url));
    if (record.organization) index.organizations.add(record.organization.toLowerCase());
    const fingerprint = normalizeTitleOrg(record.title, record.organization);
    if (fingerprint !== "|") {
      index.byFingerprint.set(fingerprint, record);
      index.fingerprints.push(fingerprint);
    }
  }
  return index;
}

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

type Classification =
  | "new_url"
  | "duplicate_within_run"
  | "existing_recently_checked"
  | "existing_due_for_recheck"
  | "existing_deadline_approaching"
  | "existing_expired"
  | "duplicate_title_organization"
  | "rejected_low_quality_domain";

type ClassifiedDoc = {
  doc: ExaDoc;
  canonicalUrl: string;
  classification: Classification;
  existing?: ExistingRecord;
  score: number;
};

const DAY_MS = 86_400_000;

function daysSince(iso: string | undefined, now: number): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (now - t) / DAY_MS;
}

function daysUntil(iso: string | undefined, now: number): number {
  if (!iso) return Infinity;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? Infinity : (t - now) / DAY_MS;
}

function classifyExisting(existing: ExistingRecord, now: number): Classification {
  const untilDeadline = daysUntil(existing.application_deadline, now);
  if (untilDeadline < -1) return "existing_expired";
  const sinceChecked = daysSince(existing.lastCheckedAt ?? existing.createdAt, now);
  if (sinceChecked < 7) return "existing_recently_checked";
  if (sinceChecked <= 30) {
    // 7-30 days: recheck only when the deadline is coming up.
    return untilDeadline <= 45 ? "existing_deadline_approaching" : "existing_recently_checked";
  }
  return "existing_due_for_recheck"; // >30 days (including no-deadline records)
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

type LambdaEvent = { trigger?: string; limit?: number; write?: boolean };

export async function handler(event: LambdaEvent = {}) {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const now = Date.now();
  const defaultLimit = Number(process.env["OPPORTUNITY_SEARCH_LIMIT"] ?? 5);
  const limit = Math.max(1, Math.min(50, event.limit ?? defaultLimit));
  const dryRun = event.write === false || event.trigger === "discovery-dry-run";
  const exaApiKey = requireEnv("EXA_API_KEY");

  console.log(JSON.stringify({ runId, trigger: event.trigger ?? "unknown", limit, dryRun }));

  const errors: string[] = [];
  const index = await loadExistingIndex();

  // --- discover ------------------------------------------------------------
  const dayIndex = Math.floor(now / DAY_MS);
  const queries = queriesForDay(dayIndex);
  const discovered: ExaDoc[] = [];
  for (const { group, query } of queries) {
    try {
      discovered.push(...(await exaSearch(exaApiKey, group, query)));
    } catch (error) {
      errors.push(`exa:${group}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // --- classify ------------------------------------------------------------
  const counts: Record<Classification, number> = {
    new_url: 0,
    duplicate_within_run: 0,
    existing_recently_checked: 0,
    existing_due_for_recheck: 0,
    existing_deadline_approaching: 0,
    existing_expired: 0,
    duplicate_title_organization: 0,
    rejected_low_quality_domain: 0,
  };
  const seenThisRun = new Set<string>();
  const classified: ClassifiedDoc[] = [];
  const domainTally: Record<string, number> = {};

  for (const doc of discovered) {
    const canonicalUrl = canonicalizeUrl(doc.url);
    if (!canonicalUrl) continue;
    const domain = domainOf(canonicalUrl);
    domainTally[domain] = (domainTally[domain] ?? 0) + 1;

    let classification: Classification;
    let existing = index.byCanonicalUrl.get(canonicalUrl);

    if (seenThisRun.has(canonicalUrl)) {
      classification = "duplicate_within_run";
    } else if (LOW_VALUE_DOMAINS.has(domain)) {
      classification = "rejected_low_quality_domain";
    } else if (existing) {
      classification = classifyExisting(existing, now);
    } else {
      // Similarity dedup: same program under a different URL links to the
      // existing record instead of becoming a second opportunity.
      const fingerprint = normalizeTitleOrg(doc.title, domain);
      let best: { fp: string; sim: number } | undefined;
      for (const fp of index.fingerprints) {
        const sim = fingerprintSimilarity(fingerprint, fp);
        if (!best || sim > best.sim) best = { fp, sim };
      }
      if (best && best.sim >= SIMILARITY_THRESHOLD) {
        classification = "duplicate_title_organization";
        existing = index.byFingerprint.get(best.fp);
      } else {
        classification = "new_url";
      }
    }
    seenThisRun.add(canonicalUrl);
    counts[classification] += 1;

    const textLower = `${doc.title} ${doc.text.slice(0, 3000)}`.toLowerCase();
    const score = noveltyScore({
      isNewCanonicalUrl: !existing,
      isNewOrganization: !index.organizations.has(domain),
      isNewDomain: !index.domains.has(domain),
      publishedRecently: daysSince(doc.publishedDate ?? undefined, now) < 180,
      applicationOpen: textLower.includes("apply now") || textLower.includes("application") || textLower.includes("register"),
      gradeRelevant: /grade|9th|10th|11th|12th|high school/.test(textLower),
      texasRelevant: /houston|texas/.test(textLower),
      officialSource: isOfficialDomain(domain),
      duplicateTitleSimilarity: classification === "duplicate_title_organization" ? 1 : 0,
      recentlyChecked: classification === "existing_recently_checked",
      lowValueDomain: LOW_VALUE_DOMAINS.has(domain),
      expiredOrNoDeadline: classification === "existing_expired",
    });
    classified.push({ doc, canonicalUrl, classification, existing, score });
  }

  // --- budget selection ----------------------------------------------------
  // 75% new / 20% recheck / 5% deadline-sensitive; unused recheck capacity
  // flows to new URLs; recurring results never eat the new-URL allocation.
  const perDomainCap = (domain: string) => (domain.endsWith(".edu") ? 5 : 3);
  const domainUsed: Record<string, number> = {};
  const pickTop = (pool: ClassifiedDoc[], budget: number, capDomains: boolean) => {
    const picked: ClassifiedDoc[] = [];
    for (const item of [...pool].sort((a, b) => b.score - a.score)) {
      if (picked.length >= budget) break;
      const domain = domainOf(item.canonicalUrl);
      if (capDomains) {
        const used = domainUsed[domain] ?? 0;
        if (used >= perDomainCap(domain)) continue;
        domainUsed[domain] = used + 1;
      }
      picked.push(item);
    }
    return picked;
  };

  const newPool = classified.filter((c) => c.classification === "new_url");
  const recheckPool = classified.filter((c) => c.classification === "existing_due_for_recheck");
  const deadlinePool = classified.filter((c) => c.classification === "existing_deadline_approaching");

  const deadlineBudget = Math.max(0, Math.floor(limit * 0.05));
  const recheckBudget = Math.max(0, Math.floor(limit * 0.2));
  const pickedDeadline = pickTop(deadlinePool, deadlineBudget, false);
  const pickedRecheck = pickTop(recheckPool, recheckBudget, false);
  const newBudget = limit - pickedDeadline.length - pickedRecheck.length;
  const pickedNew = pickTop(newPool, newBudget, true);
  const toProcess = [...pickedNew, ...pickedRecheck, ...pickedDeadline];

  // --- link near-duplicates as alternate sources (no new records) ----------
  let alternateLinksAdded = 0;
  if (!dryRun) {
    for (const item of classified) {
      if (item.classification !== "duplicate_title_organization" || !item.existing) continue;
      const existingAlternates = item.existing.alternateSourceUrls ?? [];
      if (existingAlternates.includes(item.canonicalUrl)) continue;
      try {
        await updateItem(
          { PK: item.existing.PK, SK: "OPPORTUNITY" },
          {
            alternateSourceUrls: [...existingAlternates, item.canonicalUrl].slice(0, 10),
            lastCheckedAt: new Date().toISOString(),
          },
        );
        alternateLinksAdded += 1;
      } catch (error) {
        errors.push(`alt-link: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  const topRepeatedDomains = Object.entries(domainTally)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([domain, count]) => `${domain}:${count}`);

  const discoverySummary = {
    documentsDiscovered: discovered.length,
    uniqueCanonicalUrls: seenThisRun.size,
    duplicateWithinRun: counts.duplicate_within_run,
    duplicateExistingUrl:
      counts.existing_recently_checked + counts.existing_due_for_recheck +
      counts.existing_deadline_approaching + counts.existing_expired,
    duplicateTitleOrganization: counts.duplicate_title_organization,
    existingRecentlyChecked: counts.existing_recently_checked,
    existingDueForRecheck: counts.existing_due_for_recheck,
    existingDeadlineSensitive: counts.existing_deadline_approaching,
    rejectedLowQualityDomain: counts.rejected_low_quality_domain,
    newCandidateUrls: counts.new_url,
    newUrlsSentToDeepSeek: pickedNew.length,
    existingUrlsSentToDeepSeek: pickedRecheck.length + pickedDeadline.length,
    topRepeatedDomains,
    queryGroupsUsed: [...new Set(queries.map((q) => q.group))],
  };

  if (dryRun) {
    const result = {
      ok: errors.length === 0,
      runId,
      mode: "discovery-dry-run",
      ...discoverySummary,
      projectedDeepSeekCalls: toProcess.length,
      projectedNewInserts: pickedNew.length,
      errors,
    };
    console.log(JSON.stringify(result));
    return result;
  }

  // --- audit artifact ------------------------------------------------------
  const rawKey = `opportunities/runs/${runId}/raw.json`;
  await uploadJson(rawKey, {
    runId,
    limit,
    summary: discoverySummary,
    classifications: classified.map((c) => ({
      url: c.canonicalUrl,
      classification: c.classification,
      score: c.score,
      selected: toProcess.includes(c),
    })),
    documents: toProcess.map((c) => ({ ...c.doc, canonicalUrl: c.canonicalUrl })),
  });

  // --- structure (concurrency 5) -------------------------------------------
  type Extracted = { record: Record<string, unknown>; item: ClassifiedDoc };
  const extracted: Extracted[] = [];
  let deepSeekFailures = 0;
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(5, toProcess.length) }, async () => {
      while (cursor < toProcess.length) {
        const item = toProcess[cursor]!;
        cursor += 1;
        try {
          const record = await structureWithDeepSeek(item.doc);
          extracted.push({ record, item });
        } catch (error) {
          deepSeekFailures += 1;
          errors.push(`deepseek:${item.canonicalUrl}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }),
  );

  const extractedKey = `opportunities/runs/${runId}/extracted.json`;
  await uploadJson(extractedKey, {
    runId,
    extracted: extracted.map((e) => ({ ...e.record, source_url: e.item.canonicalUrl, discovery_category: e.item.doc.group })),
  });

  // --- persist (history-preserving) ----------------------------------------
  const nowIso = new Date().toISOString();
  const contentHashOf = (record: Record<string, unknown>) => sha256Hex(JSON.stringify(record));
  let newInserts = 0;
  let contentUpdates = 0;
  let unchangedChecked = 0;
  let rejectedExpired = 0;
  let rejectedNonStem = 0;
  const items: Record<string, unknown>[] = [];

  for (const { record, item } of extracted) {
    const stemFields = Array.isArray(record["stem_fields"]) ? record["stem_fields"] : [];
    if (item.classification === "new_url" && stemFields.length === 0) {
      rejectedNonStem += 1;
      continue;
    }
    const deadline = typeof record["application_deadline"] === "string" ? Date.parse(record["application_deadline"]) : NaN;
    if (item.classification === "new_url" && !Number.isNaN(deadline) && deadline < now - DAY_MS) {
      rejectedExpired += 1;
      continue;
    }

    const pk = item.existing?.PK ?? `OPPORTUNITY#${sha256Hex(item.canonicalUrl).slice(0, 16)}`;
    const existing = await getItem({ PK: pk, SK: "OPPORTUNITY" });
    const hash = contentHashOf(record);
    const changed = !existing || existing["contentHash"] !== hash;
    if (!existing) newInserts += 1;
    else if (changed) contentUpdates += 1;
    else unchangedChecked += 1;

    items.push({
      PK: pk,
      SK: "OPPORTUNITY",
      entityType: "opportunity",
      ...record,
      source_url: item.canonicalUrl,
      discovery_category: item.doc.group,
      alternateSourceUrls: (existing?.["alternateSourceUrls"] as string[] | undefined) ?? [],
      contentHash: hash,
      runId,
      reviewStatus: existing?.["reviewStatus"] ?? "pending",
      published: existing?.["published"] ?? false,
      createdAt: existing?.["createdAt"] ?? nowIso,
      updatedAt: changed ? nowIso : (existing?.["updatedAt"] ?? nowIso),
      lastCheckedAt: nowIso,
    });
  }
  const written = items.length > 0 ? await batchWriteWithRetry(items.map((put) => ({ put }))) : 0;

  const result = {
    ok: errors.length === 0,
    runId,
    trigger: event.trigger ?? "unknown",
    ...discoverySummary,
    dynamoItemsWritten: written,
    newInserts,
    contentUpdates,
    unchangedChecked,
    alternateLinksAdded,
    rejectedExpired,
    rejectedNonStem,
    deepSeekFailures,
    s3RawKey: rawKey,
    s3ExtractedKey: extractedKey,
    errors,
  };
  console.log(JSON.stringify(result));
  return result;
}
