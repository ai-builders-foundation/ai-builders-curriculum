/**
 * chunk.ts — splitting long text into overlapping passages ("chunks").
 *
 * Why chunk at all? Two reasons:
 *   1. Embedding models and LLM prompts both have a limited context window —
 *      you can't embed or inject an entire book at once.
 *   2. Retrieval is more precise over small, focused passages. If you embed
 *      a whole document as one vector, a question about one paragraph gets
 *      diluted by everything else in the document. Chunking lets each part
 *      speak for itself, so the chunk that actually answers the question is
 *      the one retrieval finds.
 *
 * We chunk by WORDS (not characters or real model "tokens") to keep this
 * dependency-free and easy to reason about. Production systems often chunk
 * by token count (using the model's real tokenizer) or by structure
 * (headings, paragraphs, sentences) — word-count chunking is a simple,
 * good-enough stand-in for teaching the concept.
 *
 * `overlap` keeps an idea from being severed right at a chunk boundary: the
 * last few words of one chunk repeat as the first few words of the next, so
 * a sentence that spans a boundary isn't lost to either side.
 */

export interface ChunkOptions {
  /** Target chunk size, in words. */
  chunkSize?: number;
  /** How many trailing words of each chunk repeat at the start of the next. */
  overlap?: number;
}

const DEFAULT_CHUNK_SIZE = 120;
const DEFAULT_OVERLAP = 20;

/** Split `text` into overlapping word-count chunks. Returns [] for empty/blank input. */
export function chunkText(text: string, opts: ChunkOptions = {}): string[] {
  const chunkSize = opts.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const overlap = opts.overlap ?? DEFAULT_OVERLAP;
  if (chunkSize <= 0) throw new Error("chunkSize must be > 0");
  if (overlap < 0 || overlap >= chunkSize) {
    throw new Error("overlap must be >= 0 and less than chunkSize");
  }

  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const chunks: string[] = [];
  const step = chunkSize - overlap; // how far the window slides forward each time
  for (let start = 0; start < words.length; start += step) {
    const slice = words.slice(start, start + chunkSize);
    chunks.push(slice.join(" "));
    if (start + chunkSize >= words.length) break; // this chunk already reached the end
  }
  return chunks;
}
