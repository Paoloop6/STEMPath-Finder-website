// ===========================================================================
// DISABLED — ONE-TIME IMPORT COMPLETED
//
// This importer already ran to completion (63 profiles, 2026-07-31). It is
// kept only as an archived manual script. It refuses to run unless the
// environment variable ALLOW_ECDATABASE_IMPORT=true is explicitly set.
// There are NO automatic triggers for this script: no EventBridge, no Lambda,
// no Supabase cron, no local cron, no CI schedule, no background worker.
// ===========================================================================
//
// One-time EC Database STEM backfill.
//
// Discovers public applicant profiles from the filtered ecdatabase.org
// dashboard (server-rendered HTML — no auth, no hidden endpoints), stores the
// raw page representation in S3, extracts structured STEM activities/awards
// with DeepSeek, and writes review-pending records to DynamoDB.
//
//   npm run import:ecdatabase -- --dry-run --limit=3
//   npm run import:ecdatabase
//   npm run import:ecdatabase -- --resume
//
// Never modifies PK=PROFILE#test-001 / SK=PROFILE.

import {
  batchWriteWithRetry,
  getItem,
  putItem,
  sha256Hex,
  updateItem,
  uploadJson,
  queryByPrefix,
  type BatchWriteRequest,
} from "@workspace/aws";
import { buildNamePatterns, redactRecord } from "./redact-names";

// ---------------------------------------------------------------------------
// Anonymous label allocation. Labels are persisted on the profile record and
// never change once assigned; new profiles continue after the current maximum.
// ---------------------------------------------------------------------------

let nextLabelNumber = 0;

async function initLabelAllocator(): Promise<void> {
  const rows = await queryByPrefix<{ anonymousLabel?: string }>(
    "PROFILE#",
    "PROFILE",
  );
  nextLabelNumber = Math.max(
    0,
    ...rows.map((row) => {
      const match = row.anonymousLabel?.match(/^Student (\d+)$/);
      return match ? Number(match[1]) : 0;
    }),
  );
}

function allocateLabel(): string {
  nextLabelNumber += 1;
  return `Student ${String(nextLabelNumber).padStart(3, "0")}`;
}

// --------------------------------------------------------------------------
// Hard safety check: the one-time import is complete. Refuse to crawl unless
// explicitly re-enabled for a deliberate manual run.
// --------------------------------------------------------------------------

if (process.env["ALLOW_ECDATABASE_IMPORT"] !== "true") {
  console.log("EC Database import is disabled. Existing imported data will be used.");
  process.exit(0);
}

// --------------------------------------------------------------------------
// CLI flags
// --------------------------------------------------------------------------

const argv = process.argv.slice(2);
const DRY_RUN = argv.includes("--dry-run");
const RESUME = argv.includes("--resume");
const limitArg = argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Infinity;
if (Number.isNaN(LIMIT) || LIMIT <= 0) {
  throw new Error(`Invalid --limit value: ${limitArg}`);
}

const CONCURRENCY = 3;
const MAX_RETRIES = 3;
const RESERVED_PROFILE_IDS = new Set(["test-001"]);
const MAX_MODEL_INPUT_CHARS = 12000;

const DASHBOARD_URL =
  "https://ecdatabase.org/dashboard?schools=Harvard%2CYale%2CPrinceton%2CPenn%2CCornell%2CDartmouth%2CBrown%2CColumbia%2CStanford%2CMIT%2CUCLA%2CUChicago%2CDuke%2CJohns+Hopkins%2CNorthwestern%2CCarnegie+Mellon%2CRice%2CVanderbilt%2CCaltech%2CTufts%2CNotre+Dame%2CWashU%2CGeorgetown%2CBC%2CBU%2CNYU%2CMichigan%2CEmory%2CNortheastern%2CUCI%2CUCSD%2CUCSB%2CUC+Davis%2CBerkeley%2CGeorgia+Tech%2CUIUC%2CUVA%2CPurdue%2CUW-Madison%2CUGA%2CUF%2COhio+State%2CUW%2CUT+Austin%2CUNC%2CUSC%2CUMD&majors=Computer+Science%2CEngineering%2CBiology%2CMathematics%2CEnvironmental+Science%2CPhysics";

const ORIGIN = "https://ecdatabase.org";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 STEMPathFinderImport/1.0";

// --------------------------------------------------------------------------
// Counters
// --------------------------------------------------------------------------

const stats = {
  profilesDiscovered: 0,
  profilesCompleted: 0,
  profilesFailed: 0,
  activitiesExamined: 0,
  stemActivitiesRetained: 0,
  nonStemItemsExcluded: 0,
  duplicatesSkipped: 0,
  s3RawWritten: 0,
  s3ExtractedWritten: 0,
  dynamoInserted: 0,
  dynamoUpdated: 0,
  pendingReview: 0,
};

function log(message: string): void {
  console.log(message);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// --------------------------------------------------------------------------
// Fetching
// --------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(1000 * 2 ** attempt);
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT },
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} for ${url}`);
      }
      return await response.text();
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// --------------------------------------------------------------------------
// Discovery
// --------------------------------------------------------------------------

function extractProfileSlugs(html: string): Set<string> {
  const slugs = new Set<string>();
  for (const match of html.matchAll(/\/profiles\/([a-zA-Z0-9_-]+)/g)) {
    slugs.add(match[1]!);
  }
  return slugs;
}

/**
 * The dashboard is fully server-rendered (no Load More button, no client
 * pagination endpoint). We still honor the "two consecutive passes with no new
 * URLs" rule by re-fetching until the merged set stops growing.
 */
async function discoverProfiles(): Promise<string[]> {
  const all = new Set<string>();
  let emptyPasses = 0;
  let pass = 0;
  while (emptyPasses < 2) {
    pass += 1;
    const html = await fetchHtml(DASHBOARD_URL);
    const before = all.size;
    for (const slug of extractProfileSlugs(html)) all.add(slug);
    const added = all.size - before;
    log(`  discovery pass ${pass}: ${added} new, ${all.size} total`);
    emptyPasses = added === 0 ? emptyPasses + 1 : 0;
    await sleep(500);
  }
  return [...all].sort();
}

// --------------------------------------------------------------------------
// Profile page parsing
// --------------------------------------------------------------------------

type RawProfile = {
  profileId: string;
  sourceUrl: string;
  fetchedAt: string;
  text: string;
  videoUrls: string[];
  evidenceUrls: string[];
  html: string;
};

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

function htmlToText(html: string): string {
  const withoutScripts = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
  const withBreaks = withoutScripts.replace(/<[^>]+>/g, "\n");
  return decodeEntities(withBreaks)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
}

function extractUrls(html: string): {
  videoUrls: string[];
  evidenceUrls: string[];
} {
  const videoUrls = new Set<string>();
  const evidenceUrls = new Set<string>();
  for (const match of html.matchAll(
    /https:\/\/(?:www\.)?(?:youtube\.com|youtu\.be)\/[a-zA-Z0-9_\-/?=&.]+/g,
  )) {
    videoUrls.add(match[0]);
  }
  for (const match of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
    const url = decodeEntities(match[1]!);
    let host: string;
    try {
      host = new URL(url).hostname;
    } catch {
      continue;
    }
    // Site chrome and infrastructure, not applicant evidence.
    const INFRA_HOSTS = [
      "ecdatabase.org",
      "supabase.co",
      "youtube.com",
      "youtu.be",
      "fonts.googleapis.com",
      "fonts.gstatic.com",
      "gstatic.com",
      "google.com",
      "googletagmanager.com",
      "google-analytics.com",
      "vercel.com",
      "schema.org",
      "w3.org",
    ];
    if (INFRA_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
      continue;
    }
    evidenceUrls.add(url);
  }
  return {
    videoUrls: [...videoUrls].sort(),
    evidenceUrls: [...evidenceUrls].sort(),
  };
}

async function fetchProfile(profileId: string): Promise<RawProfile> {
  const sourceUrl = `${ORIGIN}/profiles/${profileId}`;
  const html = await fetchHtml(sourceUrl);
  const { videoUrls, evidenceUrls } = extractUrls(html);
  return {
    profileId,
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    text: htmlToText(html),
    videoUrls,
    evidenceUrls,
    html,
  };
}

// --------------------------------------------------------------------------
// DeepSeek extraction
// --------------------------------------------------------------------------

const EXTRACTION_SYSTEM_PROMPT = `You extract structured data from a public college-applicant profile page.

Return STRICT JSON only, matching exactly this shape:

{
  "profileName": string,
  "intendedMajors": string[],
  "acceptedSchools": string[],
  "activities": [
    {
      "title": string,
      "isStem": boolean,
      "stemField": string,
      "experienceType": "internship" | "research" | "competition" | "project" | "club" | "program" | "publication" | "tutoring" | "outreach" | "clinical" | "volunteering" | "work" | "other",
      "organization": string | null,
      "role": string | null,
      "description": string,
      "gradeLevels": string[],
      "termType": "summer" | "school_year" | "unknown",
      "skills": string[],
      "confidence": number
    }
  ],
  "awards": [
    {
      "name": string,
      "isStem": boolean,
      "category": string,
      "level": string,
      "year": number | null,
      "confidence": number
    }
  ]
}

STEM classification (isStem=true) covers: computer science, artificial intelligence, machine learning, data science, software, engineering, robotics, mathematics, biology, chemistry, physics, environmental science, medicine, public health, neuroscience, research, STEM internships, STEM summer programs, STEM competitions, hackathons, publications, technical projects, STEM tutoring, STEM outreach, and clinical experiences connected to medicine or science.

isStem=false for: sports, music, art, debate, Model UN, politics, student government, generic volunteering, generic business activity, and unrelated employment. An otherwise non-STEM activity is STEM only when its central work is clearly STEM (e.g. coding a nonprofit's platform, teaching robotics).

Strict honesty rules — never invent or infer:
- dates, years, grade levels, hours, durations, roles, selectivity, impact, outcomes, evidence, or admissions causation.
- If the page does not state a value: use [] for arrays, null for nullable fields, "unknown" for termType/level, and "" only when a string field is truly absent.
- Copy titles and descriptions from the page, lightly cleaned. Do not embellish.
- List EVERY activity and EVERY award on the page (STEM or not) and mark isStem accordingly.
- "confidence" (0 to 1) is your confidence in the isStem classification.`;

type ExtractedActivity = {
  title: string;
  isStem: boolean;
  stemField: string;
  experienceType: string;
  organization: string | null;
  role: string | null;
  description: string;
  gradeLevels: string[];
  termType: string;
  skills: string[];
  confidence: number;
};

type ExtractedAward = {
  name: string;
  isStem: boolean;
  category: string;
  level: string;
  year: number | null;
  confidence: number;
};

type Extraction = {
  profileName: string;
  intendedMajors: string[];
  acceptedSchools: string[];
  activities: ExtractedActivity[];
  awards: ExtractedAward[];
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}`);
  return value;
}

async function extractWithDeepSeek(raw: RawProfile): Promise<Extraction> {
  const apiKey = requireEnv("DEEPSEEK_API_KEY");
  const baseUrl = requireEnv("DEEPSEEK_BASE_URL");
  const model = requireEnv("DEEPSEEK_MODEL");

  const content = raw.text.slice(0, MAX_MODEL_INPUT_CHARS);

  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(2000 * 2 ** attempt);
    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          temperature: 0,
          // The model emits reasoning tokens before the JSON and max_tokens
          // covers both, so the budget must be generous or content truncates.
          max_tokens: 16000,
          messages: [
            { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
            {
              role: "user",
              content: `Profile URL: ${raw.sourceUrl}\n\nPage text:\n${content}`,
            },
          ],
        }),
        signal: AbortSignal.timeout(120000),
      });
      const data: any = await response.json();
      if (!response.ok) {
        throw new Error(
          `DeepSeek HTTP ${response.status}: ${JSON.stringify(data)}`,
        );
      }
      const choice = data.choices?.[0];
      const message: string | undefined = choice?.message?.content;
      if (!message) {
        throw new Error(
          `DeepSeek returned no content (finish_reason: ${choice?.finish_reason})`,
        );
      }
      if (choice.finish_reason === "length") {
        throw new Error("DeepSeek output truncated (finish_reason: length)");
      }
      const cleaned = message
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "");
      const parsed = JSON.parse(cleaned) as Extraction;
      if (!Array.isArray(parsed.activities) || !Array.isArray(parsed.awards)) {
        throw new Error("DeepSeek JSON missing activities/awards arrays");
      }
      parsed.intendedMajors ??= [];
      parsed.acceptedSchools ??= [];
      parsed.profileName ??= "";
      return parsed;
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError;
}

// --------------------------------------------------------------------------
// DynamoDB record building
// --------------------------------------------------------------------------

function stableId(profileId: string, kind: string, title: string): string {
  const normalized = title.toLowerCase().replace(/\s+/g, " ").trim();
  return sha256Hex(`${profileId}|${kind}|${normalized}`).slice(0, 16);
}

function buildActivityItem(
  profileId: string,
  raw: RawProfile,
  activity: ExtractedActivity,
): Record<string, unknown> {
  return {
    PK: `PROFILE#${profileId}`,
    SK: `ACTIVITY#${stableId(profileId, "activity", activity.title)}`,
    entityType: "activity",
    title: activity.title,
    experienceType: activity.experienceType || "other",
    stemField: activity.stemField || "unknown",
    organization: activity.organization ?? null,
    role: activity.role ?? null,
    description: activity.description || "",
    gradeLevels: activity.gradeLevels ?? [],
    termType: activity.termType || "unknown",
    skills: activity.skills ?? [],
    sourceUrl: raw.sourceUrl,
    evidenceUrls: raw.evidenceUrls,
    evidenceStatus: raw.evidenceUrls.length > 0 ? "supported" : "self_reported",
    confidence:
      typeof activity.confidence === "number" ? activity.confidence : 0,
    reviewStatus: "pending",
    published: false,
  };
}

function buildAwardItem(
  profileId: string,
  raw: RawProfile,
  award: ExtractedAward,
): Record<string, unknown> {
  return {
    PK: `PROFILE#${profileId}`,
    SK: `AWARD#${stableId(profileId, "award", award.name)}`,
    entityType: "award",
    name: award.name,
    category: award.category || "unknown",
    level: award.level || "unknown",
    year: award.year ?? null,
    sourceUrl: raw.sourceUrl,
    reviewStatus: "pending",
    published: false,
  };
}

// --------------------------------------------------------------------------
// Per-profile processing
// --------------------------------------------------------------------------

type ProfileRecord = {
  PK: string;
  SK: string;
  profileId: string;
  sourceUrl: string;
  status: string;
  retryCount: number;
  anonymousLabel?: string;
  contentHash?: string;
  firstSeenAt?: string;
  lastSeenAt?: string;
};

async function registerDiscovered(profileId: string): Promise<ProfileRecord> {
  const key = { PK: `PROFILE#${profileId}`, SK: "PROFILE" };
  const now = new Date().toISOString();
  const existing = await getItem<ProfileRecord>(key);
  if (existing) {
    if (!DRY_RUN) await updateItem(key, { lastSeenAt: now });
    return existing;
  }
  const record: ProfileRecord = {
    ...key,
    profileId,
    sourceUrl: `${ORIGIN}/profiles/${profileId}`,
    status: "discovered",
    retryCount: 0,
    firstSeenAt: now,
    lastSeenAt: now,
  };
  if (!DRY_RUN) {
    await putItem(record);
    stats.dynamoInserted += 1;
  }
  return record;
}

async function processProfile(profileId: string): Promise<void> {
  if (RESERVED_PROFILE_IDS.has(profileId)) {
    log(`  [${profileId}] reserved test profile — skipped`);
    return;
  }
  const key = { PK: `PROFILE#${profileId}`, SK: "PROFILE" };
  const existing = await getItem<ProfileRecord>(key);

  if (
    existing &&
    existing.status === "failed" &&
    existing.retryCount >= MAX_RETRIES
  ) {
    log(`  [${profileId}] failed ${existing.retryCount}x — not retrying`);
    stats.profilesFailed += 1;
    return;
  }

  try {
    const raw = await fetchProfile(profileId);
    const contentHash = sha256Hex(raw.text);

    if (
      existing?.status === "completed" &&
      existing.contentHash === contentHash
    ) {
      log(
        `  [${profileId}] unchanged (hash ${contentHash.slice(0, 8)}) — skipped`,
      );
      stats.duplicatesSkipped += 1;
      return;
    }

    if (!DRY_RUN) {
      await updateItem(key, {
        status: "processing",
        updatedAt: new Date().toISOString(),
      });
    }

    const rawKey = `ecdatabase/profiles/${profileId}/raw/${contentHash}.json`;
    if (!DRY_RUN) {
      await uploadJson(rawKey, raw);
      stats.s3RawWritten += 1;
    }

    const extraction = await extractWithDeepSeek(raw);
    const extractedKey = `ecdatabase/profiles/${profileId}/extracted/${contentHash}.json`;
    if (!DRY_RUN) {
      await uploadJson(extractedKey, extraction);
      stats.s3ExtractedWritten += 1;
    }

    const stemActivities = extraction.activities.filter((a) => a.isStem);
    const stemAwards = extraction.awards.filter((a) => a.isStem);
    stats.activitiesExamined += extraction.activities.length;
    stats.stemActivitiesRetained += stemActivities.length;
    stats.nonStemItemsExcluded +=
      extraction.activities.length -
      stemActivities.length +
      (extraction.awards.length - stemAwards.length);

    // Anonymization: the student's name never reaches DynamoDB. It survives
    // only inside the private S3 artifacts (admin presigned access only).
    const namePatterns = buildNamePatterns(extraction.profileName);
    const items: Record<string, unknown>[] = [
      ...stemActivities.map((a) => buildActivityItem(profileId, raw, a)),
      ...stemAwards.map((a) => buildAwardItem(profileId, raw, a)),
    ];
    for (const item of items) redactRecord(item, namePatterns);

    const profileUpdate = {
      profileName: null,
      anonymousLabel: existing?.anonymousLabel ?? allocateLabel(),
      intendedMajors: extraction.intendedMajors,
      acceptedSchools: extraction.acceptedSchools,
      stemFields: [
        ...new Set(stemActivities.map((a) => a.stemField).filter(Boolean)),
      ],
      contentHash,
      s3RawKey: rawKey,
      s3ExtractedKey: extractedKey,
      sourceVideoUrls: raw.videoUrls,
      evidenceUrls: raw.evidenceUrls,
      status: "completed",
      retryCount: 0,
      lastProcessedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      errorMessage: null,
    };

    if (DRY_RUN) {
      log(`\n===== DRY RUN: ${profileId} =====`);
      log(`--- extracted JSON (name masked in logs) ---`);
      log(JSON.stringify({ ...extraction, profileName: "[redacted]" }, null, 2));
      log(`--- proposed profile update (PROFILE#${profileId} / PROFILE) ---`);
      log(JSON.stringify(profileUpdate, null, 2));
      log(`--- proposed items (${items.length}) ---`);
      log(JSON.stringify(items, null, 2));
    } else {
      const written = await batchWriteWithRetry(
        items.map((item): BatchWriteRequest => ({ put: item })),
      );
      stats.dynamoInserted += written;
      stats.pendingReview += written;
      await updateItem(key, profileUpdate);
      stats.dynamoUpdated += 1;
    }
    stats.profilesCompleted += 1;
    log(
      `  [${profileId}] completed: ${stemActivities.length} STEM activities, ${stemAwards.length} STEM awards`,
    );
  } catch (error) {
    stats.profilesFailed += 1;
    const message = error instanceof Error ? error.message : String(error);
    log(`  [${profileId}] FAILED: ${message}`);
    if (!DRY_RUN) {
      await updateItem(key, {
        status: "failed",
        retryCount: (existing?.retryCount ?? 0) + 1,
        errorMessage: message.slice(0, 500),
        updatedAt: new Date().toISOString(),
      });
      stats.dynamoUpdated += 1;
    }
  }
}

// --------------------------------------------------------------------------
// Worker pool
// --------------------------------------------------------------------------

async function runPool(profileIds: string[]): Promise<void> {
  let next = 0;
  const workers = Array.from(
    { length: Math.min(CONCURRENCY, profileIds.length) },
    async () => {
      while (next < profileIds.length) {
        const index = next;
        next += 1;
        const id = profileIds[index]!;
        await processProfile(id);
        await sleep(300);
      }
    },
  );
  await Promise.all(workers);
}

// --------------------------------------------------------------------------
// Main
// --------------------------------------------------------------------------

async function main(): Promise<void> {
  const runId = new Date().toISOString().replace(/[:.]/g, "-");
  const startedAt = new Date().toISOString();
  log(`EC Database STEM import — run ${runId}`);
  log(
    `mode: ${DRY_RUN ? "DRY RUN (no real profile data written)" : RESUME ? "resume" : "full"}${Number.isFinite(LIMIT) ? `, limit ${LIMIT}` : ""}`,
  );

  await initLabelAllocator();
  log("Discovering profiles from filtered dashboard…");
  const discovered = await discoverProfiles();
  stats.profilesDiscovered = discovered.length;
  log(`Discovered ${discovered.length} unique profiles`);

  if (!DRY_RUN) {
    for (const profileId of discovered) {
      if (!RESERVED_PROFILE_IDS.has(profileId))
        await registerDiscovered(profileId);
    }
  }

  const toProcess = discovered
    .filter((id) => !RESERVED_PROFILE_IDS.has(id))
    .slice(0, Number.isFinite(LIMIT) ? LIMIT : undefined);
  log(`Processing ${toProcess.length} profiles (concurrency ${CONCURRENCY})…`);
  await runPool(toProcess);

  const completedAt = new Date().toISOString();
  const runRecord = {
    PK: `RUN#${runId}`,
    SK: "RUN",
    entityType: "ingestionRun",
    startedAt,
    completedAt,
    status: stats.profilesFailed === 0 ? "completed" : "completed_with_errors",
    profilesDiscovered: stats.profilesDiscovered,
    profilesCompleted: stats.profilesCompleted,
    profilesFailed: stats.profilesFailed,
    activitiesExamined: stats.activitiesExamined,
    stemActivitiesRetained: stats.stemActivitiesRetained,
    nonStemItemsExcluded: stats.nonStemItemsExcluded,
    duplicatesSkipped: stats.duplicatesSkipped,
  };
  if (!DRY_RUN) {
    await putItem(runRecord);
    stats.dynamoInserted += 1;
  }

  log("\n===== IMPORT SUMMARY =====");
  log(`profiles discovered:        ${stats.profilesDiscovered}`);
  log(`profiles completed:         ${stats.profilesCompleted}`);
  log(`profiles failed:            ${stats.profilesFailed}`);
  log(`activities examined:        ${stats.activitiesExamined}`);
  log(`STEM activities retained:   ${stats.stemActivitiesRetained}`);
  log(`non-STEM items excluded:    ${stats.nonStemItemsExcluded}`);
  log(`duplicates skipped:         ${stats.duplicatesSkipped}`);
  log(`S3 raw objects written:     ${stats.s3RawWritten}`);
  log(`S3 extracted objects:       ${stats.s3ExtractedWritten}`);
  log(`DynamoDB items inserted:    ${stats.dynamoInserted}`);
  log(`DynamoDB items updated:     ${stats.dynamoUpdated}`);
  log(`pending-review records:     ${stats.pendingReview}`);
  if (DRY_RUN) log("(dry run: no real profile data was written)");
}

main().catch((error: unknown) => {
  console.error("Import failed:", error);
  process.exit(1);
});
