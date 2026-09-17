import assert from "node:assert/strict";
import { after, before, beforeEach, mock, test } from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "template-route-test-secret";
const { app, seedSystemTemplates } = await import("../../server/app.js");
const SystemTemplate = mongoose.model("SystemTemplate");
const User = mongoose.model("User");
const records = new Map();
let server;
let base;
const adminToken = jwt.sign({ id: "admin", role: "admin" }, process.env.JWT_SECRET);
// The database role must take precedence over an outdated or forged role claim.
const userToken = jwt.sign({ id: "user", role: "admin" }, process.env.JWT_SECRET);
const sample = { id: "sanchez", name: "Sanchez", category: "Professional", style: "sanchez", status: "published", description: "Blue header", design: { accent: "#084aad" } };
const clone = (value) => structuredClone(value);
const matches = (record, filter) => Object.entries(filter).every(([key, condition]) => {
  const value = key.split(".").reduce((object, part) => object?.[part], record);
  return condition && typeof condition === "object" && "$ne" in condition ? value !== condition.$ne : value === condition;
});
const query = (value) => ({ sort() { return this; }, select() { return this; }, lean: async () => clone(value) });
const request = (path, { token = adminToken, ...options } = {}) => fetch(`${base}${path}`, {
  ...options,
  headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
});
const put = (template, token = adminToken) => request(`/api/admin/system-templates/${template.id}`, { method: "PUT", token, body: JSON.stringify({ template }) });

before(async () => {
  mock.method(User, "findById", (id) => query({ role: id === "admin" ? "admin" : "user" }));
  mock.method(SystemTemplate, "find", (filter = {}) => query([...records.values()].filter((record) => matches(record, filter))));
  mock.method(SystemTemplate, "exists", async (filter) => [...records.values()].some((record) => matches(record, filter)));
  mock.method(SystemTemplate, "findOneAndUpdate", (filter, update, options) => {
    const existing = records.get(filter.templateId);
    if (existing && !matches(existing, filter)) throw Object.assign(new Error("Duplicate ID"), { code: 11000 });
    assert.equal(options.runValidators, true);
    const record = { ...existing, ...clone(update) };
    records.set(filter.templateId, record);
    return query(record);
  });
  mock.method(SystemTemplate, "updateOne", async (filter, update, options = {}) => {
    const existing = records.get(filter.templateId);
    if (existing && matches(existing, filter)) {
      records.set(filter.templateId, { ...existing, ...clone(update.$set ?? {}) });
      return { matchedCount: 1 };
    }
    if (options.upsert) records.set(filter.templateId, clone(update.$setOnInsert));
    return { matchedCount: 0 };
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});
beforeEach(() => {
  records.clear();
  records.set(sample.id, { templateId: sample.id, template: clone(sample) });
});
after(async () => {
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  mock.restoreAll();
});

test("only database-verified admins may update or delete system templates", async () => {
  for (const [token, status] of [[null, 401], [userToken, 403]]) {
    assert.equal((await put(sample, token)).status, status);
    assert.equal((await request("/api/admin/system-templates/sanchez", { method: "DELETE", token })).status, status);
  }
  assert.deepEqual(records.get("sanchez").template, sample);
});

test("admin updates are persisted and returned by the public catalog", async () => {
  const updated = { ...sample, name: "  Updated Sanchez  ", description: "Updated description", design: { accent: "#123456" } };
  const response = await put(updated);
  assert.equal(response.status, 200);
  const saved = await response.json();
  assert.equal(saved.name, "Updated Sanchez");
  assert.equal(saved.design.accent, "#123456");
  assert.deepEqual(await (await request("/api/templates/public", { token: null })).json(), [saved]);
  await seedSystemTemplates();
  assert.deepEqual(records.get("sanchez").template, saved);
});

test("drafts remain available to admins but are hidden until published", async () => {
  assert.equal((await put({ ...sample, status: "draft" })).status, 200);
  assert.deepEqual(await (await request("/api/templates/public", { token: null })).json(), []);
  assert.equal((await (await request("/api/admin/system-templates")).json()).length, 1);
  assert.equal((await put({ ...sample, status: "published" })).status, 200);
  assert.equal((await (await request("/api/templates/public", { token: null })).json()).length, 1);
});

test("deleted bundled templates stay deleted after startup seeding", async () => {
  assert.equal((await request("/api/admin/system-templates/sanchez", { method: "DELETE" })).status, 204);
  for (const path of ["/api/templates/public", "/api/admin/system-templates"]) {
    assert.deepEqual(await (await request(path)).json(), []);
  }
  await seedSystemTemplates();
  assert.equal(records.get("sanchez").deleted, true);
  const publicTemplates = await (await request("/api/templates/public", { token: null })).json();
  assert.ok(publicTemplates.length > 0, "Other bundled templates still seed normally");
  assert.ok(!publicTemplates.some((template) => template.id === "sanchez"));
  assert.equal((await put(sample)).status, 404, "A stale editor cannot restore a deleted template");
  assert.equal((await request("/api/admin/system-templates/sanchez", { method: "DELETE" })).status, 404);
});

test("admin-created templates can also be created, updated, and deleted", async () => {
  const custom = { ...sample, id: "admin-test", name: "Custom" };
  assert.equal((await put(custom)).status, 200);
  assert.equal((await put({ ...custom, name: "Revised" })).status, 200);
  assert.equal(records.get(custom.id).template.name, "Revised");
  assert.equal((await request(`/api/admin/system-templates/${custom.id}`, { method: "DELETE" })).status, 204);
  assert.equal(records.get(custom.id).deleted, true);
});

test("invalid template updates are rejected without overwriting saved data", async () => {
  for (const patch of [{ name: "  " }, { category: 42 }, { style: null }, { status: "invalid" }]) {
    assert.equal((await put({ ...sample, ...patch })).status, 400);
  }
  assert.deepEqual(records.get("sanchez").template, sample);
  assert.equal((await request("/api/admin/system-templates/missing", { method: "DELETE" })).status, 404);
});
