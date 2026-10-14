import { Router } from "express";
import * as controller from "../controllers/template.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateResourceId } from "../middleware/validation.middleware.js";

const router = Router();
router.param("templateId", validateResourceId);
router.get("/public", controller.listPublicTemplates);
router.get("/", requireAuth, controller.listCustomTemplates);
router.put("/:templateId", requireAuth, controller.saveCustomTemplate);
router.delete("/:templateId", requireAuth, controller.deleteCustomTemplate);

export default router;
