import { validId } from "../validators/resume.validators.js";

export function validateResourceId(_req, res, next, id) {
  if (!validId(id)) return res.status(400).json({ error: "Use an ID of up to 128 letters, numbers, underscores, or hyphens." });
  next();
}
