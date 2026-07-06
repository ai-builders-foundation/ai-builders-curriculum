/**
 * rag.ts — the retrieval-augmented generation pipeline: ingest documents,
 * then answer questions grounded in them.
 *
 * This file is the concrete, runnable version of curriculum module 04's
 * "RAG in one section": chunk → embed → store → retrieve → inject → generate.
 *
 * A note on style vs. the ai-app-starter sibling: there, prepared statements
 * are declared once at the top of index.ts, right after runMigrations() has
 * already run in that same file — so the table is guaranteed to exist first.
 * Here, this module can be imported (by index.ts, or by seed.ts) BEFORE
 * migrations have necessarily run, because ES module imports are all
 * evaluated before the importing file's own top-level code runs — so a
 * statement prepared at THIS module's top level could hit a table that
 * doesn't exist yet. Preparing each statement inline, inside the function
 * that uses it, sidesteps that ordering entirely: nothing here touches the
 * database until you actually call one of these functions, by which point
 * index.ts has already run runMigrations(). The per-call overhead is
 * negligible at this scale.
 */

import { db } from "./db";
import { chunkText } from "./chunk";
import { cosineSimilarity } from "./similarity";
import { chat, embed } from "./llm";

export interface DocumentRow {
  id: number;
  title: string;
  created_at: string;
}

interface ChunkRow {
  id: number;
  document_id: number;
  chunk_index: number;
  content: string;
  embedding: string; // JSON-encoded number[] — see server/llm.ts embed()
  document_title: string;
}

export interface Source {
  documentId: number;
  documentTitle: string;
  chunkId: number;
  chunkIndex: number;
  content: string;
  score: number;
}

/**
 * STEPS 1-3: chunk → embed → store.
 * Split `text` into overlapping passages, embed each one, and save the
 * document + its chunks in a single transaction (all-or-nothing).
 */
export async function ingestDocument(
  title: string,
  text: string
): Promise<{ document: DocumentRow; chunkCount: number }> {
  const pieces = chunkText(text);
  if (pieces.length === 0) throw new Error("Document has no content to ingest");

  // Embed BEFORE opening the transaction: these are network calls (or the
  // offline stub), and we don't want a slow request holding a DB transaction open.
  const embeddings = await Promise.all(pieces.map((piece) => embed(piece)));

  const documentId = db.transaction(() => {
    const info = db.prepare("INSERT INTO documents (title) VALUES (?)").run(title);
    const insertChunk = db.prepare(
      "INSERT INTO chunks (document_id, chunk_index, content, embedding) VALUES (?, ?, ?, ?)"
    );
    pieces.forEach((content, i) => {
      insertChunk.run(info.lastInsertRowid, i, content, JSON.stringify(embeddings[i]));
    });
    return info.lastInsertRowid;
  })();

  const document = db.prepare("SELECT * FROM documents WHERE id = ?").get(documentId) as DocumentRow;
  return { document, chunkCount: pieces.length };
}

/** List ingested documents, newest first, with how many chunks each became. */
export function listDocuments(): (DocumentRow & { chunk_count: number })[] {
  return db
    .prepare(
      `SELECT d.id, d.title, d.created_at, COUNT(c.id) AS chunk_count
       FROM documents d LEFT JOIN chunks c ON c.document_id = d.id
       GROUP BY d.id
       ORDER BY d.created_at DESC`
    )
    .all() as (DocumentRow & { chunk_count: number })[];
}

/** Remove a document and (via ON DELETE CASCADE) all of its chunks. */
export function deleteDocument(id: number): void {
  db.prepare("DELETE FROM documents WHERE id = ?").run(id);
}

export function documentCount(): number {
  return (db.prepare("SELECT COUNT(*) AS count FROM documents").get() as { count: number }).count;
}

/**
 * STEPS 4-5: retrieve → inject → generate.
 * Embed the question, find the top-k most similar chunks across ALL ingested
 * documents, build a prompt that instructs the model to answer ONLY from
 * that context, and return the answer plus which chunks it's grounded in —
 * so a user can verify the answer instead of trusting it blindly.
 */
export async function answerQuestion(
  question: string,
  k = 4
): Promise<{ answer: string; sources: Source[] }> {
  const rows = db
    .prepare(
      `SELECT c.id, c.document_id, c.chunk_index, c.content, c.embedding, d.title AS document_title
       FROM chunks c
       JOIN documents d ON d.id = c.document_id`
    )
    .all() as ChunkRow[];
  if (rows.length === 0) {
    return {
      answer: "No documents have been ingested yet — add one above, then ask again.",
      sources: [],
    };
  }

  // Embed the question with the SAME model/space used for the chunks, so the
  // similarity comparison below is comparing like with like.
  const queryVector = await embed(question);

  const scored = rows
    .map((row) => ({
      row,
      score: cosineSimilarity(queryVector, JSON.parse(row.embedding) as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  const sources: Source[] = scored.map(({ row, score }) => ({
    documentId: row.document_id,
    documentTitle: row.document_title,
    chunkId: row.id,
    chunkIndex: row.chunk_index,
    content: row.content,
    score,
  }));

  // Ground the model: hand it ONLY the retrieved chunks (never the whole
  // corpus), numbered so it can cite them, and tell it to admit when the
  // answer isn't in them instead of making something up.
  const context = sources
    .map((s, i) => `[${i + 1}] (from "${s.documentTitle}")\n${s.content}`)
    .join("\n\n");

  const answer = await chat(
    [
      {
        role: "system",
        content:
          "Answer the user's question using ONLY the numbered context passages below. " +
          "Cite the passage(s) you used, like [1] or [2]. If the passages don't contain " +
          "the answer, say so plainly instead of guessing.\n\n" +
          context,
      },
      { role: "user", content: question },
    ],
    { temperature: 0.2, maxTokens: 400 } // low temperature: a faithful answer, not a creative one
  );

  return { answer, sources };
}
