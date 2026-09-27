// Student videos: YouTube videos where students explain what got them into
// college, joined to the EC Database pathways they came from and to the
// opportunities in our own database they mention.
//
// Rows are written by scripts/sync-student-videos.ts (VIDEO#<id> / VIDEO).
// The browser never talks to YouTube's API or DynamoDB: thumbnails come from
// i.ytimg.com and playback is a plain youtube-nocookie embed.

import { Router, type IRouter } from "express";
import { queryByPrefix } from "@workspace/aws";
import {
  fetchAllOpportunities,
  type NormalizedOpportunity,
} from "../lib/opportunity-repository";
import {
  getProfileEntities,
  listProfiles,
  type ProfileRow,
} from "../lib/pathways-repo";

const router: IRouter = Router();

type VideoRow = {
  PK: string;
  SK: string;
  videoId: string;
  url: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  thumbnailUrl: string;
  tags?: string[];
  activities?: string[];
  source: "ec_database" | "youtube_search";
  profileId?: string | null;
  published?: boolean;
  story?: RawStory;
};

// Written by scripts/video-story.ts.
type RawStory = {
  evidence: "transcript" | "description";
  isStudentStory: boolean;
  studentName: string | null;
  summary: string | null;
  graduationYear: number | null;
  hometown: string | null;
  committedSchool: string | null;
  acceptedSchools: string[];
  intendedMajors: string[];
  stats: { gpa: string | null; sat: string | null; act: string | null; apCount: number | null };
  activities: StoryActivity[];
  awards: { name: string; level: string | null; year: number | null; startSeconds: number | null }[];
};

type StoryActivity = {
  title: string;
  role: string | null;
  organization: string | null;
  details: string;
  category: string;
  startSeconds: number | null;
};

export type StudentVideo = {
  videoId: string;
  url: string;
  title: string;
  description: string;
  channelTitle: string;
  publishedAt: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  thumbnailUrl: string;
  activities: string[];
  source: "ec_database" | "youtube_search";
  // What the student says in the video, extracted from its transcript. The
  // name is the one they introduce themselves with on their own channel; it is
  // withheld for EC Database videos, whose pathways are published anonymously.
  story: (Omit<RawStory, "isStudentStory"> & { studentName: string | null }) | null;
  pathway: {
    profileId: string;
    anonymousLabel: string;
    acceptedSchools: string[];
    intendedMajors: string[];
    activities: { id: string; title: string; experienceType: string; stemField: string }[];
    awards: { id: string; name: string; year: number | null }[];
  } | null;
  relatedOpportunities: {
    opportunityId: string;
    numericId: number;
    title: string;
    organization: string | null;
  }[];
};

// Videos not yet run through the story extractor still carry the regex tags
// from fetch-youtube-college-activities.ts; fold them into the extractor's
// categories so the page shows one set of activity filters.
const LEGACY_ACTIVITY_LABELS: Record<string, string> = {
  "Research (lab / paper / professor)": "Research",
  "Science / math olympiad & competitions": "Competition / olympiad",
  "Academic competitions (quiz bowl, DECA, FBLA, etc.)": "Competition / olympiad",
  "Nonprofit / founded organization": "Nonprofit / organization founded",
  "Startup / business / entrepreneurship": "Startup / business",
  "Coding / software projects": "Coding / software",
  "Robotics / engineering team": "Robotics / engineering",
  "Debate / Model UN / speech": "Debate / MUN / speech",
  "Student government / leadership": "Leadership / student government",
  "Varsity sports / athletics": "Athletics",
  "Summer programs (RSI, SSP, MITES, etc.)": "Summer program",
  "Clubs / honor societies": "Club",
  "Content creation / YouTube channel": "Content creation",
  "Self-study / online courses / dual enrollment": "Coursework / self-study",
  "Passion project (generic)": "Other",
  "Work / family responsibilities": "Family / work responsibilities",
};

const PUBLIC_REVIEW_STATUSES = new Set(["approved", "pending"]);

// ---------------------------------------------------------------------------
// Opportunity mentions: an opportunity is "related" when its full title, or
// the acronym in its title ("Research Science Institute (RSI)"), appears in
// the video's title, description or tags. Titles that are just a generic
// phrase are skipped so "Summer Research Program" doesn't match everything.
// ---------------------------------------------------------------------------

const GENERIC_TITLE =
  /^(summer|research|internship|program|volunteer|competition|scholarship|camp|stem|science|engineering|coding|math|high school|students?|opportunit(y|ies)|application|machine learning|the|a|an|and|for|of|in|at)(\s|$)/i;

// Trailing acronyms that are also ordinary words or admissions jargon, so a
// video saying "BEST", "STEM" or "HAS" in an all-caps title never links.
const ACRONYM_BLOCKLIST = new Set([
  "STEM", "BEST", "HAS", "PREP", "TOP", "CAMP", "LEAP", "STAR", "STARS", "RISE", "SPARK", "REACH",
  "BRIDGE", "PATH", "NEXT", "STEP", "SEE", "ACE", "AIM", "ART", "AND", "THE", "FOR", "ALL", "NEW",
  "ONE", "HOW", "WHO", "WHY", "GOT", "INTO", "ECS", "SAT", "ACT", "GPA", "USA", "NYC", "NYS", "HSS",
  "CS", "AI", "ML", "IT", "US", "HS", "MS", "LA", "DC", "TX", "CA", "NY", "MIT", "UC", "UCLA",
]);

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** True when the acronym's letters are, in order, the initials of the title's
 * words (skipping small words), e.g. RSI <- Research Science Institute. */
function abbreviates(acronym: string, title: string): boolean {
  const initials = title
    .split(/[\s\-–—:/]+/)
    .filter((w) => w && !/^(of|the|and|for|in|at|on|a|an|&)$/i.test(w))
    .map((w) => w[0]!.toUpperCase())
    .join("");
  const letters = acronym.replace(/[^A-Z]/g, "");
  return initials.startsWith(letters) || initials === letters;
}

type Matcher = { record: NormalizedOpportunity; patterns: RegExp[] };

function buildMatchers(records: NormalizedOpportunity[]): Matcher[] {
  const matchers: Matcher[] = [];
  for (const record of records) {
    const title = record.title.trim();
    const patterns: RegExp[] = [];
    const bare = title.replace(/\s*\([^)]*\)\s*$/, "").trim();
    // Only distinctive titles match verbatim: three or more words, not a
    // generic phrase like "Application Process" or "Machine Learning".
    if (bare.length >= 16 && bare.split(/\s+/).length >= 3 && !GENERIC_TITLE.test(bare)) {
      patterns.push(new RegExp(`(^|[^a-z0-9])${escapeRegex(bare)}(?=$|[^a-z0-9])`, "i"));
    }
    // A trailing "(RSI)"-style acronym, matched case-sensitively, only when it
    // abbreviates this title ("Research Science Institute (RSI)"). A school
    // club titled "McKinney STEAM Academy - Tech Challenge (FTC)" would
    // otherwise claim every student who mentions FTC.
    const acronym = /\(([A-Z][A-Z0-9&-]{2,7})\)\s*$/.exec(title);
    if (acronym && !ACRONYM_BLOCKLIST.has(acronym[1]!) && abbreviates(acronym[1]!, bare)) {
      patterns.push(new RegExp(`(^|[^A-Za-z0-9])${escapeRegex(acronym[1]!)}(?=$|[^A-Za-z0-9])`));
    }
    if (patterns.length) matchers.push({ record, patterns });
  }
  return matchers;
}

function relatedOpportunities(text: string, matchers: Matcher[]): StudentVideo["relatedOpportunities"] {
  const hits: StudentVideo["relatedOpportunities"] = [];
  const seen = new Set<string>();
  for (const { record, patterns } of matchers) {
    if (hits.length >= 3) break;
    if (seen.has(record.title)) continue;
    if (patterns.some((re) => re.test(text))) {
      seen.add(record.title);
      hits.push({
        opportunityId: record.opportunityId,
        numericId: record.numericId,
        title: record.title,
        organization: record.organization,
      });
    }
  }
  return hits;
}

// ---------------------------------------------------------------------------
// Assembly, cached briefly: one scan + one profile query per linked video.
// ---------------------------------------------------------------------------

type CacheEntry = { at: number; videos: StudentVideo[] };
let cache: CacheEntry | undefined;
const CACHE_TTL_MS = 5 * 60_000;

async function buildStudentVideos(): Promise<StudentVideo[]> {
  const [rows, profiles, opportunities] = await Promise.all([
    queryByPrefix<VideoRow>("VIDEO#", "VIDEO"),
    listProfiles(),
    fetchAllOpportunities(),
  ]);
  const profileById = new Map<string, ProfileRow>(profiles.map((p) => [p.profileId, p]));
  const matchers = buildMatchers(opportunities.filter((o) => o.published && !o.invalid));

  const published = rows.filter((r) => r.SK === "VIDEO" && r.published === true);
  const videos = await Promise.all(
    published.map(async (row): Promise<StudentVideo> => {
      const profile = row.profileId ? profileById.get(row.profileId) : undefined;
      let pathway: StudentVideo["pathway"] = null;
      if (profile) {
        const { activities, awards } = await getProfileEntities(profile.profileId);
        pathway = {
          profileId: profile.profileId,
          anonymousLabel: profile.anonymousLabel ?? "Student",
          acceptedSchools: profile.acceptedSchools ?? [],
          intendedMajors: profile.intendedMajors ?? [],
          activities: activities
            .filter((a) => PUBLIC_REVIEW_STATUSES.has(a.reviewStatus))
            .map((a) => ({ id: a.SK, title: a.title, experienceType: a.experienceType, stemField: a.stemField })),
          awards: awards
            .filter((a) => PUBLIC_REVIEW_STATUSES.has(a.reviewStatus))
            .map((a) => ({ id: a.SK, name: a.name, year: a.year })),
        };
      }
      const text = [
        row.title,
        row.description,
        ...(row.tags ?? []),
        ...(row.story?.activities ?? []).flatMap((a) => [a.title, a.organization ?? ""]),
        ...(row.story?.awards ?? []).map((a) => a.name),
      ].join("\n");
      return {
        videoId: row.videoId,
        url: row.url,
        title: row.title,
        description: row.description,
        channelTitle: row.channelTitle,
        publishedAt: row.publishedAt,
        durationSeconds: row.durationSeconds,
        viewCount: row.viewCount,
        likeCount: row.likeCount,
        thumbnailUrl: row.thumbnailUrl,
        activities: [...new Set((row.activities ?? []).map((a) => LEGACY_ACTIVITY_LABELS[a] ?? a))],
        source: row.source,
        story: row.story
          ? (({ isStudentStory: _ignored, ...rest }) => ({
              ...rest,
              studentName: row.profileId ? null : rest.studentName,
            }))(row.story)
          : null,
        pathway,
        relatedOpportunities: relatedOpportunities(text, matchers),
      };
    }),
  );
  videos.sort((a, b) => b.viewCount - a.viewCount);
  return videos;
}

// GET /student-videos — every published video with its EC Database pathway
// and database cross-references. ?refresh=true busts the cache.
router.get("/student-videos", async (req, res): Promise<void> => {
  try {
    if (req.query["refresh"] === "true") cache = undefined;
    if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
      cache = { at: Date.now(), videos: await buildStudentVideos() };
    }
    res.set("Cache-Control", "public, max-age=300");
    res.json({ count: cache.videos.length, videos: cache.videos });
  } catch (error) {
    console.error(
      "[student-videos] request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    res.status(502).json({ error: "Student videos are temporarily unavailable." });
  }
});

export default router;
