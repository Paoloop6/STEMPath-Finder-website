import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, opportunitiesTable } from "@workspace/db";
import { MatchOpportunitiesBody } from "@workspace/api-zod";
import {
  calculateMatchScore,
  getEligibilityLabel,
  getDeadlineLabel,
  type StudentProfile,
} from "../lib/matcher";

const router: IRouter = Router();

// POST /match — rank opportunities for a student profile
router.post("/match", async (req, res): Promise<void> => {
  const parsed = MatchOpportunitiesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const profile: StudentProfile = parsed.data;

  const opportunities = await db
    .select()
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.published, true));

  const results = opportunities.map((opp) => {
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

  res.json(results);
});

export default router;
