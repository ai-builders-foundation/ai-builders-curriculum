/**
 * db.ts — database connection + a tiny hand-rolled migration runner.
 *
 * We use SQLite: a whole relational database in a single file, with no server
 * to run. It's perfect for learning and for many small production apps. When
 * you outgrow it, move to Postgres by swapping the driver in THIS file — the
 * rest of the app talks to `db` through prepared statements and is unaffected.
 *
 * See curriculum module 01 (Data & Storage) for the concepts behind everything here.
 */

import Database from "better-sqlite3";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH ?? join(here, "..", "data.sqlite");

export const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL"); // better read/write concurrency
db.pragma("foreign_keys = ON"); // SQLite leaves foreign-key enforcement off by default

/**
 * Apply any migration `.sql` files in `server/migrations/` that haven't run yet,
 * in filename order, recording each one in a `_migrations` bookkeeping table.
 *
 * This is the whole idea of migrations in ~20 lines: ordered, immutable schema
 * changes, applied once, tracked so every environment ends up identical. Safe to
 * call on every startup — already-applied migrations are skipped.
 */
export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  const dir = join(here, "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort(); // filenames are numbered (001_, 002_, …) so sort = apply order

  const appliedRows = db.prepare("SELECT name FROM _migrations").all() as { name: string }[];
  const applied = new Set(appliedRows.map((r) => r.name));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = readFileSync(join(dir, file), "utf8");

    // Run each migration in a transaction: it fully applies, or not at all.
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (name) VALUES (?)").run(file);
    });
    tx();

    console.log(`[db] applied migration ${file}`);
  }
}
