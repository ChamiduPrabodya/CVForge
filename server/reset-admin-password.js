import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost:27017/cvforge";
const email = (process.env.ADMIN_EMAIL || "admin@cvforge.local").toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!password || password.length < 8) {
  console.error("Set ADMIN_PASSWORD in .env to at least 8 characters before running this command.");
  process.exit(1);
}

const userSchema = new mongoose.Schema({ email: String, passwordHash: String, role: String }, { strict: false });
const User = mongoose.model("User", userSchema, "users");

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
