/**
 * similarity.test.ts — unit tests for cosine similarity (server/similarity.ts).
 *
 * Pure math, no network — this is the "compare two vectors" step of
 * retrieval, and it's worth pinning down with exact expected numbers.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { cosineSimilarity, topKBySimilarity } from "../server/similarity";

test("identical vectors have similarity 1", () => {
  assert.equal(cosineSimilarity([1, 2, 3], [1, 2, 3]), 1);
});

test("opposite vectors have similarity -1", () => {
  assert.equal(cosineSimilarity([1, 0], [-1, 0]), -1);
});

test("orthogonal vectors have similarity 0", () => {
  assert.equal(cosineSimilarity([1, 0], [0, 1]), 0);
});

test("magnitude doesn't matter, only direction", () => {
  const similarity = cosineSimilarity([1, 1], [2, 2]);
  assert.ok(Math.abs(similarity - 1) < 1e-9);
});

test("a zero vector has no direction, so similarity is defined as 0", () => {
  assert.equal(cosineSimilarity([0, 0], [1, 1]), 0);
  assert.equal(cosineSimilarity([0, 0], [0, 0]), 0);
});

test("mismatched vector lengths throw", () => {
  assert.throws(() => cosineSimilarity([1, 2], [1, 2, 3]));
});

test("topKBySimilarity returns the closest vectors, sorted best-first", () => {
  const query = [1, 0];
  const candidates = [
    [0, 1], // orthogonal -> 0
    [1, 0], // identical -> 1
    [-1, 0], // opposite -> -1
    [1, 1], // 45 degrees -> ~0.707
  ];

  const top2 = topKBySimilarity(query, candidates, 2);
  assert.deepEqual(
    top2.map((r) => r.index),
    [1, 3]
  );
  assert.ok(top2[0].score > top2[1].score);
});

test("topKBySimilarity never returns more than k results", () => {
  const query = [1, 0];
  const candidates = [
    [1, 0],
    [0, 1],
  ];
  assert.equal(topKBySimilarity(query, candidates, 10).length, 2);
});
