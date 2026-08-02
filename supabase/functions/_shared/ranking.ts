// STEMPath Finder ranking system.
//
// The grade is three transparent sections that always sum to a /100 total:
//
//   1. Course Completion      (30) — required lessons, quizzes, and course
//                                    activities completed
//   2. Challenge Performance  (40) — accuracy, following instructions,
//                                    completing the assigned challenge,
//                                    submitting required evidence, and
//                                    explaining the solution
//   3. Final Project          (30) — completing the final project, meeting the
//                                    requirements, demonstrating the course
//                                    skills, and clearly presenting the result
//
// Alongside the grade, informational (non-graded) reads are still computed:
// personal fit, competitiveness, evidence confidence, and application priority.
//
// Every number is computed deterministically from structured facts on the
// candidate row. The grade additionally requires `grading_signals`, which the
// research function records whenever a new source is discovered, WITH verbatim
// evidence; a category with no recorded signals is "not yet graded" and
// contributes 0 points, never an invented number.
//
// This module is dependency-free on purpose: both edge functions import it,
// and it runs unchanged under Node for local testing.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CandidateRowLike = Record<string, unknown> & { id: string };

export interface StudentProfileLike {
  grade?: string;
  location?: { cityOrZip?: string; radius?: string };
  formats?: string[];
  interests?: string[];
  specificInterest?: string;
  opportunityTypes?: string[];
  experienceLevel?: string;
  availability?: string[];
  costPreference?: string;
  applicationStatusPreference?: string;
}

/** One scored component: what it measured, what it got, and why. */
export interface RankingComponent {
  key: string;
  label: string;
  points: number;
  maxPoints: number;
  reason: string;
  /** Verbatim (or near-verbatim) supporting text, when one exists. */
  evidence?: string;
}

export interface DimensionScore {
  /** 0-100, or null when there is not enough evidence to score honestly. */
  score: number | null;
  components: RankingComponent[];
  /** Present only when score is null. */
  unscoredReason?: string;
}

export type CompetitivenessTier =
  | "low"
  | "moderate"
  | "high"
  | "very-high"
  | "unknown";

export interface CompetitivenessAssessment {
  tier: CompetitivenessTier;
  factors: string[];
}

export type PriorityLabel =
  | "apply-now"
  | "apply-soon"
  | "open"
  | "watchlist"
  | "verify-first"
  | "closed";

export interface PriorityAssessment {
  label: PriorityLabel;
  reason: string;
  daysUntilDeadline: number | null;
}

export interface EligibilityResult {
  eligible: boolean;
  /** Hard, stated-fact violations only. Empty when eligible. */
  violations: string[];
}

export interface OpportunityRanking {
  courseGrade: CourseGrade;
  personalFit: DimensionScore;
  competitiveness: CompetitivenessAssessment;
  evidenceConfidence: DimensionScore;
  applicationPriority: PriorityAssessment;
  /** The leaderboard total: Course Completion + Challenge Performance +
   * Final Project, out of 100. Always equal to courseGrade.total. */
  orderingScore: number;
}

// ---------------------------------------------------------------------------
// Course grade — three fixed sections summing to 100, evidence-gated
// ---------------------------------------------------------------------------

export const GRADING_WEIGHTS = {
  courseCompletion: 30,
  challengePerformance: 40,
  finalProject: 30,
} as const;

export type GradeCategoryKey = keyof typeof GRADING_WEIGHTS;

export const GRADE_CATEGORY_LABELS: Record<GradeCategoryKey, string> = {
  courseCompletion: "Course Completion",
  challengePerformance: "Challenge Performance",
  finalProject: "Final Project",
};

/** Per-category criteria. Points within a category sum to its weight, so the
 * three categories sum to exactly 100. */
export const GRADING_CRITERIA: Record<
  GradeCategoryKey,
  ReadonlyArray<{ key: string; label: string; points: number }>
> = {
  courseCompletion: [
    { key: "lessonsCompleted", label: "Required lessons completed", points: 12 },
    { key: "quizzesCompleted", label: "Quizzes completed", points: 9 },
    { key: "activitiesCompleted", label: "Course activities completed", points: 9 },
  ],
  challengePerformance: [
    { key: "accuracy", label: "Accuracy", points: 10 },
    { key: "followedInstructions", label: "Followed instructions", points: 8 },
    { key: "challengeCompleted", label: "Assigned challenge completed", points: 10 },
    { key: "evidenceSubmitted", label: "Required evidence submitted", points: 6 },
    { key: "solutionExplained", label: "Solution explained", points: 6 },
  ],
  finalProject: [
    { key: "projectCompleted", label: "Final project completed", points: 9 },
    { key: "requirementsMet", label: "Project requirements met", points: 8 },
    { key: "skillsDemonstrated", label: "Course skills demonstrated", points: 7 },
    { key: "resultPresented", label: "Result clearly presented", points: 6 },
  ],
};

export type GradeSignalLevel = "full" | "partial" | "minimal";

export interface GradeSignal {
  level: GradeSignalLevel | null;
  evidence: string | null;
}

/** Flat map keyed by criterion key (criterion keys are unique across categories). */
export type GradingSignals = Partial<Record<string, GradeSignal>>;

const LEVEL_MULTIPLIER: Record<GradeSignalLevel, number> = {
  full: 1,
  partial: 0.6,
  minimal: 0.25,
};

const ALL_CRITERION_KEYS = (Object.keys(GRADING_WEIGHTS) as GradeCategoryKey[])
  .flatMap((cat) => GRADING_CRITERIA[cat].map((c) => c.key));

/** A signal only counts when the grader recorded a level AND evidence.
 * Level without evidence is treated as ungraded — the whole point is that
 * published grades are tied to something a human can check. */
export function parseGradingSignals(raw: unknown): GradingSignals {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: GradingSignals = {};
  for (const key of ALL_CRITERION_KEYS) {
    const entry = (raw as Record<string, unknown>)[key];
    if (!entry || typeof entry !== "object") continue;
    const level = (entry as Record<string, unknown>).level;
    const evidence = (entry as Record<string, unknown>).evidence;
    if (
      (level === "full" || level === "partial" || level === "minimal") &&
      typeof evidence === "string" &&
      evidence.trim().length >= 8
    ) {
      out[key] = { level, evidence: evidence.trim().slice(0, 300) };
    }
  }
  return out;
}

/** One graded section of the course grade. */
export interface CategoryGrade {
  key: GradeCategoryKey;
  label: string;
  /** Earned points, 0..maxPoints. 0 when nothing has been graded yet. */
  points: number;
  /** 30 / 40 / 30 — the section's share of the 100-point total. */
  maxPoints: number;
  components: RankingComponent[];
  /** False when no criterion in this section has a recorded signal yet. */
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

function gradeCategory(key: GradeCategoryKey, signals: GradingSignals): CategoryGrade {
  const components: RankingComponent[] = [];
  let earned = 0;
  let gradedCount = 0;

  for (const criterion of GRADING_CRITERIA[key]) {
    const signal = signals[criterion.key];
    if (!signal || signal.level === null) {
      components.push({
        key: criterion.key,
        label: criterion.label,
        points: 0,
        maxPoints: criterion.points,
        reason: "Not yet graded — no evidence recorded for this criterion.",
      });
      continue;
    }
    const points = Math.round(criterion.points * LEVEL_MULTIPLIER[signal.level] * 10) / 10;
    earned += points;
    gradedCount += 1;
    components.push({
      key: criterion.key,
      label: criterion.label,
      points,
      maxPoints: criterion.points,
      reason: `Graded ${signal.level} credit from the recorded evidence.`,
      evidence: signal.evidence ?? undefined,
    });
  }

  const maxPoints = GRADING_WEIGHTS[key];
  const graded = gradedCount > 0;
  return {
    key,
    label: GRADE_CATEGORY_LABELS[key],
    points: Math.min(maxPoints, Math.round(earned * 10) / 10),
    maxPoints,
    components,
    graded,
    ungradedReason: graded ? undefined : "Not yet graded — this record has no grading evidence yet.",
  };
}

/** Grade a record: three sections, total = their sum, max 100. Run whenever a
 * new source is discovered so the leaderboard and donut update together. */
export function gradeCourse(row: CandidateRowLike): CourseGrade {
  const signals = parseGradingSignals(row.grading_signals);
  const courseCompletion = gradeCategory("courseCompletion", signals);
  const challengePerformance = gradeCategory("challengePerformance", signals);
  const finalProject = gradeCategory("finalProject", signals);
  const total = Math.min(
    100,
    Math.round((courseCompletion.points + challengePerformance.points + finalProject.points) * 10) / 10,
  );
  return { courseCompletion, challengePerformance, finalProject, total };
}

// ---------------------------------------------------------------------------
// Shared field helpers
// ---------------------------------------------------------------------------

function str(row: CandidateRowLike, key: string): string {
  const v = row[key];
  return typeof v === "string" ? v.trim() : "";
}

function lower(row: CandidateRowLike, key: string): string {
  return str(row, key).toLowerCase();
}

function strArray(row: CandidateRowLike, key: string): string[] {
  const v = row[key];
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter((x) => x.trim().length > 0);
}

function gradeNumbers(row: CandidateRowLike): number[] {
  return strArray(row, "eligible_grades")
    .map((g) => Number.parseInt(g, 10))
    .filter((n) => Number.isFinite(n));
}

/** Strict YYYY-MM-DD only. Prose dates are never guessed at. */
function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysFromNow(date: Date, now: Date): number {
  return Math.floor((date.getTime() - now.getTime()) / 86_400_000);
}

// ---------------------------------------------------------------------------
// Eligibility — hard, stated-fact filters only
// ---------------------------------------------------------------------------

export function checkEligibility(
  row: CandidateRowLike,
  profile: StudentProfileLike | undefined,
): EligibilityResult {
  const violations: string[] = [];
  if (!profile) return { eligible: true, violations };

  const grade = profile.grade ? Number.parseInt(profile.grade, 10) : NaN;
  if (Number.isFinite(grade)) {
    const stated = gradeNumbers(row);
    if (stated.length > 0 && !stated.includes(grade)) {
      violations.push(
        `Open to grades ${stated.join(", ")} — not grade ${grade}.`,
      );
    }
  }

  // Age limits are stated numeric facts; a violation is a hard no.
  // (The public profile carries grade, not age, so this only fires when a
  // caller supplies age-bearing rows — kept for completeness.)
  return { eligible: violations.length === 0, violations };
}

// ---------------------------------------------------------------------------
// Personal fit — soft signals; blank means unknown, never negative
// ---------------------------------------------------------------------------

const FIT_WEIGHTS = {
  interestMatch: 30,
  gradeMatch: 15,
  formatMatch: 10,
  costMatch: 10,
  locationMatch: 10,
  timingMatch: 10,
  experienceMatch: 10,
  statusMatch: 5,
} as const;

function component(
  key: string,
  label: string,
  points: number,
  maxPoints: number,
  reason: string,
): RankingComponent {
  return { key, label, points: Math.round(points * 10) / 10, maxPoints, reason };
}

/** Neutral credit when either side is silent: half points, labelled as such. */
function neutral(key: string, label: string, max: number, what: string): RankingComponent {
  return component(key, label, max / 2, max, `Unknown — ${what} not stated, treated neutrally.`);
}

export function scorePersonalFit(
  row: CandidateRowLike,
  profile: StudentProfileLike | undefined,
  interestKeywords: string[],
): DimensionScore {
  if (!profile || Object.keys(profile).length === 0) {
    return {
      score: null,
      components: [],
      unscoredReason: "No profile provided — results are not personalized.",
    };
  }

  const components: RankingComponent[] = [];
  const haystack = [
    lower(row, "title"),
    lower(row, "organization"),
    lower(row, "good_for"),
    lower(row, "extra_information"),
    ...strArray(row, "stem_fields").map((s) => s.toLowerCase()),
    ...strArray(row, "skills_developed").map((s) => s.toLowerCase()),
  ].join(" | ");

  // 1. Interest overlap (30)
  {
    const max = FIT_WEIGHTS.interestMatch;
    if (interestKeywords.length === 0) {
      components.push(neutral("interestMatch", "Interest match", max, "your interests"));
    } else {
      const hits = interestKeywords.filter((kw) => haystack.includes(kw));
      if (hits.length >= 2) {
        components.push(component("interestMatch", "Interest match", max, max,
          `Matches your interests (${hits.slice(0, 3).join(", ")}).`));
      } else if (hits.length === 1) {
        components.push(component("interestMatch", "Interest match", max * 0.6, max,
          `Partially matches your interests (${hits[0]}).`));
      } else {
        components.push(component("interestMatch", "Interest match", 0, max,
          "No overlap found with your stated interests."));
      }
    }
  }

  // 2. Grade (15) — hard violations were already filtered out upstream.
  {
    const max = FIT_WEIGHTS.gradeMatch;
    const grade = profile.grade ? Number.parseInt(profile.grade, 10) : NaN;
    const stated = gradeNumbers(row);
    if (!Number.isFinite(grade)) {
      components.push(neutral("gradeMatch", "Grade eligibility", max, "your grade"));
    } else if (stated.length === 0) {
      components.push(component("gradeMatch", "Grade eligibility", max / 2, max,
        "The program does not state eligible grades — verify before applying."));
    } else {
      components.push(component("gradeMatch", "Grade eligibility", max, max,
        `Explicitly open to grade ${grade}.`));
    }
  }

  // 3. Format (10)
  {
    const max = FIT_WEIGHTS.formatMatch;
    const prefs = (profile.formats ?? []).map((f) => f.toLowerCase());
    const fmt = lower(row, "program_format");
    if (prefs.length === 0 || prefs.includes("any")) {
      components.push(neutral("formatMatch", "Format", max, "a format preference"));
    } else if (!fmt) {
      components.push(neutral("formatMatch", "Format", max, "the program format"));
    } else if (fmt === "hybrid" || prefs.some((p) => fmt.includes(p.split(" ")[0]) ||
        (p.startsWith("virtual") && fmt.includes("online")) ||
        (p.startsWith("in person") && fmt.includes("in-person")))) {
      components.push(component("formatMatch", "Format", max, max, `Format (${fmt}) matches your preference.`));
    } else {
      components.push(component("formatMatch", "Format", 0, max,
        `Format is ${fmt}; you preferred ${prefs.join(", ")}.`));
    }
  }

  // 4. Cost (10)
  {
    const max = FIT_WEIGHTS.costMatch;
    const pref = (profile.costPreference ?? "").toLowerCase();
    const cost = lower(row, "cost");
    const isFree = cost.includes("free") || cost === "$0" || cost === "0" ||
      row.stipend_available === true;
    if (!pref || pref === "no preference") {
      components.push(neutral("costMatch", "Cost", max, "a cost preference"));
    } else if (!cost && row.stipend_available !== true) {
      components.push(neutral("costMatch", "Cost", max, "the program cost"));
    } else if (pref === "free only") {
      if (isFree) {
        components.push(component("costMatch", "Cost", max, max, "Free (or stipended), matching your preference."));
      } else if (row.financial_aid_available === true || cost.includes("scholarship") || cost.includes("aid")) {
        components.push(component("costMatch", "Cost", max * 0.5, max,
          "Not free, but financial aid is stated as available."));
      } else {
        components.push(component("costMatch", "Cost", 0, max, `Costs ${cost}; you wanted free only.`));
      }
    } else {
      // "Under $X" style preferences: compare when the cost parses to a number.
      const capMatch = pref.match(/\$([\d,]+)/);
      const costMatch = cost.match(/\$?([\d,]+)/);
      if (capMatch && costMatch) {
        const cap = Number(capMatch[1].replace(/,/g, ""));
        const amount = Number(costMatch[1].replace(/,/g, ""));
        if (amount <= cap || isFree) {
          components.push(component("costMatch", "Cost", max, max, `Cost (${cost}) is within your budget.`));
        } else {
          components.push(component("costMatch", "Cost", 0, max, `Cost (${cost}) exceeds your budget (${pref}).`));
        }
      } else if (isFree) {
        components.push(component("costMatch", "Cost", max, max, "Free, within any budget."));
      } else {
        components.push(neutral("costMatch", "Cost", max, "a comparable cost figure"));
      }
    }
  }

  // 5. Location (10)
  {
    const max = FIT_WEIGHTS.locationMatch;
    const fmt = lower(row, "program_format");
    const city = profile.location?.cityOrZip?.trim().toLowerCase() ?? "";
    const loc = lower(row, "location");
    if (fmt.includes("online") || fmt.includes("virtual") || fmt.includes("remote")) {
      components.push(component("locationMatch", "Location", max, max, "Online — location does not matter."));
    } else if (!city) {
      components.push(neutral("locationMatch", "Location", max, "your location"));
    } else if (!loc) {
      components.push(neutral("locationMatch", "Location", max, "the program location"));
    } else if (loc.includes(city) || loc.includes("nationwide") || loc.includes("national")) {
      components.push(component("locationMatch", "Location", max, max, `Location (${str(row, "location")}) matches yours.`));
    } else {
      components.push(component("locationMatch", "Location", 0, max,
        `Located in ${str(row, "location")}, away from ${profile.location?.cityOrZip}.`));
    }
  }

  // 6. Timing (10)
  {
    const max = FIT_WEIGHTS.timingMatch;
    const avail = (profile.availability ?? []).map((a) => a.toLowerCase())
      .filter((a) => a !== "no preference" && a !== "specific dates");
    const timing = `${lower(row, "time_commitment")} ${lower(row, "program_start_date")} ${lower(row, "extra_information")} ${lower(row, "title")} ${lower(row, "opportunity_type")}`;
    if (avail.length === 0) {
      components.push(neutral("timingMatch", "Timing", max, "your availability"));
    } else if (avail.some((a) => timing.includes(a.split(" ")[0]))) {
      components.push(component("timingMatch", "Timing", max, max, "Timing lines up with your availability."));
    } else if (!lower(row, "time_commitment")) {
      components.push(neutral("timingMatch", "Timing", max, "the program's schedule"));
    } else {
      components.push(component("timingMatch", "Timing", max * 0.3, max,
        "Timing may not line up with your availability — check the schedule."));
    }
  }

  // 7. Experience level (10)
  {
    const max = FIT_WEIGHTS.experienceMatch;
    const pref = (profile.experienceLevel ?? "").toLowerCase();
    const level = lower(row, "experience_level");
    if (!pref || pref === "no preference") {
      components.push(neutral("experienceMatch", "Experience level", max, "your experience level"));
    } else if (!level || level === "unknown" || level === "all-levels") {
      components.push(component("experienceMatch", "Experience level", max * 0.8, max,
        level === "all-levels" ? "Open to all experience levels." : "Experience expectations not stated."));
    } else {
      const beginnerish = pref.includes("beginner") || pref.includes("exploring");
      const experienced = pref.includes("experienced");
      const fits =
        (beginnerish && level.includes("beginner")) ||
        (experienced && (level.includes("advanced") || level.includes("intermediate"))) ||
        (pref.includes("some") && (level.includes("beginner") || level.includes("intermediate")));
      if (fits) {
        components.push(component("experienceMatch", "Experience level", max, max,
          `Suited to your experience level (${level}).`));
      } else if (beginnerish && level.includes("advanced")) {
        components.push(component("experienceMatch", "Experience level", 0, max,
          "Aimed at advanced students; you're just getting started."));
      } else {
        components.push(component("experienceMatch", "Experience level", max * 0.4, max,
          `Program expects ${level}; partial match with your level.`));
      }
    }
  }

  // 8. Application-status preference (5)
  {
    const max = FIT_WEIGHTS.statusMatch;
    const pref = profile.applicationStatusPreference ?? "";
    const status = lower(row, "application_status");
    if (!pref || pref === "Show all relevant programs") {
      components.push(neutral("statusMatch", "Application status", max, "a status preference"));
    } else if (pref === "Open applications only") {
      components.push(status === "open"
        ? component("statusMatch", "Application status", max, max, "Applications are open now.")
        : component("statusMatch", "Application status", 0, max, `Applications are ${status || "unconfirmed"}.`));
    } else {
      // "Open and upcoming"
      components.push(status === "open" || status === "upcoming"
        ? component("statusMatch", "Application status", max, max, `Applications are ${status}.`)
        : component("statusMatch", "Application status", 0, max, `Applications are ${status || "unconfirmed"}.`));
    }
  }

  const total = components.reduce((sum, c) => sum + c.points, 0);
  return { score: Math.round(total), components };
}

// ---------------------------------------------------------------------------
// Competitiveness — separate from quality by design
// ---------------------------------------------------------------------------

export function assessCompetitiveness(row: CandidateRowLike): CompetitivenessAssessment {
  const factors: string[] = [];
  const stated = lower(row, "competitiveness");

  let base: CompetitivenessTier = "unknown";
  if (stated) {
    if (stated.includes("very") || stated.includes("extreme")) base = "very-high";
    else if (stated.includes("high") || stated.includes("selective")) base = "high";
    else if (stated.includes("medium") || stated.includes("moderate")) base = "moderate";
    else if (stated.includes("low") || stated.includes("open") || stated.includes("all")) base = "low";
    if (base !== "unknown") factors.push(`Source describes selectivity as "${str(row, "competitiveness")}".`);
  }

  const requirements: string[] = [];
  if (row.essay_required === true) requirements.push("essay");
  if (row.recommendation_required === true) requirements.push("recommendation letter(s)");
  if (row.transcript_required === true) requirements.push("transcript");
  if (requirements.length) {
    factors.push(`Application requires: ${requirements.join(", ")}.`);
  }
  if (str(row, "prerequisites")) {
    factors.push(`Prerequisites: ${str(row, "prerequisites").slice(0, 140)}.`);
  }

  // Requirements can raise an unknown/low read, never lower a stated one.
  if (base === "unknown" && requirements.length >= 2) base = "moderate";
  if (base === "low" && requirements.length >= 3) base = "moderate";

  if (factors.length === 0) {
    factors.push("The source page states nothing about selectivity.");
  }
  return { tier: base, factors };
}

// ---------------------------------------------------------------------------
// Evidence confidence — provenance and completeness of the record itself
// ---------------------------------------------------------------------------

const OFFICIAL_TLDS = [".edu", ".gov", ".mil"];

export function scoreEvidenceConfidence(
  row: CandidateRowLike,
  now: Date,
): DimensionScore {
  const components: RankingComponent[] = [];

  // 1. Verification recency (30)
  {
    const max = 30;
    const stamp = str(row, "last_verified_at") || str(row, "checked_at");
    const date = stamp ? new Date(stamp) : null;
    if (!date || Number.isNaN(date.getTime())) {
      components.push(component("recency", "Verification recency", 0, max,
        "No verification date on record."));
    } else {
      const age = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
      const points = age <= 30 ? max : age <= 90 ? 20 : age <= 180 ? 10 : 5;
      components.push(component("recency", "Verification recency", points, max,
        `Checked against its source ${age} day${age === 1 ? "" : "s"} ago.`));
    }
  }

  // 2. Key facts present (30)
  {
    const facts: Array<[string, boolean, number]> = [
      ["deadline", Boolean(str(row, "application_deadline")), 8],
      ["eligible grades", gradeNumbers(row).length > 0 || strArray(row, "eligible_grades").length > 0, 8],
      ["cost", Boolean(str(row, "cost")) || row.stipend_available === true, 7],
      ["location", Boolean(str(row, "location")), 7],
    ];
    const present = facts.filter(([, ok]) => ok);
    const points = present.reduce((sum, [, , pts]) => sum + pts, 0);
    const missing = facts.filter(([, ok]) => !ok).map(([name]) => name);
    components.push(component("keyFacts", "Key facts on record", points, 30,
      missing.length === 0
        ? "Deadline, grades, cost, and location are all on record."
        : `Missing from the source: ${missing.join(", ")}.`));
  }

  // 3. Source completeness (20) — the extractor's own missing-fields list.
  {
    const max = 20;
    const missing = strArray(row, "missing_information").length;
    const points = missing === 0 ? max : missing <= 2 ? 14 : missing <= 4 ? 8 : 3;
    components.push(component("completeness", "Source completeness", points, max,
      missing === 0
        ? "The source page answered every research question."
        : `The source page left ${missing} field${missing === 1 ? "" : "s"} unstated.`));
  }

  // 4. Source authority (20)
  {
    const max = 20;
    let host = "";
    try {
      host = new URL(str(row, "official_url")).hostname.toLowerCase();
    } catch { /* scored as unknown below */ }
    if (!host) {
      components.push(component("authority", "Source authority", 0, max, "No valid official URL."));
    } else if (OFFICIAL_TLDS.some((tld) => host.endsWith(tld))) {
      components.push(component("authority", "Source authority", max, max,
        `Official institutional domain (${host}).`));
    } else if (host.endsWith(".org")) {
      components.push(component("authority", "Source authority", 15, max,
        `Organization domain (${host}).`));
    } else {
      components.push(component("authority", "Source authority", 10, max,
        `Commercial or unclassified domain (${host}).`));
    }
  }

  const total = components.reduce((sum, c) => sum + c.points, 0);
  return { score: Math.round(total), components };
}

// ---------------------------------------------------------------------------
// Application priority — is acting now worth it?
// ---------------------------------------------------------------------------

export function assessPriority(row: CandidateRowLike, now: Date): PriorityAssessment {
  const status = lower(row, "application_status");
  const deadlineRaw = str(row, "application_deadline");
  const deadline = deadlineRaw ? parseIsoDate(deadlineRaw) : null;
  const openDate = parseIsoDate(str(row, "application_open_date"));
  const days = deadline ? daysFromNow(deadline, now) : null;

  if (status === "closed" || (days !== null && days < 0)) {
    return {
      label: "closed",
      reason: days !== null && days < 0
        ? `The stated deadline (${deadlineRaw}) has passed.`
        : "Applications are closed.",
      daysUntilDeadline: days,
    };
  }

  if (openDate && daysFromNow(openDate, now) > 0) {
    return {
      label: "watchlist",
      reason: `Applications open on ${str(row, "application_open_date")}.`,
      daysUntilDeadline: days,
    };
  }

  if (status === "upcoming") {
    return {
      label: "watchlist",
      reason: "The next application window has not opened yet.",
      daysUntilDeadline: days,
    };
  }

  if (status === "open") {
    if (days !== null && days <= 14) {
      return {
        label: "apply-now",
        reason: `Open now with only ${days} day${days === 1 ? "" : "s"} until the deadline.`,
        daysUntilDeadline: days,
      };
    }
    if (days !== null && days <= 45) {
      return {
        label: "apply-soon",
        reason: `Open now; the deadline is in ${days} days.`,
        daysUntilDeadline: days,
      };
    }
    return {
      label: "open",
      reason: deadline
        ? `Open with time to prepare (deadline ${deadlineRaw}).`
        : "Open; no deadline is stated.",
      daysUntilDeadline: days,
    };
  }

  // Unknown status. A stated near deadline still creates urgency to verify.
  if (days !== null && days <= 30) {
    return {
      label: "apply-soon",
      reason: `Status unconfirmed, but the stated deadline is in ${days} days — verify quickly.`,
      daysUntilDeadline: days,
    };
  }
  return {
    label: "verify-first",
    reason: "Application status is unconfirmed — check the official page before planning around it.",
    daysUntilDeadline: days,
  };
}

// ---------------------------------------------------------------------------
// Composite
// ---------------------------------------------------------------------------

/** The total score IS the grade: Course Completion + Challenge Performance +
 * Final Project, out of 100. The other reads (fit, competitiveness, evidence,
 * priority) ship alongside as information, never as points. */
export function rankOpportunity(
  row: CandidateRowLike,
  profile: StudentProfileLike | undefined,
  interestKeywords: string[],
  now: Date,
): OpportunityRanking {
  const courseGrade = gradeCourse(row);
  const personalFit = scorePersonalFit(row, profile, interestKeywords);
  const competitiveness = assessCompetitiveness(row);
  const evidenceConfidence = scoreEvidenceConfidence(row, now);
  const applicationPriority = assessPriority(row, now);

  return {
    courseGrade,
    personalFit,
    competitiveness,
    evidenceConfidence,
    applicationPriority,
    orderingScore: courseGrade.total,
  };
}
