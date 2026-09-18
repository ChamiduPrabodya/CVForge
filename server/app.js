import { loadEnvironment } from "./config/env.js";
import { createAIRouter } from "./routes/ai.js";
import bcrypt from "bcryptjs";
import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import carelineTemplate from "../shared/templates/careline.json" with { type: "json" };
import saleslineTemplate from "../shared/templates/salesline.json" with { type: "json" };
import boutiqueTemplate from "../shared/templates/boutique.json" with { type: "json" };
import ivoryTemplate from "../shared/templates/ivory.json" with { type: "json" };
import mercadoTemplate from "../shared/templates/mercado.json" with { type: "json" };
import warnerTemplate from "../shared/templates/warner.json" with { type: "json" };
import sanchezTemplate from "../shared/templates/sanchez.json" with { type: "json" };
import chandranTemplate from "../shared/templates/chandran.json" with { type: "json" };
import kumariTemplate from "../shared/templates/kumari.json" with { type: "json" };

loadEnvironment();
const app = express();
const jwtSecret = process.env.JWT_SECRET || "cvforge-development-secret";

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
// Allow a 10 MB original upload encoded as a data URL plus its cropped preview.
app.use(express.json({ limit: "16mb" }));
app.use("/api/ai", createAIRouter());

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ["admin", "user"], default: "user" },
}, { timestamps: true });
const cvSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  documentId: { type: String, required: true },
  document: { type: mongoose.Schema.Types.Mixed, required: true },
  share: { token: { type: String, unique: true, sparse: true }, enabled: { type: Boolean, default: false } },
  reviews: [{ name: { type: String, required: true }, message: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true });
cvSchema.index({ userId: 1, documentId: 1 }, { unique: true });
const customTemplateSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, templateId: { type: String, required: true }, template: { type: mongoose.Schema.Types.Mixed, required: true } }, { timestamps: true });
customTemplateSchema.index({ userId: 1, templateId: 1 }, { unique: true });
const systemTemplateSchema = new mongoose.Schema({ templateId: { type: String, required: true, unique: true }, template: { type: mongoose.Schema.Types.Mixed, required: true }, deleted: { type: Boolean, default: false } }, { timestamps: true });

const User = mongoose.model("User", userSchema, "users");
const CV = mongoose.model("CV", cvSchema, "cv_documents");
const CustomTemplate = mongoose.model("CustomTemplate", customTemplateSchema, "custom_templates");
const SystemTemplate = mongoose.model("SystemTemplate", systemTemplateSchema, "system_templates");
const userPayload = (user) => ({ id: user._id.toString(), email: user.email, role: user.role });
const signToken = (user) => jwt.sign(userPayload(user), jwtSecret, { expiresIn: "7d" });
const validCredentials = (email, password) => typeof email === "string" && /^\S+@\S+\.\S+$/.test(email) && typeof password === "string" && password.length >= 8;

const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  try { req.user = jwt.verify(token, jwtSecret); return next(); }
  catch { return res.status(401).json({ error: "Your session has expired. Please sign in again." }); }
};
const requireAdmin = async (req, res, next) => {
  try {
    const user = await User.findById(req.user?.id).select("role").lean();
    if (user?.role !== "admin") return res.status(403).json({ error: "Admin access is required." });
    req.user.role = "admin";
    return next();
  } catch (error) {
    return next(error);
  }
};

app.get("/api/health", (_req, res) => res.json({ ok: true, database: mongoose.connection.name }));
app.get("/api/templates/public", async (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  try { const records = await SystemTemplate.find({ deleted: { $ne: true }, "template.status": { $ne: "draft" } }).sort({ createdAt: 1 }).lean(); res.json(records.map((record) => record.template)); }
  catch (error) { next(error); }
});
app.post("/api/auth/register", async (req, res, next) => {
  try {
    const { password } = req.body || {};
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!validCredentials(email, password)) return res.status(400).json({ error: "Use a valid email and a password of at least 8 characters." });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: "An account already exists for this email." });
    const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12), role: "user" });
    res.status(201).json({ token: signToken(user), user: userPayload(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "An account already exists for this email." });
    next(error);
  }
});
app.post("/api/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: String(email || "").trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) return res.status(401).json({ error: "Incorrect email or password." });
    res.json({ token: signToken(user), user: userPayload(user) });
  } catch (error) { next(error); }
});
app.get("/api/auth/me", requireAuth, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: "Account not found." });
    res.json({ user: userPayload(user) });
  } catch (error) { next(error); }
});
app.get("/api/dashboard", requireAuth, async (req, res, next) => {
  try {
    const [cvCount, customTemplateCount] = await Promise.all([CV.countDocuments({ userId: req.user.id }), CustomTemplate.countDocuments({ userId: req.user.id })]);
    res.json({ cvCount, customTemplateCount });
  } catch (error) { next(error); }
});

app.get("/api/cvs", requireAuth, async (req, res, next) => {
  try { const records = await CV.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean(); res.json(records.map((record) => ({ document: record.document, updatedAt: record.updatedAt }))); }
  catch (error) { next(error); }
});
app.put("/api/cvs/:documentId", requireAuth, async (req, res, next) => {
  try {
    const { document } = req.body;
    if (!document || typeof document !== "object") return res.status(400).json({ error: "A CV document is required." });
    const record = await CV.findOneAndUpdate({ userId: req.user.id, documentId: req.params.documentId }, { userId: req.user.id, documentId: req.params.documentId, document }, { upsert: true, new: true, runValidators: true }).lean();
    res.json({ document: record.document, updatedAt: record.updatedAt });
  } catch (error) { next(error); }
});
app.post("/api/cvs/:documentId/share", requireAuth, async (req, res, next) => {
  try {
    const record = await CV.findOneAndUpdate(
      { userId: req.user.id, documentId: req.params.documentId },
      { $set: { "share.enabled": true }, $setOnInsert: { "share.token": randomUUID() } },
      { new: true },
    ).lean();
    if (!record) return res.status(404).json({ error: "Save this CV before creating a review link." });
    if (!record.share?.token) {
      const updated = await CV.findByIdAndUpdate(record._id, { $set: { "share.token": randomUUID() } }, { new: true }).lean();
      return res.json({ token: updated.share.token });
    }
    return res.json({ token: record.share.token });
  } catch (error) { next(error); }
});
app.delete("/api/cvs/:documentId/share", requireAuth, async (req, res, next) => {
  try {
    const result = await CV.updateOne({ userId: req.user.id, documentId: req.params.documentId }, { $set: { "share.enabled": false } });
    if (!result.matchedCount) return res.status(404).json({ error: "CV not found." });
    return res.status(204).end();
  } catch (error) { next(error); }
});
app.get("/api/shared/:token", async (req, res, next) => {
  try {
    const record = await CV.findOne({ "share.token": req.params.token, "share.enabled": true }).lean();
    if (!record) return res.status(404).json({ error: "This review link is unavailable." });
    const { importedSource, originalPhoto, ...document } = record.document;
    return res.json({ document, reviews: record.reviews.map((review) => ({ id: review._id.toString(), name: review.name, message: review.message, createdAt: review.createdAt })) });
  } catch (error) { next(error); }
});
app.post("/api/shared/:token/reviews", async (req, res, next) => {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!name || name.length > 80 || !message || message.length > 2000) return res.status(400).json({ error: "Enter your name and feedback (up to 2,000 characters)." });
    const record = await CV.findOneAndUpdate({ "share.token": req.params.token, "share.enabled": true }, { $push: { reviews: { name, message } } }, { new: true }).lean();
    if (!record) return res.status(404).json({ error: "This review link is unavailable." });
    const review = record.reviews.at(-1);
    return res.status(201).json({ id: review._id.toString(), name: review.name, message: review.message, createdAt: review.createdAt });
  } catch (error) { next(error); }
});
app.get("/api/templates", requireAuth, async (req, res, next) => {
  try { const records = await CustomTemplate.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean(); res.json(records.map((record) => record.template)); }
  catch (error) { next(error); }
});
app.put("/api/templates/:templateId", requireAuth, async (req, res, next) => {
  try {
    const { template } = req.body;
    if (!template || typeof template !== "object") return res.status(400).json({ error: "A template is required." });
    const record = await CustomTemplate.findOneAndUpdate({ userId: req.user.id, templateId: req.params.templateId }, { userId: req.user.id, templateId: req.params.templateId, template }, { upsert: true, new: true, runValidators: true }).lean();
    res.json(record.template);
  } catch (error) { next(error); }
});
app.delete("/api/templates/:templateId", requireAuth, async (req, res, next) => {
  try { await CustomTemplate.deleteOne({ userId: req.user.id, templateId: req.params.templateId }); res.status(204).end(); }
  catch (error) { next(error); }
});
app.get("/api/admin/overview", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const [userCount, cvCount, customTemplateCount, systemTemplateCount, recentUsers] = await Promise.all([
      User.countDocuments(), CV.countDocuments(), CustomTemplate.countDocuments(), SystemTemplate.countDocuments({ deleted: { $ne: true } }),
      User.find().sort({ createdAt: -1 }).limit(8).select("email role createdAt").lean(),
    ]);
    res.json({ userCount, cvCount, customTemplateCount, systemTemplateCount, recentUsers });
  } catch (error) { next(error); }
});
app.get("/api/admin/users", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 }).select("email role createdAt").lean();
    res.json(users.map((user) => ({ id: user._id.toString(), email: user.email, role: user.role, createdAt: user.createdAt })));
  } catch (error) { next(error); }
});
app.patch("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!["admin", "user"].includes(role)) return res.status(400).json({ error: "Role must be admin or user." });
    if (req.params.id === req.user.id && role !== "admin") return res.status(400).json({ error: "You cannot remove your own admin access." });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true }).select("email role createdAt").lean();
    if (!user) return res.status(404).json({ error: "Account not found." });
    res.json({ id: user._id.toString(), email: user.email, role: user.role, createdAt: user.createdAt });
  } catch (error) { next(error); }
});
app.delete("/api/admin/users/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: "You cannot delete your own administrator account." });
    const user = await User.findById(req.params.id).select("_id").lean();
    if (!user) return res.status(404).json({ error: "Account not found." });
    await Promise.all([CV.deleteMany({ userId: user._id }), CustomTemplate.deleteMany({ userId: user._id }), User.findByIdAndDelete(user._id)]);
    res.status(204).end();
  } catch (error) { next(error); }
});
app.get("/api/admin/cvs", requireAuth, requireAdmin, async (_req, res, next) => {
  try {
    const records = await CV.find().sort({ updatedAt: -1 }).limit(100).populate("userId", "email").lean();
    res.json(records.map((record) => ({ id: record._id.toString(), title: record.document?.name || "Untitled CV", owner: record.userId?.email || "Unknown", updatedAt: record.updatedAt })));
  } catch (error) { next(error); }
});
app.delete("/api/admin/cvs/:id", requireAuth, requireAdmin, async (req, res, next) => {
  try { await CV.findByIdAndDelete(req.params.id); res.status(204).end(); }
  catch (error) { next(error); }
});
app.get("/api/admin/system-templates", requireAuth, requireAdmin, async (_req, res, next) => {
  res.set("Cache-Control", "no-store");
  try { const records = await SystemTemplate.find({ deleted: { $ne: true } }).sort({ createdAt: 1 }).lean(); res.json(records.map((record) => record.template)); }
  catch (error) { next(error); }
});
app.put("/api/admin/system-templates/:templateId", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    const { template } = req.body || {};
    if (![template?.name, template?.style, template?.category].every((value) => typeof value === "string" && value.trim())) return res.status(400).json({ error: "Template name, category, and style are required." });
    if (template.status !== undefined && !["draft", "published"].includes(template.status)) return res.status(400).json({ error: "Template status must be draft or published." });
    if (await SystemTemplate.exists({ templateId: req.params.templateId, deleted: true })) return res.status(404).json({ error: "This template has been deleted. Create a new template instead." });
    const record = await SystemTemplate.findOneAndUpdate({ templateId: req.params.templateId, deleted: { $ne: true } }, { templateId: req.params.templateId, template: { ...template, id: req.params.templateId, name: template.name.trim(), category: template.category.trim(), style: template.style.trim() } }, { upsert: true, new: true, runValidators: true }).lean();
    res.json(record.template);
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "The template changed. Refresh and try again." });
    next(error);
  }
});
app.delete("/api/admin/system-templates/:templateId", requireAuth, requireAdmin, async (req, res, next) => {
  try {
    // Retain a tombstone so startup seeding cannot restore a deleted bundled template.
    const result = await SystemTemplate.updateOne({ templateId: req.params.templateId, deleted: { $ne: true } }, { $set: { deleted: true } });
    if (!result.matchedCount) return res.status(404).json({ error: "Template not found." });
    res.status(204).end();
  } catch (error) { next(error); }
});
app.use((error, _req, res, _next) => { console.error(error); res.status(500).json({ error: "Unexpected server error." }); });

const seedAdmin = async () => {
  const email = (process.env.ADMIN_EMAIL || "admin@cvforge.local").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "ChangeThisAdminPassword123!";
  if (!(await User.findOne({ email }))) {
    await User.create({ email, passwordHash: await bcrypt.hash(password, 12), role: "admin" });
    console.log(`Created local admin account: ${email}`);
  }
};
// Remove the former bundled catalog from databases initialized by earlier versions.
// User-created templates use saved-/admin- IDs and remain available.
const removeBundledTemplates = () => SystemTemplate.deleteMany({
  templateId: { $in: ["portrait", "custom", "classic", "modern", "executive", "creative", "tech", "ats", "student", "elegant", "corporate", "twocolumn"] },
});
const seedSystemTemplates = () => Promise.all([carelineTemplate, saleslineTemplate, boutiqueTemplate, ivoryTemplate, mercadoTemplate, warnerTemplate, sanchezTemplate, chandranTemplate, kumariTemplate].map((template) => SystemTemplate.updateOne(
  { templateId: template.id },
  { $setOnInsert: { templateId: template.id, template } },
  { upsert: true },
)));
export { app, seedAdmin, removeBundledTemplates, seedSystemTemplates };
