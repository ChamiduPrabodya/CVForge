import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();
router.post("/register", controller.register);
router.post("/login", controller.login);
router.get("/me", requireAuth, controller.getCurrentUser);

export default router;
