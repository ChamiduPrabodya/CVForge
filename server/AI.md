# OpenAI features

CV import, summary improvement, and cover letters call the server's `/api/ai` routes.
The browser sends resume text; it never receives the API key. PDF and DOCX text
extraction still happens locally. Scanned documents require pasted text.

Put `OPENAI_API_KEY` and optionally `OPENAI_MODEL` in `.env.local`, following
`.env.example`. The default model is `gpt-4.1-mini`. `.env.local` is ignored by Git.
Restart `npm.cmd run dev` after changing these settings. Do not put secrets in
variables prefixed with `VITE_` or the tracked `.env` file.

The integration uses the [Responses API with structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
validates returned fields, and sets `store: false`. Import preserves supplied facts;
writing prompts prohibit invented credentials and accomplishments. Users should
review all generated content.

Requests time out after 55 seconds. Each server process allows three concurrent
AI requests and ten requests per client IP per ten minutes. For deployments with
multiple server instances, use a shared rate limiter and configure trusted proxies
for the actual hosting environment.

HTTP 429 can mean an OpenAI rate limit or exhausted billing/quota. The UI reports
the failure and offers basic import without claiming AI succeeded. Check the
OpenAI project's limits and API billing if this continues.

Validation: `node --test server/ai.test.js server/resumeImport.test.js server/templates.test.js`
and `npm.cmd run build`. Automated AI tests stub the provider and never incur API charges.
