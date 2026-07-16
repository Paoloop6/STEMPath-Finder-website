import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, candidatesTable, opportunitiesTable } from "@workspace/db";
import {
  GetCandidateParams,
  UpdateCandidateStatusParams,
  UpdateCandidateStatusBody,
  ListCandidatesQueryParams,
  SubmitCandidatesBody,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

// ── Admin candidate routes ────────────────────────────────────────────────────

// GET /admin/candidates
router.get("/admin/candidates", requireAdmin, async (req, res): Promise<void> => {
  const query = ListCandidatesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { status } = query.data;
  const conditions = status ? [eq(candidatesTable.reviewStatus, status)] : [];

  const candidates = await db
    .select()
    .from(candidatesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(candidatesTable.createdAt);

  res.json(candidates);
});

// GET /admin/candidates/:id
router.get("/admin/candidates/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetCandidateParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [candidate] = await db
    .select()
    .from(candidatesTable)
    .where(eq(candidatesTable.id, params.data.id));

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  res.json(candidate);
});

// PATCH /admin/candidates/:id/status
router.patch("/admin/candidates/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateCandidateStatusParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateCandidateStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const validStatuses = ["needs_verification", "approved", "rejected", "duplicate"];
  if (!validStatuses.includes(parsed.data.reviewStatus)) {
    res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    return;
  }

  const [candidate] = await db
    .update(candidatesTable)
    .set({
      reviewStatus: parsed.data.reviewStatus,
      reviewNotes: parsed.data.reviewNotes ?? null,
    })
    .where(eq(candidatesTable.id, params.data.id))
    .returning();

  if (!candidate) {
    res.status(404).json({ error: "Candidate not found" });
    return;
  }

  // If approved, copy to opportunities table (unpublished, needs_verification)
  if (parsed.data.reviewStatus === "approved") {
    const today = new Date().toISOString().split("T")[0];
    await db.insert(opportunitiesTable).values({
      name: candidate.name,
      organization: candidate.organization,
      category: candidate.category,
      stemField: candidate.stemField,
      eligibleGrades: candidate.possibleGrades,
      location: candidate.location,
      format: candidate.format,
      costCategory: candidate.possibleCost,
      deadline: candidate.possibleDeadline ?? null,
      experienceLevel: "Unknown",
      timeCommitment: "Unknown",
      requirements: candidate.requirements,
      officialUrl: candidate.officialUrl,
      sourceUrls: candidate.sourceUrls,
      summary: candidate.summary,
      verificationStatus: "needs_verification",
      published: false,
      isSampleData: false,
      lastVerifiedDate: today,
    });

    req.log.info({ candidateId: candidate.id }, "Candidate approved and copied to opportunities");
  }

  res.json(candidate);
});

// ── Public candidate submission API (bearer token) ────────────────────────────

// POST /candidates
router.post("/candidates", async (req, res): Promise<void> => {
  const CANDIDATE_API_TOKEN = process.env.CANDIDATE_API_TOKEN;

  if (!CANDIDATE_API_TOKEN) {
    res.status(500).json({ error: "Candidate API not configured" });
    return;
  }

  // Authenticate via Bearer token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Bearer token required" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== CANDIDATE_API_TOKEN) {
    req.log.warn("Invalid candidate API token attempt");
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  const parsed = SubmitCandidatesBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { candidates } = parsed.data;
  const today = new Date().toISOString().split("T")[0];

  let submitted = 0;
  let duplicates = 0;
  let errors = 0;

  for (const c of candidates) {
    // Normalize URL for duplicate check
    let normalizedUrl: string;
    try {
      const urlObj = new URL(c.officialUrl);
      normalizedUrl = urlObj.hostname + urlObj.pathname.replace(/\/$/, "").toLowerCase();
    } catch {
      normalizedUrl = c.officialUrl.toLowerCase().trim();
    }

    try {
      // Check for duplicate by URL in candidates table
      const [existingByUrl] = await db
        .select({ id: candidatesTable.id })
        .from(candidatesTable)
        .where(eq(candidatesTable.officialUrl, c.officialUrl));

      if (existingByUrl) {
        duplicates++;
        continue;
      }

      // Check duplicate in opportunities table
      const [existingOpp] = await db
        .select({ id: opportunitiesTable.id })
        .from(opportunitiesTable)
        .where(eq(opportunitiesTable.officialUrl, c.officialUrl));

      if (existingOpp) {
        duplicates++;
        continue;
      }

      await db.insert(candidatesTable).values({
        name: c.name,
        organization: c.organization,
        category: c.category ?? "Unknown",
        stemField: c.stemField ?? "Unknown",
        possibleGrades: c.possibleGrades ?? "Unknown",
        possibleAges: c.possibleAges ?? "Unknown",
        location: c.location ?? "Unknown",
        format: c.format ?? "Unknown",
        possibleCost: c.possibleCost ?? "Unknown",
        possibleDeadline: c.possibleDeadline ?? null,
        requirements: c.requirements ?? "",
        officialUrl: c.officialUrl,
        sourceUrls: c.sourceUrls ?? "",
        summary: c.summary,
        dateDiscovered: today,
        reviewStatus: "needs_verification",
        reviewNotes: null,
      });

      submitted++;
    } catch (err) {
      req.log.error({ err }, "Error inserting candidate");
      errors++;
    }
  }

  const message = `Processed ${candidates.length} candidates: ${submitted} submitted, ${duplicates} duplicates skipped, ${errors} errors`;

  res.status(201).json({ submitted, duplicates, errors, message });
});

export default router;
