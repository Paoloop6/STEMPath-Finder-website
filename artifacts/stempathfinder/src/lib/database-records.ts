/**
 * Read-only browse access to the live opportunity database.
 *
 * Data comes from AWS DynamoDB (stempath-data), written by the
 * stempath-daily-opportunities Lambda, via the app server's GET
 * /api/opportunities route. The browser never talks to DynamoDB, AWS, or
 * Supabase for this page, and holds no credentials.
 */

/** Bounded so a growing table can never turn this page into an unbounded download. */
export const BROWSE_LIMIT = 500;

export interface DatabaseRecord {
  id: string;
  /** Stable numeric id used in public /opportunities/{slug}-{id} URLs. */
  numeric_id: number | null;
  title: string | null;
  organization: string | null;
  opportunity_type: string | null;
  stem_fields: string[] | null;
  /** Rows carry this as a number array, a string array, or a bare string. */
  eligible_grades: Array<string | number> | string | null;
  location: string | null;
  cost: string | null;
  compensation: string | null;
  application_status: string | null;
  application_deadline: string | null;
  official_url: string | null;
  application_url: string | null;
  program_format: string | null;
  experience_level: string | null;
  time_commitment: string | null;
  good_for: string | null;
  /** Content-change timestamp (updatedAt); null when never changed since discovery. */
  last_verified_at: string | null;
  /** Last time the daily collector re-verified the record (lastCheckedAt). */
  checked_at: string | null;
  /** First-discovery timestamp (createdAt). */
  discovered_at: string | null;
  review_status: string;
  published: boolean;
}

/** Normalized record as returned by the server-side DynamoDB repository. */
type ApiOpportunity = {
  opportunityId: string;
  numericId?: number;
  title: string;
  organization: string | null;
  opportunityType: string | null;
  stemFields: string[];
  description: string;
  gradeLevels: string[];
  location: string | null;
  remoteStatus: string;
  deadline: string | null;
  applicationStatus: string | null;
  cost: string | null;
  compensation?: string | null;
  officialUrl: string | null;
  applicationUrl: string | null;
  experienceLevel: string | null;
  timeCommitment: string | null;
  reviewStatus: string;
  published: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  lastCheckedAt: string | null;
};

export type OpportunityListResponse = {
  source: string;
  table: string;
  pendingVisible: boolean;
  count: number;
  opportunities: ApiOpportunity[];
};

export async function fetchDatabaseRecords(
  refresh = false,
): Promise<{ records: DatabaseRecord[]; meta: OpportunityListResponse }> {
  const response = await fetch(
    `/api/opportunities${refresh ? "?refresh=true" : ""}`,
  );
  if (!response.ok) {
    throw new Error(`Could not load the database (${response.status}).`);
  }
  const meta = (await response.json()) as OpportunityListResponse;
  const records = meta.opportunities.slice(0, BROWSE_LIMIT).map(
    (o): DatabaseRecord => ({
      id: o.opportunityId,
      numeric_id: typeof o.numericId === "number" ? o.numericId : null,
      title: o.title,
      organization: o.organization,
      opportunity_type: o.opportunityType,
      stem_fields: o.stemFields,
      eligible_grades: o.gradeLevels,
      location: o.location,
      cost: o.cost,
      compensation: o.compensation ?? null,
      application_status: o.applicationStatus,
      application_deadline: o.deadline,
      official_url: o.officialUrl,
      application_url: o.applicationUrl,
      program_format: o.remoteStatus === "unknown" ? null : o.remoteStatus,
      experience_level: o.experienceLevel,
      time_commitment: o.timeCommitment,
      good_for: o.description || null,
      // Honest timestamp semantics: discovered = first seen; updated = content
      // actually changed; checked = last re-verified by the daily collector.
      last_verified_at: o.updatedAt,
      checked_at: o.lastCheckedAt ?? o.createdAt,
      discovered_at: o.createdAt,
      review_status: o.reviewStatus,
      published: o.published,
    }),
  );
  return { records, meta };
}

/** `eligible_grades` arrives as an array on some rows and a bare string on others. */
export function gradeLabel(value: DatabaseRecord["eligible_grades"]): string {
  if (Array.isArray(value)) return value.join(", ");
  return value ?? "";
}

/** Turns `university-outreach` into `University outreach` for display. */
export function humanize(value: string | null): string {
  if (!value) return "";
  const spaced = value.replace(/[-_]/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Sorted distinct values for a scalar column, with blanks and "unknown" dropped. */
export function distinctValues(
  records: DatabaseRecord[],
  key: keyof DatabaseRecord,
): string[] {
  const seen = new Set<string>();
  for (const record of records) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (!trimmed || trimmed.toLowerCase() === "unknown") continue;
    seen.add(trimmed);
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/** Sorted distinct values across every row's `stem_fields` array. */
export function distinctStemFields(records: DatabaseRecord[]): string[] {
  const seen = new Set<string>();
  for (const record of records) {
    if (!Array.isArray(record.stem_fields)) continue;
    for (const field of record.stem_fields) {
      if (typeof field === "string" && field.trim()) seen.add(field.trim());
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

/** Free-text match across the fields a student would actually search by. */
export function matchesQuery(record: DatabaseRecord, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    record.title,
    record.organization,
    record.location,
    record.good_for,
    record.opportunity_type,
    ...(Array.isArray(record.stem_fields) ? record.stem_fields : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(q);
}
