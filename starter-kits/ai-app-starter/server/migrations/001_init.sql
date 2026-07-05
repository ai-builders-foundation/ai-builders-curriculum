-- 001_init.sql — the initial schema for the AI notes app.
--
-- Migrations are immutable once applied: to change the schema later, add a new
-- file (002_..., 003_...) rather than editing this one. See curriculum module 01.
--
-- This starter is single-user for simplicity. To make it multi-user, add a
-- `users` table and a `user_id` foreign key here, then scope every query to the
-- authenticated user — see curriculum module 02 (Auth & Users).

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  summary    TEXT,                                   -- filled in by the AI feature; NULL until summarized
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- We list notes newest-first, so index the column we sort by.
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at);
