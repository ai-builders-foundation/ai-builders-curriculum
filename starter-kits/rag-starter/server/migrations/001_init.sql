-- 001_init.sql — the initial schema for the RAG starter.
--
-- Migrations are immutable once applied: to change the schema later, add a new
-- file (002_..., 003_...) rather than editing this one. See curriculum module 01.

-- A document you've ingested (the thing you paste into the "Add a document" box).
CREATE TABLE IF NOT EXISTS documents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Each document is split into overlapping passages ("chunks", see
-- server/chunk.ts) before embedding, so retrieval can return a focused
-- passage instead of an entire document. `embedding` stores the vector as a
-- JSON-encoded array of numbers in plain TEXT, so you can literally
-- `SELECT embedding FROM chunks` and read what's in it — see server/llm.ts
-- for what produces it. A production system at real scale would pack this
-- into a BLOB or reach for a dedicated vector index/extension; for a
-- learning-sized corpus, computing cosine similarity in JS
-- (server/similarity.ts) over rows fetched with a plain SELECT is simple,
-- correct, and fast enough.
CREATE TABLE IF NOT EXISTS chunks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  embedding   TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Retrieval scans all chunks for a question, but we still index the foreign
-- key: it's what makes "delete a document" (ON DELETE CASCADE, above) and any
-- future per-document lookups fast.
CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON chunks(document_id);
