// Supabase Edge Function: ask-stempath
//
// Conversational search over public.candidate for STEMPath Finder (beta).
// POST only. Reads candidate rows with a fixed, parameter-free query (no
// model-generated SQL, no writes), sends them to DeepSeek for matching, and
// hydrates the response from the DB rows so DeepSeek can never invent
// opportunity data.
//
// Pipeline: retrieval → hard eligibility filter → deterministic ranking
// (supabase/functions/_shared/ranking.ts) → DeepSeek EXPLAINS the ranked
// shortlist. The shortlist and its order come from the ranking system, not the
// model; DeepSeek writes the answer and per-match explanations, and may only
// drop an entry as clearly irrelevant to the question — never add or reorder.
//
// The caller may name a search tier ("standard" | "pro") to pick how much model
// effort the run gets. See TIER_MODELS below.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  checkEligibility,
  rankOpportunity,
  type OpportunityRanking,
} from "../_shared/ranking.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MAX_MESSAGE_LENGTH = 1000;
const MAX_CONTEXT_TURNS = 6;
const MAX_MATCHES = 10;

// ---------------------------------------------------------------------------
// Search depth — the one model choice a student is allowed to make.
//
// The request carries a tier name, never a model id, so a caller can never
// point this function at an arbitrary model. Anything unrecognized falls back
// to DEEPSEEK_MODEL rather than erroring, which keeps old clients working.
//
// This is student-facing search only. The research ingestion in
// research-opportunities stays pinned to V4 Pro and is not configurable.
// ---------------------------------------------------------------------------

const TIER_MODELS = {
  standard: "deepseek-v4-flash",
  pro: "deepseek-v4-pro",
} as const;

type SearchTier = keyof typeof TIER_MODELS;

// V4 Pro reasons for noticeably longer, so a shared timeout would either cut Pro
// off mid-answer or leave Standard hanging well past the point it has failed.
const TIER_TIMEOUT_MS: Record<SearchTier, number> = {
  standard: 45000,
  pro: 110000,
};

function parseTier(value: unknown): SearchTier | undefined {
  return typeof value === "string" && value in TIER_MODELS
    ? (value as SearchTier)
    : undefined;
}

// Scalable retrieval: read a bounded slice of the table, then hand DeepSeek only
// the most relevant records so its input never grows with the dataset.
const FETCH_CAP = 400; // DB read ceiling (bounds cost as the candidate table grows)
const MAX_MODEL_CANDIDATES = 45; // hard cap on records passed to DeepSeek

// Selected-interest label → search keywords, so an interest matches the varied
// field/title wording that appears in candidate rows.
const INTEREST_KEYWORDS: Record<string, string[]> = {
  "computer science": ["computer science", "cs", "software", "programming", "coding", "app"],
  "artificial intelligence": ["ai", "artificial intelligence", "machine learning", "ml", "deep learning", "neural"],
  "robotics": ["robot", "robotics", "mechatronics", "automation"],
  "engineering": ["engineering", "engineer", "mechanical", "electrical", "civil"],
  "biology": ["biology", "bio", "life science", "genetics", "molecular"],
  "biomedical science": ["biomedical", "bioengineering", "biotech", "biomedical science"],
  "medicine and health": ["medicine", "medical", "health", "clinical", "pre-med", "nursing", "public health"],
  "chemistry": ["chemistry", "chemical", "biochem"],
  "physics": ["physics", "astrophysics", "quantum"],
  "mathematics": ["math", "mathematics", "calculus", "statistics"],
  "data science": ["data science", "data", "analytics", "statistics"],
  "environmental science": ["environmental", "environment", "climate", "sustainability", "ecology", "earth science"],
  "aerospace": ["aerospace", "aeronautics", "space", "aviation", "nasa"],
};

const CANDIDATE_COLUMNS = [
  "id",
  "title",
  "organization",
  "opportunity_type",
  "stem_fields",
  "college_major_matches",
  "skills_developed",
  "eligible_grades",
  "minimum_age",
  "maximum_age",
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
  "financial_aid_available",
  "stipend_available",
  "essay_required",
  "recommendation_required",
  "transcript_required",
  "prerequisites",
  "citizenship_requirements",
  "residency_requirements",
  "program_start_date",
  "program_end_date",
  "missing_information",
  "discovery_category",
  "checked_at",
  "last_verified_at",
].join(",");

/** Selected separately so the query can fall back cleanly while the
 * grading_signals migration has not been applied yet. */
const GRADING_COLUMN = "grading_signals";

/** How many ranked candidates DeepSeek is asked to explain. */
const SHORTLIST_SIZE = 10;

type CandidateRow = Record<string, unknown> & { id: string };

type ContextTurn = { role: "user" | "assistant"; content: string };

type AskRequestBody = {
  question?: unknown;
  message?: unknown;
  context?: unknown;
  profile?: unknown;
  tier?: unknown;
};

type StudentProfile = {
  grade?: string;
  gpa?: { value?: number; scale?: string };
  location?: { cityOrZip?: string; radius?: string };
  formats?: string[];
  interests?: string[];
  specificInterest?: string;
  opportunityTypes?: string[];
  experienceLevel?: string;
  experienceDetails?: string;
  availability?: string[];
  specificDates?: string;
  costPreference?: string;
  applicationStatusPreference?: string;
};

type DeepSeekMatch = {
  id?: unknown;
  match_reason?: unknown;
  eligibility_warning?: unknown;
};

type DeepSeekAnswer = {
  answer?: unknown;
  interpreted_request?: unknown;
  matches?: unknown;
  clarification_question?: unknown;
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

function sanitizeContext(raw: unknown): ContextTurn[] {
  if (!Array.isArray(raw)) return [];

  const cleaned: ContextTurn[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const role = (entry as Record<string, unknown>).role;
    const content = (entry as Record<string, unknown>).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, MAX_MESSAGE_LENGTH);
    if (!trimmed) continue;
    cleaned.push({ role, content: trimmed });
  }

  return cleaned.slice(-MAX_CONTEXT_TURNS);
}

function buildSystemPrompt(): string {
  return [
    "You are the STEMPath Finder assistant, helping middle- and high-school students (grades 6-12) understand a ranked shortlist of STEM opportunities.",
    "The shortlist was already selected and ordered by a deterministic grading system whose total score is Course Completion (30) + Challenge Performance (40) + Final Project (30), out of 100, plus informational reads on personal fit, evidence confidence, and application urgency. Each record includes its grade summary under \"_ranking\".",
    "Your job is to EXPLAIN the shortlist, not to build one.",
    "Rules you must follow exactly:",
    "- The provided records are your ONLY source of truth. Never invent opportunities, deadlines, costs, eligibility, rankings, or links.",
    "- Return every provided id in \"matches\", in the SAME ORDER they were given. Do not reorder. Do not add ids.",
    "- Exception: omit an id ONLY when the record is clearly irrelevant to what the student actually asked (wrong subject entirely). Preference mismatches are not irrelevance — keep those and note the mismatch instead.",
    "- \"match_reason\": one or two concrete sentences on why THIS record fits THIS student's question and profile. Reference specifics (their interest, grade, location, the ranking's fit signals). No generic praise.",
    "- \"eligibility_warning\": any concern the student should check first — closed or unconfirmed status, unstated grades, cost vs their budget, a near deadline, or anything the _ranking summary flags. Null when there is nothing to flag.",
    "- \"answer\": a short, warm overview of the shortlist that answers the student's question directly and tells them what to look at first and why. When the ranking marks something apply-now, say so.",
    "- If the student's request is too vague to explain matches well, ask exactly one clarifying question in \"clarification_question\"; still explain the provided records.",
    "- Treat \"college_major_matches\" as subject-fit guidance only. Never phrase it as a college ranking, admissions guarantee, or acceptance likelihood.",
    "- A blank profile field means \"unknown\", never a negative preference.",
    "- GPA: mention GPA ONLY when a record states a minimum GPA requirement.",
    "- Respond with strict JSON only, matching exactly this shape, no markdown, no extra keys:",
    '{"answer": string, "interpreted_request": string, "matches": [{"id": string, "match_reason": string, "eligibility_warning": string | null}], "clarification_question": string | null}',
  ].join("\n");
}

async function fetchCandidates(
  supabaseUrl: string,
  serviceRoleKey: string,
  excludeClosed: boolean,
): Promise<CandidateRow[]> {
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Bounded read. The only DB-side filter is a coarse status prefilter derived
  // from a fixed enum choice (never free user text), so there is still no SQL
  // injection surface and no write path. `neq closed` drops only rows that are
  // explicitly closed — unknown/open/upcoming are kept, so a missing status
  // never removes a candidate.
  const run = async (columns: string) => {
    let query = supabase
      .from("candidate")
      .select(columns)
      .order("created_at", { ascending: false })
      .limit(FETCH_CAP);
    if (excludeClosed) {
      query = query.neq("application_status", "closed");
    }
    return await query;
  };

  let { data, error } = await run(`${CANDIDATE_COLUMNS},${GRADING_COLUMN}`);

  // Pre-migration fallback: rank without grading signals rather than failing.
  if (error && /grading_signals/i.test(error.message)) {
    ({ data, error } = await run(CANDIDATE_COLUMNS));
  }

  if (error) {
    throw new Error(`candidate query failed: ${error.message}`);
  }

  return (data ?? []) as unknown as CandidateRow[];
}

function normalize(value: unknown): string {
  return typeof value === "string" ? value.toLowerCase() : "";
}

/** Concatenate the fields worth searching for keyword relevance. */
function rowText(row: CandidateRow): string {
  const parts: string[] = [];
  for (const key of ["title", "organization", "opportunity_type", "good_for", "extra_information", "discovery_category"]) {
    parts.push(normalize(row[key]));
  }
  for (const key of ["stem_fields", "college_major_matches", "skills_developed"]) {
    const v = row[key];
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === "string") parts.push(item.toLowerCase());
        else if (item && typeof item === "object") parts.push(JSON.stringify(item).toLowerCase());
      }
    } else if (typeof v === "string") {
      parts.push(v.toLowerCase());
    }
  }
  return parts.join(" | ");
}

function profileKeywords(profile: StudentProfile | undefined, question: string): string[] {
  const kws = new Set<string>();
  const add = (s: string) => {
    const t = s.trim().toLowerCase();
    if (t.length >= 3) kws.add(t);
  };
  if (profile?.interests) {
    for (const interest of profile.interests) {
      const key = interest.trim().toLowerCase();
      (INTEREST_KEYWORDS[key] ?? [key]).forEach(add);
    }
  }
  if (profile?.specificInterest) profile.specificInterest.split(/[\s,]+/).forEach(add);
  question.split(/[\s,]+/).forEach((w) => {
    if (w.length >= 4) add(w);
  });
  return [...kws];
}

function gradeNumber(grade: string | undefined): number | null {
  if (!grade) return null;
  const n = Number.parseInt(grade, 10);
  return Number.isFinite(n) ? n : null;
}

/** Structured + keyword relevance score. Preferences are soft signals; a missing
 * field on either side never hard-rejects a candidate. */
function scoreCandidate(row: CandidateRow, profile: StudentProfile | undefined, keywords: string[]): number {
  const text = rowText(row);
  let score = 0;

  for (const kw of keywords) {
    if (text.includes(kw)) score += 3;
  }

  if (profile?.opportunityTypes?.length && !profile.opportunityTypes.includes("Any")) {
    const type = normalize(row["opportunity_type"]);
    if (profile.opportunityTypes.some((t) => type.includes(t.toLowerCase().split(" ")[0]))) score += 5;
  }

  const grade = gradeNumber(profile?.grade);
  const eligible = row["eligible_grades"];
  if (grade !== null && Array.isArray(eligible) && eligible.length) {
    const nums = eligible
      .map((g) => (typeof g === "number" ? g : Number.parseInt(String(g), 10)))
      .filter((n) => Number.isFinite(n));
    if (nums.length) score += nums.includes(grade) ? 4 : -3;
  }

  if (profile?.costPreference === "Free only") {
    const cost = normalize(row["cost"]);
    if (cost.includes("free") || cost.includes("$0") || cost === "0") score += 2;
    else if (cost && !cost.includes("scholarship")) score -= 1;
  }

  const status = normalize(row["application_status"]);
  if (profile?.applicationStatusPreference === "Open applications only" && status === "open") score += 3;

  if (profile?.formats?.length && !profile.formats.includes("Any")) {
    const fmt = normalize(row["program_format"]);
    if (profile.formats.some((f) => fmt.includes(f.toLowerCase().split(" ")[0]))) score += 1;
  }

  const cityOrZip = profile?.location?.cityOrZip?.trim().toLowerCase();
  if (cityOrZip && cityOrZip.length >= 3 && normalize(row["location"]).includes(cityOrZip)) score += 2;

  return score;
}

/** Reduce the fetched rows to the most relevant, capped set for DeepSeek. */
function retrieveRelevant(
  candidates: CandidateRow[],
  profile: StudentProfile | undefined,
  question: string,
): CandidateRow[] {
  const keywords = profileKeywords(profile, question);
  const hasSignal = keywords.length > 0 || (profile && Object.keys(profile).length > 0);
  if (!hasSignal) return candidates.slice(0, MAX_MODEL_CANDIDATES);

  const scored = candidates
    .map((row, index) => ({ row, index, score: scoreCandidate(row, profile, keywords) }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const top = scored.filter((s) => s.score > 0).slice(0, MAX_MODEL_CANDIDATES).map((s) => s.row);

  // Backfill with recent rows so there's always a reasonable set to reason over,
  // without ever exceeding the cap.
  if (top.length < Math.min(12, MAX_MODEL_CANDIDATES)) {
    const seen = new Set(top.map((r) => String(r.id)));
    for (const s of scored) {
      if (top.length >= MAX_MODEL_CANDIDATES) break;
      const id = String(s.row.id);
      if (!seen.has(id)) {
        seen.add(id);
        top.push(s.row);
      }
    }
  }
  return top;
}

/** A shortlist entry: the row plus the ranking that put it there. */
type RankedCandidate = { row: CandidateRow; ranking: OpportunityRanking };

/** Compact projection sent to the model — enough to explain on, far fewer
 * tokens. `_ranking` gives the model the same summary the student will see, so
 * its explanations agree with the published scores. */
function trimForModel(entry: RankedCandidate): Record<string, unknown> {
  const { row, ranking } = entry;
  const keep = [
    "id", "title", "organization", "opportunity_type", "stem_fields",
    "college_major_matches", "eligible_grades", "location", "cost",
    "application_status", "application_deadline", "program_format",
    "experience_level", "good_for", "prerequisites",
  ];
  const out: Record<string, unknown> = {};
  for (const key of keep) {
    if (row[key] !== undefined && row[key] !== null) out[key] = row[key];
  }
  out._ranking = {
    personal_fit: ranking.personalFit.score,
    fit_notes: ranking.personalFit.components
      .filter((c) => c.points === 0 || c.points === c.maxPoints)
      .slice(0, 4)
      .map((c) => c.reason),
    total_score: ranking.courseGrade.total,
    course_completion: ranking.courseGrade.courseCompletion.graded
      ? ranking.courseGrade.courseCompletion.points
      : null,
    challenge_performance: ranking.courseGrade.challengePerformance.graded
      ? ranking.courseGrade.challengePerformance.points
      : null,
    final_project: ranking.courseGrade.finalProject.graded
      ? ranking.courseGrade.finalProject.points
      : null,
    grade_note: ranking.courseGrade.courseCompletion.ungradedReason ?? null,
    competitiveness: ranking.competitiveness.tier,
    evidence_confidence: ranking.evidenceConfidence.score,
    application_priority: ranking.applicationPriority.label,
    priority_reason: ranking.applicationPriority.reason,
  };
  return out;
}

function sanitizeProfile(raw: unknown): StudentProfile | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  // Trust only the known shape; ignore anything unexpected. Values are used for
  // ranking + prompt context, never interpolated into SQL.
  const p = raw as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 300) : undefined);
  const strArr = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.slice(0, 60)).slice(0, 20) : undefined;

  const out: StudentProfile = {};
  if (str(p.grade)) out.grade = str(p.grade);
  if (p.gpa && typeof p.gpa === "object") {
    const g = p.gpa as Record<string, unknown>;
    const value = typeof g.value === "number" && Number.isFinite(g.value) ? g.value : undefined;
    const scale = typeof g.scale === "string" ? g.scale : undefined;
    if (value !== undefined) out.gpa = { value, ...(scale ? { scale } : {}) };
  }
  if (p.location && typeof p.location === "object") {
    const l = p.location as Record<string, unknown>;
    const loc: { cityOrZip?: string; radius?: string } = {};
    if (str(l.cityOrZip)) loc.cityOrZip = str(l.cityOrZip);
    if (str(l.radius)) loc.radius = str(l.radius);
    if (Object.keys(loc).length) out.location = loc;
  }
  const formats = strArr(p.formats);
  if (formats?.length) out.formats = formats;
  const interests = strArr(p.interests);
  if (interests?.length) out.interests = interests;
  if (str(p.specificInterest)) out.specificInterest = str(p.specificInterest);
  const types = strArr(p.opportunityTypes);
  if (types?.length) out.opportunityTypes = types;
  if (str(p.experienceLevel)) out.experienceLevel = str(p.experienceLevel);
  if (str(p.experienceDetails)) out.experienceDetails = str(p.experienceDetails);
  const availability = strArr(p.availability);
  if (availability?.length) out.availability = availability;
  if (str(p.specificDates)) out.specificDates = str(p.specificDates);
  if (str(p.costPreference)) out.costPreference = str(p.costPreference);
  if (str(p.applicationStatusPreference)) out.applicationStatusPreference = str(p.applicationStatusPreference);

  return Object.keys(out).length ? out : undefined;
}

function summarizeProfile(profile: StudentProfile | undefined): string {
  if (!profile || Object.keys(profile).length === 0) return "No structured profile provided.";
  const lines: string[] = [];
  if (profile.grade) lines.push(`Grade: ${profile.grade}`);
  if (profile.gpa?.value !== undefined) {
    lines.push(`GPA: ${profile.gpa.value}${profile.gpa.scale ? ` on a ${profile.gpa.scale} scale` : " (scale unspecified)"}`);
  }
  if (profile.location?.cityOrZip || profile.location?.radius) {
    lines.push(`Location: ${[profile.location?.cityOrZip, profile.location?.radius].filter(Boolean).join(", ")}`);
  }
  if (profile.formats?.length) lines.push(`Preferred format: ${profile.formats.join(", ")}`);
  if (profile.interests?.length) lines.push(`Interests: ${profile.interests.join(", ")}`);
  if (profile.specificInterest) lines.push(`Specific interest: ${profile.specificInterest}`);
  if (profile.opportunityTypes?.length) lines.push(`Opportunity types: ${profile.opportunityTypes.join(", ")}`);
  if (profile.experienceLevel) lines.push(`Experience level: ${profile.experienceLevel}`);
  if (profile.experienceDetails) lines.push(`Experience details: ${profile.experienceDetails}`);
  if (profile.availability?.length) lines.push(`Availability: ${profile.availability.join(", ")}`);
  if (profile.specificDates) lines.push(`Specific dates: ${profile.specificDates}`);
  if (profile.costPreference) lines.push(`Cost preference: ${profile.costPreference}`);
  if (profile.applicationStatusPreference) lines.push(`Application status preference: ${profile.applicationStatusPreference}`);
  return lines.join("\n");
}

async function callDeepSeek(
  baseUrl: string,
  apiKey: string,
  model: string,
  context: ContextTurn[],
  message: string,
  shortlist: RankedCandidate[],
  profile: StudentProfile | undefined,
  timeoutMs: number,
): Promise<DeepSeekAnswer> {
  const messages = [
    { role: "system", content: buildSystemPrompt() },
    ...context,
    {
      role: "user",
      content:
        `Student profile:\n${summarizeProfile(profile)}\n\n` +
        `Ranked shortlist (JSON array, ${shortlist.length} records, already ordered, only source of truth):\n` +
        JSON.stringify(shortlist.map(trimForModel)) +
        `\n\nStudent question: ${message}`,
    },
  ];

  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      // Ten explained matches plus the overview ran ~1,900 tokens in testing;
      // headroom here prevents mid-JSON truncation (which reads as a parse
      // failure and burns a retry).
      max_tokens: 3600,
      // Explaining a pre-ranked shortlist needs no chain-of-thought — the
      // ranking system already did the deciding. Left enabled, the model can
      // burn the entire token budget on reasoning and emit no JSON at all
      // (observed in testing: 2500/2500 tokens of reasoning, zero content).
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
    }),
    // Abort a single hung attempt so the retry loop can move on within budget.
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek request failed (${res.status}): ${text.slice(0, 300)}`);
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("DeepSeek response missing message content");
  }

  try {
    return JSON.parse(content) as DeepSeekAnswer;
  } catch {
    throw new Error("DeepSeek response was not valid JSON");
  }
}

/** Deterministic explanation when the model did not provide one — built from
 * the same ranking components the student sees. */
function fallbackReason(ranking: OpportunityRanking): string {
  const strong = ranking.personalFit.components
    .filter((c) => c.maxPoints > 0 && c.points === c.maxPoints)
    .slice(0, 2)
    .map((c) => c.reason);
  if (strong.length) return strong.join(" ");
  return ranking.applicationPriority.reason;
}

/** The shortlist order is authoritative. DeepSeek contributes prose per id and
 * may omit an id it judged irrelevant to the question; it can never add ids or
 * change the order. When the model produced nothing, every entry ships with a
 * deterministic reason instead. */
function hydrateMatches(
  shortlist: RankedCandidate[],
  rawMatches: unknown,
  modelSucceeded: boolean,
): Record<string, unknown>[] {
  const explanations = new Map<string, DeepSeekMatch>();
  if (Array.isArray(rawMatches)) {
    for (const entry of rawMatches as DeepSeekMatch[]) {
      if (!entry || typeof entry !== "object") continue;
      const id = typeof entry.id === "string" ? entry.id : String(entry.id ?? "");
      if (id && !explanations.has(id)) explanations.set(id, entry);
    }
  }

  const hydrated: Record<string, unknown>[] = [];
  for (const { row, ranking } of shortlist) {
    if (hydrated.length >= MAX_MATCHES) break;

    const explanation = explanations.get(String(row.id));
    // The model's one power: dropping a clearly-irrelevant entry.
    if (modelSucceeded && !explanation) continue;

    hydrated.push({
      id: row.id,
      title: row.title ?? null,
      organization: row.organization ?? null,
      opportunity_type: row.opportunity_type ?? null,
      stem_fields: row.stem_fields ?? [],
      college_major_matches: row.college_major_matches ?? [],
      eligible_grades: row.eligible_grades ?? [],
      location: row.location ?? null,
      cost: row.cost ?? null,
      application_status: row.application_status ?? null,
      deadline: row.application_deadline ?? null,
      official_url: row.official_url ?? null,
      application_url: row.application_url ?? null,
      verified_at: (row.last_verified_at ?? row.checked_at) ?? null,
      match_reason:
        typeof explanation?.match_reason === "string" && explanation.match_reason.trim()
          ? explanation.match_reason
          : fallbackReason(ranking),
      eligibility_warning:
        typeof explanation?.eligibility_warning === "string"
          ? explanation.eligibility_warning
          : null,
      ranking,
    });
  }

  return hydrated;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Only POST requests are supported." }, 405);
  }

  let body: AskRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Request body must be valid JSON." }, 400);
  }

  // Accept the new "question" field, falling back to legacy "message".
  const rawMessage = typeof body.question === "string" ? body.question : body.message;
  if (typeof rawMessage !== "string" || rawMessage.trim().length === 0) {
    return jsonResponse({ error: "A non-empty \"question\" string is required." }, 400);
  }

  const message = rawMessage.trim();
  if (message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: `"question" must be ${MAX_MESSAGE_LENGTH} characters or fewer.` },
      400,
    );
  }

  const context = sanitizeContext(body.context);
  const profile = sanitizeProfile(body.profile);
  const tier = parseTier(body.tier);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const deepseekApiKey = Deno.env.get("DEEPSEEK_API_KEY");
  const deepseekBaseUrl = Deno.env.get("DEEPSEEK_BASE_URL");
  // The tier the student picked wins; DEEPSEEK_MODEL is the fallback for
  // callers that send no tier at all.
  const deepseekModel = tier ? TIER_MODELS[tier] : Deno.env.get("DEEPSEEK_MODEL");
  // Budget off the resolved model, not the tier — an untiered request running on
  // a Pro DEEPSEEK_MODEL still needs Pro's longer window.
  const deepseekTimeoutMs =
    deepseekModel === TIER_MODELS.pro
      ? TIER_TIMEOUT_MS.pro
      : TIER_TIMEOUT_MS.standard;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    return jsonResponse({ error: "Server misconfiguration. Please try again later." }, 500);
  }

  if (!deepseekApiKey || !deepseekBaseUrl || !deepseekModel) {
    console.error("Missing DEEPSEEK_API_KEY, DEEPSEEK_BASE_URL, or DEEPSEEK_MODEL");
    return jsonResponse({ error: "Server misconfiguration. Please try again later." }, 500);
  }

  // Coarse status prefilter from the (enum) preference: drop explicitly-closed
  // rows unless the student asked to see everything.
  const excludeClosed =
    profile?.applicationStatusPreference === "Open applications only" ||
    profile?.applicationStatusPreference === "Open and upcoming";

  let candidates: CandidateRow[];
  try {
    candidates = await fetchCandidates(supabaseUrl, serviceRoleKey, excludeClosed);
  } catch (err) {
    console.error(err);
    return jsonResponse(
      { error: "Could not read opportunity data right now. Please try again." },
      502,
    );
  }

  // 1. Hard eligibility filter — stated-fact violations only (e.g. the record
  //    states grades 9-10 and the student is in grade 12). Unstated facts never
  //    exclude anything.
  const eligible = candidates.filter(
    (row) => checkEligibility(row, profile).eligible,
  );

  // 2. Keyword retrieval bounds the pool so ranking cost never grows with the
  //    table, then the ranking system orders it. Rank order decides the
  //    shortlist; retrieval score only breaks ties.
  const keywords = profileKeywords(profile, message);
  const relevant = retrieveRelevant(eligible, profile, message);
  const now = new Date();
  const retrievalScore = new Map(
    relevant.map((row) => [String(row.id), scoreCandidate(row, profile, keywords)]),
  );
  const shortlist: RankedCandidate[] = relevant
    .map((row) => ({ row, ranking: rankOpportunity(row, profile, keywords, now) }))
    .sort(
      (a, b) =>
        b.ranking.orderingScore - a.ranking.orderingScore ||
        (retrievalScore.get(String(b.row.id)) ?? 0) -
          (retrievalScore.get(String(a.row.id)) ?? 0),
    )
    .slice(0, SHORTLIST_SIZE);

  // 3. DeepSeek explains the shortlist. It is an explainer, not a gatekeeper:
  //    if it stays down through the retries, the ranked shortlist still ships
  //    with deterministic explanations instead of a 502.
  const MAX_ATTEMPTS = 3;
  let deepseekAnswer: DeepSeekAnswer | undefined;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      deepseekAnswer = await callDeepSeek(
        deepseekBaseUrl,
        deepseekApiKey,
        deepseekModel,
        context,
        message,
        shortlist,
        profile,
        deepseekTimeoutMs,
      );
      break;
    } catch (err) {
      console.error(`DeepSeek attempt ${attempt}/${MAX_ATTEMPTS} failed:`, err);
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  const modelSucceeded = deepseekAnswer !== undefined;

  const answer =
    typeof deepseekAnswer?.answer === "string" && deepseekAnswer.answer.trim()
      ? deepseekAnswer.answer.trim()
      : shortlist.length
        ? "Here are the opportunities that ranked best for your search, ordered by fit. The AI explanation service is briefly unavailable, so each match shows its ranking evidence instead."
        : "I couldn't find opportunities matching that search. Try broadening your interests or removing a filter.";

  const interpretedRequest =
    typeof deepseekAnswer?.interpreted_request === "string"
      ? deepseekAnswer.interpreted_request.trim()
      : message;

  const clarificationQuestion =
    typeof deepseekAnswer?.clarification_question === "string" &&
    deepseekAnswer.clarification_question.trim()
      ? deepseekAnswer.clarification_question.trim()
      : null;

  const matches = hydrateMatches(shortlist, deepseekAnswer?.matches, modelSucceeded);

  return jsonResponse(
    {
      answer,
      interpreted_request: interpretedRequest,
      matches,
      clarification_question: clarificationQuestion,
    },
    200,
  );
});
