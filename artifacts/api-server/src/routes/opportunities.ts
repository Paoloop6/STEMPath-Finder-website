import { Router, type IRouter } from "express";
import { eq, and, ilike, or, sql } from "drizzle-orm";
import { db, opportunitiesTable } from "@workspace/db";
import {
  ListOpportunitiesQueryParams,
  GetOpportunityParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

// GET /opportunities — list published opportunities
router.get("/opportunities", async (req, res): Promise<void> => {
  const query = ListOpportunitiesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { category, stemField, format, grade, search } = query.data;

  const conditions = [eq(opportunitiesTable.published, true)];

  if (category) {
    conditions.push(ilike(opportunitiesTable.category, `%${category}%`));
  }
  if (stemField) {
    conditions.push(ilike(opportunitiesTable.stemField, `%${stemField}%`));
  }
  if (format) {
    conditions.push(ilike(opportunitiesTable.format, `%${format}%`));
  }
  if (search) {
    conditions.push(
      or(
        ilike(opportunitiesTable.name, `%${search}%`),
        ilike(opportunitiesTable.organization, `%${search}%`),
        ilike(opportunitiesTable.summary, `%${search}%`),
      ) ?? sql`false`,
    );
  }

  const opportunities = await db
    .select()
    .from(opportunitiesTable)
    .where(and(...conditions))
    .orderBy(opportunitiesTable.name);

  res.json(opportunities);
});

// GET /opportunities/:id — get published opportunity
router.get("/opportunities/:id", async (req, res): Promise<void> => {
  const params = GetOpportunityParams.safeParse({ id: Number(req.params.id) });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [opp] = await db
    .select()
    .from(opportunitiesTable)
    .where(
      and(
        eq(opportunitiesTable.id, params.data.id),
        eq(opportunitiesTable.published, true),
      ),
    );

  if (!opp) {
    res.status(404).json({ error: "Opportunity not found" });
    return;
  }

  res.json(opp);
});

export default router;
