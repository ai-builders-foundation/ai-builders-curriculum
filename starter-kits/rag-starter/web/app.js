/**
 * app.js — the frontend. Plain JavaScript, no framework, no build step.
 *
 * It talks to the backend over the same JSON API you could call with `curl`.
 * Two flows: ingest a document (chunk → embed → store, on the server) and
 * ask a question (embed → retrieve → inject → generate, on the server). This
 * file just renders what the API returns — all the RAG logic lives in
 * server/rag.ts.
 */

const documentsEl = document.getElementById("documents");
const docsEmptyEl = document.getElementById("docs-empty");
const ingestFormEl = document.getElementById("ingest-form");
const askFormEl = document.getElementById("ask-form");
const answerEl = document.getElementById("answer");
const answerTextEl = document.getElementById("answer-text");
const answerSourcesEl = document.getElementById("answer-sources");

/** Small helper around fetch that throws on non-2xx and parses JSON. */
async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (res.status === 204) return null; // No Content (e.g. after DELETE)
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

/** Render one ingested document as a list item. */
function renderDocument(doc) {
  const li = document.createElement("li");
  li.className = "note";
  li.innerHTML = `
    <h3 class="note__title">${escapeHtml(doc.title)}</h3>
    <p class="note__body">${doc.chunk_count} chunk${doc.chunk_count === 1 ? "" : "s"}</p>
    <div class="note__actions">
      <button class="button button--ghost" data-action="delete" data-id="${doc.id}">
        Delete
      </button>
    </div>
  `;
  return li;
}

/** Load all documents and paint the list. */
async function refreshDocuments() {
  const docs = await api("/api/documents");
  documentsEl.innerHTML = "";
  docsEmptyEl.style.display = docs.length ? "none" : "block";
  for (const doc of docs) documentsEl.appendChild(renderDocument(doc));
}

// Ingest a document
ingestFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const text = document.getElementById("text").value;
  if (!title || !text.trim()) return;

  const button = ingestFormEl.querySelector("button");
  button.disabled = true;
  button.textContent = "Ingesting…";
  try {
    await api("/api/documents", { method: "POST", body: JSON.stringify({ title, text }) });
    ingestFormEl.reset();
    await refreshDocuments();
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.textContent = "Ingest";
  }
});

// Delete a document — one listener for the whole list (event delegation)
documentsEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action='delete']");
  if (!btn) return;
  try {
    await api(`/api/documents/${btn.dataset.id}`, { method: "DELETE" });
    await refreshDocuments();
  } catch (err) {
    alert(err.message);
  }
});

// Ask a question
askFormEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const question = document.getElementById("question").value.trim();
  if (!question) return;

  const button = askFormEl.querySelector("button");
  button.disabled = true;
  button.textContent = "Thinking…";
  try {
    const result = await api("/api/query", {
      method: "POST",
      body: JSON.stringify({ question }),
    });
    answerTextEl.textContent = result.answer;
    answerSourcesEl.innerHTML = result.sources
      .map(
        (s) => `
          <li>
            <strong>${escapeHtml(s.documentTitle)}</strong>
            (chunk ${s.chunkIndex}, similarity ${s.score.toFixed(3)})
            <br>${escapeHtml(s.content)}
          </li>
        `
      )
      .join("");
    answerEl.hidden = false;
  } catch (err) {
    alert(err.message);
  } finally {
    button.disabled = false;
    button.textContent = "Ask";
  }
});

// Initial load
refreshDocuments().catch((err) => {
  docsEmptyEl.textContent = `Could not load documents: ${err.message}`;
});
