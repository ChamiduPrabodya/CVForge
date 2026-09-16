import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";

test("template deletion persists in MongoDB across reconnect and startup seeding", { skip: process.env.RUN_MONGO_TESTS !== "1" }, async () => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "isolated-template-integration-test";
  const { app, seedSystemTemplates } = await import("./index.js");
  // Use a unique local database; never modify the application's CVForge database.
  const database = `cvforge_template_test_${Date.now()}_${process.pid}`;
  const uri = `mongodb://127.0.0.1:27017/${database}`;
  let server;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    const User = mongoose.model("User");
    const SystemTemplate = mongoose.model("SystemTemplate");
    await SystemTemplate.init();
    const admin = await User.create({ email: "test-admin@example.com", passwordHash: "unused-test-password", role: "admin" });
    const token = jwt.sign({ id: admin.id }, process.env.JWT_SECRET);
    await seedSystemTemplates();
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const headers = { Authorization: `Bearer ${token}` };
    const catalog = async (path) => {
      const response = await fetch(`${base}${path}`, { headers });
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("cache-control"), "no-store");
      return response.json();
    };
    assert.ok((await catalog("/api/templates/public")).some((template) => template.id === "sanchez"));
    const deleted = await fetch(`${base}/api/admin/system-templates/sanchez`, { method: "DELETE", headers });
    assert.equal(deleted.status, 204);
    assert.equal((await SystemTemplate.findOne({ templateId: "sanchez" }).lean()).deleted, true);
    await mongoose.disconnect();
    await mongoose.connect(uri);
    await seedSystemTemplates();
    for (const path of ["/api/templates/public", "/api/admin/system-templates"]) {
      const templates = await catalog(path);
      assert.ok(!templates.some((template) => template.id === "sanchez"));
      assert.ok(templates.some((template) => template.id === "warner"));
    }
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === database && database.startsWith("cvforge_template_test_")) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
