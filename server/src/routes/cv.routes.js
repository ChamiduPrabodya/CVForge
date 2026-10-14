import { Router } from "express";
import * as controller from "../controllers/cv.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { validateResourceId } from "../middleware/validation.middleware.js";

const router = Router();
router.param("documentId", validateResourceId);
router.use(requireAuth);
router.get("/", controller.listCVs);
router.get("/:documentId", controller.getCV);
router.put("/:documentId", controller.saveCV);
router.delete("/:documentId", controller.deleteCV);
router.post("/:documentId/share", controller.enableSharing);
router.delete("/:documentId/share", controller.disableSharing);

export default router;
