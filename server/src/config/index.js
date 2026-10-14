import { loadEnvironment } from "./env.js";
import { getRuntimeConfig } from "./runtime.js";

loadEnvironment();
export const runtimeConfig = getRuntimeConfig();
