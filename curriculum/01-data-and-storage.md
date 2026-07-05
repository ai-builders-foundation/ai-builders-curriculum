# 01 — Data & Storage

> Every application is, underneath, a way of keeping and retrieving data. Before you can build an AI app, you need somewhere for its data — and its files — to live. This module teaches you to model data, choose a database, define a schema, pick the right column types, evolve the schema safely, store uploaded files, and query it all without shooting yourself in the foot.

**Prerequisites:** basic programming, a terminal, Node.js 18+ (for the worked examples). No prior database experience needed.

**The architecture we're building toward.** Across this curriculum you'll assemble one standard shape of application: a **relational database** for structured data, an **object store** for files, an **API/functions layer** in front of both, an **LLM integration** for the AI features, and a **deployment** that ties it together. This module builds the bottom layer — the database and file storage — that everything else sits on.

## Learning objectives

By the end of this module you will be able to:

- Explain the difference between relational and document databases and pick one deliberately.
- Model a small domain as tables with primary keys and relationships.
- Choose appropriate **column types** for your data, including JSON and vector columns.
- Write a schema in SQL and apply it as a versioned **migration** (and contrast this with a *declarative* schema).
- Query data safely using **parameterized queries** (and explain why string concatenation is dangerous).
- Add an **index** and explain what problem it solves.
- Wrap related writes in a **transaction** so your data can't end up half-updated.
- Store **files** correctly — in an object store, with a reference in the database.

## Why data comes first

It's tempting to start an AI app with the exciting part — the model. But the model is a function: text in, text out. It doesn't remember anything. The moment you want your app to remember a user's conversation, store what they uploaded, or show them yesterday's results, you need a **database**: a program whose whole job is to store data durably and give it back to you quickly and correctly.

Get the data model right and the rest of the app falls into place. Get it wrong and you'll fight it forever. So we start here.

## Relational vs. document: two ways to store data

There are two mainstream shapes of database. You should understand both, then usually reach for the first.

### Relational (SQL) databases

Data lives in **tables** — rows and columns, like a spreadsheet with rules. You define the columns and their types up front (a *schema*). Tables relate to each other through shared keys. You query with **SQL**, a declarative language that's been the industry standard for decades.

Examples: **PostgreSQL**, **SQLite**, **MySQL/MariaDB**. (SQLite is a whole database in a single file with no server to run — perfect for learning and for many small production apps. Postgres is the workhorse when you outgrow a file.)

Reach for relational when your data has clear structure and relationships — users, posts, orders, messages. That's most apps.

### Document (NoSQL) databases

Data lives as flexible, self-describing **documents** (usually JSON-like), grouped into collections. There's no enforced schema by default: two documents in the same collection can have different fields.

Examples: **MongoDB**, **Couchbase**, and document-style stores built into many platforms.

Reach for document databases when your data is genuinely unstructured or wildly variable, or when you need a specific scaling pattern they're good at. For a first AI app, you usually don't — the flexibility becomes a liability once you *do* want structure, because nothing stops bad data from getting in.

> **Rule of thumb for beginners:** start relational. Use SQLite while learning, move to Postgres in production. Reach for a document store only when you can name the specific reason a relational model doesn't fit.

The concepts in this module — modeling, keys, relationships, transactions — apply to both. We'll use SQL because it makes them concrete.

## Modeling a domain

Before writing any SQL, describe your domain in plain nouns and relationships. Say we're building a note-taking app with an AI summarizer. The nouns:

- A **user** has an id, an email, and a created-at time.
- A **note** belongs to one user and has a title, body text, and timestamps.
- A **summary** is generated for one note by the AI feature.

Notice the relationships: one user has many notes; one note has (at most) one summary. "Has many" and "belongs to" are the two relationships you'll model constantly.

Each noun becomes a **table**. Each table gets a **primary key** — a column (usually named `id`) that uniquely identifies a row. Relationships are expressed with a **foreign key**: a column in one table that stores the primary key of a row in another. A note's `user_id` column points at the `users.id` it belongs to.

### A word on normalization

**Normalization** means storing each fact in exactly one place. Instead of copying a user's email onto every one of their notes, you store the email once in `users` and reference the user by id from `notes`. Then when the email changes, you change it in one row, not a thousand.

The beginner failure mode is *duplicating* data across tables and then letting the copies drift out of sync. When you feel the urge to copy a value into a second table, ask instead: "can I reference it by id?" Usually yes.

## Choosing column types

Each column has a **type**, and picking the right one is part of modeling. The database uses types to reject bad data, store values efficiently, and sort and compare them correctly. The common families you'll reach for:

- **Text** — `TEXT` / `VARCHAR` for names, bodies, emails.
- **Numbers** — `INTEGER` for counts and ids, and a decimal type (`NUMERIC`/`DECIMAL`) for money. Never store currency in a floating-point column: `0.1 + 0.2` isn't `0.3` in floating point, and that error compounds. Use integer cents or a decimal type.
- **Booleans** — `BOOLEAN` where supported (SQLite uses `0`/`1`).
- **Timestamps** — a dedicated date/time type; store times in **UTC** and convert for display. "Store UTC, render local" saves you from timezone bugs.
- **Identifiers** — an auto-incrementing `INTEGER`, or a **UUID** when you want globally unique, non-guessable ids (useful so users can't enumerate your rows by counting).
- **JSON** — a `JSON`/`JSONB` column for genuinely flexible, nested data that doesn't warrant its own table. Use it deliberately, not as an escape hatch from modeling — data buried in JSON is harder to query and index.
- **Vectors** — an array-of-floats / vector type (via an extension such as `pgvector`) for **embeddings**: numeric representations of meaning that power semantic search. You won't need this until [Module 04](04-ai-and-agents.md) introduces RAG, but it's worth knowing your database can store them, so your AI features and your regular data live in one place.

Choosing the narrowest type that fits — and adding `NOT NULL`, `UNIQUE`, and check constraints — turns your schema into a first line of defense against bad data.

## Worked example: a schema for the notes app

Here's the domain above expressed as SQL (written for SQLite; it's nearly identical in Postgres). Read it top to bottom.

```sql
-- schema.sql

CREATE TABLE users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL UNIQUE,           -- no two users share an email
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL,               -- which user owns this note
  title      TEXT NOT NULL,
  body       TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE summaries (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  note_id    INTEGER NOT NULL UNIQUE,        -- one summary per note
  content    TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

Things worth noticing:

- **`NOT NULL`** says a column is required. Let the database enforce your rules; don't rely on application code to remember.
- **`UNIQUE`** on `users.email` means the database itself guarantees no duplicates — even if two signups race each other.
- **`ON DELETE CASCADE`** means when a user is deleted, their notes (and each note's summary) are deleted too, automatically. No orphaned rows.
- The `summaries.note_id UNIQUE` constraint encodes the "at most one summary per note" rule directly in the schema.

## Querying safely: parameterized queries

Here's the single most important safety habit in this module. **Never build a SQL string by pasting user input into it.** This is the classic SQL-injection vulnerability, and it's still one of the most common serious bugs in real software.

```ts
// DANGEROUS — never do this
const email = req.query.email;               // attacker controls this
db.exec(`SELECT * FROM users WHERE email = '${email}'`);
// If email is:  ' OR '1'='1
// the query returns every user. Worse inputs can delete tables.
```

Instead, use **parameterized queries** (also called prepared statements). You write the SQL with placeholders and hand the values separately. The database driver keeps values and code strictly apart, so input can never change the meaning of the query.

```ts
// SAFE — values are passed separately from the SQL
const row = db
  .prepare("SELECT * FROM users WHERE email = ?")
  .get(email);
```

The `?` is a placeholder; `email` fills it as *data*, never as *code*. Make this your default and injection simply stops being a category of bug you can write.

## Migrations: evolving a schema without fear

Your schema will change. You'll add a column, a table, an index. You cannot just edit `schema.sql` and hope every environment (your laptop, a teammate's, production) matches — they'll drift.

A **migration** is a small, ordered, immutable change to the schema, saved as a file. You apply migrations in order; a tiny bookkeeping table records which ones have run. This gives every environment the same schema, reproducibly, and lets you roll forward safely.

```
migrations/
  001_create_users.sql
  002_create_notes.sql
  003_add_summaries.sql
  004_add_notes_pinned_column.sql
```

A migration only ever moves the schema *forward*. Once `003` has run somewhere, you don't edit it — you write `004`. Here's what `004` might look like:

```sql
-- 004_add_notes_pinned_column.sql
ALTER TABLE notes ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
```

Mature projects use a migration tool (Prisma Migrate, Drizzle Kit, Alembic for Python, Flyway, and many others) that automates the bookkeeping. But the idea is simple enough that you can hand-roll it, and understanding the idea matters more than any one tool. The [`ai-app-starter`](../starter-kits/ai-app-starter/) kit ships a minimal hand-rolled migration runner so you can see the whole mechanism in a few dozen lines.

### Migrations vs. declarative schema

There are two philosophies for managing schema, and you'll meet both. **Imperative migrations** (above) are an ordered list of changes — "add this column, then drop that table" — and you're responsible for the sequence. **Declarative schema** flips it: you describe the *desired end state* of every table in one file, and a tool computes the diff against what exists and applies whatever changes are needed to get there. Several modern platforms and tools work this way.

Both reach the same place; they're different ways of expressing the change. Declarative is pleasant because you always read the current shape in one file; imperative gives you precise control over *how* a tricky change happens (like backfilling data mid-migration). Whichever you use, the non-negotiable principle is the same: **schema changes are versioned, reviewable, and reproducible across every environment** — never a manual edit someone made in production that no one else can reproduce.

## Indexes: making reads fast

By default, finding rows that match a condition means the database scans every row. That's fine for hundreds of rows and painfully slow for millions. An **index** is a secondary data structure the database maintains so it can jump straight to matching rows — like the index at the back of a book instead of reading every page.

If your app constantly looks up notes by their owner:

```sql
CREATE INDEX idx_notes_user_id ON notes(user_id);
```

Now `SELECT * FROM notes WHERE user_id = ?` is fast even with millions of notes.

Indexes aren't free — they use space and make writes slightly slower, because the index must be updated too. So you don't index everything. **Index the columns you filter or join on frequently.** A good default: index every foreign key, plus any column you regularly search by. (Primary keys and `UNIQUE` columns are indexed automatically.)

## Transactions: all-or-nothing writes

Suppose creating a note also creates its first empty summary row, in two separate statements. What if the process crashes between them? You'd have a note with no summary, or worse. A **transaction** groups multiple writes so they either *all* succeed or *all* get rolled back — never halfway. This is the "A" (atomicity) in the famous **ACID** properties of relational databases.

```ts
// Either both inserts commit, or neither does.
const createNoteWithSummary = db.transaction((userId, title, body, summary) => {
  const info = db
    .prepare("INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)")
    .run(userId, title, body);

  db.prepare("INSERT INTO summaries (note_id, content) VALUES (?, ?)")
    .run(info.lastInsertRowid, summary);
});

createNoteWithSummary(1, "Meeting notes", "…", "A short summary.");
```

If the second insert throws, the first is undone. Reach for a transaction any time a single logical operation spans more than one write.

## Storing files: keep blobs out of your rows

Sooner or later a user uploads something — a profile picture, a PDF, an audio file. Where does it go? The tempting answer is "a column in the database." Resist it. Databases are optimized for small, structured rows, not multi-megabyte blobs; storing large files in your tables bloats the database, slows every backup and query, and is expensive to serve.

The standard pattern is a clean division of labor:

- **The file's bytes** live in an **object store** — a service built for exactly this (Amazon S3, Google Cloud Storage, Cloudflare R2, MinIO, and many S3-compatible options). Object stores are cheap, scale to enormous files, and serve them efficiently.
- **A reference to the file** lives in your database — a row with the object's key/URL plus metadata you want to query on (owner, filename, content type, size, uploaded-at).

```sql
CREATE TABLE files (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  object_key   TEXT NOT NULL,          -- where it lives in the object store, e.g. "uploads/42/avatar.png"
  filename     TEXT NOT NULL,          -- the original name, for display
  content_type TEXT NOT NULL,          -- e.g. "image/png"
  size_bytes   INTEGER NOT NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Now your database stays lean and fast, and you can still list, filter, and permission files by querying the `files` table — while the bytes themselves are served straight from the object store.

Two practices make this safe and pleasant:

- **Signed URLs.** Rather than making a bucket public or proxying every download through your server, most object stores can mint a **signed URL**: a temporary, permission-checked link to one object that expires after a set time. Your backend generates it for an authorized user; the browser downloads directly from storage. Uploads work the same way in reverse (a signed *upload* URL), so large files never pass through your app server.
- **Enforce access.** A file reference in the database means you can apply the same ownership rules as any other row (you'll formalize this in [Module 02](02-auth-and-users.md)). Never rely on an unguessable URL alone as your access control — check that the requester is allowed to see the file, *then* hand out the signed URL.

## Hands-on exercise

Design and build the storage layer for a small **task tracker**.

Requirements:

1. A `users` table (id, email, created_at) with email unique.
2. A `projects` table — each project belongs to one user.
3. A `tasks` table — each task belongs to one project, has a title, a `done` boolean-ish column, and timestamps.
4. Deleting a user should delete their projects and tasks (cascade).
5. Write the schema as **three migration files** (`001`, `002`, `003`).
6. Add an index that makes "list all tasks in a project" fast.
7. Write a parameterized query that inserts a task, and one that returns all *unfinished* tasks for a given project id.
8. Write a transaction that creates a project and its first task together.
9. Add a `files` table that lets a task carry an attachment: store an `object_key`, `filename`, `content_type`, and `size_bytes`, plus the owning `user_id` — the file's *bytes* would live in an object store, not this table. Choose a sensible type for each column.

You can do this with SQLite and the `better-sqlite3` npm package, or with the migration runner in the [`ai-app-starter`](../starter-kits/ai-app-starter/) kit. Aim for a `schema` you could hand to a teammate and have them reproduce your database exactly.

**Stretch:** add a `tags` table and a `task_tags` join table so a task can have many tags and a tag can apply to many tasks (a "many-to-many" relationship). Notice that many-to-many always needs a third table.

## Check yourself

1. **Why should you usually start with a relational database rather than a document store?**
   Most app data has clear structure and relationships, and a relational schema makes the database enforce your rules (required fields, uniqueness, referential integrity) so bad data can't get in. Document stores trade that safety for flexibility you often don't need yet.

2. **What does a foreign key express, and what does `ON DELETE CASCADE` add?**
   A foreign key says "this column references a row in another table," modeling a relationship. `ON DELETE CASCADE` says "when the referenced row is deleted, delete the rows that pointed at it too," preventing orphaned records.

3. **Rewrite this dangerous line safely:** `db.exec("SELECT * FROM notes WHERE title = '" + input + "'")`.
   Use a parameterized query: `db.prepare("SELECT * FROM notes WHERE title = ?").all(input)`. The value is passed separately so it can never alter the query.

4. **You edited `002_create_notes.sql` after it already ran in production. Why is that a bug, and what should you have done?**
   Migrations are immutable once applied; environments that already ran the old `002` won't re-run it, so they'll diverge from ones that run the edited version. Add a new migration (`00N_...`) that makes the change instead.

5. **When is adding an index the wrong move?**
   When the column is rarely filtered or joined on, or on a write-heavy table where the extra index maintenance cost outweighs the read benefit. Indexes speed up reads at the cost of space and slightly slower writes.

6. **Why wrap "insert a note and insert its summary" in a transaction?**
   So the two writes are atomic — either both commit or both roll back — and a crash between them can't leave the database in a half-updated state.

7. **A user uploads a 12 MB image. Where do the bytes go, and what goes in the database?**
   The bytes go in an object store (S3-compatible or similar); the database stores a small reference row — the object key/URL plus metadata like owner, filename, content type, and size. This keeps the database lean and lets the file be served efficiently, often via a temporary signed URL.

8. **Why store money in an integer or decimal column rather than a floating-point one?**
   Floating-point can't represent many decimal fractions exactly (`0.1 + 0.2 ≠ 0.3`), and the rounding error compounds. Integer cents or a fixed decimal type keeps monetary math exact.

## What's next

Your data has a home. Next it needs owners: [**02 — Auth & Users**](02-auth-and-users.md) covers how people log in, how you store passwords without ever storing passwords, and how to make sure users can only touch their own data.
