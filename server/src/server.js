import mongoose from "mongoose";
import { app } from "./app.js";
import { connectDatabase, initializeDatabase } from "./config/database.js";
import { runtimeConfig } from "./config/index.js";

const { port, mongoUri } = runtimeConfig;
let server;
let stopping = false;

async function shutdown() {
  if (stopping) return;
  stopping = true;
  const deadline = setTimeout(() => process.exit(1), 10000).unref();
  try {
    if (server) await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    await mongoose.disconnect();
  } catch {
    process.exitCode = 1;
  } finally { clearTimeout(deadline); }
}

if (process.env.NODE_ENV !== "test") {
  try {
    await connectDatabase(mongoUri);
    await initializeDatabase();
    server = app.listen(port, () => console.log(`CVForge API listening on http://localhost:${port}`));
    server.on("error", async error => {
      console.error("API could not listen:", error.code || error.name);
      process.exitCode = 1;
      await shutdown();
    });
    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);
  } catch (error) {
    console.error("API startup failed:", error.name, "Check MongoDB availability and server configuration.");
    process.exitCode = 1;
    await mongoose.disconnect();
  }
}
