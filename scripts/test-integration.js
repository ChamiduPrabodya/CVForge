import { spawn } from "node:child_process";
import { projectDirectory, projectPath } from "../server/src/config/paths.js";

const child = spawn(process.execPath, ["--test", projectPath("server", "tests", "backend.integration.test.js"), projectPath("server", "tests", "templates.integration.test.js")], {
  cwd: projectDirectory,
  env: { ...process.env, RUN_MONGO_TESTS: "1" },
  stdio: "inherit",
});
child.on("error", error => { console.error(error.message); process.exitCode = 1; });
child.on("exit", code => { process.exitCode = code ?? 1; });
