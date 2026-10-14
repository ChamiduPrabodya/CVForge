import { loadEnvironment } from "../server/src/config/env.js";
import { User } from "../server/src/models/User.js";
import { validCredentials } from "../server/src/validators/auth.validators.js";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

loadEnvironment();
const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/cvforge";
const email = (process.env.ADMIN_EMAIL || "admin@cvforge.local").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!validCredentials(email, password)) {
  console.error("Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local; use at least 8 characters and at most 72 UTF-8 bytes for the password.");
  process.exit(1);
}

try {
  await mongoose.connect(mongoUri);
  const result = await User.updateOne(
    { email },
    { $set: { passwordHash: await bcrypt.hash(password, 12), role: "admin" } },
  );
  if (!result.matchedCount) {
    console.error(`No admin account exists for ${email}. Start the API once to seed it first.`);
    process.exitCode = 1;
  } else {
    console.log(`Updated password for ${email}.`);
  }
} catch (error) {
  console.error("Could not reset the admin password:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
