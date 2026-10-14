import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { runtimeConfig } from "../config/index.js";

export const requireAuth = async (req, res, next) => {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization || "")?.[1];
  if (!token) return res.status(401).json({ error: "Please sign in to continue." });
  let payload;
  try {
    payload = jwt.verify(token, runtimeConfig.jwtSecret, { algorithms: ["HS256"] });
    if (typeof payload !== "object" || typeof payload.id !== "string" || !payload.id) throw new Error("Invalid session");
  }
  catch { return res.status(401).json({ error: "Your session has expired. Please sign in again." }); }
  try {
    const user = await User.findById(payload.id).select("role").lean();
    if (!user) return res.status(401).json({ error: "Account not found. Please sign in again." });
    req.user = { id: payload.id, role: user.role };
    return next();
  } catch (error) {
    if (error.name === "CastError") return res.status(401).json({ error: "Invalid session. Please sign in again." });
    return next(error);
  }
};
export const requireAdmin = (req, res, next) => {
  if (req.user.role !== "admin") return res.status(403).json({ error: "Admin access is required." });
  return next();
};
