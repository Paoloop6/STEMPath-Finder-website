// Server-side repository over the DynamoDB single-table pathway data.
//
// The browser never talks to DynamoDB and never sees AWS credentials or S3
// keys — routes call this module and return only the fields the UI needs.

import { queryByPrefix, queryProfileItems, updateItem } from "@workspace/aws";

export type ProfileRow = {
  PK: string;
  SK: string;
  profileId: string;
  sourceUrl: string;
  status: string;
  /** Nulled by anonymization; never returned to the browser. */
  profileName?: string | null;
  /** Stable anonymous display label, e.g. "Student 007". */
  anonymousLabel?: string;
  intendedMajors?: string[];
  acceptedSchools?: string[];
  stemFields?: string[];
  sourceVideoUrls?: string[];
  evidenceUrls?: string[];
  s3RawKey?: string;
  s3ExtractedKey?: string;
  lastProcessedAt?: string;
};

export type ActivityRow = {
  PK: string;
  SK: string;
  entityType: "activity";
  title: string;
  experienceType: string;
  stemField: string;
  organization: string | null;
  role: string | null;
  description: string;
  gradeLevels: string[];
  termType: string;
  skills: string[];
  sourceUrl: string;
  evidenceUrls: string[];
  evidenceStatus: "self_reported" | "supported";
  confidence: number;
  reviewStatus: "pending" | "approved" | "rejected";
  published: boolean;
};

export type AwardRow = {
  PK: string;
  SK: string;
  entityType: "award";
  name: string;
  category: string;
  level: string;
  year: number | null;
  sourceUrl: string;
  reviewStatus: "pending" | "approved" | "rejected";
  published: boolean;
};

type CacheEntry = { at: number; profiles: ProfileRow[] };
let profileCache: CacheEntry | undefined;
const CACHE_TTL_MS = 60_000;

export async function listProfiles(force = false): Promise<ProfileRow[]> {
  if (!force && profileCache && Date.now() - profileCache.at < CACHE_TTL_MS) {
    return profileCache.profiles;
  }
  const rows = await queryByPrefix<ProfileRow>("PROFILE#", "PROFILE");
  const profiles = rows.filter(
    (row) => row.SK === "PROFILE" && row.status === "completed",
  );
  profileCache = { at: Date.now(), profiles };
  return profiles;
}

export function invalidateProfileCache(): void {
  profileCache = undefined;
}

export async function getProfileEntities(
  profileId: string,
): Promise<{ activities: ActivityRow[]; awards: AwardRow[] }> {
  const items = await queryProfileItems<ActivityRow | AwardRow>(profileId);
  return {
    activities: items.filter((item): item is ActivityRow =>
      item.SK.startsWith("ACTIVITY#"),
    ),
    awards: items.filter((item): item is AwardRow =>
      item.SK.startsWith("AWARD#"),
    ),
  };
}

export async function reviewItem(
  profileId: string,
  sk: string,
  update: Record<string, unknown>,
): Promise<void> {
  if (!sk.startsWith("ACTIVITY#") && !sk.startsWith("AWARD#")) {
    throw new Error("Only activity and award items can be reviewed");
  }
  await updateItem({ PK: `PROFILE#${profileId}`, SK: sk }, update);
}
