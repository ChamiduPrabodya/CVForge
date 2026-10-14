import { CV } from "../models/CV.js";
import { CustomTemplate } from "../models/CustomTemplate.js";

export async function getDashboard(req, res, next) {
  try {
    const [cvCount, customTemplateCount] = await Promise.all([CV.countDocuments({ userId: req.user.id }), CustomTemplate.countDocuments({ userId: req.user.id })]);
    res.json({ cvCount, customTemplateCount });
  } catch (error) { next(error); }
}
