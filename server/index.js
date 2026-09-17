import mongoose from "mongoose";
import { app, seedAdmin, removeBundledTemplates, seedSystemTemplates } from "./app.js";

const port = Number(process.env.PORT || 4000);
const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cvforge";

if (process.env.NODE_ENV !== "test") mongoose.connect(mongoUri)
  .then(async () => {
    await seedAdmin();
    await removeBundledTemplates();
    await seedSystemTemplates();
    app.listen(port, () => console.log(`CVForge API listening on http://localhost:${port}`));
  })
  .catch((error) => { console.error("Could not connect to MongoDB:", error.message); process.exit(1); });
