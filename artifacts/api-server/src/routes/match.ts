import { Router, type IRouter } from "express";
import { MatchOpportunitiesBody } from "@workspace/api-zod";
import type { Opportunity } from "@workspace/db";
import {
  listOpportunities,
  toLegacyOpportunity,
} from "../lib/opportunity-repository";
import {
  calculateMatchScore,
  getEligibilityLabel,
  getDeadlineLabel,
  type MatchResult,
  type StudentProfile,
} from "../lib/matcher";
import { DEFAULT_TIER, isSearchTier, refineMatches } from "../lib/deepseek-match";

const router: IRouter = Router();

// POST /match — rank opportunities for a student profile
router.post("/match", async (req, res): Promise<void> => {
  const parsed = MatchOpportunitiesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // `tier` selects how much model effort the refinement pass gets; it is not a
  // scoring input, so it stays out of the profile handed to the rubric.
  const { tier: rawTier, ...profileFields } = parsed.data;
  const tier = isSearchTier(rawTier) ? rawTier : DEFAULT_TIER;
  const profile: StudentProfile = profileFields;

  // Candidates come from the DynamoDB repository (Lambda-written data), not
  // Postgres. Visibility rules (published/pending/rejected/expired) are
  // enforced inside the repository.
  const opportunities = (await listOpportunities({})).map(
    (record) => toLegacyOpportunity(record) as unknown as Opportunity,
  );

  const results: MatchResult[] = opportunities.map((opp) => {
    const { breakdown, matchReasons, nonMatchReasons } = calculateMatchScore(opp, profile);
    const eligibility = getEligibilityLabel(opp, profile);
    const deadlineLabel = getDeadlineLabel(opp);

    return {
      opportunity: opp,
      score: breakdown.total,
      scoreBreakdown: breakdown,
      eligibilityLabel: eligibility.label,
      deadlineLabel,
      matchReasons: [...matchReasons, ...eligibility.reasons],
      nonMatchReasons: [...nonMatchReasons, ...eligibility.nonMatchReasons],
    };
  });

  // Sort by score descending, then by eligibility
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const eligOrder: Record<string, number> = {
      Eligible: 0,
      "Maybe Eligible": 1,
      "Not Eligible": 2,
      "Deadline Passed": 3,
    };
    return (eligOrder[a.eligibilityLabel] ?? 9) - (eligOrder[b.eligibilityLabel] ?? 9);
  });

  // Best-effort: falls back to the rubric ranking above if DeepSeek is slow,
  // unconfigured, or down.
  const refined = await refineMatches(results, profile, tier);

  res.json(refined);
});

export default router;
