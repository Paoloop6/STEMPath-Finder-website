/**
 * Sync the "Student videos" section of the site into DynamoDB.
 *
 * Two sources feed one set of VIDEO# rows in the stempath-data table:
 *
 *   1. EC Database profiles (PROFILE# rows). Every profile carries the YouTube
 *      interview it was built from (sourceVideoUrls). We look those videos up
 *      on the YouTube Data API for title, channel, views and thumbnail, and
 *      store them with `profileId` so the site can join video -> pathway.
 *   2. The latest search run from fetch-youtube-college-activities.ts
 *      (data/youtube-college-activities/videos-<date>.json): first-person
 *      "how I got in" videos that clear a basic quality bar.
 *
 * Every video without a story is then transcribed and run through DeepSeek
 * (video-story.ts) for the student's name, schools and the specific activities
 * they describe, with timestamps. Videos the model says are not a student's own
 * story (counselors, grad school, street interviews) are kept but unpublished.
 * Stories already extracted are carried over, so each video is paid for once.
 *
 * With --apply, the raw captions and every extraction are also archived to
 * youtube/runs/<runId>/{transcripts/<videoId>.json,extracted.json} in the
 * raw-data bucket (runId from YOUTUBE_RUN_ID, shared with fetch:youtube).
 *
 * Dry-run by default (extracts a 2-video preview, writes nothing); pass
 * --apply to write. Re-running upserts in place.
 *
 *   pnpm run sync:videos              # preview
 *   pnpm run sync:videos -- --apply   # write to DynamoDB
 *   pnpm run sync:videos -- --apply --min-views 10000 --enrich-limit 100
 */

import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { batchWriteWithRetry, queryByPrefix, uploadJson } from "@workspace/aws";
import { extractStory, fetchTranscript, STORY_VERSION, type VideoStory } from "./video-story";

const API_KEY = process.env.YOUTUBE_API_KEY;
if (!API_KEY) {
  console.error("Missing YOUTUBE_API_KEY (repo root .env).");
  process.exit(1);
}

const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const opt = (name: string, fallback: number) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? Number(argv[i + 1]) : fallback;
};
const MIN_VIEWS = opt("min-views", 2000);
// DeepSeek calls per run; the backlog drains over a few days.
const ENRICH_LIMIT = APPLY ? opt("enrich-limit", 60) : opt("enrich-limit", 2);
const ENRICH_CONCURRENCY = 4;
const RUN_ID = process.env.YOUTUBE_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, "-");
const S3_PREFIX = `youtube/runs/${RUN_ID}`;
const DATA_DIR = resolve("../data/youtube-college-activities");

// Titles that are first-person stories but not about undergraduate admissions.
const OFF_TOPIC = /\b(law school|med school|medical school|grad school|graduate school|mba|phd|ph\.d|nursing school|dental school|pharmacy school|residency|masters|master's|business school|transfer(?:red|ring)? (?:to|into))\b/i;

// ---------- Types ----------
type ProfileRow = {
  PK: string;
  SK: string;
  profileId: string;
  status: string;
  sourceVideoUrls?: string[];
};

type SearchVideo = {
  videoId: string;
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
  isStudentStory: boolean;
  activities: string[];
};

type YtVideo = {
  id: string;
  snippet: {
    title: string;
    description: string;
    channelTitle: string;
    channelId: string;
    publishedAt: string;
    tags?: string[];
    thumbnails: Record<string, { url: string }>;
  };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
  contentDetails: { duration: string };
};

type VideoItem = {
  PK: string;
  SK: "VIDEO";
  entityType: "studentVideo";
  videoId: string;
  url: string;
  title: string;
  description: string;
  channelTitle: string;
  channelId: string;
  publishedAt: string;
  durationSeconds: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  thumbnailUrl: string;
  tags: string[];
  activities: string[];
  source: "ec_database" | "youtube_search";
  profileId: string | null;
  published: boolean;
  reviewStatus: "approved" | "rejected";
  syncedAt: string;
  story?: VideoStory;
};

// ---------- Helpers ----------
const VIDEO_ID_RE = /(?:youtube\.com\/(?:embed\/|watch\?v=|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;

function videoIdFromUrl(url: string): string | null {
  const m = VIDEO_ID_RE.exec(url);
  return m ? m[1]! : null;
}

function isoDurationToSeconds(iso: string): number {
  const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso);
  if (!m) return 0;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

function thumbnail(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}

async function fetchYoutubeVideos(ids: string[]): Promise<YtVideo[]> {
  const out: YtVideo[] = [];
  for (let i = 0; i < ids.length; i += 50) {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics,contentDetails");
    url.searchParams.set("id", ids.slice(i, i + 50).join(","));
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", API_KEY!);
    const res = await fetch(url);
    const body = (await res.json()) as { items?: YtVideo[]; error?: { message?: string } };
    if (!res.ok) throw new Error(`videos.list failed: ${res.status} ${body.error?.message ?? ""}`);
    out.push(...(body.items ?? []));
  }
  return out;
}

function latestSearchRun(): { path: string; videos: SearchVideo[] } | null {
  let files: string[];
  try {
    files = readdirSync(DATA_DIR).filter((f) => /^videos-\d{4}-\d{2}-\d{2}[\w-]*\.json$/.test(f)).sort();
  } catch {
    return null;
  }
  const last = files.at(-1);
  if (!last) return null;
  const path = resolve(DATA_DIR, last);
  const parsed = JSON.parse(readFileSync(path, "utf8")) as { videos: SearchVideo[] };
  return { path, videos: parsed.videos };
}

/** Apply an extracted story to a row: its categories replace the regex tags,
 * and a video that isn't a student's own story is unpublished (EC Database
 * videos stay up; those were already reviewed as interviews). */
function applyStory(item: VideoItem, story: VideoStory) {
  item.story = story;
  const categories = [...new Set(story.activities.map((a) => a.category))];
  if (categories.length) item.activities = categories;
  if (item.source === "youtube_search" && !story.isStudentStory) {
    item.published = false;
    item.reviewStatus = "rejected";
  }
}

async function enrich(item: VideoItem): Promise<void> {
  const transcript = await fetchTranscript(item.videoId);
  if (APPLY && transcript) {
    await uploadJson(`${S3_PREFIX}/transcripts/${item.videoId}.json`, {
      videoId: item.videoId,
      url: item.url,
      title: item.title,
      fetchedAt: new Date().toISOString(),
      segments: transcript,
    });
  }
  const story = await extractStory({
    title: item.title,
    description: item.description,
    channelTitle: item.channelTitle,
    durationSeconds: item.durationSeconds,
    transcript,
  });
  applyStory(item, story);
}

// ---------- Main ----------
async function main() {
  const now = new Date().toISOString();
  const items = new Map<string, VideoItem>();
  const existing = new Map(
    (await queryByPrefix<VideoItem>("VIDEO#", "VIDEO")).filter((r) => r.SK === "VIDEO").map((r) => [r.videoId, r]),
  );
  console.log(`DynamoDB: ${existing.size} video rows already stored`);

  // 1. EC Database profile videos -> YouTube metadata.
  const profiles = (await queryByPrefix<ProfileRow>("PROFILE#", "PROFILE")).filter(
    (p) => p.SK === "PROFILE" && p.status === "completed",
  );
  const profileByVideo = new Map<string, string>();
  for (const p of profiles) {
    for (const u of p.sourceVideoUrls ?? []) {
      const id = videoIdFromUrl(u);
      if (id && !profileByVideo.has(id)) profileByVideo.set(id, p.profileId);
    }
  }
  console.log(`EC Database: ${profiles.length} profiles, ${profileByVideo.size} distinct source videos`);

  const ytVideos = await fetchYoutubeVideos([...profileByVideo.keys()]);
  const missing = [...profileByVideo.keys()].filter((id) => !ytVideos.some((v) => v.id === id));
  if (missing.length) console.log(`  ${missing.length} unavailable on YouTube (private/removed): ${missing.join(", ")}`);

  for (const v of ytVideos) {
    items.set(v.id, {
      PK: `VIDEO#${v.id}`,
      SK: "VIDEO",
      entityType: "studentVideo",
      videoId: v.id,
      url: `https://www.youtube.com/watch?v=${v.id}`,
      title: v.snippet.title,
      description: v.snippet.description.slice(0, 1200),
      channelTitle: v.snippet.channelTitle,
      channelId: v.snippet.channelId,
      publishedAt: v.snippet.publishedAt,
      durationSeconds: isoDurationToSeconds(v.contentDetails.duration),
      viewCount: Number(v.statistics.viewCount ?? 0),
      likeCount: Number(v.statistics.likeCount ?? 0),
      commentCount: Number(v.statistics.commentCount ?? 0),
      thumbnailUrl: v.snippet.thumbnails?.high?.url ?? thumbnail(v.id),
      tags: (v.snippet.tags ?? []).slice(0, 20),
      activities: [],
      source: "ec_database",
      profileId: profileByVideo.get(v.id) ?? null,
      published: true,
      reviewStatus: "approved",
      syncedAt: now,
    });
  }

  // 2. Search-run student stories.
  const run = latestSearchRun();
  if (!run) {
    console.log("No search run found in data/youtube-college-activities; run fetch:youtube first.");
  } else {
    const stories = run.videos.filter(
      (v) => v.isStudentStory && v.viewCount >= MIN_VIEWS && isoDurationToSeconds(v.duration) >= 60 && !OFF_TOPIC.test(v.title),
    );
    let added = 0;
    for (const v of stories) {
      const dup = items.get(v.videoId);
      if (dup) {
        // Same video is also an EC Database source: keep that link, borrow the tags.
        dup.activities = v.activities;
        continue;
      }
      items.set(v.videoId, {
        PK: `VIDEO#${v.videoId}`,
        SK: "VIDEO",
        entityType: "studentVideo",
        videoId: v.videoId,
        url: `https://www.youtube.com/watch?v=${v.videoId}`,
        title: v.title,
        description: v.description.slice(0, 1200),
        channelTitle: v.channelTitle,
        channelId: v.channelId,
        publishedAt: v.publishedAt,
        durationSeconds: isoDurationToSeconds(v.duration),
        viewCount: v.viewCount,
        likeCount: v.likeCount,
        commentCount: v.commentCount,
        thumbnailUrl: thumbnail(v.videoId),
        tags: v.tags.slice(0, 20),
        activities: v.activities,
        source: "youtube_search",
        profileId: null,
        published: true,
        reviewStatus: "approved",
        syncedAt: now,
      });
      added += 1;
    }
    console.log(`Search run ${run.path.split("/").pop()}: ${stories.length} stories pass the bar (>= ${MIN_VIEWS} views, on topic), ${added} new rows`);
  }

  // 3. Carry stories over from stored rows; queue anything still missing one,
  //    including stored rows that dropped out of today's search.
  for (const [id, item] of items) {
    const prev = existing.get(id)?.story;
    if (prev && prev.version === STORY_VERSION) applyStory(item, prev);
  }
  for (const [id, row] of existing) {
    if (!items.has(id) && (!row.story || row.story.version !== STORY_VERSION)) items.set(id, row);
  }
  const queue = [...items.values()]
    .filter((it) => !it.story || it.story.version !== STORY_VERSION)
    .sort((a, b) => Number(b.source === "ec_database") - Number(a.source === "ec_database") || b.viewCount - a.viewCount);
  const batch = queue.slice(0, ENRICH_LIMIT);
  console.log(`\nStories: ${queue.length} videos need one, extracting ${batch.length} this run`);
  let done = 0;
  const failures: { videoId: string; title: string; error: string }[] = [];
  let noTranscript = 0;
  const enriched: VideoItem[] = [];
  for (let i = 0; i < batch.length; i += ENRICH_CONCURRENCY) {
    await Promise.all(
      batch.slice(i, i + ENRICH_CONCURRENCY).map(async (it) => {
        try {
          await enrich(it);
          done += 1;
          enriched.push(it);
          if (it.story?.evidence === "description") noTranscript += 1;
          const s = it.story!;
          console.log(
            `  ${s.isStudentStory ? "ok " : "rej"} ${(s.studentName ?? "(no name)").padEnd(22)} ${String(s.activities.length).padStart(2)} activities  ${it.title.slice(0, 60)}`,
          );
        } catch (err) {
          failures.push({ videoId: it.videoId, title: it.title, error: (err as Error).message });
          console.error(`  FAILED ${it.videoId}: ${(err as Error).message}`);
        }
      }),
    );
  }
  console.log(`Extracted ${done} (${noTranscript} without transcript), ${failures.length} failed, ${queue.length - batch.length} left for later runs`);
  if (APPLY && batch.length) {
    await uploadJson(`${S3_PREFIX}/extracted.json`, {
      runId: RUN_ID,
      extractedAt: now,
      model: process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash",
      storyVersion: STORY_VERSION,
      backlogRemaining: queue.length - batch.length,
      failures,
      videos: enriched.map((it) => ({ videoId: it.videoId, url: it.url, title: it.title, channelTitle: it.channelTitle, source: it.source, story: it.story })),
    });
    console.log(`Archived to s3://${process.env.AWS_S3_BUCKET}/${S3_PREFIX}/`);
  }

  const all = [...items.values()];
  const bySource = { ec_database: 0, youtube_search: 0 };
  for (const it of all) bySource[it.source] += 1;
  console.log(`\nTotal ${all.length} video rows (${bySource.ec_database} EC Database, ${bySource.youtube_search} search)`);

  if (!APPLY) {
    for (const it of enriched.slice(0, 2)) console.log(`\nPreview ${it.url}\n${JSON.stringify(it.story, null, 2)}`);
    console.log("\nDry run. Sample:");
    for (const it of all.slice(0, 8)) console.log(`  [${it.source}] ${it.viewCount.toLocaleString().padStart(10)}  ${it.title.slice(0, 80)}`);
    console.log("\nRe-run with --apply to write to DynamoDB.");
    return;
  }

  const written = await batchWriteWithRetry(all.map((put) => ({ put })));
  console.log(`Wrote ${written} rows to DynamoDB.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
