import { randomUUID } from "node:crypto";
import { CV } from "../models/CV.js";
import { validDocument } from "../validators/resume.validators.js";

export async function listCVs(req, res, next) {
  try { const records = await CV.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean(); res.json(records.map((record) => ({ document: record.document, updatedAt: record.updatedAt }))); }
  catch (error) { next(error); }
}

export async function getCV(req, res, next) {
  try {
    const record = await CV.findOne({ userId: req.user.id, documentId: req.params.documentId }).lean();
    if (!record) return res.status(404).json({ error: "CV not found." });
    res.json({ document: record.document, updatedAt: record.updatedAt });
  } catch (error) { next(error); }
}

export async function saveCV(req, res, next) {
  try {
    const { document: input } = req.body || {};
    if (!validDocument(input, req.params.documentId)) return res.status(400).json({ error: "Provide a CV object with a name, valid fields, and a matching document ID." });
    const document = { ...input, id: req.params.documentId };
    const record = await CV.findOneAndUpdate({ userId: req.user.id, documentId: req.params.documentId }, { userId: req.user.id, documentId: req.params.documentId, document }, { upsert: true, returnDocument: "after", runValidators: true }).lean();
    res.json({ document: record.document, updatedAt: record.updatedAt });
  } catch (error) { next(error); }
}

export async function deleteCV(req, res, next) {
  try {
    const result = await CV.deleteOne({ userId: req.user.id, documentId: req.params.documentId });
    if (!result.deletedCount) return res.status(404).json({ error: "CV not found." });
    res.status(204).end();
  } catch (error) { next(error); }
}

export async function enableSharing(req, res, next) {
  try {
    const filter = { userId: req.user.id, documentId: req.params.documentId };
    // Assign the token conditionally so simultaneous requests return the same link.
    let record = await CV.findOneAndUpdate(
      { ...filter, "share.token": { $exists: false } },
      { $set: { "share.enabled": true, "share.token": randomUUID() } },
      { returnDocument: "after" },
    ).lean();
    if (!record) record = await CV.findOneAndUpdate(filter, { $set: { "share.enabled": true } }, { returnDocument: "after" }).lean();
    if (!record) return res.status(404).json({ error: "Save this CV before creating a review link." });
    return res.json({ token: record.share.token });
  } catch (error) { next(error); }
}

export async function disableSharing(req, res, next) {
  try {
    const result = await CV.updateOne({ userId: req.user.id, documentId: req.params.documentId }, { $set: { "share.enabled": false } });
    if (!result.matchedCount) return res.status(404).json({ error: "CV not found." });
    return res.status(204).end();
  } catch (error) { next(error); }
}
