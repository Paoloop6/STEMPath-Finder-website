// Server-side DynamoDB repository for Lambda-written STEM opportunities.
//
// The single source of truth for opportunity data is the stempath-data table
// (PK=OPPORTUNITY#<stableId>, SK=OPPORTUNITY), written by the
// stempath-daily-opportunities Lambda. The browser never touches DynamoDB or
// AWS credentials — everything flows through this module on the server.
// Credentials resolve via the SDK default chain: the local AWS profile in
// development, IAM role credentials in deployed environments.

import {
  awsConfig,
  getDynamoDocumentClient,
  ScanCommand,
} from "@workspace/aws";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type NormalizedOpportunity = {
  opportunityId: string;
  /** Stable numeric id derived from opportunityId, for legacy numeric routes. */
  numericId: number;
  title: string;
  organization: string | null;
  opportunityType: string | null;
  stemFields: string[];
  description: string;
  eligibility: string;
  gradeLevels: string[];
  location: string | null;
  remoteStatus: "remote" | "in-person" | "hybrid" | "unknown";
  deadline: string | null;
  applicationOpenDate: string | null;
  applicationStatus: string | null;
  cost: string | null;
  compensation: string | null;
  officialUrl: string | null;
  applicationUrl: string | null;
  experienceLevel: string | null;
  timeCommitment: string | null;
  minAge: number | null;
  maxAge: number | null;
  /** Precomputed coordinates from server-side geocoding (null until geocoded). */
  lat: number | null;
  lng: number | null;
  reviewStatus: string;
  published: boolean;
  createdAt: string | null;
  /** Bumped only when extracted content changed (null on legacy records). */
  updatedAt: string | null;
  /** Every run that re-verified this record (null on legacy records). */
  lastCheckedAt: string | null;
  /** Lambda ingestion run that wrote this record. */
  runId: string | null;
  /** True when the record is too malformed to show anywhere. */
  invalid: boolean;
};

export type OpportunityFilters = {
  opportunityType?: string;
  stemField?: string;
  location?: string;
  remoteStatus?: string;
  gradeLevel?: string;
  deadlineBefore?: string;
  organization?: string;
  keyword?: string;
  /** Admin-only escape hatch; expired records stay hidden without it. */
  includeExpired?: boolean;
};

// ---------------------------------------------------------------------------
// Fetch + cache (short TTL so new Lambda records appear without restarts)
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 30_000;
let cache: { at: number; records: NormalizedOpportunity[] } | undefined;

async function scanOpportunityItems(): Promise<Record<string, unknown>[]> {
  const client = getDynamoDocumentClient();
  const items: Record<string, unknown>[] = [];
  let lastKey: Record<string, unknown> | undefined;
  do {
    const result = await client.send(
      new ScanCommand({
        TableName: awsConfig.dynamoTable,
        FilterExpression: "begins_with(PK, :pk) AND SK = :sk",
        ExpressionAttributeValues: {
          ":pk": "OPPORTUNITY#",
          ":sk": "OPPORTUNITY",
        },
        ExclusiveStartKey: lastKey,
      }),
    );
    items.push(...((result.Items ?? []) as Record<string, unknown>[]));
    lastKey = result.LastEvaluatedKey;
  } while (lastKey);
  return items;
}

export async function fetchAllOpportunities(
  force = false,
): Promise<NormalizedOpportunity[]> {
  if (!force && cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.records;
  }
  const records = (await scanOpportunityItems()).map(normalizeOpportunity);
  cache = { at: Date.now(), records };
  return records;
}

export function invalidateOpportunityCache(): void {
  cache = undefined;
}

// ---------------------------------------------------------------------------
// Normalization — Lambda records use snake_case and may have gaps.
// ---------------------------------------------------------------------------

const str = (v: unknown): string | null =>
  typeof v === "string" && v.trim() !== "" ? v.trim() : null;
const arr = (v: unknown): string[] =>
  Array.isArray(v)
    ? v.filter((x): x is string => typeof x === "string" && x !== "")
    : [];
const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v) ? v : null;

function remoteStatusOf(
  programFormat: string | null,
): NormalizedOpportunity["remoteStatus"] {
  const f = (programFormat ?? "").toLowerCase();
  if (f.includes("hybrid")) return "hybrid";
  if (f.includes("remote") || f.includes("online") || f.includes("virtual"))
    return "remote";
  if (
    f.includes("person") ||
    f.includes("residential") ||
    f.includes("on-site") ||
    f.includes("campus")
  )
    return "in-person";
  return "unknown";
}

export function normalizeOpportunity(
  item: Record<string, unknown>,
): NormalizedOpportunity {
  const pk = String(item["PK"] ?? "");
  const opportunityId = pk.startsWith("OPPORTUNITY#")
    ? pk.slice("OPPORTUNITY#".length)
    : pk;
  const officialUrl = str(item["official_url"]) ?? str(item["source_url"]);
  const title = str(item["title"]);
  const eligibilityParts = [
    str(item["prerequisites"]),
    str(item["citizenship_requirements"]),
    str(item["residency_requirements"]),
  ].filter(Boolean);
  const compensation =
    item["stipend_available"] === true
      ? "Stipend available"
      : item["stipend_available"] === false
        ? null
        : str(item["compensation"]);

  return {
    opportunityId,
    numericId: parseInt(opportunityId.slice(0, 8), 16) || 0,
    title: title ?? "Untitled opportunity",
    organization: str(item["organization"]),
    opportunityType:
      str(item["opportunity_type"]) ?? str(item["discovery_category"]),
    stemFields: arr(item["stem_fields"]),
    description: str(item["good_for"]) ?? str(item["extra_information"]) ?? "",
    eligibility: eligibilityParts.join(" · "),
    gradeLevels: arr(item["eligible_grades"]),
    location: str(item["location"]),
    remoteStatus: remoteStatusOf(str(item["program_format"])),
    deadline: str(item["application_deadline"]),
    applicationOpenDate: str(item["application_open_date"]),
    applicationStatus: str(item["application_status"]),
    cost: str(item["cost"]),
    compensation,
    officialUrl,
    applicationUrl: str(item["application_url"]) ?? officialUrl,
    experienceLevel: str(item["experience_level"]),
    timeCommitment: str(item["time_commitment"]),
    minAge: num(item["minimum_age"]),
    maxAge: num(item["maximum_age"]),
    lat: num(item["lat"]),
    lng: num(item["lng"]),
    reviewStatus: str(item["reviewStatus"]) ?? "pending",
    published: item["published"] === true,
    createdAt: str(item["createdAt"]),
    updatedAt: str(item["updatedAt"]),
    lastCheckedAt: str(item["lastCheckedAt"]),
    runId: str(item["runId"]),
    invalid: !title || !officialUrl,
  };
}

// ---------------------------------------------------------------------------
// Visibility, filtering, ranking
// ---------------------------------------------------------------------------

export function pendingRecordsAllowed(): boolean {
  return (
    process.env["NODE_ENV"] !== "production" &&
    process.env["SHOW_PENDING_OPPORTUNITIES"] === "true"
  );
}

function isExpired(record: NormalizedOpportunity, now: Date): boolean {
  if (!record.deadline) return false;
  const deadline = new Date(record.deadline);
  if (Number.isNaN(deadline.getTime())) return false;
  return deadline.getTime() < now.getTime() - 24 * 3600 * 1000;
}

/** Visibility rules — never silently publishes or approves anything. */
export function visibleOpportunities(
  records: NormalizedOpportunity[],
  includeExpired = false,
): NormalizedOpportunity[] {
  const now = new Date();
  const allowPending = pendingRecordsAllowed();
  return records.filter((record) => {
    if (record.invalid) return false;
    if (record.reviewStatus === "rejected") return false;
    if (!record.published && !allowPending) return false;
    if (!includeExpired && isExpired(record, now)) return false;
    return true;
  });
}

function relevanceScore(
  record: NormalizedOpportunity,
  keyword?: string,
): number {
  let score = 0;
  if (keyword) {
    const haystack = [
      record.title,
      record.organization,
      record.description,
      record.stemFields.join(" "),
      record.opportunityType,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    for (const term of keyword.toLowerCase().split(/\s+/).filter(Boolean)) {
      if (haystack.includes(term)) score += 2;
    }
  }
  if (record.deadline) score += 1; // records with a real deadline rank above unknowns
  if (record.published) score += 1;
  return score;
}

export async function listOpportunities(
  filters: OpportunityFilters = {},
): Promise<NormalizedOpportunity[]> {
  const all = await fetchAllOpportunities();
  let records = visibleOpportunities(all, filters.includeExpired === true);

  const contains = (value: string | null, needle?: string) =>
    !needle || (value ?? "").toLowerCase().includes(needle.toLowerCase());

  records = records.filter(
    (r) =>
      contains(r.opportunityType, filters.opportunityType) &&
      (!filters.stemField ||
        r.stemFields.some((f) =>
          f.toLowerCase().includes(filters.stemField!.toLowerCase()),
        )) &&
      contains(r.location, filters.location) &&
      (!filters.remoteStatus ||
        r.remoteStatus === filters.remoteStatus ||
        r.remoteStatus === "unknown") &&
      (!filters.gradeLevel ||
        r.gradeLevels.length === 0 ||
        r.gradeLevels.some((g) =>
          g.toLowerCase().includes(filters.gradeLevel!.toLowerCase()),
        )) &&
      (!filters.deadlineBefore ||
        !r.deadline ||
        r.deadline <= filters.deadlineBefore) &&
      contains(r.organization, filters.organization) &&
      (!filters.keyword || relevanceScore(r, filters.keyword) > 0),
  );

  // Soonest real deadline first, then relevance, then recency.
  return records.sort((a, b) => {
    const da = a.deadline ?? "9999-12-31";
    const db = b.deadline ?? "9999-12-31";
    if (da !== db) return da < db ? -1 : 1;
    const rel =
      relevanceScore(b, filters.keyword) - relevanceScore(a, filters.keyword);
    if (rel !== 0) return rel;
    return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
  });
}

export async function findOpportunityByAnyId(
  id: string,
): Promise<NormalizedOpportunity | undefined> {
  const all = visibleOpportunities(await fetchAllOpportunities(), true);
  return all.find((r) => r.opportunityId === id || String(r.numericId) === id);
}

// ---------------------------------------------------------------------------
// Legacy adapter — lets the existing matcher/DeepSeek pipeline consume
// DynamoDB records without a rewrite. Shape mirrors the drizzle Opportunity.
// ---------------------------------------------------------------------------

function costCategoryOf(cost: string | null): string {
  const c = (cost ?? "").toLowerCase();
  if (!c) return "Unknown";
  if (c.includes("free") || c === "$0" || c === "0") return "free";
  return "paid";
}

export function toLegacyOpportunity(record: NormalizedOpportunity) {
  const now = new Date();
  return {
    id: record.numericId,
    name: record.title,
    organization: record.organization ?? "Unknown",
    category: record.opportunityType ?? "Unknown",
    stemField: record.stemFields.join(", ") || "Unknown",
    eligibleGrades: record.gradeLevels.join(", ") || "Unknown",
    minAge: record.minAge,
    maxAge: record.maxAge,
    location: record.location ?? "Unknown",
    format: record.remoteStatus === "unknown" ? "Unknown" : record.remoteStatus,
    costCategory: costCategoryOf(record.cost),
    costAmount: record.cost,
    deadline: record.deadline,
    applicationOpenDate: record.applicationOpenDate,
    experienceLevel: record.experienceLevel ?? "Unknown",
    timeCommitment: record.timeCommitment ?? "Unknown",
    requirements: record.eligibility,
    officialUrl: record.officialUrl ?? "",
    sourceUrls: "",
    summary: record.description,
    verificationStatus: "needs_verification",
    published: record.published,
    lastVerifiedDate: null,
    isSampleData: false,
    createdAt: record.createdAt ? new Date(record.createdAt) : now,
    updatedAt: now,
  };
}
