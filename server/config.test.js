import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { loadEnvironment } from "./config.js";

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "cvforge-config-"));
  t.after(() => {
    assert.equal(dirname(resolve(directory)), resolve(tmpdir()));
    assert.ok(basename(directory).startsWith("cvforge-config-"));
    rmSync(directory, { recursive: true, force: true });
  });
  writeFileSync(join(directory, ".env"), "OPENAI_API_KEY=base-test-key\nPORT=4000\n");
  return directory;
}

test("local settings take precedence over base settings, but retain a real deployment key", t => {
  const directory = fixture(t);
  writeFileSync(join(directory, ".env.local"), "OPENAI_API_KEY=local-test-key\n");
  assert.deepEqual(loadEnvironment({ directory, env: {} }), { OPENAI_API_KEY: "local-test-key", PORT: "4000" });
  const env = { OPENAI_API_KEY: "deployment-test-key" };
  loadEnvironment({ directory, env });
  assert.equal(env.OPENAI_API_KEY, "deployment-test-key");
});

test("empty inherited keys no longer hide a configured key", t => {
  const directory = fixture(t);
  for (const value of ["", "   "]) {
    const env = { OPENAI_API_KEY: value };
    loadEnvironment({ directory, env });
    assert.equal(env.OPENAI_API_KEY, "base-test-key");
  }
});

test("can load a settings file created after the first configuration read", t => {
  const directory = fixture(t);
  const env = loadEnvironment({ directory, env: {} });
  delete env.OPENAI_API_KEY;
  writeFileSync(join(directory, ".env.local"), "OPENAI_API_KEY=added-later-test-key\n");
  loadEnvironment({ directory, env });
  assert.equal(env.OPENAI_API_KEY, "added-later-test-key");
});

test("default configuration paths resolve relative to the server module, not the working directory", t => {
  const directory = fixture(t);
  // Intercept dotenv in a child process to check paths without reading real keys.
  const dotenvURL = pathToFileURL(resolve("node_modules/dotenv/lib/main.js")).href;
  const script = `import dotenv from ${JSON.stringify(dotenvURL)};
    import { loadEnvironment } from ${JSON.stringify(new URL("./config.js", import.meta.url).href)};
    const paths = [];
    dotenv.config = options => { paths.push(...options.path); return { parsed: {} }; };
    loadEnvironment({ env: {} });
    console.log(JSON.stringify(paths));`;
  const result = spawnSync(process.execPath, ["--input-type=module", "-e", script], { cwd: directory, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [resolve(".env.local"), resolve(".env")]);
});
