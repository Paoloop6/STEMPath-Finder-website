/**
 * Fetch YouTube videos where students describe the activities that got them
 * into college, and tally which activity types come up most.
 *
 * Uses the YouTube Data API v3 with a plain API key (no OAuth):
 *   search.list        100 quota units per page
 *   videos.list          1 unit per 50 ids
 *   commentThreads.list  1 unit per video (only with --comments)
 * Default daily quota is 10,000 units, so the default run (~25 searches)
 * costs roughly 2,600 units.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run fetch:youtube            # default queries
 *   pnpm --filter @workspace/scripts run fetch:youtube -- --comments --pages 2
 *   pnpm --filter @workspace/scripts run fetch:youtube -- --query "how I got into MIT extracurriculars"
 *   pnpm --filter @workspace/scripts run fetch:youtube -- --recent 30   # newest uploads only (daily job)
 *
 * --s3 also uploads the raw run to youtube/runs/<runId>/search.json in the
 * raw-data bucket (runId from YOUTUBE_RUN_ID, else now), next to the
 * transcripts and extractions sync-student-videos.ts adds for the same run.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { uploadJson } from "@workspace/aws";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("Missing YOUTUBE_API_KEY (put it in the repo root .env).");
  process.exit(1);
}

// ---------- CLI flags ----------
const argv = process.argv.slice(2);
const flag = (name: string) => argv.includes(`--${name}`);
const opt = (name: string, fallback: string) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const PAGES_PER_QUERY = Number(opt("pages", "1"));
const FETCH_COMMENTS = flag("comments");
const COMMENT_VIDEO_LIMIT = Number(opt("comment-videos", "40"));
const CUSTOM_QUERY = argv.includes("--query") ? opt("query", "") : null;
const OUT_DIR = resolve(opt("out", "../data/youtube-college-activities"));
// --recent N: only videos uploaded in the last N days, newest first, so the
// daily run discovers new uploads instead of re-finding the same top hits.
const RECENT_DAYS = argv.includes("--recent") ? Number(opt("recent", "30")) : null;
const UPLOAD_S3 = flag("s3");
export const RUN_ID = process.env.YOUTUBE_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, "-");
const FROM_JSON = argv.includes("--from-json") ? resolve(opt("from-json", "")) : null;

// ---------- Queries ----------
const DEFAULT_QUERIES = [
  "extracurriculars that got me into college",
  "my extracurriculars college application",
  "extracurriculars that got me into harvard",
  "extracurriculars that got me into stanford",
  "extracurriculars that got me into mit",
  "extracurriculars that got me into yale",
  "extracurriculars that got me into princeton",
  "extracurriculars that got me into columbia",
  "extracurriculars that got me into upenn",
  "extracurriculars that got me into duke",
  "extracurriculars that got me into uc berkeley",
  "extracurriculars that got me into ucla",
  "extracurriculars that got me into caltech",
  "extracurriculars that got me into georgia tech",
  "how I got into ivy league extracurriculars",
  "my college application stats and extracurriculars",
  "what I did in high school to get into college",
  "activities list common app reaction",
  "extracurriculars for computer science college applications",
  "extracurriculars for pre med college applications",
  "extracurriculars for engineering college applications",
  "research in high school got me into college",
  "international student extracurriculars got into us college",
  "low income first gen how I got into college extracurriculars",
  "extracurriculars that got me into t20",
];
const QUERIES = CUSTOM_QUERY ? [CUSTOM_QUERY] : DEFAULT_QUERIES;

// ---------- Activity taxonomy for the tally ----------
// Each entry: label -> regexes matched against title + description (+ comments).
const ACTIVITY_PATTERNS: Record<string, RegExp[]> = {
  "Research (lab / paper / professor)": [/\bresearch\b/i, /\bresearch (project|paper|intern|lab|program|position|experience)/i, /\bdid research\b/i, /\bresearch with (a )?professor/i, /\bpublished (a |my )?(paper|research)/i, /\bworking in a lab\b/i, /\blab work\b/i],
  "Science / math olympiad & competitions": [/olympiad/i, /\bAIME\b/, /\bUSAMO\b/, /\bUSACO\b/, /\bUSABO\b/, /\bUSAPhO\b/, /\bISEF\b/, /science fair/i, /\bAMC ?1[02]\b/, /\bregeneron\b/i, /\bmath competition/i, /\bscience competition/i],
  "Internship / job": [/internship/i, /\binterned\b/i, /\bpart[- ]time job\b/i, /\bworked (a|at|as)\b/i, /\bsummer job\b/i],
  "Nonprofit / founded organization": [/non[- ]?profit/i, /\bfounded (a|my|an)\b/i, /\bstarted (a|my own) (nonprofit|organization|club|initiative|charity)/i, /\bco-?founder\b/i],
  "Startup / business / entrepreneurship": [/\bstartup\b/i, /\bstarted (a|my own) (business|company|brand)/i, /entrepreneur/i, /\bsmall business\b/i, /\bmade \$?\d/i],
  "Coding / software projects": [/\bcoding\b/i, /\bprogramming\b/i, /\bbuilt an? (app|website|game|bot)/i, /\bmade an? (app|website|game)/i, /\bsoftware\b/i, /hackathon/i, /\bgithub\b/i, /\bmachine learning\b/i, /\bcomputer science\b/i],
  "Robotics / engineering team": [/robotics/i, /\bFRC\b/, /\bFTC\b/, /\bVEX\b/, /engineering (team|club|project)/i, /\b3d print/i],
  "Debate / Model UN / speech": [/\bdebate\b/i, /model (un|united nations)/i, /\bMUN\b/, /\bspeech and debate\b/i, /mock trial/i, /\blincoln[- ]douglas\b/i],
  "Student government / leadership": [/student (government|council|body)/i, /\bASB\b/, /class president/i, /\b(club|team) (president|captain|founder|leader)/i, /\bpresident of\b/i, /\bcaptain of\b/i],
  "Varsity sports / athletics": [/\bvarsity\b/i, /\bathlete\b/i, /\brecruited\b/i, /\b(soccer|track|swim(ming)?|tennis|basketball|football|rowing|crew|lacrosse|volleyball|cross country|wrestling|golf|fencing) (team|player|captain)\b/i, /\bplayed (soccer|tennis|basketball|football|volleyball|lacrosse|golf)\b/i],
  "Music / performing arts": [/\borchestra\b/i, /\bmarching band\b/i, /\b(jazz|concert|school) band\b/i, /\bpiano\b/i, /\bviolin\b/i, /\bcello\b/i, /\bchoir\b/i, /\btheat(er|re)\b/i, /\bmusical\b/i, /\bdance (team|company)\b/i, /\bballet\b/i, /\bplayed (the )?(piano|violin|cello|guitar|flute|clarinet|trumpet)\b/i],
  "Visual arts / film / writing": [/\bart portfolio\b/i, /\bfilmmaking\b/i, /\bshort film\b/i, /\bphotography\b/i, /\bcreative writing\b/i, /\bpoetry\b/i, /\bjournalism\b/i, /\bschool newspaper\b/i, /\byearbook\b/i, /\bwrote a (book|novel)\b/i, /\bpainting\b/i],
  "Volunteering / community service": [/volunteer/i, /community service/i, /\bservice hours\b/i, /\btutoring\b/i, /\btutored\b/i, /\bmentored\b/i, /\bfood bank\b/i, /\bhospital volunteer/i],
  "Summer programs (RSI, SSP, MITES, etc.)": [/summer program/i, /\bRSI\b/, /\bSSP\b/, /\bMITES\b/, /\bTASP\b/, /\bTASS\b/, /\bCOSMOS\b/, /\bpre-?college\b/i, /\bSUMaC\b/, /\bPROMYS\b/, /\bMOSP\b/, /\bgovernor'?s school\b/i, /\bboys state\b/i, /\bgirls state\b/i],
  "Clubs / honor societies": [/\b(joined|started|founded|led|ran) (a |the |my )?club/i, /\bclub (president|officer|member)\b/i, /\bhonor society\b/i, /\bNHS\b/, /\bkey club\b/i, /\bscience club\b/i, /\bmath club\b/i],
  "Academic competitions (quiz bowl, DECA, FBLA, etc.)": [/quiz bowl/i, /\bDECA\b/, /\bFBLA\b/, /\bHOSA\b/, /\bscience bowl\b/i, /academic decathlon/i, /\bTSA\b/, /\bSkillsUSA\b/i],
  "Content creation / YouTube channel": [/\b(my|started a|ran a|have a) youtube channel\b/i, /\bmy (own )?podcast\b/i, /\bstarted a (blog|podcast)\b/i, /\b\d+k? (subscribers|followers)\b/i],
  "Self-study / online courses / dual enrollment": [/\bself[- ]stud/i, /\bdual enroll/i, /\bcommunity college (class|course)/i, /\bonline course/i, /\bcoursera\b/i, /\bedx\b/i, /\bcollege (classes|courses) in high school\b/i],
  "Passion project (generic)": [/\bpassion project/i, /\bpersonal project/i, /\bside project/i],
  "Work / family responsibilities": [/\bfamily (business|responsibilit)/i, /\btook care of (my )?(sibling|grandparent|parent)/i, /\bcaregiv/i, /\bworked to support\b/i],
};

// Videos where a student is telling their own story (vs. counselor advice / listicles).
const STORY_PATTERNS = [
  /\bgot me into\b/i, /\bhow i got (in|into|accepted)\b/i, /\bmy (stats|ecs|extracurriculars|activities list|application)\b/i,
  /\baccepted (to|into)\b/i, /\bdecision reaction/i, /\bwhat i did in high school\b/i, /\bi got into\b/i,
  /\bstats (and|&) ecs\b/i, /\bcommon app (activities|reaction|review)/i, /\bhow (\w+ )?students got into\b/i, /\basking (\w+ )?students\b/i,
];
function isStudentStory(title: string, description: string): boolean {
  return STORY_PATTERNS.some((re) => re.test(title)) || STORY_PATTERNS.slice(0, 4).some((re) => re.test(description.slice(0, 400)));
}

// ---------- Types ----------
type SearchItem = { id: { videoId?: string } };
type VideoItem = {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    tags?: string[];
  };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails: { duration: string };
};
type CommentItem = { snippet: { topLevelComment: { snippet: { textOriginal: string; likeCount: number; authorDisplayName: string } } } };

type VideoRecord = {
  videoId: string;
  url: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  duration: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  tags: string[];
  matchedQueries: string[];
  isStudentStory: boolean;
  activities: string[];
  topComments?: { text: string; likes: number; author: string }[];
};

// ---------- API helpers ----------
let quotaUsed = 0;
async function yt<T>(endpoint: string, params: Record<string, string>, cost: number): Promise<T> {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("key", API_KEY!);
  const res = await fetch(url);
  quotaUsed += cost;
  const body = (await res.json()) as any;
  if (!res.ok) {
    const reason = body?.error?.errors?.[0]?.reason ?? body?.error?.message ?? res.statusText;
    throw new Error(`${endpoint} failed (${res.status} ${reason})`);
  }
  return body as T;
}

async function searchVideos(query: string, pages: number): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  for (let p = 0; p < pages; p++) {
    const data = await yt<{ items: SearchItem[]; nextPageToken?: string }>(
      "search",
      {
        part: "snippet",
        type: "video",
        maxResults: "50",
        q: query,
        relevanceLanguage: "en",
        // Always rank by relevance: publishedAfter already limits --recent runs
        // to new uploads, and order=date fills the page with whatever was
        // uploaded last (drama shorts, sports streams) that loosely matches.
        order: "relevance",
        ...(RECENT_DAYS ? { publishedAfter: new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString() } : {}),
        ...(pageToken ? { pageToken } : {}),
      },
      100,
    );
    for (const it of data.items) if (it.id.videoId) ids.push(it.id.videoId);
    pageToken = data.nextPageToken;
    if (!pageToken) break;
  }
  return ids;
}

async function getVideos(ids: string[]): Promise<VideoItem[]> {
  const out: VideoItem[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const chunk = ids.slice(i, i + 50);
    const data = await yt<{ items: VideoItem[] }>(
      "videos",
      { part: "snippet,statistics,contentDetails", id: chunk.join(","), maxResults: "50" },
      1,
    );
    out.push(...data.items);
  }
  return out;
}

async function getTopComments(videoId: string, max = 25) {
  try {
    const data = await yt<{ items: CommentItem[] }>(
      "commentThreads",
      { part: "snippet", videoId, maxResults: String(max), order: "relevance", textFormat: "plainText" },
      1,
    );
    return data.items.map((c) => ({
      text: c.snippet.topLevelComment.snippet.textOriginal,
      likes: c.snippet.topLevelComment.snippet.likeCount,
      author: c.snippet.topLevelComment.snippet.authorDisplayName,
    }));
  } catch (err) {
    // Comments disabled on the video is common; skip silently.
    return [];
  }
}

// ---------- Analysis ----------
function classify(text: string): string[] {
  const hits: string[] = [];
  for (const [label, patterns] of Object.entries(ACTIVITY_PATTERNS)) {
    if (patterns.some((re) => re.test(text))) hits.push(label);
  }
  return hits;
}

function isoDurationToSeconds(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

// ---------- Main ----------
async function main() {
  if (FROM_JSON) {
    console.log(`Re-tallying ${FROM_JSON} (no API calls)...`);
    const saved = JSON.parse(readFileSync(FROM_JSON, "utf8")) as { queries: string[]; videos: VideoRecord[] };
    const filtered = saved.videos.map((r) => {
      const base = `${r.title}\n${r.description}\n${r.tags.join(" ")}`;
      const comments = (r.topComments ?? []).map((c) => c.text).join("\n");
      return { ...r, isStudentStory: isStudentStory(r.title, r.description), activities: [...new Set([...classify(base), ...classify(comments)])] };
    });
    filtered.sort((a, b) => b.viewCount - a.viewCount);
    writeOutputs(filtered, saved.queries, saved.videos.some((v) => v.topComments));
    return;
  }
  console.log(`Running ${QUERIES.length} queries x ${PAGES_PER_QUERY} page(s)...`);
  const idToQueries = new Map<string, Set<string>>();

  for (const q of QUERIES) {
    try {
      const ids = await searchVideos(q, PAGES_PER_QUERY);
      for (const id of ids) {
        if (!idToQueries.has(id)) idToQueries.set(id, new Set());
        idToQueries.get(id)!.add(q);
      }
      console.log(`  ${ids.length.toString().padStart(3)}  ${q}`);
    } catch (err) {
      console.error(`  FAILED  ${q}: ${(err as Error).message}`);
      if (String(err).includes("quotaExceeded")) break;
    }
  }

  const uniqueIds = [...idToQueries.keys()];
  console.log(`\n${uniqueIds.length} unique videos. Fetching details...`);
  const videos = await getVideos(uniqueIds);

  const records: VideoRecord[] = videos.map((v) => {
    const text = `${v.snippet.title}\n${v.snippet.description}\n${(v.snippet.tags ?? []).join(" ")}`;
    return {
      videoId: v.id,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      title: v.snippet.title,
      description: v.snippet.description,
      channelTitle: v.snippet.channelTitle,
      channelId: v.snippet.channelId,
      publishedAt: v.snippet.publishedAt,
      duration: v.contentDetails.duration,
      viewCount: Number(v.statistics.viewCount ?? 0),
      likeCount: Number(v.statistics.likeCount ?? 0),
      commentCount: Number(v.statistics.commentCount ?? 0),
      tags: v.snippet.tags ?? [],
      matchedQueries: [...(idToQueries.get(v.id) ?? [])],
      isStudentStory: isStudentStory(v.snippet.title, v.snippet.description),
      activities: classify(text),
    };
  });

  // Drop Shorts-length clips (< 60s) — they are almost always clickbait, not stories.
  const filtered = records.filter((r) => isoDurationToSeconds(r.duration) >= 60);
  filtered.sort((a, b) => b.viewCount - a.viewCount);

  if (FETCH_COMMENTS) {
    const targets = filtered.slice(0, COMMENT_VIDEO_LIMIT);
    console.log(`Fetching top comments for ${targets.length} most-viewed videos...`);
    for (const r of targets) {
      r.topComments = await getTopComments(r.videoId);
      // Comments frequently list a commenter's own activities; fold them into the tally.
      const commentText = r.topComments.map((c) => c.text).join("\n");
      r.activities = [...new Set([...r.activities, ...classify(commentText)])];
    }
  }

  const run = writeOutputs(filtered, QUERIES, FETCH_COMMENTS);
  if (UPLOAD_S3) {
    const key = `youtube/runs/${RUN_ID}/search.json`;
    await uploadJson(key, { runId: RUN_ID, recentDays: RECENT_DAYS, ...run });
    console.log(`Uploaded s3://${process.env.AWS_S3_BUCKET}/${key}`);
  }
}

function writeOutputs(filtered: VideoRecord[], queries: string[], withComments: boolean) {
  const stories = filtered.filter((r) => r.isStudentStory);
  const tallyFor = (rows: VideoRecord[]) => {
    const t = new Map<string, { videos: number; views: number }>();
    for (const r of rows) for (const a of r.activities) {
      const e = t.get(a) ?? { videos: 0, views: 0 };
      e.videos += 1; e.views += r.viewCount; t.set(a, e);
    }
    return [...t.entries()].sort((a, b) => b[1].videos - a[1].videos);
  };
  const tallyAll = tallyFor(filtered);
  const tallyStories = tallyFor(stories);

  const channelTally = new Map<string, number>();
  for (const r of filtered) channelTally.set(r.channelTitle, (channelTally.get(r.channelTitle) ?? 0) + 1);
  const topChannels = [...channelTally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15);

  mkdirSync(OUT_DIR, { recursive: true });
  // Run id, not just the date, so a second run the same day doesn't overwrite the first.
  const stamp = RUN_ID;
  const jsonPath = resolve(OUT_DIR, `videos-${stamp}.json`);
  const csvPath = resolve(OUT_DIR, `videos-${stamp}.csv`);
  const mdPath = resolve(OUT_DIR, `summary-${stamp}.md`);

  const run = { fetchedAt: new Date().toISOString(), queries, quotaUsed, videos: filtered };
  writeFileSync(jsonPath, JSON.stringify(run, null, 2));

  const csvEscape = (s: string | number | boolean) => `"${String(s).replace(/"/g, '""')}"`;
  const csv = [
    ["videoId", "url", "title", "channel", "publishedAt", "views", "likes", "comments", "isStudentStory", "activities"].join(","),
    ...filtered.map((r) =>
      [r.videoId, r.url, r.title, r.channelTitle, r.publishedAt, r.viewCount, r.likeCount, r.commentCount, r.isStudentStory, r.activities.join("; ")]
        .map(csvEscape)
        .join(","),
    ),
  ].join("\n");
  writeFileSync(csvPath, csv);

  const tallyTable = (rows: [string, { videos: number; views: number }][], total: number) => [
    `| Activity type | Videos | Share | Combined views |`,
    `|---|---:|---:|---:|`,
    ...rows.map(([label, t]) => `| ${label} | ${t.videos} | ${((100 * t.videos) / Math.max(total, 1)).toFixed(0)}% | ${t.views.toLocaleString()} |`),
  ];

  const md: string[] = [];
  md.push(`# YouTube: activities people say got them into college`);
  md.push(``);
  md.push(`Fetched ${stamp}. ${filtered.length} videos (Shorts removed) from ${queries.length} queries, of which ${stories.length} look like first-person student stories. Quota used: ~${quotaUsed} units.`);
  md.push(``);
  md.push(`Text scanned: title + description + tags${withComments ? " + top comments on the most-viewed videos" : ""}. A video counts once per activity type it mentions.`);
  md.push(``);
  md.push(`## Activity types in student-story videos (${stories.length})`);
  md.push(``);
  md.push(...tallyTable(tallyStories, stories.length));
  md.push(``);
  md.push(`## Activity types across all videos (${filtered.length}, includes counselor advice)`);
  md.push(``);
  md.push(...tallyTable(tallyAll, filtered.length));
  md.push(``);
  md.push(`## Most-viewed student stories`);
  md.push(``);
  md.push(`| Views | Title | Channel | Activities |`);
  md.push(`|---:|---|---|---|`);
  for (const r of stories.slice(0, 40)) {
    md.push(`| ${r.viewCount.toLocaleString()} | [${r.title.replace(/\|/g, "\\|")}](${r.url}) | ${r.channelTitle.replace(/\|/g, "\\|")} | ${r.activities.join("; ")} |`);
  }
  md.push(``);
  md.push(`## Channels appearing most often`);
  md.push(``);
  for (const [ch, n] of topChannels) md.push(`- ${ch} (${n})`);
  md.push(``);
  writeFileSync(mdPath, md.join("\n"));

  console.log(`\nWrote:\n  ${jsonPath}\n  ${csvPath}\n  ${mdPath}\nQuota used: ~${quotaUsed} units`);
  return run;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
