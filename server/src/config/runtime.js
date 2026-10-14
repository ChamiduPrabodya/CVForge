export function getRuntimeConfig(env = process.env) {
  const production = env.NODE_ENV === "production";
  const port = Number(env.PORT || 4000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT must be between 1 and 65535.");
  const jwtSecret = env.JWT_SECRET || "cvforge-development-secret";
  if (production && (jwtSecret === "cvforge-development-secret" || jwtSecret.length < 32)) {
    throw new Error("Set JWT_SECRET to a random secret of at least 32 characters in production.");
  }
  if (production && !env.CLIENT_ORIGIN) throw new Error("Set CLIENT_ORIGIN to your frontend origin in production.");
  return { port, jwtSecret, mongoUri: env.MONGODB_URI || "mongodb://127.0.0.1:27017/cvforge", clientOrigin: env.CLIENT_ORIGIN || true };
}
