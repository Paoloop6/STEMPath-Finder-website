import { Router, type IRouter } from "express";
import healthRouter from "./health";
import opportunitiesRouter from "./opportunities";
import matchRouter from "./match";
import adminRouter from "./admin";
import candidatesRouter from "./candidates";
import pathwaysRouter from "./pathways";
import dynamoOpportunitiesRouter from "./opportunities-dynamo";

const router: IRouter = Router();

router.use(healthRouter);
// DynamoDB-backed routes claim GET /opportunities (and recognized detail ids)
// ahead of the legacy Postgres router below.
router.use(dynamoOpportunitiesRouter);
router.use(opportunitiesRouter);
router.use(matchRouter);
router.use(adminRouter);
router.use(candidatesRouter);
router.use(pathwaysRouter);

export default router;
