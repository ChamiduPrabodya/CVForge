import { User, CV, CustomTemplate, SystemTemplate } from "../models/index.js";
import { validTemplate } from "../validators/resume.validators.js";

export async function getOverview(_req, res, next) {
  try {
    const [userCount, cvCount, customTemplateCount, systemTemplateCount, recentUsers] = await Promise.all([
      User.countDocuments(), CV.countDocuments(), CustomTemplate.countDocuments(), SystemTemplate.countDocuments({ deleted: { $ne: true } }),
      User.find().sort({ createdAt: -1 }).limit(8).select("email role createdAt").lean(),
    ]);
    res.json({ userCount, cvCount, customTemplateCount, systemTemplateCount, recentUsers });
  } catch (error) { next(error); }
}

export async function listUsers(_req, res, next) {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select("email role createdAt").lean();
    res.json(users.map((user) => ({ id: user._id.toString(), email: user.email, role: user.role, createdAt: user.createdAt })));
  } catch (error) { next(error); }
}

export async function updateUserRole(req, res, next) {
  try {
    const { role } = req.body || {};
    if (!["admin", "user"].includes(role)) return res.status(400).json({ error: "Role must be admin or user." });
    if (req.params.id === req.user.id && role !== "admin") return res.status(400).json({ error: "You cannot remove your own admin access." });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { returnDocument: "after", runValidators: true }).select("email role createdAt").lean();
    if (!user) return res.status(404).json({ error: "Account not found." });
    res.json({ id: user._id.toString(), email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (error) { next(error); }
}

export async function deleteUser(req, res, next) {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: "You cannot delete your own administrator account." });
    const user = await User.findById(req.params.id).select("_id").lean();
    if (!user) return res.status(404).json({ error: "Account not found." });
    await Promise.all([CV.deleteMany({ userId: user._id }), CustomTemplate.deleteMany({ userId: user._id }), User.findByIdAndDelete(user._id)]);
    res.status(204).end();
  } catch (error) { next(error); }
}

export async function listCVs(_req, res, next) {
  try {
    const records = await CV.find().sort({ updatedAt: -1 }).limit(100).populate("userId", "email").lean();
    res.json(records.map((record) => ({ id: record._id.toString(), title: record.document?.name || "Untitled CV", owner: record.userId?.email || "Unknown", updatedAt: record.updatedAt })));
  } catch (error) { next(error); }
}

export async function deleteCV(req, res, next) {
  try { await CV.findByIdAndDelete(req.params.id); res.status(204).end(); }
  catch (error) { next(error); }
}

export async function listSystemTemplates(_req, res, next) {
  res.set("Cache-Control", "no-store");
  try { const records = await SystemTemplate.find({ deleted: { $ne: true } }).sort({ createdAt: 1 }).lean(); res.json(records.map((record) => record.template)); }
  catch (error) { next(error); }
}

export async function saveSystemTemplate(req, res, next) {
  try {
    const { template } = req.body || {};
    if (!validTemplate(template, req.params.templateId)) return res.status(400).json({ error: "Provide a template with a name, category, style, matching ID, and valid status." });
    if (await SystemTemplate.exists({ templateId: req.params.templateId, deleted: true })) return res.status(404).json({ error: "This template has been deleted. Create a new template instead." });
    const record = await SystemTemplate.findOneAndUpdate({ templateId: req.params.templateId, deleted: { $ne: true } }, { templateId: req.params.templateId, template: { ...template, id: req.params.templateId, name: template.name.trim(), category: template.category.trim(), style: template.style.trim() } }, { upsert: true, returnDocument: "after", runValidators: true }).lean();
    res.json(record.template);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "The template changed. Refresh and try again." });
    next(error);
  }
}

export async function deleteSystemTemplate(req, res, next) {
  try {
    // Retain a tombstone so startup seeding cannot restore a deleted bundled template.
    const result = await SystemTemplate.updateOne({ templateId: req.params.templateId, deleted: { $ne: true } }, { $set: { deleted: true } });
    if (!result.matchedCount) return res.status(404).json({ error: "Template not found." });
    res.status(204).end();
  } catch (error) { next(error); }
}
