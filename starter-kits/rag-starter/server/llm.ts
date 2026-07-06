/**
 * llm.ts — the provider-agnostic model client: chat completions AND embeddings.
 *
 * This is the ONLY file in the app that knows which model provider(s) you
 * use. Everything else imports `chat()` and `embed()` and never touches a
 * vendor SDK or URL. To switch providers — or point at a local, self-hosted
 * model — change environment variables in `.env`; no code changes anywhere else.
 *
 * Chat and embeddings are configured SEPARATELY (`LLM_*` vs `EMBEDDING_*`)
 * because in practice they're often different models — sometimes even
 * different providers — even when everything else about your setup is the same.
 *
 * Both request shapes below are the widely-adopted OpenAI-compatible
 * `/chat/completions` and `/embeddings` formats, which many providers and
 * self-hosting tools implement. If your provider differs, adapt THIS file only.
 */

// --- chat ----------------------------------------------------------------------

// No vendor defaults here on purpose — you supply all three in .env.
const LLM_BASE_URL = process.env.LLM_BASE_URL ?? "";
const LLM_API_KEY = process.env.LLM_API_KEY ?? "";
const LLM_MODEL = process.env.LLM_MODEL ?? "";
const LLM_OFFLINE = process.env.LLM_OFFLINE === "1";

export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
}

/**
 * Send a list of messages to the model and return its text reply.
 * Remember: the model is stateless — pass all the context it needs every call.
 */
export async function chat(messages: Message[], opts: ChatOptions = {}): Promise<string> {
  // Offline demo mode: no network, no key required. Also kicks in automatically
  // if the provider isn't fully configured, so the app always runs. Set
  // LLM_OFFLINE=0 and fill in all three LLM_* vars in .env for real output.
  if (LLM_OFFLINE || !LLM_API_KEY || !LLM_BASE_URL || !LLM_MODEL) {
    return offlineChatStub(messages);
  }

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 512,
    }),
  });

  if (!res.ok) {
    // Log detail server-side; the caller turns this into a generic 500 for clients.
    const detail = await res.text();
    throw new Error(`LLM request failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? "";
}

/** A dependency-free stand-in so the app runs end-to-end without a provider. */
function offlineChatStub(messages: Message[]): string {
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  const text = (lastUser?.content ?? "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const preview = words.slice(0, 24).join(" ");
  const ellipsis = words.length > 24 ? "…" : "";
  return (
    "[offline demo — add LLM_API_KEY to .env and set LLM_OFFLINE=0 for real output] " +
    `Grounded on the retrieved context, here's a stand-in answer to: "${preview}${ellipsis}"`
  );
}

// --- embeddings ------------------------------------------------------------------

const EMBEDDING_BASE_URL = process.env.EMBEDDING_BASE_URL ?? "";
const EMBEDDING_API_KEY = process.env.EMBEDDING_API_KEY ?? "";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "";
const EMBEDDING_OFFLINE = process.env.EMBEDDING_OFFLINE === "1";

/** Dimensionality of the offline stand-in embedding — see offlineEmbeddingStub. */
const OFFLINE_EMBEDDING_DIM = 256;

/**
 * Turn `text` into an embedding vector — a list of numbers positioned so that
 * texts with similar meaning end up with similar vectors (see
 * server/similarity.ts for what "similar" means for two vectors).
 */
export async function embed(text: string): Promise<number[]> {
  // Offline demo mode: same idea as chat()'s offline stub, so `npm start`
  // works end-to-end with zero configuration. See offlineEmbeddingStub below
  // for exactly what it computes and how it differs from a real model.
  if (EMBEDDING_OFFLINE || !EMBEDDING_API_KEY || !EMBEDDING_BASE_URL || !EMBEDDING_MODEL) {
    return offlineEmbeddingStub(text);
  }

  const res = await fetch(`${EMBEDDING_BASE_URL}/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${EMBEDDING_API_KEY}`,
    },
    body: JSON.stringify({ model: EMBEDDING_MODEL, input: text }),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`Embedding request failed (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { data?: { embedding?: number[] }[] };
  const vector = data.data?.[0]?.embedding;
  if (!vector) throw new Error("Embedding response did not include a vector");
  return vector;
}

/**
 * A dependency-free stand-in embedding so the app runs end-to-end without an
 * embeddings provider configured. It is NOT a real semantic embedding — it's
 * a "hashed bag of words": every word in the text is hashed into one of
 * OFFLINE_EMBEDDING_DIM buckets and counted, then the resulting vector is
 * normalized to unit length. Texts that share more words end up more similar
 * under cosine similarity, which is enough to demonstrate retrieval working
 * end-to-end. Swap in a real EMBEDDING_* provider for actual semantic search
 * (e.g. matching "automobile" to "car" even though they share no words).
 */
function offlineEmbeddingStub(text: string): number[] {
  const vector = new Array(OFFLINE_EMBEDDING_DIM).fill(0);
  const words = text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
  for (const word of words) {
    vector[hashToBucket(word)] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
  return norm === 0 ? vector : vector.map((v) => v / norm);
}

/** A tiny, deterministic string hash (FNV-1a) mapped into a fixed bucket count. */
function hashToBucket(word: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < word.length; i++) {
    hash ^= word.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash) % OFFLINE_EMBEDDING_DIM;
}
