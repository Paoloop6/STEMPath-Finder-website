import { Router, type IRouter } from "express";
import { eq, and, ilike, count, sql } from "drizzle-orm";
import { db, opportunitiesTable, candidatesTable } from "@workspace/db";
import {
  AdminLoginBody,
  GetAdminOpportunityParams,
  UpdateOpportunityParams,
  DeleteOpportunityParams,
  TogglePublishOpportunityParams,
  CreateOpportunityBody,
  UpdateOpportunityBody,
  TogglePublishOpportunityBody,
  ListAdminOpportunitiesQueryParams,
} from "@workspace/api-zod";
import { requireAdmin } from "../middlewares/adminAuth";

const router: IRouter = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

// POST /admin/login
router.post("/admin/login", async (req, res): Promise<void> => {
  if (!ADMIN_PASSWORD) {
    res.status(500).json({ error: "Admin password not configured" });
    return;
  }

  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    req.log.warn({ username }, "Failed admin login attempt");
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  req.session.admin = { username, authenticated: true };
  res.json({ authenticated: true, username });
});

// POST /admin/logout
router.post("/admin/logout", (req, res): void => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// GET /admin/me
router.get("/admin/me", (req, res): void => {
  if (!req.session?.admin?.authenticated) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  res.json({ authenticated: true, username: req.session.admin.username });
});

// GET /admin/stats
router.get("/admin/stats", requireAdmin, async (req, res): Promise<void> => {
  const [oppStats] = await db
    .select({
      total: count(),
      published: sql<number>`sum(case when ${opportunitiesTable.published} then 1 else 0 end)`,
      verified: sql<number>`sum(case when ${opportunitiesTable.verificationStatus} = 'verified' then 1 else 0 end)`,
    })
    .from(opportunitiesTable);

  const [candStats] = await db
    .select({
      total: count(),
      pending: sql<number>`sum(case when ${candidatesTable.reviewStatus} = 'needs_verification' then 1 else 0 end)`,
    })
    .from(candidatesTable);

  res.json({
    totalOpportunities: Number(oppStats.total) ?? 0,
    publishedOpportunities: Number(oppStats.published) ?? 0,
    verifiedOpportunities: Number(oppStats.verified) ?? 0,
    pendingCandidates: Number(candStats.pending) ?? 0,
    totalCandidates: Number(candStats.total) ?? 0,
  });
});

// GET /admin/opportunities
router.get("/admin/opportunities", requireAdmin, async (req, res): Promise<void> => {
  const query = ListAdminOpportunitiesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { published, verificationStatus, search } = query.data;
  const conditions = [];

  if (published !== undefined) {
    conditions.push(eq(opportunitiesTable.published, published));
  }
  if (verificationStatus) {
    conditions.push(eq(opportunitiesTable.verificationStatus, verificationStatus));
  }
  if (search) {
    conditions.push(
      sql`(${ilike(opportunitiesTable.name, `%${search}%`)} OR ${ilike(opportunitiesTable.organization, `%${search}%`)})`,
    );
  }

  const opps = await db
    .select()
    .from(opportunitiesTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(opportunitiesTable.createdAt);

  res.json(opps);
});

// POST /admin/opportunities
router.post("/admin/opportunities", requireAdmin, async (req, res): Promise<void> => {
  const parsed = CreateOpportunityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [opp] = await db
    .insert(opportunitiesTable)
    .values({
      ...parsed.data,
      verificationStatus: parsed.data.verificationStatus ?? "needs_verification",
      published: parsed.data.published ?? false,
      isSampleData: parsed.data.isSampleData ?? false,
    })
    .returning();

  res.status(201).json(opp);
});

// GET /admin/opportunities/:id
router.get("/admin/opportunities/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = GetAdminOpportunityParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [opp] = await db
    .select()
    .from(opportunitiesTable)
    .where(eq(opportunitiesTable.id, params.data.id));

  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  res.json(opp);
});

// PUT /admin/opportunities/:id
router.put("/admin/opportunities/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = UpdateOpportunityParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOpportunityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [opp] = await db
    .update(opportunitiesTable)
    .set(parsed.data)
    .where(eq(opportunitiesTable.id, params.data.id))
    .returning();

  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  res.json(opp);
});

// DELETE /admin/opportunities/:id
router.delete("/admin/opportunities/:id", requireAdmin, async (req, res): Promise<void> => {
  const params = DeleteOpportunityParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [opp] = await db
    .delete(opportunitiesTable)
    .where(eq(opportunitiesTable.id, params.data.id))
    .returning();

  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  res.sendStatus(204);
});

// PATCH /admin/opportunities/:id/publish
router.patch("/admin/opportunities/:id/publish", requireAdmin, async (req, res): Promise<void> => {
  const params = TogglePublishOpportunityParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = TogglePublishOpportunityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [opp] = await db
    .update(opportunitiesTable)
    .set({ published: parsed.data.published })
    .where(eq(opportunitiesTable.id, params.data.id))
    .returning();

  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  res.json(opp);
});

export default router;
