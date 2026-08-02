// Supabase Edge Function: research-opportunities
//
// Scheduled research ingestion for STEMPath Finder.
//
//   Supabase Cron
//     -> research-opportunities (this function)
//     -> Exa discovers real opportunity pages on official public websites
//     -> DeepSeek V4 Pro reads the source material and structures it
//     -> public.candidate stores one reusable, structured record per opportunity
//
// The research cost is paid once, here, ahead of any student search. Nothing in
// this function is student-facing and nothing here is user-configurable: the
// research model is fixed to DeepSeek V4 Pro with no fallback.
//
// Never returned to any caller: the DeepSeek API key, the Supabase service-role
// key, the prompts below, or the model's reasoning content.

import { createClient } from "npm:@supabase/supabase-js@2";
import { parseGradingSignals } from "../_shared/ranking.ts";

// ---------------------------------------------------------------------------
// Model policy — research is V4 Pro only.
//
// No Flash fallback. No R1. No deepseek-reasoner. No deepseek-chat. There is no
// user-facing control over this value and it must not be read from a request
// body, a query string, or an environment variable.
// ---------------------------------------------------------------------------

const RESEARCH_MODEL = "deepseek-v4-pro" as const;

const RESEARCH_MODEL_CONFIG = {
  model: RESEARCH_MODEL,
  thinking: {
    type: "enabled" as const,
  },
  reasoning_effort: "high" as const,
  max_tokens: 5000,
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-research-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Discovery budget. Kept small per run because the job runs daily — steady
// accumulation beats one large, expensive sweep.
const DEFAULT_RESULTS_PER_CATEGORY = 6;
const MAX_RESULTS_PER_CATEGORY = 12;
const MAX_SOURCE_CHARACTERS = 12000; // per page, before it reaches the model
const MAX_STRUCTURED_PER_RUN = 40; // hard ceiling on V4 Pro calls per run
const EXISTING_URL_SCAN_CAP = 5000; // rows scanned for duplicate detection

const EXA_ENDPOINT = "https://api.exa.ai/search";
const EXA_TIMEOUT_MS = 30000;

// ---------------------------------------------------------------------------
// Exa search engineering.
//
// Discovery quality is decided in three places:
//   1. excludeDomains — aggregators, listicle mills, and social platforms are
//      cut at the API so they never consume result slots;
//   2. query text — each category query names the page we actually want (an
//      official program page with eligibility/application content);
//   3. source scoring — every returned page is scored on domain class, URL
//      path, title, and content signals; the V4 Pro budget is spent on the
//      best-scoring pages first instead of arrival order.
// ---------------------------------------------------------------------------

/** Never worth a V4 Pro read: roundups, forums, social, and content farms.
 * Official program pages do not live on these hosts. */
const EXCLUDED_DOMAINS = [
  "reddit.com",
  "quora.com",
  "facebook.com",
  "instagram.com",
  "tiktok.com",
  "x.com",
  "twitter.com",
  "youtube.com",
  "linkedin.com",
  "pinterest.com",
  "medium.com",
  "blogspot.com",
  "wordpress.com",
  "wikipedia.org",
  "niche.com",
  "collegevine.com",
  "collegeconfidential.com",
  "prepscholar.com",
  "crimsoneducation.org",
  "polygence.org",
  "indigoresearch.org",
  "scholarships360.org",
  "bold.org",
  "appily.com",
  "teenlife.com",
];

/** A page must show at least one of these before we spend model budget on it —
 * a real opportunity page tells students how to get in. */
const OPPORTUNITY_TEXT_SIGNALS = [
  "apply",
  "application",
  "deadline",
  "eligib",
  "register",
  "admission",
  "nominat",
  "entry",
];

/** Listicle/roundup markers in a title. One strike disqualifies. */
const LISTICLE_TITLE_PATTERNS = [
  /\btop\s+\d+/i,
  /\b\d+\s+(best|great|amazing|awesome)\b/i,
  /\bbest\s+.*(programs|internships|camps|competitions|scholarships)\b/i,
  /\b(list|roundup|guide)\s+(of|to)\b/i,
  /\bultimate guide\b/i,
];

/** Path fragments that mark a canonical program page. */
const PROGRAM_PATH_SIGNALS = [
  "program",
  "intern",
  "camp",
  "scholar",
  "competition",
  "challenge",
  "apply",
  "admission",
  "outreach",
  "summer",
  "research",
  "student",
  "youth",
  "precollege",
  "pre-college",
  "k12",
  "fellowship",
];

/** Sources scoring below this are dropped before structuring. */
const MIN_SOURCE_SCORE = 3;

/** Diversity cap: one host may not eat the run's structuring budget. */
const MAX_DOCS_PER_HOST = 2;

/** Deterministic source-quality score. Higher = more likely to be a canonical,
 * structurable program page. Components are additive and inspectable. */
function scoreSource(url: string, title: string, text: string): number {
  let host = "";
  let path = "";
  try {
    const parsed = new URL(url);
    host = parsed.hostname.toLowerCase().replace(/^www\./, "");
    path = parsed.pathname.toLowerCase();
  } catch {
    return -100;
  }

  const lowerTitle = title.toLowerCase();
  const lowerText = text.toLowerCase();
  let score = 0;

  // Domain class: official institutions publish their own programs.
  if (host.endsWith(".edu") || host.endsWith(".gov") || host.endsWith(".mil")) score += 4;
  else if (host.endsWith(".org")) score += 2;

  // Canonical-looking path.
  if (PROGRAM_PATH_SIGNALS.some((p) => path.includes(p))) score += 2;

  // The page tells students how to get in.
  const signals = OPPORTUNITY_TEXT_SIGNALS.filter((s) => lowerText.includes(s)).length;
  score += Math.min(3, signals);

  // Enough substance to structure without guessing.
  if (text.length >= 2500) score += 1;

  // Roundups and listicles are DeepSeek rejections waiting to happen.
  if (LISTICLE_TITLE_PATTERNS.some((re) => re.test(lowerTitle))) score -= 6;

  // PDFs and search/tag pages structure poorly.
  if (path.endsWith(".pdf")) score -= 2;
  if (path.includes("/search") || path.includes("/tag/") || path.includes("/category/")) score -= 3;

  return score;
}
const DEEPSEEK_TIMEOUT_MS = 120000; // V4 Pro with high reasoning effort is slow
const DEEPSEEK_MAX_ATTEMPTS = 3;

/** Discovery categories. Each becomes one Exa query per run and is stored on the
 * row as `discovery_category`, so ingestion stays traceable to its search.
 *
 * Query engineering: Exa's neural search matches pages that *read like* the
 * query's target, so each query is phrased the way an official program page
 * describes itself — naming the audience, the eligibility language, and the
 * application mechanics — rather than the way a student would search. That
 * steers results toward canonical pages and away from roundups. */
const DISCOVERY_CATEGORIES: Array<{ category: string; query: string }> = [
  {
    category: "research program",
    query:
      "Apply to our summer research program: high school students work in university labs with faculty mentors. Eligibility, application deadline, and program dates below.",
  },
  {
    category: "internship",
    query:
      "STEM internship for high school students: application requirements, eligibility, stipend details, and how to apply on this official program page.",
  },
  {
    category: "summer program",
    query:
      "University pre-college summer program page for high school students: courses, residential details, tuition, financial aid, eligibility, and application instructions.",
  },
  {
    category: "competition",
    query:
      "Official rules and registration page for a national STEM competition open to middle and high school students, with entry deadlines and judging criteria.",
  },
  {
    category: "scholarship",
    query:
      "STEM scholarship for graduating high school students: award amount, eligibility criteria, required materials, and application deadline on the sponsoring organization's page.",
  },
  {
    category: "mentorship",
    query:
      "Free STEM mentorship program page pairing high school students with scientist or engineer mentors: who can apply, time commitment, and application steps.",
  },
  {
    category: "hackathon",
    query:
      "Official registration page for a hackathon or engineering design challenge open to high school students, with event dates, team rules, and signup instructions.",
  },
  {
    category: "volunteering",
    query:
      "STEM volunteer or citizen-science program page recruiting high school students, describing the work, time commitment, and how to sign up.",
  },
];

/** Columns written to public.candidate. The schema is not modified by this
 * function — anything the model returns outside this list is dropped. */
const STRING_FIELDS = [
  "title",
  "organization",
  "opportunity_type",
  "location",
  "cost",
  "application_status",
  "application_deadline",
  "application_open_date",
  "official_url",
  "application_url",
  "good_for",
  "extra_information",
  "experience_level",
  "competitiveness",
  "program_format",
  "time_commitment",
  "prerequisites",
  "citizenship_requirements",
  "residency_requirements",
  "program_start_date",
  "program_end_date",
] as const;

const ARRAY_FIELDS = [
  "stem_fields",
  "college_major_matches",
  "skills_developed",
  "eligible_grades",
  "missing_information",
] as const;

const BOOLEAN_FIELDS = [
  "financial_aid_available",
  "stipend_available",
  "essay_required",
  "recommendation_required",
  "transcript_required",
] as const;

const NUMBER_FIELDS = ["minimum_age", "maximum_age"] as const;

type ExaResult = {
  url?: unknown;
  title?: unknown;
  text?: unknown;
  publishedDate?: unknown;
};

type SourceDocument = {
  url: string;
  title: string;
  text: string;
  category: string;
  /** Deterministic source-quality score from scoreSource(). */
  sourceScore: number;
};

type CandidateRecord = Record<string, unknown>;

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

/** Normalize a URL for duplicate detection: host without `www.`, no trailing
 * slash, no query or fragment. */
function urlKey(raw: unknown): string | null {
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    const url = new URL(raw.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.replace(/\/+$/, "");
    return `${host}${path}`;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 1 — Exa discovery
// ---------------------------------------------------------------------------

async function discover(
  exaApiKey: string,
  category: string,
  query: string,
  numResults: number,
): Promise<{ documents: SourceDocument[]; droppedLowQuality: number }> {
  const res = await fetch(EXA_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": exaApiKey,
    },
    body: JSON.stringify({
      query,
      numResults,
      type: "auto",
      excludeDomains: EXCLUDED_DOMAINS,
      contents: {
        text: { maxCharacters: MAX_SOURCE_CHARACTERS },
        // Recrawl when Exa's cache has nothing — deadlines age fast.
        livecrawl: "fallback",
      },
    }),
    signal: AbortSignal.timeout(EXA_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Exa search failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  const data = await res.json();
  const results: ExaResult[] = Array.isArray(data?.results) ? data.results : [];

  const documents: SourceDocument[] = [];
  let droppedLowQuality = 0;
  for (const result of results) {
    const url = typeof result.url === "string" ? result.url.trim() : "";
    const text = typeof result.text === "string" ? result.text.trim() : "";
    if (!url || text.length < 400) continue; // too thin to structure reliably

    const title = typeof result.title === "string" ? result.title.trim() : "";
    const sourceScore = scoreSource(url, title, text);
    if (sourceScore < MIN_SOURCE_SCORE) {
      droppedLowQuality += 1;
      continue;
    }

    documents.push({
      url,
      title,
      text: text.slice(0, MAX_SOURCE_CHARACTERS),
      category,
      sourceScore,
    });
  }

  return { documents, droppedLowQuality };
}

// ---------------------------------------------------------------------------
// Step 2 — DeepSeek V4 Pro structures one source page into one record
// ---------------------------------------------------------------------------

function buildResearchSystemPrompt(): string {
  return [
    "You are the STEMPath Finder research analyst. You convert one source web page into one structured STEM opportunity record for students in grades 6-12.",
    "The page text you are given is your ONLY source of truth.",
    "Rules you must follow exactly:",
    "- Never invent, infer, or estimate any value. If the page does not state something, use null (or an empty array) and list that field name in \"missing_information\".",
    "- Never guess deadlines, costs, eligibility, ages, or grade ranges. A plausible-sounding guess is a failure.",
    "- \"is_opportunity\" must be false unless the page describes ONE specific, real program students can apply to or enter. Listicles, blog roundups, directories, news articles, and general organization homepages are not opportunities.",
    "- \"official_url\" must be the page's own canonical program URL. \"application_url\" is the direct application link only if the page states one.",
    "- \"eligible_grades\" is an array of grade numbers as strings (e.g. [\"9\",\"10\",\"11\",\"12\"]), only when the page states them. College-only programs are not eligible for this database.",
    "- \"opportunity_type\" is one of: Internship, Research, Camp, Competition, Volunteer opportunity, Mentorship, Workshop, Scholarship, Summer Program.",
    "- \"application_status\" is one of: open, upcoming, closed, unknown. Use \"unknown\" unless the page states it.",
    "- \"college_major_matches\" is subject-fit guidance only. Never phrase it as a college ranking, admissions guarantee, or acceptance likelihood.",
    "- Dates use YYYY-MM-DD when the page gives a full date; otherwise reproduce the page's own wording verbatim.",
    "",
    "GRADING SIGNALS — \"grading_signals\" holds an evidence-backed course grade in three sections. Every new source must be graded. For each criterion, either grade it (\"full\", \"partial\", or \"minimal\" credit) or leave it null:",
    "Course Completion (30% of the grade):",
    "- lessonsCompleted: the required lessons of the course are completed / offered as completable.",
    "- quizzesCompleted: the course's quizzes are completed / offered as completable.",
    "- activitiesCompleted: the required course activities are completed / offered as completable.",
    "Challenge Performance (40% of the grade):",
    "- accuracy: the challenge work is accurate.",
    "- followedInstructions: the challenge instructions were followed.",
    "- challengeCompleted: the assigned challenge was completed.",
    "- evidenceSubmitted: the required evidence for the challenge was submitted.",
    "- solutionExplained: the solution is explained.",
    "Final Project (30% of the grade):",
    "- projectCompleted: the final project was completed.",
    "- requirementsMet: the project requirements were met.",
    "- skillsDemonstrated: the course skills are demonstrated.",
    "- resultPresented: the result is clearly presented.",
    "Rules for every criterion: \"evidence\" MUST be a short verbatim quote (or tight paraphrase) from the page that supports the credit level. No quote you can point to means level = null and evidence = null. Never infer a level from reputation alone — only from what THIS page states.",
    "",
    "- Respond with strict JSON only, matching exactly this shape, no markdown, no extra keys:",
    '{"is_opportunity": boolean, "rejection_reason": string | null, "title": string | null, "organization": string | null, "opportunity_type": string | null, "stem_fields": string[], "college_major_matches": string[], "skills_developed": string[], "eligible_grades": string[], "minimum_age": number | null, "maximum_age": number | null, "location": string | null, "cost": string | null, "application_status": string | null, "application_deadline": string | null, "application_open_date": string | null, "official_url": string | null, "application_url": string | null, "good_for": string | null, "extra_information": string | null, "experience_level": string | null, "competitiveness": string | null, "program_format": string | null, "time_commitment": string | null, "financial_aid_available": boolean | null, "stipend_available": boolean | null, "essay_required": boolean | null, "recommendation_required": boolean | null, "transcript_required": boolean | null, "prerequisites": string | null, "citizenship_requirements": string | null, "residency_requirements": string | null, "program_start_date": string | null, "program_end_date": string | null, "missing_information": string[], "grading_signals": {"lessonsCompleted": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "quizzesCompleted": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "activitiesCompleted": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "accuracy": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "followedInstructions": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "challengeCompleted": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "evidenceSubmitted": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "solutionExplained": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "projectCompleted": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "requirementsMet": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "skillsDemonstrated": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}, "resultPresented": {"level": "full" | "partial" | "minimal" | null, "evidence": string | null}}}',
  ].join("\n");
}

async function structureSource(
  baseUrl: string,
  apiKey: string,
  doc: SourceDocument,
): Promise<CandidateRecord | null> {
  const messages = [
    { role: "system", content: buildResearchSystemPrompt() },
    {
      role: "user",
      content:
        `Source URL: ${doc.url}\n` +
        `Source page title: ${doc.title || "(none)"}\n` +
        `Discovery category: ${doc.category}\n\n` +
        `Source page text (only source of truth):\n${doc.text}`,
    },
  ];

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      ...RESEARCH_MODEL_CONFIG,
      messages,
      temperature: 0.1,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(DEEPSEEK_TIMEOUT_MS),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `DeepSeek research request failed (${res.status}): ${detail.slice(0, 300)}`,
    );
  }

  const data = await res.json();
  // `reasoning_content` is deliberately ignored — reasoning never leaves this
  // function, is never stored, and is never returned to a caller.
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("DeepSeek research response missing message content");
  }

  try {
    return JSON.parse(content) as CandidateRecord;
  } catch {
    throw new Error("DeepSeek research response was not valid JSON");
  }
}

// ---------------------------------------------------------------------------
// Step 3 — validate and shape one row for public.candidate
// ---------------------------------------------------------------------------

function cleanString(value: unknown, max = 2000): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.toLowerCase() === "null" || trimmed.toLowerCase() === "unknown") {
    return null;
  }
  return trimmed.slice(0, max);
}

function cleanStringArray(value: unknown, max = 25): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const item of value) {
    const cleaned = cleanString(item, 120);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
    if (out.length >= max) break;
  }
  return out;
}

function toCandidateRow(
  parsed: CandidateRecord,
  doc: SourceDocument,
  runTimestamp: string,
): CandidateRecord | null {
  if (parsed.is_opportunity !== true) return null;

  const title = cleanString(parsed.title, 300);
  const officialUrl = cleanString(parsed.official_url, 1000) ?? doc.url;
  if (!title || !urlKey(officialUrl)) return null;

  const row: CandidateRecord = {
    // Provenance: how this record was discovered and when it was researched.
    source_url: doc.url,
    discovery_category: doc.category,
    retrieved_at: runTimestamp,
    checked_at: runTimestamp,
    last_verified_at: runTimestamp,
  };

  for (const field of STRING_FIELDS) {
    row[field] = cleanString(parsed[field]);
  }
  for (const field of ARRAY_FIELDS) {
    row[field] = cleanStringArray(parsed[field]);
  }
  for (const field of BOOLEAN_FIELDS) {
    row[field] = typeof parsed[field] === "boolean" ? parsed[field] : null;
  }
  for (const field of NUMBER_FIELDS) {
    const value = parsed[field];
    row[field] =
      typeof value === "number" && Number.isFinite(value) && value > 0 && value < 120
        ? Math.round(value)
        : null;
  }

  row.title = title;
  row.official_url = officialUrl;
  row.application_status = cleanString(parsed.application_status)?.toLowerCase() ?? null;

  // Grading signals pass through the same validator the grading module reads
  // with: a credit level only survives alongside real evidence text. An empty
  // result stores as null, which the grader reports as "not yet graded". This
  // is where every newly discovered source gets its grade recorded.
  const signals = parseGradingSignals(parsed.grading_signals);
  row.grading_signals = Object.keys(signals).length > 0 ? signals : null;

  return row;
}

// ---------------------------------------------------------------------------
// Step 4 — duplicate detection against existing candidate records
// ---------------------------------------------------------------------------

async function loadExistingUrlKeys(
  supabase: ReturnType<typeof createClient>,
): Promise<Set<string>> {
  const { data, error } = await supabase
    .from("candidate")
    .select("official_url,source_url")
    .limit(EXISTING_URL_SCAN_CAP);

  if (error) {
    throw new Error(`candidate duplicate scan failed: ${error.message}`);
  }

  const keys = new Set<string>();
  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    for (const key of [urlKey(row.official_url), urlKey(row.source_url)]) {
      if (key) keys.add(key);
    }
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Only POST requests are supported." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const exaApiKey = Deno.env.get("EXA_API_KEY");
  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
  const deepseekBaseUrl = Deno.env.get("DEEPSEEK_BASE_URL");
  const researchSecret = Deno.env.get("RESEARCH_TRIGGER_SECRET");

  if (!supabaseUrl || !serviceRoleKey || !exaApiKey || !deepseekApiKey || !deepseekBaseUrl) {
    console.error(
      "Missing one of SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, EXA_API_KEY, DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL",
    );
    return jsonResponse({ error: "Server misconfiguration." }, 500);
  }

  // This is a write path, so it is never open. The cron job presents either the
  // shared research secret or the service-role bearer token.
  const presentedSecret = req.headers.get("x-research-secret");
  const presentedBearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  const authorized =
    (researchSecret && presentedSecret === researchSecret) ||
    presentedBearer === serviceRoleKey;

  if (!authorized) {
    return jsonResponse({ error: "Unauthorized." }, 401);
  }

  let body: Record<string, unknown> = {};
  try {
    const raw = await req.text();
    if (raw.trim()) body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  const perCategory = (() => {
    const value = body.resultsPerCategory;
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return DEFAULT_RESULTS_PER_CATEGORY;
    }
    return Math.min(MAX_RESULTS_PER_CATEGORY, Math.max(1, Math.round(value)));
  })();

  const requestedCategories = Array.isArray(body.categories)
    ? body.categories.filter((c): c is string => typeof c === "string")
    : null;
  const categories = requestedCategories?.length
    ? DISCOVERY_CATEGORIES.filter((c) => requestedCategories.includes(c.category))
    : DISCOVERY_CATEGORIES;

  const dryRun = body.dryRun === true;
  const runTimestamp = new Date().toISOString();

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  let existingKeys: Set<string>;
  try {
    existingKeys = await loadExistingUrlKeys(supabase);
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: "Could not read existing candidate records." }, 502);
  }

  // --- Discovery -----------------------------------------------------------
  const discoveryErrors: string[] = [];
  const documents: SourceDocument[] = [];
  const seenThisRun = new Set<string>();
  // Exa hits dropped before structuring because we already hold that URL, either
  // from a previous run or from an earlier category in this one.
  let skippedExisting = 0;
  let skippedLowQuality = 0;

  for (const { category, query } of categories) {
    try {
      const { documents: found, droppedLowQuality } = await discover(
        exaApiKey,
        category,
        query,
        perCategory,
      );
      skippedLowQuality += droppedLowQuality;
      for (const doc of found) {
        const key = urlKey(doc.url);
        if (!key) continue;
        if (existingKeys.has(key) || seenThisRun.has(key)) {
          skippedExisting += 1;
          continue;
        }
        seenThisRun.add(key);
        documents.push(doc);
      }
    } catch (err) {
      console.error(`Exa discovery failed for "${category}":`, err);
      discoveryErrors.push(category);
    }
  }

  // Spend the V4 Pro budget on the best sources first, and never let one host
  // monopolize a run — a university that dominates one query should not crowd
  // out every other discovery.
  documents.sort((a, b) => b.sourceScore - a.sourceScore);
  const hostCounts = new Map<string, number>();
  let skippedHostCap = 0;
  const prioritized: SourceDocument[] = [];
  for (const doc of documents) {
    let host = "";
    try {
      host = new URL(doc.url).hostname.toLowerCase().replace(/^www\./, "");
    } catch {
      continue;
    }
    const used = hostCounts.get(host) ?? 0;
    if (used >= MAX_DOCS_PER_HOST) {
      skippedHostCap += 1;
      continue;
    }
    hostCounts.set(host, used + 1);
    prioritized.push(doc);
  }

  const toStructure = prioritized.slice(0, MAX_STRUCTURED_PER_RUN);
  const skippedForBudget = prioritized.length - toStructure.length;

  // --- Structuring (DeepSeek V4 Pro only) ----------------------------------
  const rows: CandidateRecord[] = [];
  let rejectedNotAnOpportunity = 0;
  let structureFailures = 0;

  for (const doc of toStructure) {
    let parsed: CandidateRecord | null = null;

    for (let attempt = 1; attempt <= DEEPSEEK_MAX_ATTEMPTS; attempt += 1) {
      try {
        parsed = await structureSource(deepseekBaseUrl, deepseekApiKey, doc);
        break;
      } catch (err) {
        console.error(
          `V4 Pro structuring attempt ${attempt}/${DEEPSEEK_MAX_ATTEMPTS} failed for ${doc.url}:`,
          err,
        );
        if (attempt === DEEPSEEK_MAX_ATTEMPTS) {
          // No fallback model. A page that cannot be structured by V4 Pro is
          // left for the next run rather than downgraded to a weaker model.
          structureFailures += 1;
        } else {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
      }
    }

    if (!parsed) continue;

    const row = toCandidateRow(parsed, doc, runTimestamp);
    if (!row) {
      rejectedNotAnOpportunity += 1;
      continue;
    }

    // Re-check after structuring: the model may resolve a redirect-style search
    // hit to a canonical URL that already exists.
    const key = urlKey(row.official_url);
    if (!key || existingKeys.has(key)) {
      rejectedNotAnOpportunity += 1;
      continue;
    }
    existingKeys.add(key);
    rows.push(row);
  }

  // --- Storage -------------------------------------------------------------
  let inserted = 0;
  let gradingSignalsStored = true;
  if (rows.length && !dryRun) {
    let { error } = await supabase.from("candidate").insert(rows);

    // Pre-migration window: if public.candidate does not have grading_signals
    // yet, store everything else rather than losing the run. The grader treats
    // the missing signals as "not yet graded".
    if (error && /grading_signals/i.test(error.message)) {
      console.warn(
        "grading_signals column missing — inserting without it. Apply supabase/migrations/20260727090000_add_grading_signals.sql to keep grades.",
      );
      gradingSignalsStored = false;
      const stripped = rows.map(({ grading_signals: _dropped, ...rest }) => rest);
      ({ error } = await supabase.from("candidate").insert(stripped));
    }

    if (error) {
      console.error("candidate insert failed:", error.message);
      return jsonResponse(
        {
          error: "Could not store researched candidates.",
          discovered: documents.length,
          structured: rows.length,
          inserted: 0,
        },
        502,
      );
    }
    inserted = rows.length;
  }

  // Counts only — no source text, no prompts, no reasoning, no credentials.
  return jsonResponse(
    {
      ok: true,
      ran_at: runTimestamp,
      categories: categories.map((c) => c.category),
      discovered: documents.length,
      structured: rows.length,
      inserted,
      dry_run: dryRun,
      skipped_existing: skippedExisting,
      skipped_low_quality: skippedLowQuality,
      skipped_host_cap: skippedHostCap,
      skipped_for_budget: skippedForBudget,
      rejected_not_an_opportunity: rejectedNotAnOpportunity,
      structure_failures: structureFailures,
      discovery_errors: discoveryErrors,
      grading_signals_stored: gradingSignalsStored,
    },
    200,
  );
});
