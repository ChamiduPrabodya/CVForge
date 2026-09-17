import assert from "node:assert/strict";
import { test } from "node:test";
import { requestGemini } from "../services/gemini.js";

const url = "https://generativelanguage.googleapis.com/test";
const options = () => ({ method: "POST", body: "synthetic input", signal: AbortSignal.timeout(55000) });

test("recovers from a temporary Gemini failure while preserving the request and deadline", async () => {
  const request = options();
  let calls = 0;
  let waitMs;
  const result = await requestGemini(url, request, {
    fetchImpl: async (target, received) => {
      assert.equal(target, url);
      assert.equal(received, request);
      return ++calls === 1 ? new Response("busy", { status: 503, headers: { "Retry-After": "2" } }) : new Response("recovered");
    },
    wait: async (ms, _value, settings) => { waitMs = ms; assert.equal(settings.signal, request.signal); },
  });
  assert.equal(calls, 2);
  assert.equal(waitMs, 2000);
  assert.equal(await result.text(), "recovered");
});

test("stops after one retry when Gemini stays unavailable", async () => {
  let calls = 0;
  const result = await requestGemini(url, options(), { fetchImpl: async () => { calls++; return new Response("busy", { status: 503 }); }, wait: async () => {} });
  assert.equal(calls, 2);
  assert.equal(result.status, 503);
});

test("uses the backup endpoint only for the bounded retry", async () => {
  const backup = "https://generativelanguage.googleapis.com/backup";
  const request = options();
  const calls = [];
  const result = await requestGemini(url, request, {
    retryUrl: backup,
    wait: async () => {},
    fetchImpl: async (target, received) => {
      calls.push(target);
      assert.equal(received, request);
      return calls.length === 1 ? new Response("busy", { status: 503 }) : new Response("ok");
    },
  });
  assert.deepEqual(calls, [url, backup]);
  assert.equal(await result.text(), "ok");
});

test("does not retry successful, invalid, unauthorized, quota, or unknown-outcome requests", async () => {
  for (const status of [200, 400, 401, 403, 404, 413, 429]) {
    let calls = 0;
    const result = await requestGemini(url, options(), { retryUrl: "https://generativelanguage.googleapis.com/backup", fetchImpl: async () => { calls++; return new Response("body", { status }); }, wait: () => assert.fail("must not wait") });
    assert.equal(calls, 1);
    assert.equal(result.status, status);
  }
  let calls = 0;
  await assert.rejects(requestGemini(url, options(), { fetchImpl: async () => { calls++; throw new TypeError("network failed"); }, wait: () => assert.fail("must not wait") }), /network failed/);
  assert.equal(calls, 1);
});

test("respects long Retry-After values and does not run beyond an aborted deadline", async () => {
  for (const retryAfter of ["60", new Date(Date.now() + 60000).toUTCString()]) {
    let calls = 0;
    const result = await requestGemini(url, options(), { fetchImpl: async () => { calls++; return new Response("busy", { status: 503, headers: { "Retry-After": retryAfter } }); }, wait: () => assert.fail("must not wait") });
    assert.equal(calls, 1);
    assert.equal(result.headers.get("retry-after"), retryAfter);
  }
  const controller = new AbortController();
  let calls = 0;
  await assert.rejects(requestGemini(url, { ...options(), signal: controller.signal }, { fetchImpl: async () => { calls++; return new Response("busy", { status: 503 }); }, wait: async () => controller.abort() }), { name: "AbortError" });
  assert.equal(calls, 1);
});
