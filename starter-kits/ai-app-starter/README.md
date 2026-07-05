# AI App Starter

A minimal, **vendor-neutral** full-stack AI app you can clone and build on in a weekend. It's the reference scaffold for the [AI Builders Curriculum](../../curriculum/) and a solid starting point for a hackathon project.

It deliberately stays small and dependency-light so you can read the *entire* thing and understand it, then extend it however you like.

## What's in the box

A tiny **AI Notes** app that demonstrates the whole stack the curriculum teaches:

- A **relational database** (SQLite) with a hand-rolled **migration runner** — *module 01*.
- An **HTTP/JSON API** built on Node's built-in server, with validation and honest status codes — *module 03*.
- An **LLM integration** behind an environment-variable API key, **provider-agnostic** — *module 04*.
- A **tiny frontend** (plain HTML/CSS/JS, no build step) that talks to the API.
- A **health check** and clean separation of config from code, ready to deploy — *module 05*.

Create a note, click **Summarize**, and the backend calls a language model to summarize it. Swap the model provider by editing three environment variables.

## Prerequisites

- **Node.js 18 or newer** (it uses the built-in `fetch`). Check with `node --version`.
- That's it. No database server to install — SQLite is a single file.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Create your local config from the template
cp .env.example .env

# 3. Run it. The default .env uses LLM_OFFLINE=1, so it works with NO API key —
#    the summarize feature returns a canned response until you add a real one.
npm run dev

# 4. Open http://localhost:3000
```

To use a **real** model, edit `.env`:

```bash
LLM_BASE_URL=https://api.your-provider.example/v1   # any OpenAI-compatible endpoint, or a local server
LLM_API_KEY=your-real-key
LLM_MODEL=your-model-name
LLM_OFFLINE=0
```

Then restart. Nothing else in the code changes — that's the point of keeping the provider in config.

## Project structure

```
ai-app-starter/
├── package.json          # scripts + dependencies
├── tsconfig.json         # TypeScript config (run directly with tsx, no build step)
├── .env.example          # copy to .env and fill in
├── server/
│   ├── index.ts          # the HTTP server + routes (node:http, no framework)
│   ├── db.ts             # SQLite connection + migration runner
│   ├── llm.ts            # provider-agnostic LLM client — the ONLY vendor-aware file
│   ├── migrate.ts        # `npm run migrate` entry point
│   └── migrations/
│       └── 001_init.sql  # the initial schema
└── web/
    ├── index.html        # the UI
    ├── styles.css        # plain CSS (light + dark)
    └── app.js            # frontend logic (fetch + render)
```

## The API

The frontend uses these; you can too, with `curl` or any HTTP client.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/api/health` | — | `{ status, time }` |
| `GET` | `/api/notes` | — | array of notes (newest first) |
| `POST` | `/api/notes` | `{ title, body }` | `201` + the created note |
| `POST` | `/api/notes/:id/summarize` | — | `200` + the note with an AI `summary` |
| `DELETE` | `/api/notes/:id` | — | `204` |

Try it:

```bash
curl -s localhost:3000/api/health
curl -s -X POST localhost:3000/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"Standup","body":"Shipped the login flow; blocked on the payments webhook."}'
curl -s -X POST localhost:3000/api/notes/1/summarize
```

## Scripts

- `npm run dev` — start with auto-reload on file changes.
- `npm start` — start once (what you'd run in production).
- `npm run migrate` — apply database migrations without booting the app.
- `npm run typecheck` — type-check the server code.

## How this maps to the curriculum

Each part of this kit is the concrete version of a lesson. Read the lesson, then read the code:

| Curriculum module | Where to look here |
|-------------------|--------------------|
| [01 — Data & Storage](../../curriculum/01-data-and-storage.md) | `server/db.ts`, `server/migrations/` |
| [02 — Auth & Users](../../curriculum/02-auth-and-users.md) | *not included* — add it (see "Where to take it next") |
| [03 — Functions & APIs](../../curriculum/03-functions-and-apis.md) | `server/index.ts` |
| [04 — AI & Agents](../../curriculum/04-ai-and-agents.md) | `server/llm.ts`, the `summarize` route |
| [05 — Deploy](../../curriculum/05-deploy.md) | `/api/health`, env-var config, `.gitignore` |

## Where to take it next

This is a starting point, not a finished product. Good next moves, roughly in order:

1. **Add users and auth** (module 02): create a `users` table, add a `user_id` foreign key to `notes`, hash passwords, issue sessions, and scope every query to the logged-in user.
2. **Turn summarize into structured extraction** (module 04): return `{ title, action_items, sentiment }` as validated JSON instead of a plain summary.
3. **Add a tool-using agent** (module 04): a `/api/ask` endpoint that can search your notes and answer questions about them.
4. **Swap SQLite for Postgres** when you outgrow a file — change only `server/db.ts`.
5. **Deploy it** (module 05): containerize with a `Dockerfile`, set your secrets on a host, and get a public URL.

## License

MIT, © AI Builders Foundation. Use it, teach it, remix it.
