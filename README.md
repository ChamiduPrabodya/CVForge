# CVForge

A React resume builder with an Express/MongoDB backend and Gemini-assisted CV import and writing.

## Project layout

```text
client/                      Frontend
  src/
    main.tsx                 React entry point
    app/App.tsx              App state, pages, builder, and resume previews
    components/PhotoEditor.tsx Reusable photo editor
    features/resume/         CV upload, text extraction, and basic parsing
    services/ai.ts           Browser requests to the AI API
    config/api.ts            Frontend API address
    types/resume.ts          Resume, template, and account types
    styles/global.css        App and template styling
  tests/                     Resume parsing and file validation tests
  index.html                 Browser entry point
  vite.config.ts             Vite dev server, build, and API proxy
  tsconfig*.json             Frontend and Vite TypeScript settings
  dist/                      Generated production build (ignored)
server/                      Backend (MVC-style modules)
  src/
    server.js                Database initialization and HTTP startup
    app.js                   Express app and middleware setup
    config/                  Environment, runtime settings, database, and project paths
    routes/                  API endpoints grouped by feature
    controllers/             Request handlers for each feature
    models/                  MongoDB schemas and models
    middleware/              Authentication, parameter validation, and errors
    services/                Authentication helpers and Gemini requests
    validators/              Credentials, CV, and template validation
    seeds/                   Administrator and bundled-template initialization
  tests/                     API, configuration, and database integration tests
shared/templates/            JSON templates used by frontend and backend
scripts/                     Development launcher and admin maintenance
docs/ai.md                   Gemini configuration and troubleshooting
package.json                 Shared dependencies and development commands
```

`node_modules/` contains installed dependencies, `client/dist/` contains the production
build, and `tmp/` holds local diagnostics, screenshots, logs, and archived generated
files. These are working artifacts, not application source. `client/vite.config.ts` is the
single Vite configuration; type checking does not emit duplicate root config files.

## Run locally

Use Node.js 24 or newer and an available MongoDB instance. Run `npm install` once
at the project root. Both folders use the root package and lockfile; run the commands below there.
Keep local settings in `.env.local` at the project root. See `.env.example` for server and AI
settings. The server also reads `.env` as a fallback.

- `npm run dev` starts both frontend and backend.
- `npm run dev:web` starts only Vite.
- `npm run dev:api` starts only the backend with automatic reload.
- `npm start` starts the backend without file watching.
- `npm run test:integration` runs the MongoDB workflow checks against a local database.
- `npm test` runs unit and API tests without paid AI requests.
- `npm run typecheck` checks frontend and Vite configuration types.
- `npm run build` checks types and builds the frontend into `client/dist/`.
- `npm run preview` serves the built frontend; the backend must also be running.
- `npm run reset:admin` resets the administrator password using local settings.

In Windows PowerShell, use `npm.cmd` if execution policy blocks `npm.ps1`.
Development normally runs at `http://localhost:5173`, with the backend at
`http://localhost:4000`. Browser requests use `/api`, forwarded by Vite to the backend.

## Tests

The API tests are in `server/tests/`. Database tests cover accounts, CV ownership,
sharing, feedback, custom templates, and admin template management. They use isolated
temporary databases on a local MongoDB instance and are skipped by `npm test` unless
`RUN_MONGO_TESTS=1` is set.

```powershell
npm.cmd run test:integration
```

See [AI configuration](docs/ai.md) for Gemini settings. Keep API keys in
Git-ignored `.env.local`; never put them in frontend code or `VITE_` variables.
See [backend setup and API reference](docs/backend.md) for routes, database tests,
administrator setup, and production environment settings.

## Resume pages

Long resumes automatically continue onto additional pages in the builder, PDF
download, and print output. All templates use the same pagination code in
`client/src/features/resume/`. It measures rendered text, preserves each column's
order, repeats section headings on continuation pages, and splits oversized
descriptions without dropping text. The page count updates as the resume changes.
A4 and US Letter follow the selected template's page size.

The optional browser regression check is `node client/tests/pagination.browser.mjs`
with the development website running and Playwright/Chromium available. Set
`PLAYWRIGHT_MODULE` and `CHROME_PATH` if using an existing browser tooling install.
It checks content preservation, page overflow, PDF page counts, and printing for
all bundled templates plus custom layouts. `PAGINATION_CASE=short` checks single-page
resumes; `PAGINATION_CASE=oversized` checks entries longer than one page.
`CHECK_EDITING=1` with the short case also checks mobile editing and export.
The browser checks stub AI and catalog responses and make no paid API calls.
