import mongoose from "mongoose";

const cvSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  documentId: { type: String, required: true },
  document: { type: mongoose.Schema.Types.Mixed, required: true },
  share: { token: { type: String, unique: true, sparse: true }, enabled: { type: Boolean, default: false } },
  reviews: [{ name: { type: String, required: true }, message: { type: String, required: true }, createdAt: { type: Date, default: Date.now } }],
}, { timestamps: true });
cvSchema.index({ userId: 1, documentId: 1 }, { unique: true });

export const CV = mongoose.model("CV", cvSchema, "cv_documents");
