import assert from "node:assert/strict";
import { after, before, mock, test } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { getRuntimeConfig } from "../src/config/runtime.js";
import { validDocument, validTemplate } from "../src/validators/resume.validators.js";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "backend-test-secret";
const { app } = await import("../src/app.js");
let server;
let base;
before(async () => {
  server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(async () => {
  await new Promise(resolve => server.close(resolve));
  mock.restoreAll();
});

test("health reports an unavailable database without claiming readiness", async () => {
  const response = await fetch(`${base}/api/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { ok: false, database: "unavailable" });
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("x-powered-by"), null);
});

test("malformed JSON and unknown endpoints return safe JSON errors", async () => {
  const malformed = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json" }, body: '{"password":"private-content",' });
  assert.equal(malformed.status, 400);
  assert.deepEqual(await malformed.json(), { error: "Request body must be valid JSON." });
  const missing = await fetch(`${base}/api/missing`);
  assert.equal(missing.status, 404);
  assert.deepEqual(await missing.json(), { error: "API endpoint not found." });
});

test("oversized request bodies return 413 without echoing their contents", async () => {
  const response = await fetch(`${base}/api/auth/register`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ privateContent: "x".repeat(16 * 1024 * 1024) }),
  });
  assert.equal(response.status, 413);
  assert.deepEqual(await response.json(), { error: "Request body exceeds the 16 MB limit." });
});

test("CV routes require a well-formed, signed session", async () => {
  for (const authorization of [undefined, "Bearer broken", "Basic anything", `Bearer ${jwt.sign({ role: "admin" }, process.env.JWT_SECRET)}`, `Bearer ${jwt.sign({ id: "user" }, "wrong-secret")}`]) {
    const response = await fetch(`${base}/api/cvs`, { headers: authorization ? { Authorization: authorization } : {} });
    assert.equal(response.status, 401);
  }
});

test("deleted accounts cannot use an otherwise valid token", async () => {
  const find = mock.method(mongoose.model("User"), "findById", () => ({ select() { return this; }, lean: async () => null }));
  try {
    const token = jwt.sign({ id: "deleted-user" }, process.env.JWT_SECRET);
    const response = await fetch(`${base}/api/cvs`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(response.status, 401);
  } finally { find.mock.restore(); }
});

test("CV and template validation reject wrong shapes and conflicting IDs", () => {
  const document = { id: "cv-1", name: "My CV", skills: ["JavaScript"], experience: [{ title: "Developer" }] };
  assert.ok(validDocument(document, "cv-1"));
  for (const value of [null, [], {}, { ...document, id: "cv-2" }, { ...document, skills: [42] }, { ...document, experience: ["Developer"] }, { ...document, summary: {} }, { ...document, design: [] }, { ...document, design: { font: {} } }, { ...document, templateConfig: {} }]) assert.equal(validDocument(value, "cv-1"), false);
  const template = { id: "t-1", name: "Simple", style: "custom", category: "Custom" };
  assert.ok(validTemplate(template, "t-1"));
  for (const value of [[], null, { ...template, id: "t-2" }, { ...template, status: "unknown" }, { ...template, sections: {} }, { ...template, sectionLabels: { summary: [] } }]) assert.equal(validTemplate(value, "t-1"), false);
});

test("production requires explicit origins and a strong session secret", () => {
  assert.equal(getRuntimeConfig({}).mongoUri, "mongodb://127.0.0.1:27017/cvforge");
  assert.throws(() => getRuntimeConfig({ PORT: "invalid" }), /PORT/);
  assert.throws(() => getRuntimeConfig({ NODE_ENV: "production" }), /JWT_SECRET/);
  assert.throws(() => getRuntimeConfig({ NODE_ENV: "production", JWT_SECRET: "x".repeat(32) }), /CLIENT_ORIGIN/);
  assert.equal(getRuntimeConfig({ NODE_ENV: "production", JWT_SECRET: "x".repeat(32), CLIENT_ORIGIN: "https://cv.example" }).clientOrigin, "https://cv.example");
});
