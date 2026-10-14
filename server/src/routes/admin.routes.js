import { Router } from "express";
import * as controller from "../controllers/admin.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";
import { validateResourceId } from "../middleware/validation.middleware.js";

const router = Router();
router.param("templateId", validateResourceId);
router.use(requireAuth, requireAdmin);
router.get("/overview", controller.getOverview);
router.get("/users", controller.listUsers);
router.patch("/users/:id", controller.updateUserRole);
router.delete("/users/:id", controller.deleteUser);
router.get("/cvs", controller.listCVs);
router.delete("/cvs/:id", controller.deleteCV);
router.get("/system-templates", controller.listSystemTemplates);
router.put("/system-templates/:templateId", controller.saveSystemTemplate);
router.delete("/system-templates/:templateId", controller.deleteSystemTemplate);

export default router;
