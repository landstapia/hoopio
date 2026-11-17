import Database from 'better-sqlite3';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));

export const db = new Database(process.env.DB_FILE ?? path.join(here, '..', 'database.db'));

db.pragma('journal_mode = WAL');   // faster, safer writes
db.pragma('foreign_keys = ON');    // SQLite ignores foreign keys unless you turn this on, every time

db.exec(readFileSync(path.join(here, '..', 'schema.sql'), 'utf8'));