import assert from "node:assert/strict";
import { test } from "node:test";
import express from "express";
import { createAIRouter, resumeSchema } from "./ai.js";

const empty = schema => schema.type === "string" ? "" : schema.type === "array" ? [] : Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, empty(value)]));
const details = { ...empty(resumeSchema), fullName: "Jane Perera", email: "jane@example.com", experience: [{ title: "Engineer", company: "Acme", location: "", start: "2020", end: "Present", description: "Built tools." }] };
const response = data => new Response(JSON.stringify({ status: "completed", output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(data) }] }] }), { status: 200 });
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

test("imports through Responses with strict schema, no storage, and server-only credentials", async t => {
  const request = await fixture(t, async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal(options.headers.Authorization, "Bearer test-only-secret");
    const body = JSON.parse(options.body);
    assert.equal(body.store, false);
    assert.equal(body.text.format.strict, true);
    assert.deepEqual(body.text.format.schema, resumeSchema);
    assert.equal(JSON.parse(body.input).resume, text);
    assert.match(body.instructions, /Never invent/);
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
  const request = await fixture(t, () => assert.fail("must not call OpenAI"));
  assert.equal((await request("import", { text: "short" })).status, 400);
  assert.equal((await request("import", { text: "x".repeat(60001) })).status, 400);
  assert.equal((await request("cover-letter", { text, job: "", company: "Acme" })).status, 400);
  assert.equal((await request("other")).status, 404);
});

test("reports missing credentials and enforces request limits", async t => {
  const missing = await fixture(t, () => assert.fail("must not call OpenAI"), { getKey: () => "" });
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
    [async () => new Response(JSON.stringify({ status: "incomplete", output: [] })), 502],
    [async () => new Response(JSON.stringify({ status: "completed", output: [{ content: [{ type: "refusal", refusal: "private provider data" }] }] })), 422],
    [async () => new Response("test-only-secret private provider data", { status: 401 }), 503],
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
    if (body.text.format.name === "summary") return response({ summary: "Engineer experienced in building tools." });
    assert.equal(JSON.parse(body.input).jobDescription, "Build accessible tools.");
    return response({ letter: "Dear Acme team,\nI am applying for the Engineer role." });
  });
  assert.equal((await (await request("summary")).json()).summary, "Engineer experienced in building tools.");
  assert.match((await (await request("cover-letter", { text, job: "Engineer", company: "Acme", jobDescription: "Build accessible tools." })).json()).letter, /Dear Acme/);
});
