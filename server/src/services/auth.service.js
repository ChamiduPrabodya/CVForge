import jwt from "jsonwebtoken";
import { runtimeConfig } from "../config/index.js";

export const userPayload = (user) => ({ id: user._id.toString(), email: user.email, role: user.role });
export const signToken = (user) => jwt.sign(userPayload(user), runtimeConfig.jwtSecret, { expiresIn: "7d" });
