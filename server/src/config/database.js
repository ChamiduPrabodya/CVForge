import mongoose from "mongoose";
import "../models/index.js";
import { seedAdmin, removeBundledTemplates, seedSystemTemplates } from "../seeds/index.js";

export function connectDatabase(uri) {
  return mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
}

export async function initializeDatabase() {
  await seedAdmin();
  await removeBundledTemplates();
  await seedSystemTemplates();
  await Promise.all(Object.values(mongoose.models).map(model => model.init()));
}
