import { CV } from "../models/CV.js";

export async function getSharedCV(req, res, next) {
  try {
    const record = await CV.findOne({ "share.token": req.params.token, "share.enabled": true }).lean();
    if (!record) return res.status(404).json({ error: "This review link is unavailable." });
    const { importedSource, originalPhoto, ...document } = record.document;
    return res.json({ document, reviews: record.reviews.map((review) => ({ id: review._id.toString(), name: review.name, message: review.message, createdAt: review.createdAt })) });
  } catch (error) { next(error); }
}

export async function createReview(req, res, next) {
  try {
    const name = typeof req.body?.name === "string" ? req.body.name.trim() : "";
    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!name || name.length > 80 || !message || message.length > 2000) return res.status(400).json({ error: "Enter your name and feedback (up to 2,000 characters)." });
    const record = await CV.findOneAndUpdate({ "share.token": req.params.token, "share.enabled": true }, { $push: { reviews: { name, message } } }, { returnDocument: "after" }).lean();
    if (!record) return res.status(404).json({ error: "This review link is unavailable." });
    const review = record.reviews.at(-1);
    return res.status(201).json({ id: review._id.toString(), name: review.name, message: review.message, createdAt: review.createdAt });
  } catch (error) { next(error); }
}
