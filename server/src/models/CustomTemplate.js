import mongoose from "mongoose";

const customTemplateSchema = new mongoose.Schema({ userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true }, templateId: { type: String, required: true }, template: { type: mongoose.Schema.Types.Mixed, required: true } }, { timestamps: true });
customTemplateSchema.index({ userId: 1, templateId: 1 }, { unique: true });

export const CustomTemplate = mongoose.model("CustomTemplate", customTemplateSchema, "custom_templates");
