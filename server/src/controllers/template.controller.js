import { CustomTemplate } from "../models/CustomTemplate.js";
import { SystemTemplate } from "../models/SystemTemplate.js";
import { validTemplate } from "../validators/resume.validators.js";

export async function listPublicTemplates(_req, res, next) {
  res.set("Cache-Control", "no-store");
  try { const records = await SystemTemplate.find({ deleted: { $ne: true }, "template.status": { $ne: "draft" } }).sort({ createdAt: 1 }).lean(); res.json(records.map((record) => record.template)); }
  catch (error) { next(error); }
}

export async function listCustomTemplates(req, res, next) {
  try { const records = await CustomTemplate.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean(); res.json(records.map((record) => record.template)); }
  catch (error) { next(error); }
}

export async function saveCustomTemplate(req, res, next) {
  try {
    const { template: input } = req.body || {};
    if (!validTemplate(input, req.params.templateId)) return res.status(400).json({ error: "Provide a template with a name, category, style, and matching ID." });
    const template = { ...input, id: req.params.templateId };
    const record = await CustomTemplate.findOneAndUpdate({ userId: req.user.id, templateId: req.params.templateId }, { userId: req.user.id, templateId: req.params.templateId, template }, { upsert: true, returnDocument: "after", runValidators: true }).lean();
    res.json(record.template);
  } catch (error) { next(error); }
}

export async function deleteCustomTemplate(req, res, next) {
  try { await CustomTemplate.deleteOne({ userId: req.user.id, templateId: req.params.templateId }); res.status(204).end(); }
  catch (error) { next(error); }
}
