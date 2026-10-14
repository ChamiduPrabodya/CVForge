import mongoose from "mongoose";

export function getHealth(_req, res) {
  const connected = mongoose.connection.readyState === 1;
  res.status(connected ? 200 : 503).json({ ok: connected, database: connected ? "connected" : "unavailable" });
}
