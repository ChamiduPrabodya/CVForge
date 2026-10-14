import { fileURLToPath } from "node:url";
import { join } from "node:path";

export const projectDirectory = fileURLToPath(new URL("../../../", import.meta.url));
export const projectPath = (...segments) => join(projectDirectory, ...segments);
export const serverEntryPath = projectPath("server", "src", "server.js");
export const viteConfigPath = projectPath("client", "vite.config.ts");
