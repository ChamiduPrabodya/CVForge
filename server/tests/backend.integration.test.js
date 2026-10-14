import assert from "node:assert/strict";
import { test } from "node:test";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

test("backend account, CV, template, sharing, and admin workflows persist in MongoDB", { skip: process.env.RUN_MONGO_TESTS !== "1" }, async t => {
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "backend-integration-secret";
  const { app } = await import("../src/app.js");
  const database = `cvforge_backend_test_${Date.now()}_${process.pid}`;
  const uri = `mongodb://127.0.0.1:${Number(process.env.MONGO_TEST_PORT || 27017)}/${database}`;
  let server;
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    await Promise.all(Object.values(mongoose.models).map(model => model.init()));
    const User = mongoose.model("User");
    server = app.listen(0, "127.0.0.1");
    await new Promise(resolve => server.once("listening", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const request = (path, { token, body, ...options } = {}) => fetch(`${base}/api${path}`, {
      ...options,
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const credentials = { email: "Owner@Example.com", password: "correct-password-123" };
    let owner;
    let other;
    let shareToken;
    const document = { id: "cv-1", name: "Engineer CV", fullName: "Jane Perera", skills: ["JavaScript"], originalPhoto: "private-original", importedSource: "private-source", photo: "cropped-preview" };

    await t.test("registration hashes passwords, normalizes email, and rejects duplicates", async () => {
      const response = await request("/auth/register", { method: "POST", body: { ...credentials, role: "admin" } });
      assert.equal(response.status, 201);
      owner = await response.json();
      assert.equal(owner.user.email, "owner@example.com");
      assert.equal(owner.user.role, "user");
      assert.equal(owner.user.passwordHash, undefined);
      const stored = await User.findById(owner.user.id).lean();
      assert.notEqual(stored.passwordHash, credentials.password);
      assert.ok(await bcrypt.compare(credentials.password, stored.passwordHash));
      assert.equal((await request("/auth/register", { method: "POST", body: credentials })).status, 409);
      assert.equal((await request("/auth/register", { method: "POST", body: { email: "a@example.com", password: "é".repeat(37) } })).status, 400);
      const second = await request("/auth/register", { method: "POST", body: { email: "other@example.com", password: credentials.password } });
      assert.equal(second.status, 201);
      other = await second.json();
    });

    await t.test("login and session lookup enforce credentials and database roles", async () => {
      assert.equal((await request("/auth/login", { method: "POST", body: { ...credentials, password: "wrong" } })).status, 401);
      const login = await request("/auth/login", { method: "POST", body: credentials });
      assert.equal(login.status, 200);
      assert.equal((await login.json()).user.id, owner.user.id);
      const me = await request("/auth/me", { token: owner.token });
      assert.equal(me.status, 200);
      assert.deepEqual((await me.json()).user, owner.user);
      const forgedRole = jwt.sign({ id: owner.user.id, role: "admin" }, process.env.JWT_SECRET);
      assert.equal((await request("/admin/overview", { token: forgedRole })).status, 403);
      const expired = jwt.sign({ id: owner.user.id }, process.env.JWT_SECRET, { expiresIn: -1 });
      assert.equal((await request("/cvs", { token: expired })).status, 401);
    });

    await t.test("CV saves, reads, updates, and deletions are isolated by owner", async () => {
      assert.equal((await request("/cvs/cv-1", { method: "PUT", token: owner.token, body: { document } })).status, 200);
      const read = await request("/cvs/cv-1", { token: owner.token });
      assert.equal(read.status, 200);
      assert.deepEqual((await read.json()).document, document);
      assert.equal((await (await request("/cvs", { token: owner.token })).json()).length, 1);
      assert.deepEqual(await (await request("/cvs", { token: other.token })).json(), []);
      assert.equal((await request("/cvs/cv-1", { token: other.token })).status, 404);
      assert.equal((await request("/cvs/cv-1", { method: "DELETE", token: other.token })).status, 404);
      for (const input of [[], { ...document, id: "wrong" }, { ...document, skills: [42] }]) assert.equal((await request("/cvs/cv-1", { method: "PUT", token: owner.token, body: { document: input } })).status, 400);
      assert.equal((await request("/cvs/cv-1", { method: "PUT", token: owner.token })).status, 400);
      assert.equal((await request("/cvs/bad%20id", { method: "PUT", token: owner.token, body: { document } })).status, 400);
      assert.equal((await request("/cvs/cv-1", { method: "PUT", token: owner.token, body: { document: { ...document, summary: "Updated" } } })).status, 200);
      assert.equal((await (await request("/cvs/cv-1", { token: owner.token })).json()).document.summary, "Updated");
    });

    await t.test("concurrent share requests reuse one token and hide original uploads", async () => {
      assert.equal((await request("/cvs/cv-1/share", { method: "POST", token: other.token })).status, 404);
      const responses = await Promise.all(Array.from({ length: 5 }, () => request("/cvs/cv-1/share", { method: "POST", token: owner.token })));
      for (const response of responses) assert.equal(response.status, 200);
      const tokens = await Promise.all(responses.map(response => response.json()));
      shareToken = tokens[0].token;
      assert.match(shareToken, /^[a-f0-9-]{36}$/);
      assert.ok(tokens.every(item => item.token === shareToken));
      const shared = await request(`/shared/${shareToken}`);
      assert.equal(shared.status, 200);
      const data = await shared.json();
      assert.equal(data.document.originalPhoto, undefined);
      assert.equal(data.document.importedSource, undefined);
      assert.equal(data.document.photo, "cropped-preview");
      assert.deepEqual(data.reviews, []);
    });

    await t.test("review validation, persistence, and share revocation work", async () => {
      assert.equal((await request(`/shared/${shareToken}/reviews`, { method: "POST", body: { name: "", message: "Feedback" } })).status, 400);
      const review = await request(`/shared/${shareToken}/reviews`, { method: "POST", body: { name: " Reviewer ", message: " Clear CV. " } });
      assert.equal(review.status, 201);
      const saved = await review.json();
      assert.equal(saved.name, "Reviewer");
      assert.equal(saved.message, "Clear CV.");
      assert.equal((await (await request(`/shared/${shareToken}`)).json()).reviews[0].id, saved.id);
      assert.equal((await request("/cvs/cv-1/share", { method: "DELETE", token: owner.token })).status, 204);
      assert.equal((await request(`/shared/${shareToken}`)).status, 404);
      assert.equal((await request(`/shared/${shareToken}/reviews`, { method: "POST", body: { name: "Reviewer", message: "More" } })).status, 404);
      assert.equal((await (await request("/cvs/cv-1/share", { method: "POST", token: owner.token })).json()).token, shareToken);
    });

    await t.test("custom templates persist per owner and dashboard counts are accurate", async () => {
      const template = { id: "saved-1", name: "My template", category: "Custom", style: "custom" };
      assert.equal((await request("/templates/saved-1", { method: "PUT", token: owner.token, body: { template } })).status, 200);
      assert.deepEqual(await (await request("/templates", { token: owner.token })).json(), [template]);
      assert.deepEqual(await (await request("/templates", { token: other.token })).json(), []);
      await request("/templates/saved-1", { method: "DELETE", token: other.token });
      assert.equal((await (await request("/templates", { token: owner.token })).json()).length, 1);
      assert.deepEqual(await (await request("/dashboard", { token: owner.token })).json(), { cvCount: 1, customTemplateCount: 1 });
      assert.equal((await request("/templates/saved-1", { method: "DELETE", token: owner.token })).status, 204);
      assert.equal((await request("/cvs/cv-1", { method: "DELETE", token: owner.token })).status, 204);
      assert.equal((await request(`/shared/${shareToken}`)).status, 404);
      assert.deepEqual(await (await request("/dashboard", { token: owner.token })).json(), { cvCount: 0, customTemplateCount: 0 });
    });

    await t.test("administrator permissions follow the stored role and deleted accounts lose access", async () => {
      await User.findByIdAndUpdate(owner.user.id, { role: "admin" });
      assert.equal((await request("/admin/overview", { token: owner.token })).status, 200);
      assert.equal((await request(`/admin/users/${owner.user.id}`, { method: "DELETE", token: owner.token })).status, 400);
      assert.equal((await request(`/admin/users/${owner.user.id}`, { method: "PATCH", token: owner.token, body: { role: "user" } })).status, 400);
      assert.equal((await request("/admin/users/invalid-id", { method: "PATCH", token: owner.token, body: { role: "user" } })).status, 400);
      assert.equal((await request(`/admin/users/${other.user.id}`, { method: "DELETE", token: owner.token })).status, 204);
      assert.equal((await request("/cvs", { token: other.token })).status, 401);
      const health = await request("/health");
      assert.equal(health.status, 200);
      assert.deepEqual(await health.json(), { ok: true, database: "connected" });
    });

    await t.test("production entry point resolves configuration and templates from another working directory", async () => {
      const portProbe = createServer();
      await new Promise(resolve => portProbe.listen(0, "127.0.0.1", resolve));
      const port = portProbe.address().port;
      await new Promise(resolve => portProbe.close(resolve));
      const child = spawn(process.execPath, [fileURLToPath(new URL("../src/server.js", import.meta.url))], {
        cwd: tmpdir(),
        env: { ...process.env, NODE_ENV: "production", PORT: String(port), MONGODB_URI: uri,
          JWT_SECRET: "production-startup-test-secret-32-characters", CLIENT_ORIGIN: "http://localhost:5173", ADMIN_EMAIL: "", ADMIN_PASSWORD: "" },
        stdio: ["ignore", "pipe", "pipe"],
      });
      try {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("API startup timed out")), 10000);
          let output = "";
          const finished = () => clearTimeout(timeout);
          child.once("error", error => { finished(); reject(error); });
          child.once("exit", code => { finished(); reject(new Error(`API exited before startup (${code})`)); });
          child.stdout.on("data", chunk => {
            output += chunk.toString();
            if (output.includes("CVForge API listening")) { finished(); resolve(); }
          });
          child.stderr.resume();
        });
        const response = await fetch(`http://127.0.0.1:${port}/api/health`);
        assert.equal(response.status, 200);
        const catalog = await fetch(`http://127.0.0.1:${port}/api/templates/public`);
        assert.equal(catalog.status, 200);
        assert.equal((await catalog.json()).length, 9);
        assert.equal(await User.countDocuments(), 1, "Production must not create a default administrator");
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          const exited = new Promise(resolve => child.once("exit", resolve));
          child.kill();
          await exited;
        }
      }
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (mongoose.connection.readyState === 1 && mongoose.connection.name === database && database.startsWith("cvforge_backend_test_")) await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
  }
});
