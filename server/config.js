import dotenv from "dotenv";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

const projectDirectory = fileURLToPath(new URL("../", import.meta.url));

export function loadEnvironment({ directory = projectDirectory, env = process.env } = {}) {
  const { parsed } = dotenv.config({
    path: [join(directory, ".env.local"), join(directory, ".env")],
    processEnv: env,
    quiet: true,
  });
  // An empty inherited variable should not hide a configured local key.
  if (!env.GEMINI_API_KEY?.trim() && parsed?.GEMINI_API_KEY?.trim()) {
    env.GEMINI_API_KEY = parsed.GEMINI_API_KEY.trim();
  }
  return env;
}

export function getGeminiKey() {
  // .env.local may be created after the development server starts.
  if (!process.env.GEMINI_API_KEY?.trim()) loadEnvironment();
  return process.env.GEMINI_API_KEY?.trim();
}
