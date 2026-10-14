# Backend

The Express API uses MongoDB for accounts, CVs, templates, review links, and
feedback. The React app already calls these endpoints through `/api`.

## Architecture and paths

Backend source lives in `server/src/`. `server.js` connects to MongoDB and starts
HTTP; `app.js` assembles Express middleware and the API router. Routes delegate to
feature controllers, which use the models in `models/`. Shared authentication and
error handling live in `middleware/`; reusable logic lives in `services/` and
`validators/`. Database initialization is in `config/database.js` and `seeds/`.
Tests stay in `server/tests/`.

`server/src/config/paths.js` resolves the project root from its module URL and
provides shared paths for scripts. Environment loading always uses the root
`.env.local` first, then the root `.env`, regardless of the shell's working
directory. Keep these files at the project root. Template imports are relative to
their source modules. No application paths depend on a particular Windows user
or drive. The public API URLs and frontend API configuration stay the same.

## Local setup

Use Node.js 24+ and start MongoDB. Keep settings in the root `.env.local`:

```dotenv
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/cvforge
CLIENT_ORIGIN=http://localhost:5173
JWT_SECRET=replace-with-a-random-secret-at-least-32-characters-long
```

Use `.env.example` for the complete list. Do not overwrite existing local AI keys.
Run `npm run dev` for the frontend and API, or `npm run dev:api` for the API alone.
`npm start` runs the API without file watching. The API waits for MongoDB, seeds
bundled templates, and initializes indexes before accepting requests. It disconnects
from MongoDB on shutdown and exits with an error if startup fails.

In development, the existing default administrator is `admin@cvforge.local` with
password `ChangeThisAdminPassword123!`. Override `ADMIN_EMAIL` and `ADMIN_PASSWORD`
to use your own credentials. In production, an administrator is created only when
both settings are supplied. Changing these settings does not reset an existing
account; use `npm run reset:admin` for that.

## API

Authenticated requests require `Authorization: Bearer <token>`. Registration and
login return `{ token, user }`; tokens expire after seven days. Every protected
request checks that the account still exists and uses its current database role.
Registration passwords must contain at least eight characters and fit within
bcrypt's 72-byte UTF-8 limit.

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/api/health` | Public | 200 when MongoDB is connected, otherwise 503 |
| POST | `/api/auth/register` | Public | Register with `{ email, password }` |
| POST | `/api/auth/login` | Public | Sign in with `{ email, password }` |
| GET | `/api/auth/me` | Account | Read the signed-in user |
| GET | `/api/dashboard` | Account | Count owned CVs and custom templates |
| GET | `/api/cvs` | Account | List owned CVs |
| GET | `/api/cvs/:documentId` | Owner | Read a saved CV |
| PUT | `/api/cvs/:documentId` | Account | Save `{ document }` under the current account |
| DELETE | `/api/cvs/:documentId` | Owner | Delete a CV and its sharing/review data |
| POST | `/api/cvs/:documentId/share` | Owner | Enable sharing and return `{ token }` |
| DELETE | `/api/cvs/:documentId/share` | Owner | Disable the review link |
| GET | `/api/shared/:token` | Public link | Read a shared CV and feedback |
| POST | `/api/shared/:token/reviews` | Public link | Add `{ name, message }` feedback |
| GET | `/api/templates/public` | Public | List published system templates |
| GET | `/api/templates` | Account | List owned custom templates |
| PUT | `/api/templates/:templateId` | Account | Save `{ template }` under the current account |
| DELETE | `/api/templates/:templateId` | Owner | Delete a custom template |
| GET | `/api/admin/overview` | Admin | Read platform counts and recent users |
| GET | `/api/admin/users` | Admin | List accounts |
| PATCH | `/api/admin/users/:id` | Admin | Set `{ role: "user" or "admin" }` |
| DELETE | `/api/admin/users/:id` | Admin | Delete an account and its CVs/templates |
| GET | `/api/admin/cvs` | Admin | List up to 100 recent CVs |
| DELETE | `/api/admin/cvs/:id` | Admin | Delete a CV by its MongoDB ID |
| GET | `/api/admin/system-templates` | Admin | List all active system templates, including drafts |
| PUT | `/api/admin/system-templates/:templateId` | Admin | Create/update `{ template }` |
| DELETE | `/api/admin/system-templates/:templateId` | Admin | Permanently hide a system template |

AI import, summary, and cover-letter endpoints are documented in [ai.md](ai.md).
AI tests use fake provider responses and do not spend API credits.

CV and template IDs start with a letter or digit and use up to 128 letters, digits,
underscores, or hyphens. A CV requires a nonempty `name`; known fields are validated
before saving. If its `id` is supplied, it must match the URL. Templates require
`name`, `category`, and `style`, and their IDs must also match the URL when supplied.
CV reads and saves return `{ document, updatedAt }`. Deletes return 204. A PUT is
scoped to the current account, so two users can independently use the same ID.

Sharing is opt-in. A shared response excludes the imported source text and original
photo, while retaining the edited photo used in the CV. Re-enabling sharing reuses
the existing token. Feedback names are limited to 80 characters and messages to
2,000 characters. Disabling sharing blocks both reading and posting feedback.

API errors return `{ error: "message" }`. Malformed JSON returns 400, payloads over
16 MB return 413, authentication failures return 401, denied admin access returns
403, missing resources return 404, and duplicate records return 409. Responses
disable caching, and errors do not expose request bodies or database internals.

## Verification

```powershell
npm.cmd test
npm.cmd run build
npm.cmd run test:integration
```

The integration command requires a running MongoDB on `127.0.0.1:27017`.
Set `MONGO_TEST_PORT` to test a separate local instance. It creates uniquely named
`cvforge_backend_test_*` and `cvforge_template_test_*` databases and drops only
those databases afterward. It never uses the application's `MONGODB_URI`.

The database checks cover registration, hashed passwords, login, expired sessions,
ownership boundaries, CV updates/deletion, concurrent review links, private upload
redaction, feedback, share revocation, custom templates, dashboard counts, deleted
accounts, administrator authorization, and system-template persistence across a
database reconnect. `npm test` skips database checks unless `RUN_MONGO_TESTS=1`.

## Production settings

Set `NODE_ENV=production`, `MONGODB_URI`, a random `JWT_SECRET` of at least 32
characters, and `CLIENT_ORIGIN` to the exact frontend origin. Production startup
rejects the development signing secret and a missing frontend origin. Set
`VITE_API_URL` to the API address when the frontend is hosted separately; frontend
environment values are applied when building. Use HTTPS at your hosting layer.
