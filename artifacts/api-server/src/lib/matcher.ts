import type { Opportunity } from "@workspace/db";

export interface StudentProfile {
  grade: number;
  age: number;
  stemInterest: string;
  opportunityType: string;
  locationPreference: string;
  formatPreference: string;
  costPreference: string;
  experienceLevel: string;
  timeCommitment: string;
}

export interface ScoreBreakdown {
  basicEligibility: number;
  stemInterest: number;
  opportunityType: number;
  locationFormat: number;
  costPreference: number;
  experienceLevel: number;
  timeCommitment: number;
  deadlineOpen: number;
  total: number;
}

export interface MatchResult {
  opportunity: Opportunity;
  score: number;
  scoreBreakdown: ScoreBreakdown;
  eligibilityLabel: string;
  deadlineLabel: string;
  matchReasons: string[];
  nonMatchReasons: string[];
  /** Written by the DeepSeek pass in deepseek-match.ts; null when it was skipped. */
  aiReason?: string | null;
  aiCaution?: string | null;
}

/** Returns "Eligible" | "Maybe Eligible" | "Not Eligible" | "Deadline Passed" */
export function getEligibilityLabel(
  opp: Opportunity,
  profile: StudentProfile,
): { label: string; reasons: string[]; nonMatchReasons: string[] } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const matchReasons: string[] = [];
  const nonMatchReasons: string[] = [];

  // Deadline check
  if (opp.deadline) {
    const deadlineDate = new Date(opp.deadline + "T00:00:00");
    if (deadlineDate < today) {
      return {
        label: "Deadline Passed",
        reasons: [],
        nonMatchReasons: ["The application deadline has passed"],
      };
    }
  }

  // Grade check
  const gradeEligible = isGradeEligible(opp.eligibleGrades, profile.grade);
  if (gradeEligible === true) {
    matchReasons.push(`Open to grade ${profile.grade}`);
  } else if (gradeEligible === false) {
    nonMatchReasons.push(`Not open to grade ${profile.grade}`);
  }

  // Age check
  let ageEligible = true;
  if (opp.minAge !== null && opp.minAge !== undefined && profile.age < opp.minAge) {
    ageEligible = false;
    nonMatchReasons.push(`Minimum age is ${opp.minAge}`);
  }
  if (opp.maxAge !== null && opp.maxAge !== undefined && profile.age > opp.maxAge) {
    ageEligible = false;
    nonMatchReasons.push(`Maximum age is ${opp.maxAge}`);
  }
  if (ageEligible && (opp.minAge !== null || opp.maxAge !== null)) {
    matchReasons.push(`Your age (${profile.age}) is within range`);
  }

  // Location/format check
  const formatMatch = isFormatMatch(opp.format, profile.formatPreference);
  if (formatMatch) {
    matchReasons.push(`Available ${opp.format}`);
  } else {
    nonMatchReasons.push(`Format preference (${profile.formatPreference}) does not match`);
  }

  // Determine overall eligibility
  if (gradeEligible === false || !ageEligible) {
    return { label: "Not Eligible", reasons: matchReasons, nonMatchReasons };
  }

  if (gradeEligible === null) {
    return { label: "Maybe Eligible", reasons: matchReasons, nonMatchReasons };
  }

  return { label: "Eligible", reasons: matchReasons, nonMatchReasons };
}

/** Returns "Apply Now" | "Closing Soon" | "Open" | "Watchlist" | "Closed" */
export function getDeadlineLabel(opp: Opportunity): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check if application hasn't opened yet
  if (opp.applicationOpenDate) {
    const openDate = new Date(opp.applicationOpenDate + "T00:00:00");
    if (openDate > today) {
      return "Watchlist";
    }
  }

  if (!opp.deadline) {
    return "Open";
  }

  const deadlineDate = new Date(opp.deadline + "T00:00:00");
  const diffMs = deadlineDate.getTime() - today.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Closed";
  if (diffDays <= 7) return "Apply Now";
  if (diffDays <= 30) return "Closing Soon";
  return "Open";
}

export function calculateMatchScore(
  opp: Opportunity,
  profile: StudentProfile,
): { breakdown: ScoreBreakdown; matchReasons: string[]; nonMatchReasons: string[] } {
  const matchReasons: string[] = [];
  const nonMatchReasons: string[] = [];

  // 1. Basic eligibility (25 pts)
  const gradeEligible = isGradeEligible(opp.eligibleGrades, profile.grade);
  let ageEligible = true;
  if (opp.minAge !== null && opp.minAge !== undefined && profile.age < opp.minAge) ageEligible = false;
  if (opp.maxAge !== null && opp.maxAge !== undefined && profile.age > opp.maxAge) ageEligible = false;

  let basicEligibility = 0;
  if (gradeEligible === true && ageEligible) {
    basicEligibility = 25;
    matchReasons.push(`You are eligible for grade ${profile.grade}`);
  } else if (gradeEligible === null && ageEligible) {
    basicEligibility = 12;
    matchReasons.push("You may be eligible — verify grade requirements");
  } else {
    if (gradeEligible === false) nonMatchReasons.push(`Not open to grade ${profile.grade}`);
    if (!ageEligible) nonMatchReasons.push(`Age requirement not met`);
  }

  // 2. STEM interest (20 pts)
  const stemMatch = isStemMatch(opp.stemField, profile.stemInterest);
  let stemInterest = 0;
  if (stemMatch === "exact") {
    stemInterest = 20;
    matchReasons.push(`Matches your ${profile.stemInterest} interest`);
  } else if (stemMatch === "partial") {
    stemInterest = 10;
    matchReasons.push("Partially matches your STEM interest");
  } else {
    nonMatchReasons.push("STEM field does not match your interest");
  }

  // 3. Opportunity type (15 pts)
  const typeMatch = isCategoryMatch(opp.category, profile.opportunityType);
  let opportunityType = 0;
  if (typeMatch === "exact") {
    opportunityType = 15;
    matchReasons.push(`Matches your preferred opportunity type (${profile.opportunityType})`);
  } else if (typeMatch === "partial") {
    opportunityType = 7;
    matchReasons.push("Partially matches your opportunity preference");
  } else {
    nonMatchReasons.push("Opportunity type does not match your preference");
  }

  // 4. Location / format (10 pts)
  const formatMatch = isFormatMatch(opp.format, profile.formatPreference);
  const locationMatch = isLocationMatch(opp.location, profile.locationPreference, opp.format);
  let locationFormat = 0;
  if (formatMatch && locationMatch) {
    locationFormat = 10;
    matchReasons.push(`Available ${opp.format} in your preferred location`);
  } else if (formatMatch || locationMatch) {
    locationFormat = 5;
    matchReasons.push("Partially matches your location/format preference");
  } else {
    nonMatchReasons.push("Location or format does not match");
  }

  // 5. Cost preference (10 pts)
  const costMatch = isCostMatch(opp.costCategory, profile.costPreference);
  let costPreference = 0;
  if (costMatch === "exact") {
    costPreference = 10;
    matchReasons.push(`Matches your cost preference (${opp.costCategory})`);
  } else if (costMatch === "partial") {
    costPreference = 5;
    matchReasons.push("Partially matches your cost preference");
  } else {
    nonMatchReasons.push("Cost may not match your preference");
  }

  // 6. Experience level (10 pts)
  const expMatch = isExperienceMatch(opp.experienceLevel, profile.experienceLevel);
  let experienceLevel = 0;
  if (expMatch === "exact") {
    experienceLevel = 10;
    matchReasons.push(`Appropriate for your experience level (${profile.experienceLevel})`);
  } else if (expMatch === "partial") {
    experienceLevel = 5;
    matchReasons.push("Possibly suitable for your experience level");
  } else {
    nonMatchReasons.push("Experience level may not match");
  }

  // 7. Time commitment (5 pts)
  const timeMatch = isTimeMatch(opp.timeCommitment, profile.timeCommitment);
  let timeCommitment = 0;
  if (timeMatch) {
    timeCommitment = 5;
    matchReasons.push(`Time commitment matches (${opp.timeCommitment})`);
  } else {
    nonMatchReasons.push("Time commitment may not match your availability");
  }

  // 8. Deadline open (5 pts)
  const deadlineLabel = getDeadlineLabel(opp);
  let deadlineOpen = 0;
  if (deadlineLabel !== "Closed" && deadlineLabel !== "Deadline Passed") {
    deadlineOpen = 5;
    if (deadlineLabel === "Apply Now") matchReasons.push("Deadline is very soon — apply now!");
    else if (deadlineLabel === "Closing Soon") matchReasons.push("Deadline closing soon");
    else matchReasons.push("Application is open");
  } else {
    nonMatchReasons.push("Application deadline has passed");
  }

  const total =
    basicEligibility +
    stemInterest +
    opportunityType +
    locationFormat +
    costPreference +
    experienceLevel +
    timeCommitment +
    deadlineOpen;

  return {
    breakdown: {
      basicEligibility,
      stemInterest,
      opportunityType,
      locationFormat,
      costPreference,
      experienceLevel,
      timeCommitment,
      deadlineOpen,
      total,
    },
    matchReasons,
    nonMatchReasons,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isGradeEligible(eligibleGrades: string, grade: number): boolean | null {
  const s = eligibleGrades.toLowerCase();
  if (s === "unknown" || s === "all" || s === "any") return null;

  // Parse ranges like "6-12", "9-12", lists like "9,10,11,12", or single "10"
  const numbers = s.match(/\d+/g)?.map(Number) ?? [];
  if (numbers.length === 0) return null;

  if (s.includes("-") && numbers.length >= 2) {
    return grade >= numbers[0] && grade <= numbers[numbers.length - 1];
  }
  return numbers.includes(grade);
}

function isStemMatch(
  stemField: string,
  interest: string,
): "exact" | "partial" | "none" {
  const field = stemField.toLowerCase();
  const pref = interest.toLowerCase();
  if (field === "unknown" || field === "all" || field === "any") return "partial";
  if (field.includes(pref) || pref.includes(field)) return "exact";
  // broad stem category matches
  const broadMatches: Record<string, string[]> = {
    engineering: ["robotics", "coding", "technology", "computer", "software", "hardware", "electrical", "mechanical", "civil"],
    science: ["biology", "chemistry", "physics", "environmental", "earth", "space", "astronomy"],
    technology: ["computer", "coding", "software", "engineering", "robotics", "ai", "data"],
    math: ["mathematics", "statistics", "data", "calculus"],
  };
  for (const [broad, related] of Object.entries(broadMatches)) {
    if (field.includes(broad) && related.some((r) => pref.includes(r))) return "partial";
    if (pref.includes(broad) && related.some((r) => field.includes(r))) return "partial";
  }
  return "none";
}

function isCategoryMatch(
  category: string,
  preference: string,
): "exact" | "partial" | "none" {
  const cat = category.toLowerCase();
  const pref = preference.toLowerCase();
  if (cat === "unknown" || cat === "any") return "partial";
  if (cat === pref || cat.includes(pref) || pref.includes(cat)) return "exact";
  const related: Record<string, string[]> = {
    competition: ["challenge", "contest", "olympiad", "hackathon"],
    internship: ["research", "work", "employment", "job"],
    program: ["camp", "summer", "workshop", "course", "class"],
    scholarship: ["award", "grant", "fellowship"],
  };
  for (const [key, aliases] of Object.entries(related)) {
    if ((cat.includes(key) || aliases.some((a) => cat.includes(a))) &&
        (pref.includes(key) || aliases.some((a) => pref.includes(a)))) {
      return "partial";
    }
  }
  return "none";
}

function isFormatMatch(format: string, preference: string): boolean {
  const f = format.toLowerCase();
  const p = preference.toLowerCase();
  if (f === "hybrid" || p === "no preference" || p === "any") return true;
  if (f === p) return true;
  return false;
}

function isLocationMatch(location: string, preference: string, format: string): boolean {
  if (format.toLowerCase() === "remote") return true;
  const p = preference.toLowerCase();
  if (p === "any" || p === "no preference" || p === "nationwide") return true;
  const loc = location.toLowerCase();
  if (loc === "nationwide" || loc === "national" || loc === "all states") return true;
  return loc.includes(p) || p.includes(loc);
}

function isCostMatch(
  costCategory: string,
  preference: string,
): "exact" | "partial" | "none" {
  const c = costCategory.toLowerCase();
  const p = preference.toLowerCase();
  if (c === "unknown") return "partial";
  if (c === "free" && (p === "free" || p === "low")) return "exact";
  if (c === p) return "exact";
  if (c === "low" && p === "medium") return "partial";
  if (c === "medium" && p === "high") return "partial";
  if (c === "free" && p === "medium") return "partial";
  return "none";
}

function isExperienceMatch(
  oppLevel: string,
  userLevel: string,
): "exact" | "partial" | "none" {
  const o = oppLevel.toLowerCase();
  const u = userLevel.toLowerCase();
  if (o === "unknown" || o === "any" || o === "all") return "partial";
  if (o === u) return "exact";
  // beginner can do any, advanced can do intermediate+
  if (u === "beginner" && (o === "beginner" || o === "introductory")) return "exact";
  if (u === "intermediate" && (o === "beginner" || o === "intermediate")) return "partial";
  if (u === "advanced" && o !== "introductory") return "partial";
  return "none";
}

function isTimeMatch(oppTime: string, preference: string): boolean {
  const o = oppTime.toLowerCase();
  const p = preference.toLowerCase();
  if (o === "unknown") return true;
  if (o === p) return true;
  // flexible matches
  if (p === "flexible" || p === "any") return true;
  if (o.includes(p) || p.includes(o)) return true;
  return false;
}
