# Gemini AI features

CV import, summary improvement, and cover letters call the server's `/api/ai` routes.
The browser sends resume text; it never receives the API key. PDF and DOCX text
extraction still happens locally. Scanned documents require pasted text.

Put `GEMINI_API_KEY` and optionally `GEMINI_MODEL` in `.env.local`, following
`.env.example`. The default model is `gemini-3.6-flash`. `.env.local` is ignored by Git.
Restart `npm.cmd run dev` after changing these settings. Do not put secrets in
variables prefixed with `VITE_` or the tracked `.env` file.

Use `VITE_API_URL=/api` for local development and preview. Vite forwards `/api`
to the backend on `127.0.0.1`, using the configured `PORT` (default 4000).
This lets browsers use the website's address instead of contacting their own
`localhost`. Restart a running preview server after changing proxy settings.
Production hosting must route `/api` to the backend, or set `VITE_API_URL` to
the deployed backend's HTTPS API address before building.

The integration uses [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/generate-content/structured-output)
via `generateContent` and validates returned fields. Import preserves supplied facts;
writing prompts prohibit invented credentials and accomplishments. Users should
review all generated content.

Requests time out after 55 seconds. Each server process allows three concurrent
AI requests and ten requests per client IP per ten minutes. For deployments with
multiple server instances, use a shared rate limiter and configure trusted proxies
for the actual hosting environment.

HTTP 429 can mean a Gemini rate limit or exhausted quota. The UI reports
the failure and offers basic import without claiming AI succeeded. Check the
Google AI Studio project's limits and API billing if this continues. A paid Gemini
chat subscription does not establish whether this project's API has quota.

Keys are sent only in the `x-goog-api-key` header to Google's Generative Language
API; they never appear in URLs, browser code, or server responses. Both standard
and authorization key formats are passed as issued, without prefix assumptions.
The prior OpenAI key and balance are no longer used by these routes.

Validation: `npm test`
and `npm.cmd run build`. Automated AI tests stub the provider and never incur API charges.
