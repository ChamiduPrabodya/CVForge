import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import { validCredentials } from "../validators/auth.validators.js";
import { signToken, userPayload } from "../services/auth.service.js";

export async function register(req, res, next) {
  try {
    const { password } = req.body || {};
    const email = typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
    if (!validCredentials(email, password)) return res.status(400).json({ error: "Use a valid email and a password of at least 8 characters and at most 72 UTF-8 bytes." });
    if (await User.exists({ email: email.toLowerCase() })) return res.status(409).json({ error: "An account already exists for this email." });
    const user = await User.create({ email, passwordHash: await bcrypt.hash(password, 12), role: "user" });
    res.status(201).json({ token: signToken(user), user: userPayload(user) });
  } catch (error) {
    if (error.code === 11000) return res.status(409).json({ error: "An account already exists for this email." });
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body || {};
    if (typeof email !== "string" || email.length > 254 || typeof password !== "string" || !password || Buffer.byteLength(password, "utf8") > 72) return res.status(401).json({ error: "Incorrect email or password." });
    const user = await User.findOne({ email: String(email || "").trim().toLowerCase() });
    if (!user || !(await bcrypt.compare(String(password || ""), user.passwordHash))) return res.status(401).json({ error: "Incorrect email or password." });
    res.json({ token: signToken(user), user: userPayload(user) });
  } catch (error) { next(error); }
}

export async function getCurrentUser(req, res, next) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(401).json({ error: "Account not found." });
    res.json({ user: userPayload(user) });
  } catch (error) { next(error); }
}
