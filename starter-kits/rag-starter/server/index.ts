/**
 * index.ts — the HTTP server that ties everything together.
 *
 * Built on Node's built-in `node:http` (no web framework) — same as the
 * ai-app-starter sibling kit — so you can see exactly how a request becomes
 * a response, the concepts from curriculum module 03 (Functions & APIs) with
 * nothing hidden. It serves a JSON API under /api/* and the static frontend
 * in web/ for everything else.
 *
 * Routes:
 *   GET    /api/health          → liveness check
 *   GET    /api/documents       → list ingested documents (newest first)
 *   POST   /api/documents       → ingest a document   { title, text }
 *   DELETE /api/documents/:id   → remove a document and its chunks
 *   POST   /api/query           → ask a question   { question, k? } → grounded answer + sources
 *   (anything else)             → static files from web/
 *
 * The frontend is served from the SAME origin as the API, so we don't need
 * CORS here (see module 03 for when you would). If you split them onto
 * different domains, add CORS headers.
 */

import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, extname, normalize } from "node:path";
import { runMigrations } from "./db";
import { ingestDocument, listDocuments, deleteDocument, answerQuestion } from "./rag";
import { seedIfEmpty } from "./seed";

const here = dirname(fileURLToPath(import.meta.url));
const WEB_DIR = join(here, "..", "web");
const PORT = Number(process.env.PORT ?? 3000);

// Make sure the schema exists, and there's something to ask about, before we
// serve any traffic. Both are safe to run on every startup — they no-op once
// already done.
runMigrations();
await seedIfEmpty();

// --- types -------------------------------------------------------------------

/** A small error carrying an HTTP status, so handlers can throw a clean failure. */
class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

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

    // List ingested documents
    if (path === "/api/documents" && method === "GET") {
      return sendJson(res, 200, listDocuments());
    }

    // Ingest a document — the RAG pipeline's WRITE side: chunk → embed → store.
    if (path === "/api/documents" && method === "POST") {
      const body = await readJsonBody(req);
      const title = typeof body.title === "string" ? body.title.trim() : "";
      const text = typeof body.text === "string" ? body.text : "";
      if (!title) throw new HttpError(400, "title is required");
      if (title.length > 200) throw new HttpError(400, "title must be 200 characters or fewer");
      if (!text.trim()) throw new HttpError(400, "text is required");

      const { document, chunkCount } = await ingestDocument(title, text);
      return sendJson(res, 201, { ...document, chunk_count: chunkCount }); // 201 Created
    }

    // Delete a document (and its chunks, via ON DELETE CASCADE)
    const docMatch = path.match(/^\/api\/documents\/(\d+)$/);
    if (docMatch && method === "DELETE") {
      deleteDocument(Number(docMatch[1]));
      res.writeHead(204); // No Content
      return res.end();
    }

    // Ask a question — the RAG pipeline's READ side: retrieve → inject → generate.
    if (path === "/api/query" && method === "POST") {
      const body = await readJsonBody(req);
      const question = typeof body.question === "string" ? body.question.trim() : "";
      const k = typeof body.k === "number" && body.k > 0 ? Math.floor(body.k) : 4;
      if (!question) throw new HttpError(400, "question is required");

      const result = await answerQuestion(question, k);
      return sendJson(res, 200, result);
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
  console.log(`\n  RAG Starter → http://localhost:${PORT}\n`);
});
