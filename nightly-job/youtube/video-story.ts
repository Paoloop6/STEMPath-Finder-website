// Transcript fetch + DeepSeek extraction for student videos, shared by
// sync-student-videos.ts. Turns a "how I got into X" video into the student's
// own name, schools, and a list of the specific activities they describe, each
// with the second in the video where they talk about it.
//
// Transcripts come from YouTube's public caption tracks (auto-generated or
// uploaded). YouTube often refuses these requests from cloud IPs, which is
// why the daily job runs from a normal machine rather than Lambda. When no
// transcript is available the model sees only the title and description and
// the row is marked evidence="description".

export const STORY_VERSION = 1;

export type TranscriptSegment = { start: number; text: string };

export type StoryActivity = {
  title: string;
  role: string | null;
  organization: string | null;
  details: string;
  category: string;
  startSeconds: number | null;
};

export type VideoStory = {
  version: number;
  evidence: "transcript" | "description";
  isStudentStory: boolean;
  rejectReason: string | null;
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
  extractedAt: string;
};

export const ACTIVITY_CATEGORIES = [
  "Research",
  "Competition / olympiad",
  "Internship / job",
  "Nonprofit / organization founded",
  "Startup / business",
  "Coding / software",
  "Robotics / engineering",
  "Debate / MUN / speech",
  "Leadership / student government",
  "Athletics",
  "Music / performing arts",
  "Visual arts / film / writing",
  "Volunteering / community service",
  "Summer program",
  "Club",
  "Content creation",
  "Coursework / self-study",
  "Family / work responsibilities",
  "Other",
] as const;

// ---------------------------------------------------------------------------
// Transcript
// ---------------------------------------------------------------------------

const ANDROID_CLIENT = { clientName: "ANDROID", clientVersion: "20.10.38", androidSdkVersion: 34, hl: "en" };

type CaptionTrack = { baseUrl: string; languageCode?: string; kind?: string };

/** Public captions for a video, English preferred, uploaded over auto-generated. */
export async function fetchTranscript(videoId: string): Promise<TranscriptSegment[] | null> {
  try {
    const player = await fetch("https://www.youtube.com/youtubei/v1/player?prettyPrint=false", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "com.google.android.youtube/20.10.38 (Linux; U; Android 14)",
      },
      body: JSON.stringify({ context: { client: ANDROID_CLIENT }, videoId }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!player.ok) return null;
    const body = (await player.json()) as any;
    const tracks: CaptionTrack[] = body?.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const english = tracks.filter((t) => t.languageCode?.startsWith("en"));
    const track = english.find((t) => t.kind !== "asr") ?? english[0];
    if (!track) return null;

    const res = await fetch(`${track.baseUrl.replace(/&fmt=[^&]*/, "")}&fmt=json3`, {
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { events?: { tStartMs?: number; segs?: { utf8?: string }[] }[] };
    const segments: TranscriptSegment[] = [];
    for (const ev of json.events ?? []) {
      const text = (ev.segs ?? []).map((s) => s.utf8 ?? "").join("").replace(/\s+/g, " ").trim();
      if (text && text !== "[Music]") segments.push({ start: Math.floor((ev.tStartMs ?? 0) / 1000), text });
    }
    return segments.length ? segments : null;
  } catch {
    return null;
  }
}

function mmss(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

/** Transcript as text with a [m:ss] marker roughly every 20 seconds, capped
 * so one long video can't blow the model budget. */
export function transcriptForPrompt(segments: TranscriptSegment[], maxChars = 45_000): string {
  let out = "";
  let lastMark = -Infinity;
  for (const seg of segments) {
    if (seg.start - lastMark >= 20) {
      out += `\n[${mmss(seg.start)}] `;
      lastMark = seg.start;
    }
    out += `${seg.text} `;
    if (out.length > maxChars) {
      out += "\n[transcript truncated]";
      break;
    }
  }
  return out.trim();
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

const EXTRACTION_PROMPT = `You read one YouTube video in which a student talks about applying to US colleges. Extract what the STUDENT THEMSELVES did, as specifically as the video states it.

Return ONLY a JSON object:
{
  "is_student_story": boolean,      // true only if the speaker is the admitted/applying student describing their OWN undergraduate application. False for counselors, reaction/commentary channels, "asking students" street interviews, grad/law/med school, and parents.
  "reject_reason": string|null,     // short reason when is_student_story is false
  "student_name": string|null,      // the name the student uses for themselves in the video or description ("hi I'm Nina", "name → helaine zhao"). Proper-case it. null if they never say it; never guess from the channel handle.
  "summary": string|null,           // one sentence, <= 30 words, the arc of their story in concrete terms
  "graduation_year": number|null,   // high-school class year
  "hometown": string|null,          // city/state or country only if they say it
  "committed_school": string|null,
  "accepted_schools": string[],     // colleges they say they were ACCEPTED to (not rejected/waitlisted)
  "intended_majors": string[],
  "stats": { "gpa": string|null, "sat": string|null, "act": string|null, "ap_count": number|null },
  "activities": [                   // every extracurricular they describe, most important first, max 12
    {
      "title": string,              // specific name: "Founded 'Code for Kids' coding nonprofit", not "Nonprofit"
      "role": string|null,          // "founder", "captain", "research intern"
      "organization": string|null,  // lab, program, company, team or club name as said
      "details": string,            // 1-2 sentences of the concrete specifics they give: numbers, hours, outcomes, what they built/studied, who with. No filler.
      "category": string,           // one of: ${ACTIVITY_CATEGORIES.join(" | ")}
      "start_seconds": number|null  // second in the video where they start talking about it, from the [m:ss] markers (m*60+ss). null if not in transcript.
    }
  ],
  "awards": [ { "name": string, "level": string|null, "year": number|null, "start_seconds": number|null } ]  // named honors: "USAMO qualifier", "Regeneron STS scholar", "National Merit Semifinalist"
}

Rules: only include what is said; never invent names, numbers, schools, or activities. Auto-captions mis-spell names — correct obvious ones (e.g. "use a co" -> "USACO", "reggae neuron" -> "Regeneron") but otherwise keep their wording. If the video is not a student story, return empty arrays.`;

type RawStory = {
  is_student_story?: boolean;
  reject_reason?: string | null;
  student_name?: string | null;
  summary?: string | null;
  graduation_year?: number | null;
  hometown?: string | null;
  committed_school?: string | null;
  accepted_schools?: string[];
  intended_majors?: string[];
  stats?: { gpa?: string | null; sat?: string | null; act?: string | null; ap_count?: number | null };
  activities?: {
    title?: string;
    role?: string | null;
    organization?: string | null;
    details?: string;
    category?: string;
    start_seconds?: number | null;
  }[];
  awards?: { name?: string; level?: string | null; year?: number | null; start_seconds?: number | null }[];
};

const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const strList = (v: unknown): string[] => (Array.isArray(v) ? v.map(str).filter((s): s is string => !!s) : []);

/** Seconds must fall inside the video, otherwise the model made them up. */
const seconds = (v: unknown, duration: number): number | null => {
  const n = num(v);
  return n !== null && n >= 0 && n < Math.max(duration, 1) ? Math.floor(n) : null;
};

export async function extractStory(input: {
  title: string;
  description: string;
  channelTitle: string;
  durationSeconds: number;
  transcript: TranscriptSegment[] | null;
}): Promise<VideoStory> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("Missing DEEPSEEK_API_KEY (repo root .env).");
  const baseUrl = process.env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com";
  const model = process.env.DEEPSEEK_MODEL ?? "deepseek-v4-flash";

  const user = [
    `Title: ${input.title}`,
    `Channel: ${input.channelTitle}`,
    `Length: ${mmss(input.durationSeconds)}`,
    ``,
    `Description:`,
    input.description.slice(0, 4000),
    ``,
    input.transcript ? `Transcript:\n${transcriptForPrompt(input.transcript)}` : `Transcript: not available.`,
  ].join("\n");

  // One retry: a long transcript occasionally comes back cut off mid-JSON.
  let raw: RawStory | undefined;
  for (let attempt = 0; attempt < 2 && !raw; attempt++) {
    raw = await callModel(baseUrl, apiKey, model, user, attempt === 1);
  }
  return normalize(raw!, input);
}

async function callModel(baseUrl: string, apiKey: string, model: string, user: string, isRetry: boolean): Promise<RawStory | undefined> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      response_format: { type: "json_object" },
      temperature: 0,
      max_tokens: 16000,
      messages: [
        { role: "system", content: EXTRACTION_PROMPT },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(300_000),
  });
  const data: any = await res.json();
  if (!res.ok) throw new Error(`DeepSeek HTTP ${res.status}: ${JSON.stringify(data).slice(0, 300)}`);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned no content");
  try {
    return JSON.parse(content) as RawStory;
  } catch (err) {
    if (isRetry) throw new Error(`DeepSeek returned invalid JSON (finish_reason=${data.choices?.[0]?.finish_reason}): ${(err as Error).message}`);
    return undefined;
  }
}

function normalize(raw: RawStory, input: Parameters<typeof extractStory>[0]): VideoStory {
  const categories = new Set<string>(ACTIVITY_CATEGORIES);
  const d = input.durationSeconds;
  return {
    version: STORY_VERSION,
    evidence: input.transcript ? "transcript" : "description",
    isStudentStory: raw.is_student_story === true,
    rejectReason: str(raw.reject_reason),
    studentName: str(raw.student_name),
    summary: str(raw.summary),
    graduationYear: num(raw.graduation_year),
    hometown: str(raw.hometown),
    committedSchool: str(raw.committed_school),
    acceptedSchools: strList(raw.accepted_schools).slice(0, 20),
    intendedMajors: strList(raw.intended_majors).slice(0, 4),
    stats: {
      gpa: str(raw.stats?.gpa),
      sat: str(raw.stats?.sat),
      act: str(raw.stats?.act),
      apCount: num(raw.stats?.ap_count),
    },
    activities: (raw.activities ?? [])
      .filter((a) => str(a.title))
      .slice(0, 12)
      .map((a) => ({
        title: str(a.title)!,
        role: str(a.role),
        organization: str(a.organization),
        details: str(a.details) ?? "",
        category: a.category && categories.has(a.category) ? a.category : "Other",
        startSeconds: input.transcript ? seconds(a.start_seconds, d) : null,
      })),
    awards: (raw.awards ?? [])
      .filter((a) => str(a.name))
      .slice(0, 12)
      .map((a) => ({
        name: str(a.name)!,
        level: str(a.level),
        year: num(a.year),
        startSeconds: input.transcript ? seconds(a.start_seconds, d) : null,
      })),
    extractedAt: new Date().toISOString(),
  };
}
