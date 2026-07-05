# 03 — Functions & APIs

> Your data has a home and your users have identities. Now you need the layer that connects the outside world to your logic: an **API**. This module teaches how HTTP actually works, how to design REST endpoints, how to validate every input, and how to fail gracefully — using plain functions you could run on any host.

**Prerequisites:** [Module 01 — Data & Storage](01-data-and-storage.md) and [Module 02 — Auth & Users](02-auth-and-users.md).

## Learning objectives

By the end of this module you will be able to:

- Explain the parts of an HTTP request and response.
- Map operations to HTTP **methods** and **status codes** correctly.
- Build a small REST API with plain handler **functions**.
- **Validate** every incoming request at the boundary and reject bad input clearly.
- Handle errors so the client gets a useful message and secrets never leak.
- Recognize the different ways a function is **triggered** (HTTP, scheduled/cron, events/webhooks) and make webhook handlers **idempotent**.
- Explain what **serverless functions**, **environment variables**, and **CORS** are and when each matters.

## HTTP, from the ground up

Everything your frontend, your mobile app, or another service does with your backend travels over **HTTP**. An HTTP exchange is a request and a response, both plain text with a defined shape.

A **request** has:

- A **method** — the verb: `GET`, `POST`, `PUT`, `PATCH`, `DELETE`.
- A **path** — what you're addressing: `/notes/42`.
- **Headers** — metadata: `Content-Type: application/json`, `Authorization: …`, `Cookie: …`.
- Optionally a **body** — data you're sending, usually JSON.

A **response** has:

- A **status code** — a three-digit outcome: `200`, `404`, `500`.
- **Headers** — metadata about the response.
- Optionally a **body** — the data you're returning.

That's the whole protocol at the level you need. Everything else is convention layered on top — and the most important convention is REST.

## REST in one section

**REST** is a style for designing HTTP APIs around **resources** (nouns) and the standard methods (verbs). Instead of inventing endpoint names like `/getNotes` and `/createNoteNow`, you model resources and let the method express the action:

| Intent | Method | Path | Meaning |
|--------|--------|------|---------|
| List notes | `GET` | `/notes` | Read the collection |
| Get one note | `GET` | `/notes/42` | Read one resource |
| Create a note | `POST` | `/notes` | Add to the collection |
| Replace a note | `PUT` | `/notes/42` | Full update |
| Update part of a note | `PATCH` | `/notes/42` | Partial update |
| Delete a note | `DELETE` | `/notes/42` | Remove it |

Two properties are worth internalizing:

- **Safe** methods (`GET`) don't change anything. A `GET` should never create or delete data. Search engines, browsers, and caches assume this.
- **Idempotent** methods (`GET`, `PUT`, `DELETE`) produce the same result whether called once or five times. `DELETE /notes/42` twice leaves the same end state. `POST` is *not* idempotent — two `POST`s create two notes. This matters when a client retries after a dropped connection.

### Status codes that actually communicate

Return the code that tells the truth. Clients (and future-you) rely on them.

- **2xx — success.** `200 OK` (general success), `201 Created` (a `POST` made a new resource), `204 No Content` (success, nothing to return — e.g. a `DELETE`).
- **4xx — the client's fault.** `400 Bad Request` (malformed/invalid input), `401 Unauthorized` (not logged in), `403 Forbidden` (logged in, not allowed), `404 Not Found`, `409 Conflict` (e.g. duplicate email), `422 Unprocessable Entity` (well-formed but semantically invalid), `429 Too Many Requests` (rate limited).
- **5xx — the server's fault.** `500 Internal Server Error` (something broke), `503 Service Unavailable` (temporarily down).

The single most common mistake is returning `200` with an error message in the body. Don't. If it failed, say so with the status code — that's what it's for.

## Worked example: a small REST API

Here's a `/notes` resource built with Express (a minimal, ubiquitous HTTP framework). The same shape works with any framework, or with Node's built-in `node:http` — the [`ai-app-starter`](../starter-kits/ai-app-starter/) kit shows the zero-dependency version. The concepts, not the framework, are the point.

```ts
import express from "express";
import { requireAuth } from "./auth";   // from Module 02

const app = express();
app.use(express.json());                // parse JSON request bodies

// List the current user's notes
app.get("/notes", requireAuth(db), (req, res) => {
  const notes = db
    .prepare("SELECT id, title, created_at FROM notes WHERE user_id = ? ORDER BY created_at DESC")
    .all(req.user.id);
  res.status(200).json(notes);
});

// Get one note (scoped to the owner — see Module 02)
app.get("/notes/:id", requireAuth(db), (req, res) => {
  const note = db
    .prepare("SELECT * FROM notes WHERE id = ? AND user_id = ?")
    .get(req.params.id, req.user.id);
  if (!note) return res.status(404).json({ error: "Note not found" });
  res.status(200).json(note);
});

// Create a note
app.post("/notes", requireAuth(db), (req, res) => {
  const { title, body } = req.body ?? {};

  // Validate at the boundary (see next section)
  if (typeof title !== "string" || title.trim().length === 0) {
    return res.status(400).json({ error: "title is required" });
  }
  if (title.length > 200) {
    return res.status(400).json({ error: "title must be 200 characters or fewer" });
  }

  const info = db
    .prepare("INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)")
    .run(req.user.id, title.trim(), typeof body === "string" ? body : "");

  res.status(201).json({ id: info.lastInsertRowid, title: title.trim() });
});

// Delete a note
app.delete("/notes/:id", requireAuth(db), (req, res) => {
  const info = db
    .prepare("DELETE FROM notes WHERE id = ? AND user_id = ?")
    .run(req.params.id, req.user.id);
  if (info.changes === 0) return res.status(404).json({ error: "Note not found" });
  res.status(204).end();   // success, no body
});

app.listen(3000, () => console.log("API on http://localhost:3000"));
```

Read the status codes: `201` on create, `204` on delete, `404` when a scoped lookup finds nothing, `400` on bad input. Each one is a small, honest signal to the client.

## Validate everything at the boundary

**Never trust input.** Every request could be malformed, malicious, or just buggy. The rule: **validate at the edge, before the data touches your logic or database.** Once data is past the boundary, your code should be able to assume it's well-shaped.

Hand-written checks (like the `title` checks above) are fine for one field. For anything larger, use a schema-validation library — **Zod** (TypeScript) and **Pydantic** (Python) are the popular, well-maintained choices — which validates and gives you typed, trusted data in one step:

```ts
import { z } from "zod";

const CreateNote = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(50_000).optional().default(""),
});

app.post("/notes", requireAuth(db), (req, res) => {
  const parsed = CreateNote.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Invalid input", details: parsed.error.issues });
  }
  const { title, body } = parsed.data; // clean, typed, trusted
  // …insert…
});
```

Validation is also a security control: it's where you enforce length limits (to stop giant payloads), types (to stop surprises), and allowed values. Pair it with the parameterized queries from Module 01 and the auth scoping from Module 02, and you've closed the most common holes.

## Handle errors on purpose

Two failures happen in every real API: **expected** errors (bad input, not found, conflict) and **unexpected** ones (a bug, a downed dependency). Handle both deliberately.

- **Expected errors:** return the right 4xx with a short, clear message the client can act on.
- **Unexpected errors:** catch them, log the full detail *server-side* for yourself, and return a generic `500` to the client. **Never** send raw exception text, stack traces, or SQL errors to the client — they leak internal structure to attackers and confuse honest users.

A single catch-all error handler keeps this consistent:

```ts
// Registered last. Any error thrown in a handler lands here.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);          // full detail stays server-side
  res.status(500).json({ error: "Something went wrong" }); // generic for the client
});
```

Wrap risky operations and translate known failures into the right code — for example, a unique-constraint violation on `email` becomes a `409 Conflict`, not a `500`.

## Triggers: not every function runs from a web request

So far every handler runs because a browser made an HTTP request. But the same "a function runs in response to something" model covers more than web traffic. As you build real apps you'll meet several **trigger types**, and recognizing them keeps you from forcing everything through an HTTP endpoint:

- **HTTP** — the default: a client calls your endpoint. Everything above.
- **Scheduled (cron)** — a function runs on a timer: nightly cleanup, a daily digest email, refreshing cached data every hour. You write the same kind of handler; the platform (or a cron daemon, or a scheduler) invokes it on a schedule instead of on a request.
- **Event / webhook** — a function runs when *another system* notifies you. A payment provider calls your **webhook** URL when a charge succeeds; a queue delivers a job for background processing; a file upload fires an event. Your handler receives the event payload and reacts.

The handler shape is identical across all three — input in, work done, result out. What changes is *who pulls the trigger*.

### Background work

Some tasks are too slow to do inside a request the user is waiting on — sending email, transcoding a file, calling a slow AI model over a large document. The pattern: the HTTP handler validates the request, enqueues a job (or records it in a table), returns quickly (often `202 Accepted`), and a separate worker/queue-triggered function does the slow work afterward. The user isn't blocked; the work still happens reliably.

### Making webhooks idempotent

Webhooks (and queues) come with a catch: the sender may deliver the **same event more than once** — networks retry, and "at-least-once delivery" is the norm. If your handler charges a card or sends an email every time it's called, duplicate deliveries mean duplicate charges. The fix is **idempotency**: design the handler so processing the same event twice has the same effect as processing it once.

The standard technique: every event carries a unique id; record processed ids and skip duplicates.

```ts
app.post("/webhooks/payments", (req, res) => {
  const eventId = req.body?.id;
  if (typeof eventId !== "string") return res.status(400).json({ error: "missing id" });

  // Have we already handled this exact event? A UNIQUE constraint makes this race-safe.
  const inserted = db
    .prepare("INSERT OR IGNORE INTO processed_events (event_id) VALUES (?)")
    .run(eventId);

  if (inserted.changes === 0) {
    return res.status(200).end(); // already processed — acknowledge and do nothing
  }

  handlePayment(req.body); // safe to run exactly once
  res.status(200).end();     // 200 tells the sender to stop retrying
});
```

Also **verify the webhook is genuine** — real webhook providers sign their requests; check the signature so an attacker can't POST fake events to your endpoint. (Verifying the signature is authentication for machine-to-machine calls, the server-side cousin of Module 02.)

## Three concepts you'll meet immediately

### Environment variables

Configuration and secrets — database URLs, API keys, the session secret — must **not** live in your code. Hard-coding a key means it ends up in git history and leaks. Instead, read them from the **environment** at runtime:

```ts
const apiKey = process.env.LLM_API_KEY;
if (!apiKey) throw new Error("LLM_API_KEY is not set");
```

Locally you keep them in a `.env` file (which is **git-ignored**) and commit a `.env.example` listing the *names* with placeholder values so others know what to set. In production the host provides them. This one habit — secrets in the environment, never in code — prevents a huge share of real leaks, and it's exactly what makes the Module 04 LLM client vendor-neutral: swap the provider by changing env vars, not code.

### Serverless functions

You don't always run a long-lived server. A **serverless function** (also "cloud function" / "edge function") is a single handler the platform runs on demand — it spins up when a request arrives and disappears after. You write the same kind of function; the platform handles scaling and servers. The trade-offs: you don't manage infrastructure, but functions are stateless (keep no in-memory state between calls) and can have a "cold start" delay. The REST handlers above map almost directly onto serverless functions. We'll return to hosting choices in [Module 05](05-deploy.md).

### CORS

Browsers enforce the **same-origin policy**: by default, a page served from `app.example.com` may not make requests to `api.example.com`. **CORS** (Cross-Origin Resource Sharing) is how your API *opts in* to being called from other origins, by sending headers that name the allowed origins:

```ts
import cors from "cors";
app.use(cors({ origin: "https://app.example.com", credentials: true }));
```

If your frontend and API are on different domains and you see requests failing with a "CORS" error in the browser console, this is why. Note that CORS is a *browser* protection, not a substitute for auth — server-to-server calls ignore it entirely, so it never replaces the authorization checks from Module 02.

## Hands-on exercise

Build a REST API for the task tracker, on top of your data (Module 01) and auth (Module 02).

1. Implement these endpoints, all scoped to the authenticated user:
   - `GET /projects` — list, `POST /projects` — create, `DELETE /projects/:id`.
   - `GET /projects/:id/tasks` — list tasks in a project, `POST /projects/:id/tasks` — create a task, `PATCH /tasks/:id` — mark done/undone, `DELETE /tasks/:id`.
2. Return the **correct status code** for each outcome: `201` on create, `204` on delete, `404` for missing/unowned resources, `400` for invalid input.
3. **Validate** every request body (a validation library or hand-written checks). Reject empty titles and oversized fields with `400`.
4. Add a catch-all error handler that logs server-side and returns a generic `500`.
5. Read a config value (e.g. a `PORT`) from an environment variable, with a `.env.example` documenting it.
6. Test it end-to-end with `curl` or an HTTP client: create a project, add tasks, mark one done, list them, delete one. Then confirm you get a `404` (not a `403` leak, not another user's data) when you request a task id that belongs to a different user.

**Stretch:** (a) add pagination to the list endpoints (`?limit=&offset=`), and a `429` rate limit on `POST` routes. (b) Add a **scheduled** function that runs daily and deletes tasks completed more than 30 days ago (invoke it manually to test). (c) Add a `POST /webhooks/demo` endpoint that is **idempotent** — record processed event ids and confirm that delivering the same event id twice only takes effect once.

## Check yourself

1. **Why should a `GET` request never create or modify data?**
   `GET` is defined as *safe*: clients, browsers, caches, and crawlers assume it has no side effects and may call it freely or repeatedly. A `GET` that mutates data will cause surprising, hard-to-debug behavior.

2. **A client sends invalid JSON and your API returns `200` with `{ "error": "bad input" }`. What's wrong, and what should it return?**
   Returning `200` for a failure is dishonest — the client's success check will pass. It should return `400 Bad Request` (the input was malformed/invalid) with the error message.

3. **What's the difference between `401`, `403`, and `404` when a user requests a resource they don't own?**
   `401` = not authenticated. `403` = authenticated but not allowed. For a resource a user doesn't own, returning `404` (as if it doesn't exist) is often best — it avoids revealing that the id exists at all.

4. **Where should input validation happen, and why there?**
   At the boundary, before the data reaches your business logic or database. That way the rest of your code can trust the data's shape, and you enforce security limits (types, lengths, allowed values) in one place.

5. **Why must API keys and database URLs come from environment variables rather than the source code?**
   Hard-coded secrets get committed to version control and leak. Environment variables keep secrets out of the codebase and let you change configuration per environment without editing code.

6. **You're getting a CORS error calling your API from a browser app on a different domain. What is CORS actually doing, and is it protecting your data?**
   CORS is the browser's same-origin policy asking your API to explicitly allow the other origin. It's a browser-side guard, not server-side authorization — it does not protect your data from non-browser clients, so you still need real auth checks.

7. **A payment provider sends you the same "charge succeeded" webhook twice. Why does that happen, and how do you keep from charging the user twice?**
   Webhook/event delivery is typically at-least-once, so retries can redeliver an event. Make the handler idempotent: record each event's unique id and skip any id you've already processed, so handling it twice has the same effect as once.

8. **You need to send a confirmation email that takes several seconds. Why not do it inside the request handler, and what's the pattern instead?**
   Blocking the request makes the user wait and ties up the handler. Instead, validate and enqueue the work, return quickly (e.g. `202 Accepted`), and let a separate worker or scheduled/queue-triggered function do the slow part.

## What's next

You have an API. Time for the part everyone came for: [**04 — AI & Agents**](04-ai-and-agents.md) — calling a language model behind an environment variable, getting structured output you can trust, giving the model tools, and building a small agent loop.
