import { Router, type IRouter } from "express";
import healthRouter from "./health";
import opportunitiesRouter from "./opportunities";
import matchRouter from "./match";
import adminRouter from "./admin";
import candidatesRouter from "./candidates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(opportunitiesRouter);
router.use(matchRouter);
router.use(adminRouter);
router.use(candidatesRouter);

export default router;
