import { DEFAULT_SEARCH_TIER, type SearchTier } from "@/lib/search-tier";

export const MESSAGE_MAX_LENGTH = 1000;

/** One scored ranking component: what was measured, the points, and why. */
export interface RankingComponent {
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  reason: string;
  evidence?: string;
}

export interface DimensionScore {
  /** 0-100, or null when there is not enough evidence to score honestly. */
  score: number | null;
  components: RankingComponent[];
  unscoredReason?: string;
}

export type PriorityLabel =
  "apply-now" | "apply-soon" | "open" | "watchlist" | "verify-first" | "closed";

/** One graded section of the course grade (30/40/30). */
export interface CategoryGrade {
  key: "courseCompletion" | "challengePerformance" | "finalProject";
  label: string;
  points: number;
  maxPoints: number;
  components: RankingComponent[];
  graded: boolean;
  ungradedReason?: string;
}

export interface CourseGrade {
  courseCompletion: CategoryGrade;
  challengePerformance: CategoryGrade;
  finalProject: CategoryGrade;
  /** Course Completion + Challenge Performance + Final Project, 0..100. */
  total: number;
}

/** Transparent ranking computed server-side from structured facts —
 * mirrors supabase/functions/_shared/ranking.ts. */
export interface OpportunityRanking {
  courseGrade: CourseGrade;
  personalFit: DimensionScore;
  competitiveness: {
    tier: "low" | "moderate" | "high" | "very-high" | "unknown";
    factors: string[];
  };
  evidenceConfidence: DimensionScore;
  applicationPriority: {
    label: PriorityLabel;
    reason: string;
    daysUntilDeadline: number | null;
  };
  orderingScore: number;
}

export interface OpportunityMatch {
  id: string;
  title: string | null;
  organization: string | null;
  opportunity_type: string | null;
  stem_fields: string[];
  college_major_matches: string[];
  eligible_grades: string[] | string | null;
  location: string | null;
  cost: string | null;
  application_status: string | null;
  deadline: string | null;
  official_url: string | null;
  application_url: string | null;
  verified_at: string | null;
  match_reason: string;
  eligibility_warning: string | null;
  /** Absent while the deployed function predates the ranking system. */
  ranking?: OpportunityRanking | null;
}

export interface AskStempathResponse {
  answer: string;
  interpreted_request: string;
  matches: OpportunityMatch[];
  clarification_question: string | null;
}

export interface ConversationTurn {
  role: "user" | "assistant";
  content: string;
}

export interface StudentProfile {
  grade?: string;
  gpa?: {
    value: number;
    scale?: "4.0" | "5.0" | "100";
  };
  location?: {
    cityOrZip?: string;
    radius?: string;
  };
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
}

/**
 * Recursively strip empty values so the backend never receives empty strings,
 * empty arrays, nulls, or empty objects. Blank means "unknown" — never a
 * default assumption. Returns undefined when nothing meaningful remains.
 */
export function pruneEmpty<T>(value: T): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? (trimmed as unknown as T) : undefined;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => pruneEmpty(item))
      .filter((item) => item !== undefined);
    return cleaned.length ? (cleaned as unknown as T) : undefined;
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = pruneEmpty(val);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return Object.keys(out).length ? (out as unknown as T) : undefined;
  }
  return value;
}

export async function askStempath(
  message: string,
  context: ConversationTurn[],
  profile?: StudentProfile,
  tier: SearchTier = DEFAULT_SEARCH_TIER,
): Promise<AskStempathResponse> {
  const cleanedProfile = profile ? pruneEmpty(profile) : undefined;

  // App-server endpoint backed by the DynamoDB opportunity repository. The
  // browser holds no Supabase, AWS, or DeepSeek credentials for this call.
  const response = await fetch(`/api/ask-stempath`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: message,
      context,
      tier,
      ...(cleanedProfile ? { profile: cleanedProfile } : {}),
    }),
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Received an invalid response from the AI search service.");
  }

  if (!response.ok) {
    const errorMessage =
      data &&
      typeof data === "object" &&
      "error" in data &&
      typeof (data as { error: unknown }).error === "string"
        ? (data as { error: string }).error
        : `AI search request failed (${response.status}).`;
    throw new Error(errorMessage);
  }

  return data as AskStempathResponse;
}
