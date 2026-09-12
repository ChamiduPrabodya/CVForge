import { spawn } from "node:child_process";

// Start both services so signing up works with the standard development command.
const children = [];
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
for (const args of [
  ["server/index.js"],
  ["node_modules/vite/bin/vite.js", ...process.argv.slice(2)],
]) {
  const child = spawn(process.execPath, args, { stdio: "inherit" });
  children.push(child);
  child.on("error", (error) => { console.error(error.message); stop(1); });
  child.on("exit", (code) => stop(code ?? 0));
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
