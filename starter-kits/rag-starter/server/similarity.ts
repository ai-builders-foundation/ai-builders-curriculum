/**
 * similarity.ts — comparing two embedding vectors.
 *
 * An embedding is just an array of numbers (a "vector") that a model produces
 * from text, positioned in a high-dimensional space so that texts with
 * similar MEANING end up with similar vectors. "Similar" for vectors is
 * usually measured with cosine similarity: the cosine of the angle between
 * them, ranging from -1 (opposite direction) to 1 (identical direction).
 *
 * Two vectors pointing in the same direction are "about the same idea" even
 * if their magnitudes differ — which is exactly the property we want: a
 * one-sentence chunk and a five-sentence chunk that both center on the same
 * topic should still score as similar.
 *
 *   cosine_similarity(a, b) = (a · b) / (||a|| * ||b||)
 *
 * where `a · b` is the dot product and `||a||` is the vector's length
 * (its Euclidean norm).
 */

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vectors must be the same length (got ${a.length} and ${b.length})`);
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0; // a zero vector has no direction to compare
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Return the top-k most similar candidates to `query`, sorted by similarity
 * descending. This is the "search" step of retrieval: with a handful of
 * documents, this brute-force scan (compare against every stored vector) is
 * simple and plenty fast; at real scale you'd reach for an
 * approximate-nearest-neighbor index or a dedicated vector database instead.
 */
export function topKBySimilarity(
  query: number[],
  candidates: number[][],
  k: number
): { index: number; score: number }[] {
  return candidates
    .map((vec, index) => ({ index, score: cosineSimilarity(query, vec) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
