/**
 * app.js — the frontend. Plain JavaScript, no framework, no build step.
 *
 * It talks to the backend over the same JSON API you could call with `curl`.
 * Read it top to bottom: fetch data, render it, and wire up the buttons.
 * When you're ready for a framework (React, Vue, Svelte…), the API stays the same.
 */

const notesEl = document.getElementById("notes");
const emptyEl = document.getElementById("empty");
const formEl = document.getElementById("note-form");

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

/** Render one note as a list item. */
function renderNote(note) {
  const li = document.createElement("li");
  li.className = "note";
  li.innerHTML = `
    <h3 class="note__title">${escapeHtml(note.title)}</h3>
    ${note.body ? `<p class="note__body">${escapeHtml(note.body)}</p>` : ""}
    ${
      note.summary
        ? `<div class="note__summary"><strong>AI summary</strong>${escapeHtml(note.summary)}</div>`
        : ""
    }
    <div class="note__actions">
      <button class="button button--ghost" data-action="summarize" data-id="${note.id}">
        ${note.summary ? "Re-summarize" : "Summarize"}
      </button>
      <button class="button button--ghost" data-action="delete" data-id="${note.id}">
        Delete
      </button>
    </div>
  `;
  return li;
}

/** Load all notes and paint the list. */
async function refresh() {
  const notes = await api("/api/notes");
  notesEl.innerHTML = "";
  emptyEl.style.display = notes.length ? "none" : "block";
  for (const note of notes) notesEl.appendChild(renderNote(note));
}

// Create a note
formEl.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const body = document.getElementById("body").value;
  if (!title) return;
  await api("/api/notes", { method: "POST", body: JSON.stringify({ title, body }) });
  formEl.reset();
  await refresh();
});

// Summarize / delete — one listener for the whole list (event delegation)
notesEl.addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-action]");
  if (!btn) return;
  const { action, id } = btn.dataset;

  try {
    if (action === "summarize") {
      btn.disabled = true;
      btn.textContent = "Summarizing…";
      await api(`/api/notes/${id}/summarize`, { method: "POST" });
    } else if (action === "delete") {
      await api(`/api/notes/${id}`, { method: "DELETE" });
    }
    await refresh();
  } catch (err) {
    alert(err.message);
    btn.disabled = false;
  }
});

// Initial load
refresh().catch((err) => {
  emptyEl.textContent = `Could not load notes: ${err.message}`;
});
