/**
 * chunk.test.ts — unit tests for the chunking function (server/chunk.ts).
 *
 * Pure function, no network and no database, so these tests run instantly
 * and need no API key — exactly what makes it worth testing directly.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "../server/chunk";

test("empty or whitespace-only text produces no chunks", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText("   \n\t  "), []);
});

test("text shorter than chunkSize becomes a single chunk", () => {
  const chunks = chunkText("a short sentence", { chunkSize: 10, overlap: 2 });
  assert.deepEqual(chunks, ["a short sentence"]);
});

test("long text is split into overlapping chunks that slide forward", () => {
  const words = Array.from({ length: 8 }, (_, i) => `w${i}`); // w0..w7
  const chunks = chunkText(words.join(" "), { chunkSize: 4, overlap: 1 });

  assert.deepEqual(chunks, ["w0 w1 w2 w3", "w3 w4 w5 w6", "w6 w7"]);
});

test("no overlap produces non-overlapping, contiguous chunks", () => {
  const words = Array.from({ length: 6 }, (_, i) => `w${i}`);
  const chunks = chunkText(words.join(" "), { chunkSize: 2, overlap: 0 });

  assert.deepEqual(chunks, ["w0 w1", "w2 w3", "w4 w5"]);
});

test("collapses arbitrary whitespace between words", () => {
  const chunks = chunkText("  one   two\nthree \t four  ", { chunkSize: 10, overlap: 0 });
  assert.deepEqual(chunks, ["one two three four"]);
});

test("rejects invalid options", () => {
  assert.throws(() => chunkText("hello world", { chunkSize: 0 }));
  assert.throws(() => chunkText("hello world", { chunkSize: -5 }));
  assert.throws(() => chunkText("hello world", { chunkSize: 5, overlap: 5 }));
  assert.throws(() => chunkText("hello world", { chunkSize: 5, overlap: -1 }));
});
