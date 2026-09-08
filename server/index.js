import "dotenv/config";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";

const app = express();
const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cvforge";

app.use(cors({ origin: process.env.CLIENT_ORIGIN || true }));
app.use(express.json({ limit: "3mb" }));

const cvSchema = new mongoose.Schema(
  {
    ownerKey: { type: String, required: true, index: true },
    documentId: { type: String, required: true },
    document: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);
cvSchema.index({ ownerKey: 1, documentId: 1 }, { unique: true });

const customTemplateSchema = new mongoose.Schema(
  {
    ownerKey: { type: String, required: true, index: true },
    templateId: { type: String, required: true },
    template: { type: mongoose.Schema.Types.Mixed, required: true },
  },
  { timestamps: true },
);
customTemplateSchema.index({ ownerKey: 1, templateId: 1 }, { unique: true });

const CV = mongoose.model("CV", cvSchema);
const CustomTemplate = mongoose.model("CustomTemplate", customTemplateSchema);

const validOwnerKey = (value) => typeof value === "string" && value.length >= 8 && value.length <= 128;

app.get("/api/health", (_req, res) => res.json({ ok: true, database: mongoose.connection.name }));

app.get("/api/cvs", async (req, res, next) => {
  try {
    const { ownerKey } = req.query;
    if (!validOwnerKey(ownerKey)) return res.status(400).json({ error: "A valid ownerKey is required." });
    const records = await CV.find({ ownerKey }).sort({ updatedAt: -1 }).lean();
    res.json(records.map((record) => ({ document: record.document, updatedAt: record.updatedAt })));
  } catch (error) { next(error); }
});

app.put("/api/cvs/:documentId", async (req, res, next) => {
  try {
    const { ownerKey, document } = req.body;
    if (!validOwnerKey(ownerKey) || !document || typeof document !== "object") return res.status(400).json({ error: "ownerKey and document are required." });
    const record = await CV.findOneAndUpdate(
      { ownerKey, documentId: req.params.documentId },
      { ownerKey, documentId: req.params.documentId, document },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    res.json({ document: record.document, updatedAt: record.updatedAt });
  } catch (error) { next(error); }
});

app.get("/api/templates", async (req, res, next) => {
  try {
    const { ownerKey } = req.query;
    if (!validOwnerKey(ownerKey)) return res.status(400).json({ error: "A valid ownerKey is required." });
    const records = await CustomTemplate.find({ ownerKey }).sort({ updatedAt: -1 }).lean();
    res.json(records.map((record) => record.template));
  } catch (error) { next(error); }
});

app.put("/api/templates/:templateId", async (req, res, next) => {
  try {
    const { ownerKey, template } = req.body;
    if (!validOwnerKey(ownerKey) || !template || typeof template !== "object") return res.status(400).json({ error: "ownerKey and template are required." });
    const record = await CustomTemplate.findOneAndUpdate(
      { ownerKey, templateId: req.params.templateId },
      { ownerKey, templateId: req.params.templateId, template },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    res.json(record.template);
  } catch (error) { next(error); }
});

app.delete("/api/templates/:templateId", async (req, res, next) => {
  try {
    const { ownerKey } = req.query;
    if (!validOwnerKey(ownerKey)) return res.status(400).json({ error: "A valid ownerKey is required." });
    await CustomTemplate.deleteOne({ ownerKey, templateId: req.params.templateId });
    res.status(204).end();
  } catch (error) { next(error); }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: "Unexpected server error." });
});

mongoose.connect(mongoUri)
  .then(() => app.listen(port, () => console.log(`CVForge API listening on http://localhost:${port}`)))
  .catch((error) => { console.error("Could not connect to MongoDB:", error.message); process.exit(1); });
