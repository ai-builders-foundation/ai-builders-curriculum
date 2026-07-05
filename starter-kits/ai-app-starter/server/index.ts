/**
 * index.ts — the HTTP server that ties everything together.
 *
 * Built on Node's built-in `node:http` (no web framework) so you can see exactly
 * how a request becomes a response — the concepts from curriculum module 03
 * (Functions & APIs) with nothing hidden. It serves a JSON API under /api/* and
 * the static frontend in web/ for everything else.
 *
 * Routes:
 *   GET    /api/health                 → liveness check
 *   GET    /api/notes                  → list notes (newest first)
 *   POST   /api/notes                  → create a note   { title, body }
 *   POST   /api/notes/:id/summarize    → AI: summarize a note with the LLM
 *   DELETE /api/notes/:id              → delete a note
 *   (anything else)                    → static files from web/
 *
 * The frontend is served from the SAME origin as the API, so we don't need CORS
 * here (see module 03 for when you would). If you split them onto different
 * domains, add CORS headers.
 */

import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { db, runMigrations } from "./db";
import { chat } from "./llm";

const here = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(here, "..", "web");
const PORT = Number(process.env.PORT ?? 3000);

// Make sure the schema exists before we serve any traffic.
runMigrations();

// --- types -------------------------------------------------------------------

interface Note {
  id: number;
  title: string;
  body: string;
  summary: string | null;
  created_at: string;
  updated_at: string;
}

/** A small error carrying an HTTP status, so handlers can throw a clean failure. */
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// --- prepared statements (parameterized — never string-concatenate SQL) ------

const listNotes = db.prepare("SELECT * FROM notes ORDER BY created_at DESC");
const getNote = db.prepare("SELECT * FROM notes WHERE id = ?");
const insertNote = db.prepare("INSERT INTO notes (title, body) VALUES (?, ?)");
const deleteNote = db.prepare("DELETE FROM notes WHERE id = ?");
const setSummary = db.prepare(
  "UPDATE notes SET summary = ?, updated_at = datetime('now') WHERE id = ?"
);

// --- helpers -----------------------------------------------------------------

function sendJson(res: http.ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(body));
}

async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "Request body must be valid JSON");
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

async function serveStatic(res: http.ServerResponse, urlPath: string): Promise<void> {
  const rel = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = normalize(join(WEB_DIR, rel));
  // Guard against path traversal (e.g. "/../server/db.ts").
  if (!filePath.startsWith(WEB_DIR)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }
  try {
    const data = await readFile(filePath);
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] ?? "application/octet-stream" });
    res.end(data);
  } catch {
    sendJson(res, 404, { error: "Not found" });
  }
}

// --- request handler ---------------------------------------------------------

const server = http.createServer(async (req, res) => {
  const method = req.method ?? "GET";
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const path = url.pathname;

  try {
    // Health check — cheap and dependency-light (module 05).
    if (path === "/api/health" && method === "GET") {
      return sendJson(res, 200, { status: "ok", time: new Date().toISOString() });
    }

    // List notes
    if (path === "/api/notes" && method === "GET") {
      return sendJson(res, 200, listNotes.all() as Note[]);
    }

    // Create a note — validate input at the boundary (module 03).
    if (path === "/api/notes" && method === "POST") {
      const body = await readJsonBody(req);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const text = typeof body.body === "string" ? body.body : "";
      if (!title) throw new HttpError(400, "title is required");
      if (title.length > 200) throw new HttpError(400, "title must be 200 characters or fewer");

      const info = insertNote.run(title, text);
      const created = getNote.get(info.lastInsertRowid) as Note;
      return sendJson(res, 201, created); // 201 Created
    }

    // Routes on a single note: /api/notes/:id  and  /api/notes/:id/summarize
    const noteMatch = path.match(/^\/api\/notes\/(\d+)(\/summarize)?$/);
    if (noteMatch) {
      const id = Number(noteMatch[1]);
      const isSummarize = Boolean(noteMatch[2]);
      const note = getNote.get(id) as Note | undefined;
      if (!note) throw new HttpError(404, "Note not found");

      // THE AI FEATURE: summarize the note's body with the LLM (provider-agnostic).
      if (isSummarize && method === "POST") {
        const summary = await chat(
          [
            {
              role: "system",
              content: "Summarize the user's note in 1-2 concise sentences. No preamble.",
            },
            { role: "user", content: note.body || note.title },
          ],
          { temperature: 0.3, maxTokens: 160 } // low temperature: a faithful, stable summary
        );
        setSummary.run(summary.trim(), id);
        return sendJson(res, 200, getNote.get(id) as Note);
      }

      // Delete a note
      if (!isSummarize && method === "DELETE") {
        deleteNote.run(id);
        res.writeHead(204); // No Content
        return res.end();
      }
    }

    // Not an API route → serve the frontend.
    if (!path.startsWith("/api/")) {
      return await serveStatic(res, path);
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    // Expected failures carry a status; everything else is a generic 500 with
    // full detail logged server-side only (module 03).
    if (err instanceof HttpError) {
      return sendJson(res, err.status, { error: err.message });
    }
    console.error("Unhandled error:", err);
    sendJson(res, 500, { error: "Something went wrong" });
  }
});

server.listen(PORT, () => {
  console.log(`\n  AI App Starter → http://localhost:${PORT}\n`);
});
