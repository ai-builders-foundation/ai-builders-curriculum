/**
 * seed.ts — load a couple of sample documents on first run.
 *
 * Called once from index.ts on every startup: if no documents exist yet, it
 * ingests two short samples through the exact same pipeline a real user
 * would use (chunk → embed → store), so `npm start` gives you something to
 * ask questions about immediately — no manual setup step required. It's a
 * no-op once anything has been ingested (including your own documents), so
 * it's safe to leave in place.
 *
 * The two samples are, fittingly, about RAG itself — so the very first
 * question you try ("What are the five steps of RAG?") demonstrates the
 * whole pipeline working end to end.
 */

import { ingestDocument, documentCount } from "./rag";

const SAMPLE_DOCUMENTS: { title: string; text: string }[] = [
  {
    title: "Retrieval-augmented generation, in five steps",
    text: `Large language models are frozen at training time: they don't know about
documents that didn't exist when they were trained, and they can't see your
private data at all. Retrieval-augmented generation, or RAG, works around
this without retraining the model. First, you chunk your source documents
into smaller passages, because embedding and prompting both have limits on
how much text fits at once. Second, you embed each chunk, turning its text
into a vector — a list of numbers that captures its meaning. Third, you
store those vectors alongside the chunk text, often in a dedicated vector
database or, for smaller corpora, a plain SQL table. Fourth, when a user asks
a question, you embed the question the same way and search for the stored
chunks whose vectors are most similar to it — this is the retrieve step.
Fifth, you inject the retrieved chunks into the prompt as context and ask the
model to answer using only that material, which is the generate step. The
result is an answer that's grounded in real, checkable source text instead
of the model's memory, and you can show the user exactly which passages it
came from.`,
  },
  {
    title: "Cosine similarity for comparing vectors",
    text: `Once you've turned two pieces of text into embedding vectors, you need a
way to measure how similar they are. Cosine similarity does this by looking
at the angle between two vectors rather than their raw distance. Two vectors
that point in the same direction get a cosine similarity close to 1, even if
one is much longer than the other, because only the direction — not the
magnitude — is being compared. Two vectors pointing in completely opposite
directions score close to -1, and two unrelated vectors at right angles
score close to 0. This matters for retrieval because a short chunk of text
and a long chunk of text can both be "about the same topic" even though
their word counts differ wildly, and cosine similarity treats them as
similar as long as they point the same way in the embedding space. To
compute it, take the dot product of the two vectors and divide by the
product of their magnitudes (their Euclidean lengths). In a retrieval
system you compute this between the question's embedding and every stored
chunk's embedding, then keep the handful of chunks with the highest score —
that's the "top-k" the code refers to.`,
  },
];

export async function seedIfEmpty(): Promise<void> {
  if (documentCount() > 0) return;

  for (const doc of SAMPLE_DOCUMENTS) {
    await ingestDocument(doc.title, doc.text);
  }
  console.log(`[seed] ingested ${SAMPLE_DOCUMENTS.length} sample document(s)`);
}
