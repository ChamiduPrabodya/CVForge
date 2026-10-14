import { Router } from "express";
import authRouter from "./auth.routes.js";
import cvRouter from "./cv.routes.js";
import shareRouter from "./share.routes.js";
import templateRouter from "./template.routes.js";
import adminRouter from "./admin.routes.js";
import { createAIRouter } from "./ai.routes.js";
import { getHealth } from "../controllers/health.controller.js";
import { getDashboard } from "../controllers/dashboard.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();
router.get("/health", getHealth);
router.use("/auth", authRouter);
router.get("/dashboard", requireAuth, getDashboard);
router.use("/cvs", cvRouter);
router.use("/shared", shareRouter);
router.use("/templates", templateRouter);
router.use("/admin", adminRouter);
router.use("/ai", createAIRouter());

export default router;
