// DynamoDB-backed opportunity routes.
//
// Mounted BEFORE the legacy Postgres opportunities router, so GET
// /opportunities now serves live Lambda-written DynamoDB data. The legacy
// numeric detail route still works: this router only claims detail ids it
// recognizes and passes everything else through.

import { Router, type IRouter } from "express";
import {
  fetchAllOpportunities,
  findOpportunityByAnyId,
  listOpportunities,
  invalidateOpportunityCache,
  pendingRecordsAllowed,
  type NormalizedOpportunity,
} from "../lib/opportunity-repository";

const router: IRouter = Router();

function safeError(res: import("express").Response, error: unknown): void {
  console.error(
    "[opportunities] request failed:",
    error instanceof Error ? error.message : "unknown error",
  );
  res
    .status(502)
    .json({ error: "Opportunity data is temporarily unavailable." });
}

// GET /opportunities — live DynamoDB data with query-string filters.
router.get("/opportunities", async (req, res): Promise<void> => {
  try {
    const q = req.query as Record<string, string | undefined>;
    if (q["refresh"] === "true") invalidateOpportunityCache();
    const records = await listOpportunities({
      opportunityType: q["opportunityType"] || q["category"],
      stemField: q["stemField"],
      location: q["location"],
      remoteStatus: q["remoteStatus"] || q["format"],
      gradeLevel: q["gradeLevel"] || q["grade"],
      deadlineBefore: q["deadlineBefore"],
      organization: q["organization"],
      keyword: q["keyword"] || q["search"],
      includeExpired: q["includeExpired"] === "true",
    });
    // Optional page size so light surfaces (the homepage board) never pull the
    // whole table. `count` stays the size of the full filtered set.
    const limitRaw = Number.parseInt(q["limit"] ?? "", 10);
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 1000) : undefined;
    const page = limit ? records.slice(0, limit) : records;
    console.log(`[opportunities] source=dynamodb count=${records.length} sent=${page.length}`);
    res.json({
      source: "dynamodb",
      table: "stempath-data",
      pendingVisible: pendingRecordsAllowed(),
      count: records.length,
      opportunities: page,
    });
  } catch (error) {
    safeError(res, error);
  }
});

// GET /opportunities/:id — serve DynamoDB records; fall through otherwise.
router.get("/opportunities/:id", async (req, res, next): Promise<void> => {
  try {
    const record = await findOpportunityByAnyId(req.params["id"] ?? "");
    if (!record) {
      next(); // legacy Postgres route may know this id
      return;
    }
    res.json(record);
  } catch (error) {
    safeError(res, error);
  }
});

// ---------------------------------------------------------------------------
// POST /opportunity-recommendations — DynamoDB candidates -> DeepSeek ->
// validated IDs. DeepSeek can only recommend records we handed it.
// ---------------------------------------------------------------------------

type StudentProfile = {
  grade?: number;
  location?: string;
  interests?: string[];
  preferredTypes?: string[];
  remotePreference?: "remote" | "in-person" | "either";
  costPreference?: "free" | "free-or-paid";
};

const MAX_CANDIDATES = 30;

function candidateScore(
  record: NormalizedOpportunity,
  profile: StudentProfile,
): number {
  let score = 0;
  const interests = (profile.interests ?? []).map((i) => i.toLowerCase());
  const haystack = [
    record.title,
    record.description,
    record.stemFields.join(" "),
    record.opportunityType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  for (const interest of interests) {
    if (haystack.includes(interest)) score += 3;
  }
  const types = (profile.preferredTypes ?? []).map((t) => t.toLowerCase());
  if (
    types.length &&
    types.some((t) => (record.opportunityType ?? "").toLowerCase().includes(t))
  ) {
    score += 3;
  }
  if (profile.grade != null && record.gradeLevels.length > 0) {
    const gradeText = record.gradeLevels.join(" ").toLowerCase();
    if (gradeText.includes(String(profile.grade))) score += 2;
  }
  if (profile.remotePreference && profile.remotePreference !== "either") {
    if (record.remoteStatus === profile.remotePreference) score += 2;
    else if (record.remoteStatus !== "unknown") score -= 2;
  }
  if (profile.location && record.remoteStatus !== "remote") {
    const state = profile.location.split(",").pop()?.trim().toLowerCase();
    if (state && (record.location ?? "").toLowerCase().includes(state))
      score += 2;
  }
  if (
    profile.costPreference === "free" &&
    (record.cost ?? "").toLowerCase().includes("free")
  ) {
    score += 1;
  }
  if (record.deadline) score += 1;
  return score;
}

/** Only useful fields — never raw source documents. */
function candidateSummary(record: NormalizedOpportunity) {
  return {
    opportunityId: record.opportunityId,
    title: record.title,
    organization: record.organization,
    opportunityType: record.opportunityType,
    stemFields: record.stemFields,
    description: record.description.slice(0, 400),
    eligibility: record.eligibility.slice(0, 300),
    gradeLevels: record.gradeLevels,
    location: record.location,
    remoteStatus: record.remoteStatus,
    deadline: record.deadline,
    cost: record.cost,
    compensation: record.compensation,
    officialUrl: record.officialUrl,
    applicationUrl: record.applicationUrl,
    reviewStatus: record.reviewStatus,
    published: record.published,
  };
}

async function askDeepSeekForRecommendations(
  profile: StudentProfile,
  candidates: NormalizedOpportunity[],
): Promise<Array<{ opportunityId: string; reason: string }>> {
  const apiKey = process.env["DEEPSEEK_API_KEY"];
  const baseUrl =
    process.env["DEEPSEEK_BASE_URL"] ?? "https://api.deepseek.com";
  const model = process.env["DEEPSEEK_MODEL"] ?? "deepseek-v4-flash";
  if (!apiKey) throw new Error("DeepSeek is not configured");

  const system = `You recommend STEM opportunities for a high-school student.

You are given the ONLY opportunities that exist, as JSON candidates with "opportunityId" fields. Rules:
- Recommend 3 to 8 opportunities, best fit first.
- Use ONLY opportunityId values copied exactly from the candidate list. Never invent, modify, or guess an id. Never mention an opportunity that is not in the list.
- Each reason must be 1-2 sentences grounded in the candidate's actual fields (no invented deadlines, costs, or eligibility).
Return strict JSON: {"recommendations":[{"opportunityId":"...","reason":"..."}]}`;

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
      max_tokens: 6000,
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: JSON.stringify({
            studentProfile: {
              grade: profile.grade,
              location: profile.location,
              interests: profile.interests,
              preferredTypes: profile.preferredTypes,
              remotePreference: profile.remotePreference,
              costPreference: profile.costPreference,
            },
            candidates: candidates.map(candidateSummary),
          }),
        },
      ],
    }),
    signal: AbortSignal.timeout(120000),
  });
  const data: any = await response.json();
  if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek returned no content");
  const parsed = JSON.parse(content);
  return Array.isArray(parsed?.recommendations) ? parsed.recommendations : [];
}

router.post("/opportunity-recommendations", async (req, res): Promise<void> => {
  try {
    const profile: StudentProfile = req.body?.studentProfile ?? {};
    const all = await listOpportunities({});
    const candidates = all
      .map((record) => ({ record, score: candidateScore(record, profile) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES)
      .map(({ record }) => record);

    if (candidates.length === 0) {
      res.json({ recommendations: [], candidateCount: 0, validatedCount: 0 });
      return;
    }

    const raw = await askDeepSeekForRecommendations(profile, candidates);

    // Hard validation: every returned id must exist in the candidate set.
    const byId = new Map(candidates.map((c) => [c.opportunityId, c]));
    const recommendations: Array<{
      opportunity: ReturnType<typeof candidateSummary>;
      reason: string;
    }> = [];
    for (const item of raw) {
      const record =
        typeof item?.opportunityId === "string"
          ? byId.get(item.opportunityId)
          : undefined;
      if (!record) {
        console.warn(
          `[recommendations] dropped unknown opportunityId from model: ${String(item?.opportunityId).slice(0, 40)}`,
        );
        continue;
      }
      recommendations.push({
        opportunity: candidateSummary(record),
        reason: typeof item.reason === "string" ? item.reason : "",
      });
    }

    console.log(
      `[recommendations] candidates=${candidates.length} validated=${recommendations.length}`,
    );
    res.json({
      recommendations,
      candidateCount: candidates.length,
      validatedCount: recommendations.length,
    });
  } catch (error) {
    safeError(res, error);
  }
});

// ---------------------------------------------------------------------------
// GET /opportunity-stats — server-computed statistics over the same repository
// the /database page uses. ?refresh=true busts the cache for newest Lambda data.
// ---------------------------------------------------------------------------

function tally(
  records: NormalizedOpportunity[],
  keys: (r: NormalizedOpportunity) => string[],
) {
  const counts: Record<string, number> = {};
  for (const record of records) {
    for (const key of keys(record)) {
      if (key) counts[key] = (counts[key] ?? 0) + 1;
    }
  }
  return counts;
}

router.get("/opportunity-stats", async (req, res): Promise<void> => {
  try {
    if ((req.query as Record<string, string>)["refresh"] === "true") {
      invalidateOpportunityCache();
    }
    const all = await fetchAllOpportunities();
    const valid = all.filter(
      (r) => !r.invalid && r.reviewStatus !== "rejected",
    );
    const active = await listOpportunities({});
    const now = Date.now();

    const deadlineWithin = (days: number) =>
      active.filter((r) => {
        if (!r.deadline) return false;
        const t = Date.parse(r.deadline);
        return !Number.isNaN(t) && t >= now && t <= now + days * 86_400_000;
      }).length;

    const isExpired = (r: NormalizedOpportunity) => {
      if (!r.deadline) return false;
      const t = Date.parse(r.deadline);
      return !Number.isNaN(t) && t < now - 86_400_000;
    };

    const costBucket = (r: NormalizedOpportunity) => {
      const c = (r.cost ?? "").toLowerCase();
      if (!c) return "unknown";
      if (c.includes("free") || c === "$0" || c === "0") return "free";
      return "paid";
    };

    const domains = new Set<string>();
    for (const r of valid) {
      try {
        if (r.officialUrl)
          domains.add(new URL(r.officialUrl).hostname.replace(/^www\./, ""));
      } catch {
        /* malformed URL — skip */
      }
    }

    const latestRunId = valid.reduce<string | null>(
      (max, r) => (r.runId && (!max || r.runId > max) ? r.runId : max),
      null,
    );
    const lastUpdated = valid.reduce<string | null>(
      (max, r) =>
        r.createdAt && (!max || r.createdAt > max) ? r.createdAt : max,
      null,
    );

    res.json({
      source: "dynamodb",
      table: "stempath-data",
      totalActive: active.length,
      pendingReview: valid.filter((r) => r.reviewStatus === "pending").length,
      published: valid.filter((r) => r.published).length,
      expired: valid.filter(isExpired).length,
      byType: tally(valid, (r) => [r.opportunityType ?? "unknown"]),
      byStemField: tally(valid, (r) =>
        r.stemFields.length ? r.stemFields : ["unknown"],
      ),
      byLocation: tally(valid, (r) => [r.location ?? "unknown"]),
      remote: {
        remote: valid.filter((r) => r.remoteStatus === "remote").length,
        inPerson: valid.filter((r) => r.remoteStatus === "in-person").length,
        hybrid: valid.filter((r) => r.remoteStatus === "hybrid").length,
        unknown: valid.filter((r) => r.remoteStatus === "unknown").length,
      },
      deadlines: {
        next7Days: deadlineWithin(7),
        next30Days: deadlineWithin(30),
        next60Days: deadlineWithin(60),
      },
      cost: tally(valid, (r) => [costBucket(r)]),
      organizations: new Set(valid.map((r) => r.organization).filter(Boolean))
        .size,
      websiteCount: domains.size,
      latestRunId,
      lastUpdated,
      addedInLatestRun: latestRunId
        ? valid.filter((r) => r.runId === latestRunId).length
        : 0,
    });
  } catch (error) {
    safeError(res, error);
  }
});

// ---------------------------------------------------------------------------
// POST /ask-stempath — chat over the same DynamoDB repository. Replaces the
// Supabase edge function; DeepSeek may only cite candidate opportunityIds.
// ---------------------------------------------------------------------------

type AskProfile = {
  grade?: string;
  location?: { cityOrZip?: string };
  interests?: string[];
  specificInterest?: string;
  opportunityTypes?: string[];
  formats?: string[];
  costPreference?: string;
};

function askCandidateScore(
  record: NormalizedOpportunity,
  question: string,
  profile: AskProfile,
): number {
  const terms = [
    ...question.toLowerCase().split(/\W+/),
    ...(profile.interests ?? []).map((i) => i.toLowerCase()),
    ...(profile.specificInterest
      ? profile.specificInterest.toLowerCase().split(/\W+/)
      : []),
  ].filter((t) => t.length >= 3);
  const haystack = [
    record.title,
    record.description,
    record.organization,
    record.stemFields.join(" "),
    record.opportunityType,
    record.location,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  let score = 0;
  for (const term of new Set(terms)) if (haystack.includes(term)) score += 2;
  const types = (profile.opportunityTypes ?? []).map((t) => t.toLowerCase());
  if (
    types.some((t) => (record.opportunityType ?? "").toLowerCase().includes(t))
  )
    score += 3;
  if (
    profile.grade &&
    record.gradeLevels.join(" ").includes(profile.grade.replace(/\D/g, ""))
  )
    score += 2;
  if (record.deadline) score += 1;
  return score;
}

/** UI-facing match shape (mirrors the legacy edge-function response). */
function toOpportunityMatch(
  record: NormalizedOpportunity,
  reason: string,
  warning: string | null,
) {
  return {
    id: record.opportunityId,
    title: record.title,
    organization: record.organization,
    opportunity_type: record.opportunityType,
    stem_fields: record.stemFields,
    college_major_matches: [],
    eligible_grades: record.gradeLevels,
    location: record.location,
    cost: record.cost,
    application_status: record.applicationStatus,
    deadline: record.deadline,
    official_url: record.officialUrl,
    application_url: record.applicationUrl,
    verified_at: record.createdAt,
    match_reason: reason,
    eligibility_warning: warning,
    ranking: null,
  };
}

router.post("/ask-stempath", async (req, res): Promise<void> => {
  try {
    const question: string = String(
      req.body?.question ?? req.body?.message ?? "",
    ).slice(0, 1000);
    const context: Array<{ role: string; content: string }> = Array.isArray(
      req.body?.context,
    )
      ? req.body.context.slice(-6)
      : [];
    const profile: AskProfile = req.body?.profile ?? {};
    if (!question.trim()) {
      res.status(400).json({ error: "A question is required." });
      return;
    }

    const all = await listOpportunities({});
    const candidates = all
      .map((record) => ({
        record,
        score: askCandidateScore(record, question, profile),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 30)
      .map(({ record }) => record);

    const apiKey = process.env["DEEPSEEK_API_KEY"];
    const baseUrl =
      process.env["DEEPSEEK_BASE_URL"] ?? "https://api.deepseek.com";
    const model = process.env["DEEPSEEK_MODEL"] ?? "deepseek-v4-flash";
    if (!apiKey) throw new Error("DeepSeek is not configured");

    const system = `You are STEMPath, a helpful assistant matching high-school students to STEM opportunities.

You are given the ONLY opportunities that exist as JSON candidates with "opportunityId" fields. Rules:
- Answer the student's question conversationally and concretely.
- Recommend up to 6 matches, best first, ONLY using opportunityId values copied exactly from the candidates. Never invent or alter an id; never mention an opportunity not in the list.
- Ground every claim in candidate fields; never invent deadlines, costs, or eligibility. Note eligibility concerns in eligibility_warning.
- If the question cannot be answered from the candidates, say so and set clarification_question.
Return strict JSON: {"answer": string, "interpreted_request": string, "clarification_question": string|null, "matches": [{"opportunityId": string, "match_reason": string, "eligibility_warning": string|null}]}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        response_format: { type: "json_object" },
        temperature: 0.2,
        max_tokens: 6000,
        messages: [
          { role: "system", content: system },
          ...context
            .filter((t) => t.role === "user" || t.role === "assistant")
            .map((t) => ({
              role: t.role,
              content: String(t.content).slice(0, 800),
            })),
          {
            role: "user",
            content: JSON.stringify({
              question,
              profile: {
                grade: profile.grade,
                location: profile.location?.cityOrZip,
                interests: profile.interests,
                opportunityTypes: profile.opportunityTypes,
                formats: profile.formats,
                costPreference: profile.costPreference,
              },
              candidates: candidates.map((record) =>
                toOpportunityMatch(record, "", null),
              ),
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(120000),
    });
    const data: any = await response.json();
    if (!response.ok) throw new Error(`DeepSeek HTTP ${response.status}`);
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error("DeepSeek returned no content");
    const parsed = JSON.parse(content);

    const byId = new Map(candidates.map((c) => [c.opportunityId, c]));
    const matches: ReturnType<typeof toOpportunityMatch>[] = [];
    for (const m of Array.isArray(parsed?.matches) ? parsed.matches : []) {
      const record =
        typeof m?.opportunityId === "string"
          ? byId.get(m.opportunityId)
          : undefined;
      if (!record) {
        console.warn(
          `[ask-stempath] dropped unknown opportunityId from model: ${String(m?.opportunityId).slice(0, 40)}`,
        );
        continue;
      }
      matches.push(
        toOpportunityMatch(
          record,
          typeof m.match_reason === "string" ? m.match_reason : "",
          typeof m.eligibility_warning === "string"
            ? m.eligibility_warning
            : null,
        ),
      );
    }

    console.log(
      `[ask-stempath] candidates=${candidates.length} validated=${matches.length}`,
    );
    res.json({
      answer: typeof parsed?.answer === "string" ? parsed.answer : "",
      interpreted_request:
        typeof parsed?.interpreted_request === "string"
          ? parsed.interpreted_request
          : "",
      clarification_question:
        typeof parsed?.clarification_question === "string"
          ? parsed.clarification_question
          : null,
      matches,
    });
  } catch (error) {
    safeError(res, error);
  }
});

export default router;
