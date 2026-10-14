export function notFound(_req, res) {
  res.status(404).json({ error: "API endpoint not found." });
}

export function handleError(error, _req, res, next) {
  if (res.headersSent) return next(error);
  if (error.type === "entity.parse.failed") return res.status(400).json({ error: "Request body must be valid JSON." });
  if (error.type === "entity.too.large") return res.status(413).json({ error: "Request body exceeds the 16 MB limit." });
  if (["CastError", "ValidationError"].includes(error.name)) return res.status(400).json({ error: "Invalid request data or ID." });
  if (error.code === 11000) return res.status(409).json({ error: "This record already exists. Refresh and try again." });
  if (["MongoServerSelectionError", "MongooseServerSelectionError", "MongoNetworkError"].includes(error.name)) return res.status(503).json({ error: "The database is temporarily unavailable." });
  // Database errors may contain CV content or credentials; log only the category.
  console.error("API request failed:", error.name || "Error");
  res.status(500).json({ error: "Unexpected server error." });
}
