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
  if (!env.OPENAI_API_KEY?.trim() && parsed?.OPENAI_API_KEY?.trim()) {
    env.OPENAI_API_KEY = parsed.OPENAI_API_KEY.trim();
  }
  return env;
}

export function getOpenAIKey() {
  // .env.local may be created after the development server starts.
  if (!process.env.OPENAI_API_KEY?.trim()) loadEnvironment();
  return process.env.OPENAI_API_KEY?.trim();
}
