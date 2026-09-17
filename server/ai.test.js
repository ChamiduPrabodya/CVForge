import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { createAIRouter, resumeSchema } from "./ai.js";

const empty = schema => schema.type === "string" ? "" : schema.type === "array" ? [] : Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, empty(value)]));
const details = { ...empty(resumeSchema), fullName: "Jane Perera", email: "jane@example.com", experience: [{ title: "Engineer", company: "Acme", location: "", start: "2020", end: "Present", description: "Built tools." }] };
const response = data => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ text: JSON.stringify(data) }] } }] }), { status: 200 });
const text = "Jane Perera\njane@example.com\nEngineer at Acme since 2020. Built tools.";
async function fixture(t, fetchImpl, extra = {}) {
  const app = express();
  app.use(express.json());
  app.use("/ai", createAIRouter({ fetchImpl, getKey: () => "test-only-secret", ...extra }));
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  return (action, body = { text }) => fetch(`http://127.0.0.1:${server.address().port}/ai/${action}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
}

test("imports through Gemini with a JSON schema and server-only credentials", async t => {
  const request = await fixture(t, async (url, options) => {
    assert.equal(url, `https://generativelanguage.googleapis.com/v1beta/models/${process.env.GEMINI_MODEL || "gemini-2.5-flash"}:generateContent`);
    assert.equal(options.headers["x-goog-api-key"], "test-only-secret");
    assert.ok(!url.includes("test-only-secret"));
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.responseMimeType, "application/json");
    assert.deepEqual(body.generationConfig.responseJsonSchema, resumeSchema);
    assert.equal(JSON.parse(body.contents[0].parts[0].text).resume, text);
    assert.match(body.systemInstruction.parts[0].text, /Never invent/);
    return response(details);
  });
  const result = await request("import");
  assert.equal(result.status, 200);
  assert.equal(result.headers.get("cache-control"), "no-store");
  const body = await result.json();
  assert.equal(body.details.fullName, "Jane Perera");
  assert.ok(body.details.experience[0].id);
  assert.ok(!JSON.stringify(body).includes("test-only-secret"));
});

test("validates requests without making paid calls", async t => {
  const request = await fixture(t, () => assert.fail("must not call Gemini"));
  assert.equal((await request("import", { text: "short" })).status, 400);
  assert.equal((await request("import", { text: "x".repeat(60001) })).status, 400);
  assert.equal((await request("cover-letter", { text, job: "", company: "Acme" })).status, 400);
  assert.equal((await request("other")).status, 404);
});

test("reports missing credentials and enforces request limits", async t => {
  const missing = await fixture(t, () => assert.fail("must not call Gemini"), { getKey: () => "" });
  assert.equal((await missing("import")).status, 503);
  const limited = await fixture(t, async () => response(details), { limit: 1 });
  assert.equal((await limited("import")).status, 200);
  const second = await limited("import");
  assert.equal(second.status, 429);
  assert.ok(second.headers.get("retry-after"));
});

test("rejects malformed, refused and incomplete output without returning provider errors", async t => {
  const cases = [
    [async () => response({ ...details, injected: "unsafe" }), 502],
    [async () => response({ ...details, skills: "wrong type" }), 502],
    [async () => new Response(JSON.stringify({ candidates: [{ finishReason: "MAX_TOKENS" }] })), 502],
    [async () => new Response(JSON.stringify({ candidates: [{ finishReason: "SAFETY" }] })), 422],
    [async () => new Response(JSON.stringify({ promptFeedback: { blockReason: "SAFETY" } })), 422],
    [async () => new Response("test-only-secret private provider data", { status: 401 }), 503],
    [async () => new Response(JSON.stringify({ error: { details: [{ reason: "API_KEY_INVALID" }], message: "private provider data" } }), { status: 400 }), 503],
    [async () => new Response("private provider data", { status: 404 }), 503],
    [async () => new Response("private provider data", { status: 400 }), 502],
    [async () => new Response("private provider data", { status: 429 }), 429],
    [async () => { throw new DOMException("private provider data", "TimeoutError"); }, 502],
  ];
  for (const [provider, status] of cases) {
    const request = await fixture(t, provider);
    const result = await request("import");
    assert.equal(result.status, status);
    assert.doesNotMatch(await result.text(), /private provider data|test-only-secret/);
  }
});

test("summary and cover letter use actual provider results and the supplied job description", async t => {
  const request = await fixture(t, async (_url, options) => {
    const body = JSON.parse(options.body);
    if (body.generationConfig.responseJsonSchema.required[0] === "summary") return response({ summary: "Engineer experienced in building tools." });
    assert.equal(JSON.parse(body.contents[0].parts[0].text).jobDescription, "Build accessible tools.");
    return response({ letter: "Dear Acme team,\nI am applying for the Engineer role." });
  });
  assert.equal((await (await request("summary")).json()).summary, "Engineer experienced in building tools.");
  assert.match((await (await request("cover-letter", { text, job: "Engineer", company: "Acme", jobDescription: "Build accessible tools." })).json()).letter, /Dear Acme/);
});

test("reports Gemini quota errors and preserves Retry-After without leaking provider details", async t => {
  const request = await fixture(t, async () => new Response(JSON.stringify({ error: { status: "RESOURCE_EXHAUSTED", message: "private provider data" } }), { status: 429, headers: { "Retry-After": "90" } }));
  const result = await request("import");
  assert.equal(result.status, 429);
  const { error } = await result.json();
  assert.match(error, /Gemini's API quota or rate limit/);
  assert.equal(result.headers.get("retry-after"), "90");
  assert.doesNotMatch(error, /private provider data/);
});

test("ignores thinking parts and assembles JSON text parts", async t => {
  const json = JSON.stringify(details);
  const request = await fixture(t, async () => new Response(JSON.stringify({ candidates: [{ finishReason: "STOP", content: { parts: [{ thought: true, text: "private reasoning" }, { text: json.slice(0, 30) }, { text: json.slice(30) }] } }] })));
  const result = await request("import");
  assert.equal(result.status, 200);
  assert.equal((await result.json()).details.fullName, "Jane Perera");
});
