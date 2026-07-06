# RAG Starter

A minimal, **vendor-neutral** retrieval-augmented generation (RAG) app you can clone and build on in a weekend. It's the reference RAG scaffold for the [AI Builders Curriculum](../../curriculum/) and a solid starting point for a "chat with your docs" hackathon project.

It deliberately stays small and dependency-light so you can read the *entire* thing and understand it, then extend it however you like.

## What's in the box

A tiny app that demonstrates the whole RAG pipeline end to end:

- **Ingest**: paste in text, and the server chunks it, embeds each chunk, and stores the chunks + vectors in SQLite — *module 04*.
- **Retrieve + answer**: ask a question; the server embeds it, finds the most similar stored chunks by **cosine similarity** (computed in plain TypeScript — no vector database needed at this scale), and asks the model to answer using *only* that retrieved context — citing which chunks it used.
- Both the **chat model** and the **embeddings model** are **provider-agnostic**, configured separately via environment variables, exactly like `ai-app-starter`'s `llm.ts` pattern.
- A **tiny frontend** (plain HTML/CSS/JS, no build step) to ingest documents and ask questions.
- Two **sample documents** (about RAG itself) are seeded automatically on first run, so there's something to ask about immediately.

Ask "What are the five steps of RAG?" and the answer comes back grounded in the seeded sample document, with the exact chunk it was pulled from shown as a source.

## Prerequisites

- **Node.js 18 or newer** (it uses the built-in `fetch`). Check with `node --version`.
- That's it. No database server, and no vector database, to install — SQLite is a single file.

## Quickstart

```bash
# 1. Install dependencies
npm install

# 2. Create your local config from the template
cp .env.example .env

# 3. Apply the database schema
npm run migrate

# 4. Run it. The default .env uses LLM_OFFLINE=1 and EMBEDDING_OFFLINE=1, so
#    it works with NO API keys — two sample documents ingest automatically,
#    and asking a question returns a canned response grounded in whichever
#    chunks a simple offline embedding retrieves.
npm start

# 5. Open http://localhost:3000
```

To use **real** models, edit `.env`:

```bash
LLM_BASE_URL=https://api.your-provider.example/v1        # any OpenAI-compatible chat endpoint
LLM_API_KEY=your-real-key
LLM_MODEL=your-model-name
LLM_OFFLINE=0

EMBEDDING_BASE_URL=https://api.your-provider.example/v1   # any OpenAI-compatible embeddings endpoint
EMBEDDING_API_KEY=your-real-key
EMBEDDING_MODEL=your-embedding-model-name
EMBEDDING_OFFLINE=0
```

Then restart. Nothing else in the code changes — that's the point of keeping the provider in config. Chat and embeddings are configured **separately** because they're often different models, sometimes even different providers, even when the rest of your setup stays the same.

> If you switch to real embeddings after having ingested documents offline, re-ingest them (delete and re-add) — the offline stub and a real embeddings model produce vectors that aren't comparable to each other.

## Project structure

```
rag-starter/
├── package.json          # scripts + dependencies
├── tsconfig.json         # TypeScript config (run directly with tsx, no build step)
├── .env.example          # copy to .env and fill in
├── server/
│   ├── index.ts          # the HTTP server + routes (node:http, no framework)
│   ├── db.ts             # SQLite connection + migration runner
│   ├── llm.ts            # provider-agnostic chat + embeddings client — the ONLY vendor-aware file
│   ├── chunk.ts           # splitting text into overlapping passages (pure function, unit-tested)
│   ├── similarity.ts      # cosine similarity + top-k search (pure functions, unit-tested)
│   ├── rag.ts             # the pipeline: ingest (chunk→embed→store) and answer (retrieve→inject→generate)
│   ├── seed.ts            # ingests two sample documents on first run
│   ├── migrate.ts        # `npm run migrate` entry point
│   └── migrations/
│       └── 001_init.sql  # the initial schema (documents + chunks)
├── web/
│   ├── index.html        # the UI
│   ├── styles.css        # plain CSS (light + dark)
│   └── app.js             # frontend logic (fetch + render)
└── test/
    ├── chunk.test.ts       # unit tests for chunking
    └── similarity.test.ts  # unit tests for cosine similarity
```

## The API

The frontend uses these; you can too, with `curl` or any HTTP client.

| Method | Path | Body | Returns |
|--------|------|------|---------|
| `GET` | `/api/health` | — | `{ status, time }` |
| `GET` | `/api/documents` | — | array of ingested documents (newest first), with `chunk_count` |
| `POST` | `/api/documents` | `{ title, text }` | `201` + the created document |
| `DELETE` | `/api/documents/:id` | — | `204` |
| `POST` | `/api/query` | `{ question, k? }` | `200` + `{ answer, sources }` |

Try it:

```bash
curl -s localhost:3000/api/health

curl -s -X POST localhost:3000/api/documents \
  -H 'Content-Type: application/json' \
  -d '{"title":"Return policy","text":"Items may be returned within 30 days of purchase for a full refund, as long as they are unused and in original packaging."}'

curl -s -X POST localhost:3000/api/query \
  -H 'Content-Type: application/json' \
  -d '{"question":"How long do I have to return an item?"}'
```

The `/api/query` response looks like this:

```json
{
  "answer": "You have 30 days from the date of purchase to return an item for a full refund [1].",
  "sources": [
    {
      "documentId": 3,
      "documentTitle": "Return policy",
      "chunkId": 5,
      "chunkIndex": 0,
      "content": "Items may be returned within 30 days...",
      "score": 0.83
    }
  ]
}
```

## Scripts

- `npm run dev` — start with auto-reload on file changes.
- `npm start` — start once (what you'd run in production).
- `npm run migrate` — apply database migrations without booting the app.
- `npm run typecheck` — type-check the server and test code.
- `npm test` — run the unit tests (chunking + cosine similarity — pure functions, no network, no API key required).

## How this maps to the curriculum

Each part of this kit is the concrete version of a lesson. Read the lesson, then read the code:

| Curriculum module | Where to look here |
|-------------------|--------------------|
| [01 — Data & Storage](../../curriculum/01-data-and-storage.md) | `server/db.ts`, `server/migrations/` |
| [03 — Functions & APIs](../../curriculum/03-functions-and-apis.md) | `server/index.ts` |
| [04 — AI & Agents](../../curriculum/04-ai-and-agents.md) | `server/llm.ts` (provider-agnostic chat + embeddings), `server/chunk.ts`, `server/similarity.ts`, `server/rag.ts` — the concrete version of the module's "RAG in one section": chunk → embed → store → retrieve → inject → generate |
| [05 — Deploy](../../curriculum/05-deploy.md) | `/api/health`, env-var config, `.gitignore` |

This kit assumes you've already been through [`ai-app-starter`](../ai-app-starter/) (or module 03) for the HTTP/database basics — it doesn't re-explain `node:http` or migrations in as much depth, and focuses its comments on what's new: chunking, embeddings, and grounded generation.

## How retrieval actually works here

No external vector database — on purpose, to keep the concept visible:

1. Each chunk's embedding is stored as a JSON-encoded array of numbers in a `TEXT` column (`server/migrations/001_init.sql`). You can `SELECT embedding FROM chunks` and read it yourself.
2. At query time, `server/rag.ts` loads **every** chunk's embedding, computes cosine similarity against the question's embedding in plain TypeScript (`server/similarity.ts`), and keeps the top-k.
3. This brute-force scan is simple, correct, and plenty fast for a learning-sized corpus (hundreds to low thousands of chunks). At real scale, you'd swap in an approximate-nearest-neighbor index or a dedicated vector database — but the *concept* (embed, compare, keep the closest) doesn't change, only the performance trick.

## Where to take it next

This is a starting point, not a finished product. Good next moves, roughly in order:

1. **Support real files, not just pasted text**: accept file uploads (`.txt`, `.md`, PDF) and extract their text before chunking.
2. **Chunk by structure, not just word count**: split on headings/paragraphs first, and only fall back to a word-count window for long paragraphs.
3. **Add users and auth** (module 02): scope documents to the user who ingested them, so people don't see each other's data.
4. **Add a tool-using agent** (module 04): give an agent a `search_documents(query)` tool that calls the same retrieval code, so it can decide *when* to look things up instead of always retrieving.
5. **Swap in a real vector index** once your corpus outgrows a brute-force scan — change only `server/rag.ts`'s retrieval query.
6. **Deploy it** (module 05): containerize with a `Dockerfile`, set your secrets on a host, and get a public URL.

## License

MIT, © AI Builders Foundation. Use it, teach it, remix it.
