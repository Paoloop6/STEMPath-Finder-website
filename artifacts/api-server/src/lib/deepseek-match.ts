import { logger } from "./logger";
import type { MatchResult, StudentProfile } from "./matcher";

/**
 * Optional DeepSeek pass over the deterministic match results.
 *
 * The arithmetic scorer in matcher.ts stays the source of truth for eligibility
 * and score. This pass only does what arithmetic cannot: re-order the top slice
 * on fit that the rubric misses, and write a sentence explaining the fit in the
 * student's terms. It can never invent an opportunity — it only sees ids that
 * came out of the database and any id it returns that we did not send is
 * dropped.
 *
 * Every failure path returns the original ranking untouched. A slow or down
 * DeepSeek degrades this route to exactly its previous behaviour rather than
 * failing the request.
 */

const TIER_MODELS = {
  standard: "deepseek-v4-flash",
  pro: "deepseek-v4-pro",
} as const;

export type SearchTier = keyof typeof TIER_MODELS;

export const DEFAULT_TIER: SearchTier = "standard";

/** V4 Pro reasons for much longer; a shared budget would cut it off mid-answer. */
const TIER_TIMEOUT_MS: Record<SearchTier, number> = {
  standard: 45000,
  pro: 110000,
};

/** Only the head of the list is worth model time — nobody reads rank 40. */
const MAX_REFINED = 12;
const MAX_ATTEMPTS = 2;
const MAX_REASON_LENGTH = 240;

export function isSearchTier(value: unknown): value is SearchTier {
  return typeof value === "string" && value in TIER_MODELS;
}

interface ModelRankEntry {
  id?: unknown;
  ai_reason?: unknown;
  ai_caution?: unknown;
}

/** Compact projection — enough to judge fit on, a fraction of the tokens. */
function trimForModel(result: MatchResult) {
  const opp = result.opportunity;
  return {
    id: opp.id,
    name: opp.name,
    organization: opp.organization,
    category: opp.category,
    stem_field: opp.stemField,
    eligible_grades: opp.eligibleGrades,
    location: opp.location,
    format: opp.format,
    cost: opp.costCategory,
    experience_level: opp.experienceLevel,
    time_commitment: opp.timeCommitment,
    deadline: opp.deadline,
    summary: opp.summary,
    rubric_score: result.score,
    eligibility: result.eligibilityLabel,
  };
}

function buildSystemPrompt(): string {
  return [
    "You help a middle or high school student choose between STEM opportunities they are already eligible for.",
    "You are given a student profile and a JSON array of opportunities that a deterministic rubric already scored and ranked.",
    "",
    "Your job:",
    "- Re-order the opportunities by genuine fit for this specific student. The rubric score is a strong prior — only move something when you have a concrete reason.",
    "- Write one short sentence per opportunity ('ai_reason') saying why it fits THIS student. Reference their stated interest, grade, or constraints. No generic praise.",
    "- If an opportunity has a real drawback for this student (cost, travel, experience gap, near deadline), state it in 'ai_caution'. Otherwise set 'ai_caution' to null.",
    "",
    "Hard rules:",
    "- Only use ids that appear in the input array. Never invent an opportunity, a fact, a deadline, or a URL.",
    "- Every input id must appear exactly once in your output.",
    "- Never contradict the eligibility label you were given.",
    "",
    "Respond with JSON only, in exactly this shape:",
    '{"ranking": [{"id": number, "ai_reason": string, "ai_caution": string | null}]}',
  ].join("\n");
}

function summarizeProfile(profile: StudentProfile): string {
  return [
    `Grade: ${profile.grade}`,
    `Age: ${profile.age}`,
    `Primary STEM interest: ${profile.stemInterest}`,
    `Opportunity type: ${profile.opportunityType}`,
    `Experience level: ${profile.experienceLevel}`,
    `Time commitment: ${profile.timeCommitment}`,
    `Format preference: ${profile.formatPreference}`,
    `Cost preference: ${profile.costPreference}`,
    profile.locationPreference
      ? `Location preference: ${profile.locationPreference}`
      : "Location preference: none given",
  ].join("\n");
}

async function callDeepSeek(
  baseUrl: string,
  apiKey: string,
  model: string,
  timeoutMs: number,
  profile: StudentProfile,
  slice: MatchResult[],
): Promise<ModelRankEntry[]> {
  const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: buildSystemPrompt() },
        {
          role: "user",
          content:
            `Student profile:\n${summarizeProfile(profile)}\n\n` +
            `Opportunities (JSON array, ${slice.length} total, the only source of truth):\n` +
            JSON.stringify(slice.map(trimForModel)),
        },
      ],
      temperature: 0.2,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `DeepSeek request failed (${res.status}): ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: unknown } }>;
  };
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") {
    throw new Error("DeepSeek response missing message content");
  }

  const parsed = JSON.parse(content) as { ranking?: unknown };
  if (!Array.isArray(parsed.ranking)) {
    throw new Error("DeepSeek response missing a 'ranking' array");
  }
  return parsed.ranking as ModelRankEntry[];
}

function cleanSentence(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, MAX_REASON_LENGTH);
}

/**
 * Applies the model's ranking to the slice we sent. Ids we never sent are
 * dropped; ids the model omitted keep their rubric order at the end, so the
 * result is always a permutation of the input.
 */
function applyRanking(
  slice: MatchResult[],
  ranking: ModelRankEntry[],
): MatchResult[] {
  const byId = new Map(slice.map((r) => [String(r.opportunity.id), r]));
  const ordered: MatchResult[] = [];
  const used = new Set<string>();

  for (const entry of ranking) {
    if (!entry || typeof entry !== "object") continue;
    const id = String((entry as { id?: unknown }).id ?? "");
    if (!id || used.has(id)) continue;

    const result = byId.get(id);
    if (!result) continue; // an id the model invented

    used.add(id);
    ordered.push({
      ...result,
      aiReason: cleanSentence(entry.ai_reason),
      aiCaution: cleanSentence(entry.ai_caution),
    });
  }

  // Anything the model forgot still ships, in its original rubric order.
  for (const result of slice) {
    if (!used.has(String(result.opportunity.id))) ordered.push(result);
  }

  return ordered;
}

export async function refineMatches(
  results: MatchResult[],
  profile: StudentProfile,
  tier: SearchTier,
): Promise<MatchResult[]> {
  if (results.length === 0) return results;

  const apiKey = process.env["DEEPSEEK_API_KEY"];
  const baseUrl = process.env["DEEPSEEK_BASE_URL"];

  if (!apiKey || !baseUrl) {
    logger.warn(
      "DEEPSEEK_API_KEY or DEEPSEEK_BASE_URL is not set — serving rubric-only match results",
    );
    return results;
  }

  const model = TIER_MODELS[tier];
  const timeoutMs = TIER_TIMEOUT_MS[tier];
  const head = results.slice(0, MAX_REFINED);
  const tail = results.slice(MAX_REFINED);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    try {
      const ranking = await callDeepSeek(
        baseUrl,
        apiKey,
        model,
        timeoutMs,
        profile,
        head,
      );
      logger.info({ tier, model, refined: head.length }, "match refined");
      return [...applyRanking(head, ranking), ...tail];
    } catch (err) {
      logger.error(
        { err, tier, model, attempt },
        `DeepSeek refinement attempt ${attempt}/${MAX_ATTEMPTS} failed`,
      );
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  // Refinement is an enhancement, never a dependency.
  return results;
}
