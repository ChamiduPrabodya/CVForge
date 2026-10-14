import mongoose from "mongoose";

const systemTemplateSchema = new mongoose.Schema({ templateId: { type: String, required: true, unique: true }, template: { type: mongoose.Schema.Types.Mixed, required: true }, deleted: { type: Boolean, default: false } }, { timestamps: true });

export const SystemTemplate = mongoose.model("SystemTemplate", systemTemplateSchema, "system_templates");
