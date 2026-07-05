/**
 * migrate.ts — run database migrations from the command line.
 *
 *   npm run migrate
 *
 * You don't strictly need to run this by hand: the server calls runMigrations()
 * on startup too. This script is here so you can apply schema changes explicitly
 * (e.g. in a deploy step or CI) without booting the whole app.
 */

import { runMigrations } from "./db";

runMigrations();
console.log("[db] migrations up to date");
