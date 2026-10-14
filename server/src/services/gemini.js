import { setTimeout as delay } from "node:timers/promises";

const transientStatuses = new Set([408, 500, 502, 503, 504]);

// Retry one explicit temporary failure, sharing the caller's original deadline.
// Never repeat rejected credentials, invalid requests, quota errors, or a request
// whose network outcome is unknown.
export async function requestGemini(url, options, { fetchImpl = fetch, wait = delay, retryUrl = url } = {}) {
  let response = await fetchImpl(url, options);
  if (!transientStatuses.has(response.status)) return response;

  const retryAfter = response.headers.get("Retry-After");
  const retrySeconds = retryAfter === null ? NaN : Number(retryAfter);
  const retryDate = retryAfter === null ? NaN : Date.parse(retryAfter);
  const retryMs = Number.isFinite(retrySeconds) ? retrySeconds * 1000 : Number.isFinite(retryDate) ? retryDate - Date.now() : 1000 + Math.random() * 250;
  // Longer delays are returned to the user instead of extending an import indefinitely.
  if (retryMs > 5000) return response;

  await response.body?.cancel();
  await wait(Math.max(0, retryMs), undefined, { signal: options.signal });
  options.signal?.throwIfAborted();
  response = await fetchImpl(retryUrl, options);
  return response;
}
