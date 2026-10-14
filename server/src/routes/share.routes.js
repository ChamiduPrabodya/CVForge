import { Router } from "express";
import * as controller from "../controllers/share.controller.js";

const router = Router();
router.get("/:token", controller.getSharedCV);
router.post("/:token/reviews", controller.createReview);

export default router;
